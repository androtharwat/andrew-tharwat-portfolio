alter table public.studio_project_workstreams
  add column if not exists domain_key text,
  add column if not exists lead_skill text,
  add column if not exists lead_member_id uuid references public.studio_team_members(id) on delete set null,
  add column if not exists expected_outcome text,
  add column if not exists acceptance_criteria text,
  add column if not exists status text not null default 'planned',
  add column if not exists due_at timestamptz,
  add column if not exists submission text,
  add column if not exists rework_reason text,
  add column if not exists submitted_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists source_case_id uuid references public.studio_discovery_cases(id) on delete set null,
  add column if not exists source_solution_task_ids uuid[] not null default '{}'::uuid[],
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.studio_project_workstreams'::regclass
      and conname='studio_project_workstreams_status_check'
  ) then
    alter table public.studio_project_workstreams
      add constraint studio_project_workstreams_status_check
      check (status in ('planned','active','review','accepted','rework','blocked'));
  end if;
end $$;

alter table public.studio_project_tasks
  add column if not exists source_solution_task_id uuid references public.studio_solution_tasks(id) on delete set null,
  add column if not exists created_by_member_id uuid references public.studio_team_members(id) on delete set null;

create unique index if not exists studio_project_tasks_source_solution_unique
  on public.studio_project_tasks(source_solution_task_id)
  where source_solution_task_id is not null;
create index if not exists studio_project_workstreams_lead_idx
  on public.studio_project_workstreams(lead_member_id,status);
create index if not exists studio_project_workstreams_project_status_idx
  on public.studio_project_workstreams(project_id,status);
create index if not exists studio_project_tasks_workstream_status_idx
  on public.studio_project_tasks(workstream_id,status);

create index if not exists studio_project_workstreams_source_case_idx
  on public.studio_project_workstreams(source_case_id);
create index if not exists studio_project_tasks_created_by_idx
  on public.studio_project_tasks(created_by_member_id);

