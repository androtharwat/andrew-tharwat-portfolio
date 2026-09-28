create table if not exists public.studio_delivery_blueprints (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references public.studio_discovery_cases(id) on delete cascade,
  lead_id uuid not null references public.studio_leads(id) on delete cascade,
  project_id uuid null references public.studio_projects(id) on delete set null,
  status text not null default 'ready' check (status in ('draft','ready','needs_evidence','approved','activated')),
  blueprint jsonb not null default '{"domains":[]}'::jsonb,
  source_snapshot jsonb not null default '{}'::jsonb,
  model text null,
  generation_notes text null,
  generated_at timestamptz not null default now(),
  approved_at timestamptz null,
  activated_at timestamptz null,
  updated_at timestamptz not null default now()
);

alter table public.studio_delivery_blueprints enable row level security;
grant select,insert,update,delete on public.studio_delivery_blueprints to anon,authenticated,service_role;

drop policy if exists studio_delivery_blueprints_trusted_all on public.studio_delivery_blueprints;
create policy studio_delivery_blueprints_trusted_all
on public.studio_delivery_blueprints
for all to anon,authenticated
using (portfolio_device_is_trusted())
with check (portfolio_device_is_trusted());

create index if not exists studio_delivery_blueprints_lead_idx
  on public.studio_delivery_blueprints(lead_id,status);
create index if not exists studio_delivery_blueprints_project_idx
  on public.studio_delivery_blueprints(project_id);

alter table public.studio_project_tasks
  add column if not exists source_blueprint_task_key text null;

create unique index if not exists studio_project_tasks_blueprint_unique
  on public.studio_project_tasks(project_id,source_blueprint_task_key)
  where source_blueprint_task_key is not null;


-- Blueprint activation and one-click domain distribution
CREATE OR REPLACE FUNCTION ats_team_private.auto_distribute_domain(p_workstream uuid)
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
  candidate uuid;
  assigned_count integer := 0;
  skipped jsonb := '[]'::jsonb;
begin
  perform pg_advisory_xact_lock(724901,3);
  select * into w from public.studio_project_workstreams where id=p_workstream for update;
  if not found then raise exception 'Domain unavailable'; end if;
  if not admin and (me is null or w.lead_member_id is distinct from me) then
    raise exception 'Domain Lead access required' using errcode='42501';
  end if;
  if w.lead_member_id is null then raise exception 'Assign a Domain Lead first'; end if;

  for t in
    select * from public.studio_project_tasks
    where workstream_id=w.id and status='available'
    order by due_at nulls last, created_at
    for update
  loop
    select m.id into candidate
    from public.studio_team_members m
    join public.studio_member_skills s
      on s.member_id=m.id
     and s.skill=t.required_skill
     and s.level>=t.required_level
    where m.active
      and m.available
      and m.id<>w.lead_member_id
      and (
        select count(*) from public.studio_project_tasks x
        where x.owner_id=m.id and x.status in ('assigned','in_progress','review')
      ) < m.capacity
    order by
      s.level desc,
      (
        select count(*) from public.studio_project_tasks x
        where x.owner_id=m.id and x.status in ('assigned','in_progress','review')
      ) asc,
      m.created_at asc
    limit 1;

    if candidate is null then
      skipped := skipped || jsonb_build_array(jsonb_build_object(
        'task_id',t.id,
        'title',t.title,
        'required_skill',t.required_skill,
        'reason','No eligible available member within capacity'
      ));
      continue;
    end if;

    update public.studio_project_tasks
    set owner_id=candidate,status='assigned',updated_at=now()
    where id=t.id and status='available';

    insert into public.studio_token_ledger(
      task_id,project_id,member_id,event_type,tokens,reason,actor_user_id,actor_device_id
    ) values (
      t.id,t.project_id,candidate,'RESERVED',t.base_tokens,
      'Auto-distributed by Domain Lead rules',uid,device
    );

    insert into public.studio_task_events(
      task_id,member_id,actor_user_id,actor_device_id,action,details
    ) values (
      t.id,candidate,uid,device,'domain_auto_assign',
      jsonb_build_object('workstream_id',w.id,'required_skill',t.required_skill)
    );

    assigned_count:=assigned_count+1;
    candidate:=null;
  end loop;

  insert into public.studio_activity(
    actor_user_id,actor_type,entity_type,entity_id,action,metadata
  ) values (
    uid,case when admin then 'admin' else 'member' end,
    'workstream',w.id,'domain_auto_distributed',
    jsonb_build_object('assigned',assigned_count,'skipped',skipped,'lead_member_id',w.lead_member_id)
  );

  return jsonb_build_object(
    'workstream_id',w.id,
    'assigned',assigned_count,
    'skipped',skipped
  );
