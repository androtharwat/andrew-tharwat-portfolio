-- Fix PL/pgSQL ambiguity between local case id variables and table columns.

CREATE OR REPLACE FUNCTION ats_team_private.build_delivery_system(p_project uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  p public.studio_projects%rowtype;
  v_case_id uuid;
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

  select dc.id into v_case_id
  from public.studio_discovery_cases dc
  where dc.lead_id=p.source_lead_id
  order by dc.created_at desc
  limit 1;

  if v_case_id is null then
    return jsonb_build_object('project_id',p_project,'domains_created',0,'tasks_created',0,'reason','No discovery case');
  end if;

  select * into bp
  from public.studio_delivery_blueprints b
  where b.case_id=v_case_id
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
        v_case_id,'{}'::uuid[],now()
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
        where st.case_id=v_case_id and st.status in ('todo','in_progress')
      ),
      grouped as (
        select
          domain_key,
          array_agg(id order by sort_order,id) as source_ids,
          string_agg(distinct coalesce(nullif(trim(expected_effect),''),title), E'\\n• '
            order by coalesce(nullif(trim(expected_effect),''),title)) as outcome,
          string_agg(distinct coalesce(nullif(trim(acceptance_criteria),''),'Accepted task output with evidence'), E'\\n• '
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
        v_case_id,
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

CREATE OR REPLACE FUNCTION public.studio_admin_build_delivery_system(p_project_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  p public.studio_projects%rowtype;
  v_case_id uuid;
  bp public.studio_delivery_blueprints%rowtype;
  result jsonb;
  dep_count integer := 0;
begin
  if not coalesce(public.portfolio_device_is_trusted(),false) then
    raise exception 'Trusted device required' using errcode='42501';
  end if;

  select * into p
  from public.studio_projects
  where id=p_project_id;

  if not found or p.status in ('completed','cancelled') then
    raise exception 'Choose an active project';
  end if;

  select dc.id into v_case_id
  from public.studio_discovery_cases dc
  where dc.lead_id=p.source_lead_id
  order by dc.created_at desc
  limit 1;

  if v_case_id is null then
    raise exception 'Project has no approved ATS discovery case';
  end if;

  select * into bp
  from public.studio_delivery_blueprints b
  where b.case_id=v_case_id
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
