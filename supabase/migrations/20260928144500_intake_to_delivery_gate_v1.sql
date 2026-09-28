-- ATS Intake → Delivery Gate V1
-- Keeps discovery between Client + Admin, requires Admin scope approval before team activation,
-- and preserves blueprint dependencies when delivery tasks are materialized.

create or replace function ats_team_private.sync_blueprint_dependencies(p_project uuid)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  bp jsonb;
  d jsonb;
  item jsonb;
  dep_key text;
  task_key text;
  task_id uuid;
  dep_id uuid;
  inserted_count integer := 0;
  n integer := 0;
begin
  select b.blueprint into bp
  from public.studio_delivery_blueprints b
  where b.project_id=p_project
    and b.status in ('approved','activated')
    and jsonb_typeof(b.blueprint->'domains')='array'
  order by b.updated_at desc
  limit 1;

  if bp is null then return 0; end if;

  for d in select value from jsonb_array_elements(bp->'domains')
  loop
    if jsonb_typeof(d->'tasks') <> 'array' then continue; end if;
    for item in select value from jsonb_array_elements(d->'tasks')
    loop
      task_key:=coalesce(d->>'domain_key','delivery')||':'||coalesce(item->>'key','');
      select t.id into task_id
      from public.studio_project_tasks t
      where t.project_id=p_project and t.source_blueprint_task_key=task_key
      limit 1;
      if task_id is null or jsonb_typeof(item->'depends_on') <> 'array' then continue; end if;

      for dep_key in select value from jsonb_array_elements_text(item->'depends_on')
      loop
        dep_id:=null;
        select t.id into dep_id
        from public.studio_project_tasks t
        where t.project_id=p_project
          and t.source_blueprint_task_key like '%:'||dep_key
        limit 1;
        if dep_id is null or dep_id=task_id then continue; end if;

        insert into public.studio_task_dependencies(task_id,depends_on)
        values(task_id,dep_id)
        on conflict do nothing;
        get diagnostics n = row_count;
        inserted_count:=inserted_count+n;
      end loop;
    end loop;
  end loop;

  return inserted_count;
end
$function$;

create or replace function public.studio_admin_build_delivery_system(p_project_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  p public.studio_projects%rowtype;
  case_id uuid;
  bp public.studio_delivery_blueprints%rowtype;
  result jsonb;
  dep_count integer := 0;
begin
  if not coalesce(public.portfolio_device_is_trusted(),false) then
    raise exception 'Trusted device required' using errcode='42501';
  end if;

  select * into p from public.studio_projects where id=p_project_id;
  if not found or p.status in ('completed','cancelled') then
    raise exception 'Choose an active project';
  end if;

  select dc.id into case_id
  from public.studio_discovery_cases dc
  where dc.lead_id=p.source_lead_id
  order by dc.created_at desc
  limit 1;

  if case_id is null then
    raise exception 'Project has no approved ATS discovery case';
  end if;

  select * into bp
  from public.studio_delivery_blueprints b
  where b.case_id=case_id
  order by b.updated_at desc
  limit 1;

  if not found or bp.status not in ('approved','activated') then
    raise exception 'Admin must confirm the Delivery Blueprint before team activation';
  end if;

  result:=ats_team_private.build_delivery_system(p_project_id);
  dep_count:=ats_team_private.sync_blueprint_dependencies(p_project_id);

  return coalesce(result,'{}'::jsonb)||jsonb_build_object('dependencies_created',dep_count);
end
$function$;

create or replace function public.studio_admin_assign_domain_lead(
  p_workstream_id uuid,
  p_member_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  w public.studio_project_workstreams%rowtype;
  m public.studio_team_members%rowtype;
  domain_json jsonb;
  created integer := 0;
  deps integer := 0;
  note text:=trim(coalesce(p_reason,''));
begin
  if not coalesce(public.portfolio_device_is_trusted(),false) then
    raise exception 'Trusted device required' using errcode='42501';
  end if;

  perform pg_advisory_xact_lock(724901,3);

  select * into w
  from public.studio_project_workstreams
  where id=p_workstream_id
  for update;
  if not found then raise exception 'Domain unavailable'; end if;

  select * into m
  from public.studio_team_members
  where id=p_member_id and active
  for update;
  if not found or not m.available then
    raise exception 'Choose an active available Domain Lead';
  end if;

  if not exists(
    select 1 from public.studio_member_skills s
    where s.member_id=p_member_id
      and s.skill=lower(trim(w.lead_skill))
      and s.level>=1
  ) then
    raise exception 'Selected member does not have the required Domain Lead skill';
  end if;

  if w.lead_member_id is not null
     and w.lead_member_id<>p_member_id
     and exists(
       select 1 from public.studio_project_tasks t
       where t.workstream_id=w.id and t.status in ('assigned','in_progress','review')
     )
     and note='' then
    raise exception 'Changing an active Domain Lead requires a reason';
  end if;

  update public.studio_project_workstreams
  set lead_member_id=p_member_id,
      status=case when status='planned' then 'active' else status end,
      updated_at=now()
  where id=w.id
  returning * into w;

  update public.studio_project_tasks
  set reviewer_id=p_member_id,updated_at=now()
  where workstream_id=w.id and status='available';

  select d.value into domain_json
  from public.studio_delivery_blueprints b
  cross join lateral jsonb_array_elements(b.blueprint->'domains') d(value)
  where b.project_id=w.project_id
    and b.status in ('approved','activated')
    and d.value->>'domain_key'=w.domain_key
  order by b.updated_at desc
  limit 1;

  if domain_json is not null then
    created:=ats_team_private.materialize_blueprint_tasks(w.id,domain_json);
  else
    created:=ats_team_private.materialize_domain_tasks(w.id);
  end if;

  deps:=ats_team_private.sync_blueprint_dependencies(w.project_id);

  insert into public.studio_activity(actor_type,entity_type,entity_id,action,metadata)
  values('admin','workstream',w.id,'domain_lead_assigned',
    jsonb_build_object(
      'member_id',p_member_id,
      'reason',nullif(note,''),
      'tasks_created',created,
      'dependencies_created',deps
    ));

  return jsonb_build_object(
    'workstream_id',w.id,
    'lead_member_id',p_member_id,
    'tasks_created',created,
    'dependencies_created',deps
  );
end
$function$;

grant execute on function public.studio_admin_build_delivery_system(uuid) to anon,authenticated;
grant execute on function public.studio_admin_assign_domain_lead(uuid,uuid,text) to anon,authenticated;