end
$function$;

CREATE OR REPLACE FUNCTION ats_team_private.build_delivery_system(p_project uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  p public.studio_projects%rowtype;
  case_id uuid;
  bp public.studio_delivery_blueprints%rowtype;
  domain_json jsonb;
  w public.studio_project_workstreams%rowtype;
  candidate uuid;
  dkey text;
  dname text;
  dskill text;
  domains_created integer := 0;
  tasks_created integer := 0;
  unassigned jsonb := '[]'::jsonb;
begin
  if not coalesce(public.portfolio_device_is_trusted(),false) then
    raise exception 'Trusted device required' using errcode='42501';
  end if;

  select * into p
  from public.studio_projects
  where id=p_project
  for update;

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

  select * into bp
  from public.studio_delivery_blueprints b
  where b.case_id=case_id
    and b.status in ('ready','approved','activated')
    and jsonb_typeof(b.blueprint->'domains')='array'
    and jsonb_array_length(b.blueprint->'domains')>0
  order by b.updated_at desc
  limit 1;

  if found then
    for domain_json in
      select value from jsonb_array_elements(bp.blueprint->'domains')
    loop
      dkey:=lower(trim(coalesce(domain_json->>'domain_key','risk_management')));
      dname:=coalesce(nullif(trim(domain_json->>'name'),''),ats_team_private.domain_name(dkey));
      dskill:=coalesce(nullif(lower(trim(domain_json->>'lead_skill')),''),ats_team_private.domain_skill(dkey));

      insert into public.studio_project_workstreams(
        project_id,name,domain_key,lead_skill,expected_outcome,acceptance_criteria,
        status,due_at,source_case_id,source_solution_task_ids,updated_at
      ) values (
        p_project,dname,dkey,dskill,
        coalesce(nullif(trim(domain_json->>'expected_outcome'),''),'Deliver the required domain outcome.'),
        coalesce(nullif(trim(domain_json->>'acceptance_criteria'),''),'Outcome is complete, evidenced, and ready for Admin acceptance.'),
        'planned',
        coalesce(p.due_date::timestamptz,now()+interval '20 days'),
        case_id,'{}'::uuid[],now()
      )
      on conflict(project_id,name) do update set
        domain_key=excluded.domain_key,
        lead_skill=excluded.lead_skill,
        expected_outcome=excluded.expected_outcome,
        acceptance_criteria=excluded.acceptance_criteria,
        due_at=excluded.due_at,
        source_case_id=excluded.source_case_id,
        updated_at=now()
      returning * into w;

      domains_created:=domains_created+1;

      if w.lead_member_id is null then
        select m.id into candidate
        from public.studio_team_members m
        join public.studio_member_skills s
          on s.member_id=m.id and s.skill=w.lead_skill
        where m.active and m.available
        order by
          s.level desc,
          (select count(*) from public.studio_project_workstreams aw
            where aw.lead_member_id=m.id and aw.status in ('active','review','rework')) asc,
          (select count(*) from public.studio_project_tasks at
            where at.owner_id=m.id and at.status in ('assigned','in_progress','review')) asc,
          m.created_at asc
        limit 1;

        if candidate is not null then
          update public.studio_project_workstreams
          set lead_member_id=candidate,status='active',updated_at=now()
          where id=w.id
          returning * into w;
        else
          unassigned:=unassigned||jsonb_build_array(jsonb_build_object(
            'workstream_id',w.id,'name',w.name,'lead_skill',w.lead_skill
          ));
        end if;
      end if;

      tasks_created:=tasks_created+ats_team_private.materialize_blueprint_tasks(w.id,domain_json);
      candidate:=null;
    end loop;

    update public.studio_delivery_blueprints
    set project_id=p_project,status='activated',activated_at=coalesce(activated_at,now()),updated_at=now()
    where id=bp.id;
  else
    for w in
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
          string_agg(distinct coalesce(nullif(trim(expected_effect),''),title), E'\n• '
            order by coalesce(nullif(trim(expected_effect),''),title)) as outcome,
          string_agg(distinct coalesce(nullif(trim(acceptance_criteria),''),'Accepted task output with evidence'), E'\n• '
            order by coalesce(nullif(trim(acceptance_criteria),''),'Accepted task output with evidence')) as criteria
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
        updated_at=now()
      returning *
    loop
      domains_created:=domains_created+1;

      if w.lead_member_id is null then
        select m.id into candidate
        from public.studio_team_members m
        join public.studio_member_skills s on s.member_id=m.id and s.skill=w.lead_skill
        where m.active and m.available
        order by s.level desc,
          (select count(*) from public.studio_project_workstreams aw where aw.lead_member_id=m.id and aw.status in ('active','review','rework')) asc,
          (select count(*) from public.studio_project_tasks at where at.owner_id=m.id and at.status in ('assigned','in_progress','review')) asc,
          m.created_at asc
        limit 1;

        if candidate is not null then
          update public.studio_project_workstreams
          set lead_member_id=candidate,status='active',updated_at=now()
          where id=w.id
          returning * into w;
        else
          unassigned:=unassigned||jsonb_build_array(jsonb_build_object(
            'workstream_id',w.id,'name',w.name,'lead_skill',w.lead_skill
          ));
        end if;
      end if;

      tasks_created:=tasks_created+ats_team_private.materialize_domain_tasks(w.id);
      candidate:=null;
    end loop;
  end if;

  insert into public.studio_activity(actor_type,entity_type,entity_id,action,metadata)
  values('admin','project',p_project,'delivery_system_built',
    jsonb_build_object(
      'domains_created',domains_created,
      'tasks_created',tasks_created,
      'unassigned_domains',unassigned,
      'blueprint_id',case when bp.id is null then null else bp.id end
    ));

  return jsonb_build_object(
    'project_id',p_project,
    'domains_created',domains_created,
    'tasks_created',tasks_created,
    'unassigned_domains',unassigned,
    'blueprint_id',case when bp.id is null then null else bp.id end
  );
end
$function$;

CREATE OR REPLACE FUNCTION ats_team_private.materialize_blueprint_tasks(p_workstream uuid, p_domain jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  w public.studio_project_workstreams%rowtype;
  item jsonb;
  task_key text;
  skill text;
  due_days integer;
  task_due timestamptz;
  created_count integer := 0;
begin
  select * into w
  from public.studio_project_workstreams
  where id=p_workstream
  for update;

  if not found or w.lead_member_id is null then return 0; end if;
  if jsonb_typeof(p_domain->'tasks') <> 'array' then return 0; end if;

  for item in select value from jsonb_array_elements(p_domain->'tasks')
  loop
    task_key := coalesce(nullif(trim(item->>'key'),''),md5(coalesce(item->>'title','')||coalesce(item->>'expected_output','')));
    task_key := coalesce(w.domain_key,'delivery')||':'||task_key;

    if exists(
      select 1 from public.studio_project_tasks t
      where t.project_id=w.project_id and t.source_blueprint_task_key=task_key
    ) then
      continue;
    end if;

    skill := lower(trim(coalesce(nullif(item->>'required_skill',''),w.lead_skill,'project management')));
    due_days := greatest(1,least(45,coalesce((item->>'due_offset_days')::integer,7)));
    task_due := now() + make_interval(days=>due_days);
    if w.due_at is not null and task_due>w.due_at then task_due:=w.due_at; end if;

    insert into public.studio_project_tasks(
      project_id,workstream_id,title,required_skill,required_level,
      expected_output,acceptance_criteria,reviewer_id,admin_acceptance,
      due_at,base_tokens,assignment_mode,escalate_hours,
      source_blueprint_task_key,created_by_member_id
    ) values (
      w.project_id,w.id,left(coalesce(nullif(trim(item->>'title'),''),'Delivery task'),200),
      skill,1,
      coalesce(nullif(trim(item->>'expected_output'),''),nullif(trim(item->>'title'),''),'Deliver the required output.'),
      coalesce(nullif(trim(item->>'acceptance_criteria'),''),'The output is evidenced and passes Domain Lead review.'),
      w.lead_member_id,false,
      task_due,20,'direct',24,
      task_key,w.lead_member_id
    );
    created_count:=created_count+1;
  end loop;
  return created_count;
end
$function$;

CREATE OR REPLACE FUNCTION public.studio_domain_auto_distribute(p_workstream_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$ select ats_team_private.auto_distribute_domain(p_workstream_id) $function$;