CREATE OR REPLACE FUNCTION ats_team_private.build_delivery_system(p_project uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  p public.studio_projects%rowtype;
  case_id uuid;
  w record;
  candidate uuid;
  domains_created integer := 0;
  tasks_created integer := 0;
  unassigned jsonb := '[]'::jsonb;
begin
  if not coalesce(public.portfolio_device_is_trusted(),false) then
    raise exception 'Trusted device required' using errcode='42501';
  end if;
  select * into p from public.studio_projects where id=p_project for update;
  if not found or p.status in ('completed','cancelled') then
    raise exception 'Choose an active project';
  end if;

  select dc.id into case_id
  from public.studio_discovery_cases dc
  where dc.lead_id=p.source_lead_id
  order by dc.created_at desc
  limit 1;

  if case_id is null then
    return jsonb_build_object('project_id',p_project,'domains_created',0,'tasks_created',0,'reason','No discovery case');
  end if;

  with source_rows as (
    select
      st.id,
      ats_team_private.classify_solution_task(st.title,st.rationale,st.expected_effect,pb.domain) as domain_key,
      st.title,st.expected_effect,st.acceptance_criteria,st.sort_order
    from public.studio_solution_tasks st
    left join public.studio_task_playbooks pb on pb.task_id=st.id
    where st.case_id=case_id and st.status in ('todo','in_progress')
  ),
  grouped as (
    select
      domain_key,
      array_agg(id order by sort_order,id) as source_ids,
      string_agg(distinct coalesce(nullif(trim(expected_effect),''),title), E'\n• ' order by coalesce(nullif(trim(expected_effect),''),title)) as outcome,
      string_agg(distinct coalesce(nullif(trim(acceptance_criteria),''),'Accepted task output with evidence'), E'\n• ' order by coalesce(nullif(trim(acceptance_criteria),''),'Accepted task output with evidence')) as criteria
    from source_rows
    group by domain_key
  )
  insert into public.studio_project_workstreams(
    project_id,name,domain_key,lead_skill,expected_outcome,acceptance_criteria,
    status,due_at,source_case_id,source_solution_task_ids,updated_at
  )
  select
    p_project,
    ats_team_private.domain_name(g.domain_key),
    g.domain_key,
    ats_team_private.domain_skill(g.domain_key),
    '• '||g.outcome,
    '• '||g.criteria,
    'planned',
    coalesce(p.due_date::timestamptz,now()+interval '20 days'),
    case_id,
    g.source_ids,
    now()
  from grouped g
  on conflict(project_id,name) do update set
    domain_key=excluded.domain_key,
    lead_skill=excluded.lead_skill,
    expected_outcome=excluded.expected_outcome,
    acceptance_criteria=excluded.acceptance_criteria,
    due_at=excluded.due_at,
    source_case_id=excluded.source_case_id,
    source_solution_task_ids=excluded.source_solution_task_ids,
    updated_at=now();

  get diagnostics domains_created = row_count;

  for w in
    select *
    from public.studio_project_workstreams
    where project_id=p_project and source_case_id=case_id
    order by name
  loop
    if w.lead_member_id is null then
      select m.id into candidate
      from public.studio_team_members m
      join public.studio_member_skills s on s.member_id=m.id and s.skill=w.lead_skill
      where m.active and m.available
      order by
        s.level desc,
        (select count(*) from public.studio_project_workstreams aw where aw.lead_member_id=m.id and aw.status in ('active','review','rework')) asc,
        (select count(*) from public.studio_project_tasks at where at.owner_id=m.id and at.status in ('assigned','in_progress','review')) asc,
        m.created_at asc
      limit 1;

      if candidate is not null then
        update public.studio_project_workstreams
        set lead_member_id=candidate,status='active',updated_at=now()
        where id=w.id;
      else
        unassigned := unassigned || jsonb_build_array(jsonb_build_object(
          'workstream_id',w.id,'name',w.name,'lead_skill',w.lead_skill
        ));
      end if;
    end if;

    tasks_created := tasks_created + ats_team_private.materialize_domain_tasks(w.id);
    candidate := null;
  end loop;

  insert into public.studio_activity(actor_type,entity_type,entity_id,action,metadata)
  values('admin','project',p_project,'delivery_system_built',
    jsonb_build_object('domains_created',domains_created,'tasks_created',tasks_created,'unassigned_domains',unassigned));

  return jsonb_build_object(
    'project_id',p_project,
    'domains_created',domains_created,
    'tasks_created',tasks_created,
    'unassigned_domains',unassigned
  );
end
$function$;

CREATE OR REPLACE FUNCTION ats_team_private.classify_solution_task(p_title text, p_rationale text, p_effect text, p_playbook_domain text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case
    when nullif(trim(coalesce(p_playbook_domain,'')),'') is not null then lower(trim(p_playbook_domain))
    when lower(coalesce(p_title,'')||' '||coalesce(p_rationale,'')||' '||coalesce(p_effect,'')) ~
         '(hse|safety|hazard|risk assessment|fire|excavat|hot work|confined|ppe|سلامة|خطر|مخاطر|حريق|حفريات)' then 'hse'
    when lower(coalesce(p_title,'')||' '||coalesce(p_rationale,'')||' '||coalesce(p_effect,'')) ~
         '(security|vulnerab|auth|login|otp|permission|access control|session|secret|أمان|دخول|صلاحيات)' then 'software_security'
    when lower(coalesce(p_title,'')||' '||coalesce(p_rationale,'')||' '||coalesce(p_effect,'')) ~
         '(story ai|\bai\b|automation|generative|llm|prompt|ذكاء اصطناعي|توليد)' then 'ai_systems'
    when lower(coalesce(p_title,'')||' '||coalesce(p_rationale,'')||' '||coalesce(p_effect,'')) ~
         '(social media|facebook|instagram|tiktok|community|سوشيال|فيسبوك|انستجرام)' then 'social_media'
    when lower(coalesce(p_title,'')||' '||coalesce(p_rationale,'')||' '||coalesce(p_effect,'')) ~
         '(marketing|campaign|ads|advertis|performance marketing|تسويق|حملة|إعلان|اعلان)' then 'marketing'
    when lower(coalesce(p_title,'')||' '||coalesce(p_rationale,'')||' '||coalesce(p_effect,'')) ~
         '(brand|branding|identity|logo|هوية|براند)' then 'brand'
    when lower(coalesce(p_title,'')||' '||coalesce(p_rationale,'')||' '||coalesce(p_effect,'')) ~
         '(content|copy|caption|script|storytelling|محتوى|كابشن|سيناريو)' then 'content'
    when lower(coalesce(p_title,'')||' '||coalesce(p_rationale,'')||' '||coalesce(p_effect,'')) ~
         '(performance|speed|lcp|inp|cls|load time|سرعة|أداء)' then 'web_performance'
    when lower(coalesce(p_title,'')||' '||coalesce(p_rationale,'')||' '||coalesce(p_effect,'')) ~
         '(journey|ux|user|customer|form|upload|website|app|mobile|flow|friction|واجهة|تجربة|مستخدم|رحلة)' then 'product_ux'
    else 'risk_management'
  end
$function$;

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
      'skill',skill,'level',coalesce(s.level,0),
      'active_load',(select count(*) from public.studio_project_tasks t where t.owner_id=m.id and t.status in ('assigned','in_progress','review')),
      'eligible',(m.active and m.available and m.id<>w.lead_member_id and coalesce(s.level,0)>0 and
        (select count(*) from public.studio_project_tasks t where t.owner_id=m.id and t.status in ('assigned','in_progress','review'))<m.capacity)
    ) order by
      (m.active and m.available and m.id<>w.lead_member_id and coalesce(s.level,0)>0) desc,
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
    if mid=t.reviewer_id then raise exception 'Domain Lead cannot review their own subtask'; end if;
    if not exists(select 1 from public.studio_member_skills s where s.member_id=mid and s.skill=t.required_skill and s.level>=t.required_level) then
      raise exception 'Required skill or level missing';
    end if;
    select count(*) into active_load from public.studio_project_tasks x where x.owner_id=mid and x.status in ('assigned','in_progress','review');
    if active_load>=m.capacity then raise exception 'Team member capacity reached'; end if;
    update public.studio_project_tasks set owner_id=mid,status='assigned',updated_at=now() where id=tid;
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

CREATE OR REPLACE FUNCTION ats_team_private.domain_name(p_domain text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case lower(coalesce(p_domain,''))
    when 'product_ux' then 'Product & UX'
    when 'accessibility' then 'Accessibility'
    when 'web_performance' then 'Web Performance'
    when 'software_security' then 'Software Security'
    when 'ai_systems' then 'AI & Automation'
    when 'content' then 'Content & Storytelling'
    when 'brand' then 'Brand & Creative'
    when 'marketing' then 'Marketing'
    when 'social_media' then 'Social Media'
    when 'hse' then 'HSE'
    when 'risk_management' then 'Risk & Project Control'
    else 'Delivery'
  end
$function$;

CREATE OR REPLACE FUNCTION ats_team_private.domain_skill(p_domain text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case lower(coalesce(p_domain,''))
    when 'product_ux' then 'digital systems'
    when 'accessibility' then 'web development'
    when 'web_performance' then 'web development'
    when 'software_security' then 'software development'
    when 'ai_systems' then 'ai / automation'
    when 'content' then 'content writing'
    when 'brand' then 'copywriting'
    when 'marketing' then 'performance marketing'
    when 'social_media' then 'social media'
    when 'hse' then 'safety & hse'
    when 'risk_management' then 'project management'
    else 'project management'
  end
$function$;

CREATE OR REPLACE FUNCTION ats_team_private.materialize_domain_tasks(p_workstream uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  w public.studio_project_workstreams%rowtype;
  st public.studio_solution_tasks%rowtype;
  created_count integer := 0;
  skill text;
begin
  select * into w from public.studio_project_workstreams where id=p_workstream for update;
  if not found or w.lead_member_id is null then return 0; end if;

  for st in
    select s.*
    from public.studio_solution_tasks s
    where s.id = any(w.source_solution_task_ids)
      and s.status in ('todo','in_progress')
    order by s.sort_order, s.created_at
  loop
    if exists(select 1 from public.studio_project_tasks t where t.source_solution_task_id=st.id) then
      continue;
    end if;
    skill := ats_team_private.task_skill(w.domain_key, coalesce(st.title,'')||' '||coalesce(st.rationale,'')||' '||coalesce(st.expected_effect,''));
    insert into public.studio_project_tasks(
      project_id,workstream_id,title,required_skill,required_level,
      expected_output,acceptance_criteria,reviewer_id,admin_acceptance,
      due_at,base_tokens,assignment_mode,escalate_hours,
      source_solution_task_id,created_by_member_id
    ) values (
      w.project_id,w.id,left(coalesce(nullif(trim(st.title),''),'Delivery task'),200),
      lower(trim(skill)),1,
      coalesce(nullif(trim(st.expected_effect),''),nullif(trim(st.rationale),''),st.title),
      coalesce(nullif(trim(st.acceptance_criteria),''),'The expected output is delivered with evidence and meets the Domain Lead review.'),
      w.lead_member_id,false,
      coalesce(w.due_at,now()+interval '14 days'),20,'direct',24,
      st.id,w.lead_member_id
    );
    created_count := created_count + 1;
  end loop;
  return created_count;
end
$function$;

CREATE OR REPLACE FUNCTION ats_team_private.task_skill(p_domain text, p_text text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case
    when lower(coalesce(p_text,'')) ~ '(research|audit|journey|friction|analysis|تحليل|مراجعة|اختبار)' then 'data / research'
    when lower(coalesce(p_text,'')) ~ '(code|develop|integration|api|database|auth|otp|story ai|ربط|برمجة|تطوير)' then 'software development'
    when lower(coalesce(p_text,'')) ~ '(copy|caption|script|content|كتابة|محتوى|كابشن|سيناريو)' then 'copywriting'
    when lower(coalesce(p_text,'')) ~ '(social|community|facebook|instagram|tiktok|سوشيال)' then 'social media'
    when lower(coalesce(p_text,'')) ~ '(campaign|ads|performance marketing|حملة|إعلان|اعلان)' then 'performance marketing'
    else ats_team_private.domain_skill(p_domain)
  end
$function$;

CREATE OR REPLACE FUNCTION public.studio_admin_build_delivery_system(p_project_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select ats_team_private.build_delivery_system(p_project_id) $function$;

CREATE OR REPLACE FUNCTION public.studio_domain_candidates(p_workstream_id uuid, p_required_skill text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select ats_team_private.domain_candidates(p_workstream_id,p_required_skill) $function$;

CREATE OR REPLACE FUNCTION public.studio_domain_command(p_action text, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select ats_team_private.domain_command(p_action,p_payload) $function$;


drop policy if exists streams_read on public.studio_project_workstreams;
create policy streams_read
on public.studio_project_workstreams
for select
to anon, authenticated
using (
  (select public.portfolio_device_is_trusted())
  or lead_member_id = (select ats_team_private.member_id())
  or exists (
    select 1 from public.studio_project_tasks t
    where t.workstream_id=studio_project_workstreams.id
      and ats_team_private.can_read_task(t.id)
  )
);
