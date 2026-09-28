-- Lean team execution: Domain Leads may execute their own tasks, with Admin as final reviewer.

CREATE OR REPLACE FUNCTION ats_team_private.domain_candidates(p_workstream uuid, p_required_skill text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  admin boolean := coalesce(public.portfolio_device_is_trusted(),false);
  me uuid := ats_team_private.member_id();
  w public.studio_project_workstreams%rowtype;
  skill text;
begin
  select * into w from public.studio_project_workstreams where id=p_workstream;
  if not found then raise exception 'Domain unavailable'; end if;
  if not admin and (me is null or w.lead_member_id is distinct from me) then
    raise exception 'Domain Lead access required' using errcode='42501';
  end if;
  skill := lower(trim(coalesce(nullif(p_required_skill,''),w.lead_skill)));
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',m.id,'full_name',m.full_name,'available',m.available,'capacity',m.capacity,
      'skill',skill,'level',coalesce(s.level,0),'is_domain_lead',(m.id=w.lead_member_id),
      'active_load',(select count(*) from public.studio_project_tasks t where t.owner_id=m.id and t.status in ('assigned','in_progress','review')),
      'eligible',(m.active and m.available and coalesce(s.level,0)>0 and
        (select count(*) from public.studio_project_tasks t where t.owner_id=m.id and t.status in ('assigned','in_progress','review'))<m.capacity)
    ) order by
      (m.active and m.available and coalesce(s.level,0)>0) desc,
      coalesce(s.level,0) desc,
      (select count(*) from public.studio_project_tasks t where t.owner_id=m.id and t.status in ('assigned','in_progress','review')) asc,
      m.full_name
    )
    from public.studio_team_members m
    left join public.studio_member_skills s on s.member_id=m.id and s.skill=skill
    where m.active
  ),'[]'::jsonb);
end
$function$;

