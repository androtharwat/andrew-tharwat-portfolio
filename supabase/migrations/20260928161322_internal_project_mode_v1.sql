alter table public.studio_leads
  add column if not exists project_mode text not null default 'client';

alter table public.studio_projects
  add column if not exists project_mode text not null default 'client';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='studio_leads_project_mode_check'
      and conrelid='public.studio_leads'::regclass
  ) then
    alter table public.studio_leads
      add constraint studio_leads_project_mode_check
      check (project_mode in ('client','internal'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname='studio_projects_project_mode_check'
      and conrelid='public.studio_projects'::regclass
  ) then
    alter table public.studio_projects
      add constraint studio_projects_project_mode_check
      check (project_mode in ('client','internal'));
  end if;
end $$;

create or replace function public.studio_admin_convert_internal_lead(
  p_lead_id uuid,
  p_project_title text,
  p_due_date date default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_lead public.studio_leads%rowtype;
  v_blueprint public.studio_delivery_blueprints%rowtype;
  v_client_id uuid;
  v_project_id uuid;
  v_client_code text;
  v_project_code text;
begin
  if not coalesce(public.portfolio_device_is_trusted(),false) then
    raise exception 'Trusted device required' using errcode='42501';
  end if;

  select * into v_lead
  from public.studio_leads
  where id=p_lead_id
  for update;

  if not found then
    raise exception 'Lead not found' using errcode='P0002';
  end if;

  if coalesce(v_lead.project_mode,'client') <> 'internal' then
    raise exception 'Lead is not marked as an internal ATS project' using errcode='22023';
  end if;

  select id,project_code into v_project_id,v_project_code
  from public.studio_projects
  where source_lead_id=p_lead_id
  order by created_at asc
  limit 1;

  if v_project_id is not null then
    return jsonb_build_object(
      'project_id',v_project_id,
      'project_code',v_project_code,
      'already_converted',true
    );
  end if;

  select b.* into v_blueprint
  from public.studio_delivery_blueprints b
  join public.studio_discovery_cases d on d.id=b.case_id
  where d.lead_id=p_lead_id
  order by b.updated_at desc
  limit 1;

  if not found or v_blueprint.status not in ('approved','activated') then
    raise exception 'Admin must confirm the Delivery Blueprint before internal project activation' using errcode='22023';
  end if;

  if v_lead.existing_client_id is not null then
    v_client_id:=v_lead.existing_client_id;
  else
    select c.id into v_client_id
    from public.studio_clients c
    where lower(c.email)=lower(v_lead.email)
    order by c.created_at asc
    limit 1;

    if v_client_id is null then
      insert into public.studio_clients(source_lead_id,full_name,email,phone,status)
      values (
        v_lead.id,
        coalesce(nullif(btrim(v_lead.full_name),''),'ATS Internal'),
        v_lead.email,
        v_lead.phone,
        'active'
      )
      returning id,client_code into v_client_id,v_client_code;
    end if;
  end if;

  if v_client_code is null then
    select client_code into v_client_code
    from public.studio_clients
    where id=v_client_id;
  end if;

  insert into public.studio_projects(
    client_id,source_lead_id,source_proposal_id,title,service_type,description,
    status,stage,health,progress,client_action,internal_action,due_date,
    project_value,currency,included_revisions,project_mode
  ) values (
    v_client_id,
    v_lead.id,
    null,
    coalesce(nullif(btrim(p_project_title),''),nullif(btrim(v_lead.company_name),''),v_lead.full_name||' · Internal ATS Project'),
    v_lead.service,
    v_lead.project_goal,
    'active',
    'Onboarding',
    'On Track',
    10,
    'No client action required · internal ATS project',
    'Build delivery system and assign accountable Domain Leads',
    p_due_date,
    0,
    'EGP',
    0,
    'internal'
  )
  returning id,project_code into v_project_id,v_project_code;

  update public.studio_leads
  set status='won',
      existing_client_id=v_client_id,
      next_action='Start project delivery',
      next_action_due_at=null,
      updated_at=now()
  where id=p_lead_id;

  insert into public.studio_project_stages(project_id,stage_key,stage_name,status,position,started_at)
  select v_project_id,s.key,s.name,
         case when s.pos=1 then 'active' else 'pending' end,
         s.pos,
         case when s.pos=1 then now() else null end
  from (values
    ('onboarding','Onboarding',1),
    ('content','Content Preparation',2),
    ('design','Design',3),
    ('development','Development',4),
    ('qa','Internal QA',5),
    ('client_review','Client Review',6),
    ('revisions','Revisions',7),
    ('final_approval','Final Approval',8),
    ('final_payment','Final Payment',9),
    ('deployment','Deployment',10),
    ('completed','Completed',11)
  ) as s(key,name,pos);

  insert into public.studio_activity(actor_type,entity_type,entity_id,action,metadata)
  values (
    'admin','project',v_project_id,'internal_project_activated',
    jsonb_build_object('lead_id',p_lead_id,'client_id',v_client_id,'blueprint_id',v_blueprint.id)
  );

  return jsonb_build_object(
    'client_id',v_client_id,
    'client_code',v_client_code,
    'project_id',v_project_id,
    'project_code',v_project_code,
    'already_converted',false,
    'project_mode','internal'
  );
end;
$function$;

revoke execute on function public.studio_admin_convert_internal_lead(uuid,text,date) from public;
revoke execute on function public.studio_admin_convert_internal_lead(uuid,text,date) from anon;
grant execute on function public.studio_admin_convert_internal_lead(uuid,text,date) to authenticated;
