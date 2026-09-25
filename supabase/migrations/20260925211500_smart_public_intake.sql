-- ATS Smart Public Intake
-- Structures Discovery before the request reaches Admin and issues a short-lived
-- upload grant so evidence files can be attached/analyzed in the same order flow.

create table if not exists public.studio_public_upload_grants (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.studio_leads(id) on delete cascade,
  token_hash text not null unique,
  status text not null default 'active'
    check (status = any(array['active'::text,'revoked'::text,'expired'::text])),
  max_files integer not null default 10 check (max_files between 1 and 20),
  files_used integer not null default 0 check (files_used >= 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists studio_public_upload_grants_lead_idx
  on public.studio_public_upload_grants(lead_id,created_at desc);

alter table public.studio_public_upload_grants enable row level security;
revoke all on table public.studio_public_upload_grants from anon,authenticated;
grant select,insert,update,delete on table public.studio_public_upload_grants to service_role;

create table if not exists public.studio_public_intake_rate (
  fingerprint text primary key,
  window_start timestamptz not null default now(),
  request_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.studio_public_intake_rate enable row level security;
revoke all on table public.studio_public_intake_rate from anon,authenticated;
grant select,insert,update,delete on table public.studio_public_intake_rate to service_role;

create or replace function public.studio_submit_public_lead_v2(
  p_full_name text,
  p_email text,
  p_phone text default null,
  p_company_name text default null,
  p_service text default 'General / Multidisciplinary',
  p_project_goal text default '',
  p_timeline text default null,
  p_budget_range text default null,
  p_source_path text default null,
  p_discovery jsonb default '{}'::jsonb
)
returns table(
  lead_code text,
  created_at timestamptz,
  upload_token text,
  readiness_score integer
)
language plpgsql
security definer
set search_path=pg_catalog,public,extensions
as $$
declare
  v_lead public.studio_leads%rowtype;
  v_case public.studio_discovery_cases%rowtype;
  v_token text;
  v_snapshot jsonb := coalesce(p_discovery,'{}'::jsonb);
  v_current_state text;
  v_impact text;
  v_affected_people text;
  v_desired_outcome text;
  v_evidence text;
  v_prior_attempts text;
  v_process_point text;
  v_constraints text;
begin
  p_full_name := nullif(btrim(coalesce(p_full_name,'')), '');
  p_email := lower(nullif(btrim(coalesce(p_email,'')), ''));
  p_phone := nullif(btrim(coalesce(p_phone,'')), '');
  p_company_name := nullif(btrim(coalesce(p_company_name,'')), '');
  p_service := coalesce(nullif(btrim(coalesce(p_service,'')), ''), 'General / Multidisciplinary');
  p_project_goal := nullif(btrim(coalesce(p_project_goal,'')), '');
  p_timeline := nullif(btrim(coalesce(p_timeline,'')), '');
  p_budget_range := nullif(btrim(coalesce(p_budget_range,'')), '');
  p_source_path := left(nullif(btrim(coalesce(p_source_path,'')), ''), 500);

  if p_full_name is null or length(p_full_name) > 160 then raise exception 'A valid name is required'; end if;
  if p_email is null or p_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' or length(p_email) > 254 then
    raise exception 'A valid email is required';
  end if;
  if p_project_goal is null or length(p_project_goal) > 8000 then raise exception 'Project details are required'; end if;
  if p_phone is not null and length(p_phone) > 80 then raise exception 'Phone number is too long'; end if;
  if p_company_name is not null and length(p_company_name) > 200 then raise exception 'Company name is too long'; end if;

  v_current_state := left(nullif(btrim(coalesce(v_snapshot->>'current_state','')), ''),5000);
  v_impact := left(nullif(btrim(coalesce(v_snapshot->>'impact','')), ''),5000);
  v_affected_people := left(nullif(btrim(coalesce(v_snapshot->>'affected_people','')), ''),5000);
  v_desired_outcome := left(nullif(btrim(coalesce(v_snapshot->>'desired_outcome','')), ''),5000);
  v_evidence := left(nullif(btrim(coalesce(v_snapshot->>'evidence','')), ''),5000);
  v_prior_attempts := left(nullif(btrim(coalesce(v_snapshot->>'prior_attempts','')), ''),5000);
  v_process_point := left(nullif(btrim(coalesce(v_snapshot->>'process_point','')), ''),5000);
  v_constraints := left(nullif(btrim(coalesce(v_snapshot->>'constraints','')), ''),5000);

  insert into public.studio_leads(
    full_name,email,phone,company_name,service,project_goal,current_assets,
    timeline,budget_range,source,source_path,status
  ) values (
    p_full_name,p_email,p_phone,p_company_name,p_service,p_project_goal,'{}'::text[],
    p_timeline,p_budget_range,'website_v9',p_source_path,'new'
  ) returning * into v_lead;

  select * into v_case
  from public.studio_discovery_cases
  where lead_id=v_lead.id
  for update;

  if not found then
    insert into public.studio_discovery_cases(
      lead_id,phase,source_snapshot,current_state,impact,affected_people,desired_outcome,
      evidence,prior_attempts,process_point,constraints,analysis_state
    ) values (
      v_lead.id,'discovery',
      jsonb_build_object(
        'lead_code',v_lead.lead_code,'service',v_lead.service,'project_goal',v_lead.project_goal,
        'timeline',v_lead.timeline,'budget_range',v_lead.budget_range,'source',v_lead.source,
        'source_path',v_lead.source_path,'smart_intake',v_snapshot
      ),
      v_current_state,v_impact,v_affected_people,v_desired_outcome,
      v_evidence,v_prior_attempts,v_process_point,v_constraints,'stale'
    ) returning * into v_case;
  else
    update public.studio_discovery_cases
    set
      source_snapshot=coalesce(source_snapshot,'{}'::jsonb)||jsonb_build_object('smart_intake',v_snapshot),
      current_state=coalesce(v_current_state,current_state),
      impact=coalesce(v_impact,impact),
      affected_people=coalesce(v_affected_people,affected_people),
      desired_outcome=coalesce(v_desired_outcome,desired_outcome),
      evidence=coalesce(v_evidence,evidence),
      prior_attempts=coalesce(v_prior_attempts,prior_attempts),
      process_point=coalesce(v_process_point,process_point),
      constraints=coalesce(v_constraints,constraints),
      phase='discovery',
      analysis_state='stale'
    where id=v_case.id
    returning * into v_case;
  end if;

  insert into public.studio_discovery_answers(
    case_id,question_key,answer,actor_type,source_channel,is_read_by_admin
  )
  select v_case.id,x.question_key,x.answer,'prospect','intake',true
  from (
    values
      ('current_state'::text,v_current_state),
      ('impact'::text,v_impact),
      ('affected_people'::text,v_affected_people),
      ('desired_outcome'::text,v_desired_outcome),
      ('evidence'::text,v_evidence),
      ('prior_attempts'::text,v_prior_attempts),
      ('process_point'::text,v_process_point),
      ('constraints'::text,v_constraints)
  ) as x(question_key,answer)
  where x.answer is not null;

  insert into public.studio_activity(actor_type,entity_type,entity_id,action,metadata)
  values(
    'system','lead',v_lead.id,'lead_created_from_v9',
    jsonb_build_object(
      'source','public_v9_smart_intake',
      'source_path',p_source_path,
      'readiness_score',v_case.readiness_score
    )
  );

  v_token := encode(extensions.gen_random_bytes(32),'hex');

  insert into public.studio_public_upload_grants(
    lead_id,token_hash,status,max_files,files_used,expires_at
  ) values (
    v_lead.id,
    encode(extensions.digest(v_token,'sha256'),'hex'),
    'active',10,0,now()+interval '30 minutes'
  );

  return query select v_lead.lead_code,v_lead.created_at,v_token,v_case.readiness_score;
end;
$$;

revoke all on function public.studio_submit_public_lead_v2(text,text,text,text,text,text,text,text,text,jsonb) from public;
grant execute on function public.studio_submit_public_lead_v2(text,text,text,text,text,text,text,text,text,jsonb) to anon,authenticated;