CREATE OR REPLACE FUNCTION ats_team_private.domain_command(p_action text, p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  admin boolean := coalesce(public.portfolio_device_is_trusted(),false);
  me uuid := ats_team_private.member_id();
  uid uuid := auth.uid();
  device text := case when admin then public.portfolio_request_header('x-portfolio-device-id') else null end;
  w public.studio_project_workstreams%rowtype;
  t public.studio_project_tasks%rowtype;
  m public.studio_team_members%rowtype;
  wid uuid;
  tid uuid;
  mid uuid;
  note text := trim(coalesce(p->>'reason',''));
  created integer := 0;
  active_load integer := 0;
begin
  if not admin and uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not admin and me is null then raise exception 'Active ATS membership required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(724901,2);

  wid := nullif(p->>'workstream_id','')::uuid;
  if wid is not null then
    select * into w from public.studio_project_workstreams where id=wid for update;
    if not found then raise exception 'Domain unavailable'; end if;
  end if;

  if p_action='assign_lead' then
    if not admin then raise exception 'Admin only' using errcode='42501'; end if;
    mid := (p->>'member_id')::uuid;
    select * into m from public.studio_team_members where id=mid and active for update;
    if not found then raise exception 'Choose an active Domain Lead'; end if;
    if w.lead_member_id is not null and w.lead_member_id<>mid
       and exists(select 1 from public.studio_project_tasks x where x.workstream_id=w.id and x.status in ('assigned','in_progress','review'))
       and note='' then
      raise exception 'Reassigning an active domain requires a reason';
    end if;
    update public.studio_project_workstreams
    set lead_member_id=mid,status=case when status='planned' then 'active' else status end,updated_at=now()
    where id=w.id;
    update public.studio_project_tasks
    set reviewer_id=mid,updated_at=now()
    where workstream_id=w.id and status='available';
    created := ats_team_private.materialize_domain_tasks(w.id);
    insert into public.studio_activity(actor_type,entity_type,entity_id,action,metadata)
    values('admin','workstream',w.id,'domain_lead_assigned',jsonb_build_object('member_id',mid,'reason',note,'tasks_created',created));
    return jsonb_build_object('workstream_id',w.id,'lead_member_id',mid,'tasks_created',created);
  end if;

  if not admin and (w.id is null or w.lead_member_id is distinct from me) then
    raise exception 'Domain Lead access required' using errcode='42501';
  end if;

  if p_action='create_task' then
    if w.lead_member_id is null then raise exception 'Assign a Domain Lead first'; end if;
    tid:=gen_random_uuid();
    insert into public.studio_project_tasks(
      id,project_id,workstream_id,title,required_skill,required_level,expected_output,
      acceptance_criteria,reviewer_id,admin_acceptance,due_at,base_tokens,
      assignment_mode,escalate_hours,created_by_member_id
    ) values(
      tid,w.project_id,w.id,trim(p->>'title'),lower(trim(p->>'required_skill')),
      coalesce((p->>'required_level')::int,1),trim(p->>'expected_output'),
      trim(p->>'acceptance_criteria'),w.lead_member_id,false,
      (p->>'due_at')::timestamptz,coalesce((p->>'base_tokens')::int,10),
      'direct',coalesce((p->>'escalate_hours')::int,24),coalesce(me,w.lead_member_id)
    );
    insert into public.studio_task_events(task_id,member_id,actor_user_id,actor_device_id,action,details)
    values(tid,coalesce(me,w.lead_member_id),uid,device,'domain_create_task',p);
    return jsonb_build_object('id',tid,'status','available');
  end if;

  tid := nullif(p->>'id','')::uuid;
  if tid is not null then
    select * into t from public.studio_project_tasks where id=tid for update;
    if not found or (w.id is not null and t.workstream_id<>w.id) then raise exception 'Task unavailable'; end if;
    if w.id is null then select * into w from public.studio_project_workstreams where id=t.workstream_id for update; end if;
    if not admin and w.lead_member_id is distinct from me then raise exception 'Domain Lead access required' using errcode='42501'; end if;
  end if;

  if p_action='assign_task' then
    if t.status<>'available' then raise exception 'Task is not available'; end if;
    mid := (p->>'member_id')::uuid;
    select * into m from public.studio_team_members where id=mid and active for update;
    if not found or not m.available then raise exception 'Choose an active available team member'; end if;
    if not exists(select 1 from public.studio_member_skills s where s.member_id=mid and s.skill=t.required_skill and s.level>=t.required_level) then
      raise exception 'Required skill or level missing';
    end if;
    select count(*) into active_load from public.studio_project_tasks x where x.owner_id=mid and x.status in ('assigned','in_progress','review');
    if active_load>=m.capacity then raise exception 'Team member capacity reached'; end if;
    if mid=t.reviewer_id then
      update public.studio_project_tasks
      set owner_id=mid,status='assigned',reviewer_id=null,admin_acceptance=true,updated_at=now()
      where id=tid;
    else
      update public.studio_project_tasks
      set owner_id=mid,status='assigned',reviewer_id=w.lead_member_id,admin_acceptance=false,updated_at=now()
      where id=tid;
    end if;
    insert into public.studio_token_ledger(task_id,project_id,member_id,event_type,tokens,reason,actor_user_id,actor_device_id)
    values(tid,t.project_id,mid,'RESERVED',t.base_tokens,'Assigned by Domain Lead',uid,device);
    insert into public.studio_task_events(task_id,member_id,actor_user_id,actor_device_id,action,details)
    values(tid,mid,uid,device,'domain_assign',jsonb_build_object('workstream_id',w.id,'from',t.status,'to','assigned'));
    return jsonb_build_object('id',tid,'status','assigned','owner_id',mid);
  elsif p_action='unassign_task' then
    if t.status not in ('assigned','in_progress','review') or note='' then raise exception 'Active assignment and reason required'; end if;
    insert into public.studio_token_ledger(task_id,project_id,member_id,event_type,tokens,reason,actor_user_id,actor_device_id)
    values(tid,t.project_id,t.owner_id,'RELEASED',t.base_tokens,note,uid,device);
    update public.studio_project_tasks
    set owner_id=null,status='available',submission=null,rework_reason=null,rework_category=null,
        reviewer_id=w.lead_member_id,admin_acceptance=false,
        submitted_at=null,available_since=now(),updated_at=now()
    where id=tid;
    insert into public.studio_task_events(task_id,member_id,actor_user_id,actor_device_id,action,details)
    values(tid,t.owner_id,uid,device,'domain_unassign',jsonb_build_object('reason',note,'workstream_id',w.id));
    return jsonb_build_object('id',tid,'status','available');
  elsif p_action='edit_task' then
    if t.status<>'available' then raise exception 'Only available tasks can be edited'; end if;
    update public.studio_project_tasks set
      title=trim(coalesce(p->>'title',title)),
      required_skill=lower(trim(coalesce(p->>'required_skill',required_skill))),
      required_level=coalesce((p->>'required_level')::int,required_level),
      expected_output=trim(coalesce(p->>'expected_output',expected_output)),
      acceptance_criteria=trim(coalesce(p->>'acceptance_criteria',acceptance_criteria)),
      due_at=coalesce((p->>'due_at')::timestamptz,due_at),
      base_tokens=coalesce((p->>'base_tokens')::int,base_tokens),
      updated_at=now()
    where id=tid;
    insert into public.studio_task_events(task_id,member_id,actor_user_id,actor_device_id,action,details)
    values(tid,coalesce(me,w.lead_member_id),uid,device,'domain_edit_task',p);
    return jsonb_build_object('id',tid,'status','available');
  elsif p_action='deadline_task' then
    if t.status in ('accepted','closed') then raise exception 'Task is already complete'; end if;
    if note='' then raise exception 'Reason required'; end if;
    update public.studio_project_tasks set due_at=(p->>'due_at')::timestamptz,updated_at=now() where id=tid;
    insert into public.studio_task_events(task_id,member_id,actor_user_id,actor_device_id,action,details)
    values(tid,coalesce(t.owner_id,me),uid,device,'domain_deadline',jsonb_build_object('reason',note,'due_at',p->>'due_at'));
    return jsonb_build_object('id',tid,'status',t.status);
  elsif p_action='submit_domain' then
    if w.lead_member_id is distinct from me and not admin then raise exception 'Only the Domain Lead may submit'; end if;
    if length(trim(coalesce(p->>'submission',''))) not between 10 and 10000 then raise exception 'Add the consolidated domain result'; end if;
    if exists(select 1 from public.studio_project_tasks x where x.workstream_id=w.id and x.status not in ('accepted','closed')) then
      raise exception 'All domain tasks must be accepted before submitting the domain result';
    end if;
    if not exists(select 1 from public.studio_project_tasks x where x.workstream_id=w.id) then
      raise exception 'Create at least one team task before submitting the domain result';
    end if;
    update public.studio_project_workstreams
    set submission=trim(p->>'submission'),status='review',submitted_at=now(),rework_reason=null,updated_at=now()
    where id=w.id;
    insert into public.studio_activity(actor_user_id,actor_type,entity_type,entity_id,action,metadata)
    values(uid,'member','workstream',w.id,'domain_submitted',jsonb_build_object('lead_member_id',w.lead_member_id));
    return jsonb_build_object('workstream_id',w.id,'status','review');
  elsif p_action='accept_domain' then
    if not admin then raise exception 'Admin only' using errcode='42501'; end if;
    if w.status<>'review' then raise exception 'Domain result must be under review'; end if;
    update public.studio_project_workstreams
    set status='accepted',accepted_at=now(),rework_reason=null,updated_at=now()
    where id=w.id;
    insert into public.studio_activity(actor_type,entity_type,entity_id,action,metadata)
    values('admin','workstream',w.id,'domain_accepted',jsonb_build_object('lead_member_id',w.lead_member_id));
    return jsonb_build_object('workstream_id',w.id,'status','accepted');
  elsif p_action='rework_domain' then
    if not admin then raise exception 'Admin only' using errcode='42501'; end if;
    if w.status<>'review' or note='' then raise exception 'Review state and rework reason required'; end if;
    update public.studio_project_workstreams
    set status='rework',rework_reason=note,updated_at=now()
    where id=w.id;
    insert into public.studio_activity(actor_type,entity_type,entity_id,action,metadata)
    values('admin','workstream',w.id,'domain_rework',jsonb_build_object('reason',note,'lead_member_id',w.lead_member_id));
    return jsonb_build_object('workstream_id',w.id,'status','rework');
  else
    raise exception 'Unknown domain action';
  end if;
end
$function$;

