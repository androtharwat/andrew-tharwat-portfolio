-- ATS Diagnostic Decision Engine
-- Evidence -> adaptive diagnosis -> causal hypotheses -> proposed tasks -> validation -> verification

create table if not exists public.studio_diagnostic_runs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.studio_discovery_cases(id) on delete cascade,
  trigger_source text not null default 'admin'
    check (trigger_source = any(array['admin'::text,'client_answer'::text,'system'::text])),
  status text not null default 'running'
    check (status = any(array['running'::text,'completed'::text,'failed'::text,'cached'::text])),
  input_hash text not null,
  model text,
  input_snapshot jsonb not null default '{}'::jsonb,
  analysis jsonb,
  error_text text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists studio_diagnostic_runs_case_created_idx
  on public.studio_diagnostic_runs(case_id,created_at desc);
create index if not exists studio_diagnostic_runs_hash_idx
  on public.studio_diagnostic_runs(case_id,input_hash,status);

alter table public.studio_diagnostic_runs enable row level security;
grant select,insert,update,delete on public.studio_diagnostic_runs to anon,authenticated;

drop policy if exists studio_diagnostic_runs_trusted_device_all on public.studio_diagnostic_runs;
create policy studio_diagnostic_runs_trusted_device_all
on public.studio_diagnostic_runs for all to anon,authenticated
using (public.portfolio_device_is_trusted())
with check (public.portfolio_device_is_trusted());

alter table public.studio_discovery_cases
  add column if not exists analysis_state text not null default 'never_analyzed',
  add column if not exists decision_stage text not null default 'needs_evidence',
  add column if not exists system_problem_statement text,
  add column if not exists system_diagnosis_summary text,
  add column if not exists system_confidence integer not null default 0,
  add column if not exists system_next_action text,
  add column if not exists system_next_question jsonb,
  add column if not exists last_analyzed_at timestamptz,
  add column if not exists last_diagnostic_run_id uuid;

alter table public.studio_discovery_cases drop constraint if exists studio_discovery_cases_analysis_state_check;
alter table public.studio_discovery_cases add constraint studio_discovery_cases_analysis_state_check
check (analysis_state = any(array['never_analyzed'::text,'stale'::text,'analyzing'::text,'ready'::text,'error'::text]));

alter table public.studio_discovery_cases drop constraint if exists studio_discovery_cases_decision_stage_check;
alter table public.studio_discovery_cases add constraint studio_discovery_cases_decision_stage_check
check (decision_stage = any(array['needs_evidence'::text,'needs_validation'::text,'solution_ready'::text,'execution'::text]));

alter table public.studio_discovery_cases drop constraint if exists studio_discovery_cases_system_confidence_check;
alter table public.studio_discovery_cases add constraint studio_discovery_cases_system_confidence_check
check (system_confidence between 0 and 100);

alter table public.studio_discovery_cases drop constraint if exists studio_discovery_cases_last_run_fkey;
alter table public.studio_discovery_cases add constraint studio_discovery_cases_last_run_fkey
foreign key (last_diagnostic_run_id) references public.studio_diagnostic_runs(id) on delete set null;

alter table public.studio_root_causes
  add column if not exists source_type text not null default 'admin',
  add column if not exists diagnostic_run_id uuid references public.studio_diagnostic_runs(id) on delete set null,
  add column if not exists causal_level text not null default 'contributing',
  add column if not exists validation_method text,
  add column if not exists system_rank integer;

alter table public.studio_root_causes drop constraint if exists studio_root_causes_source_type_check;
alter table public.studio_root_causes add constraint studio_root_causes_source_type_check
check (source_type = any(array['admin'::text,'ai'::text,'system'::text]));

alter table public.studio_root_causes drop constraint if exists studio_root_causes_causal_level_check;
alter table public.studio_root_causes add constraint studio_root_causes_causal_level_check
check (causal_level = any(array['symptom'::text,'contributing'::text,'root'::text]));

alter table public.studio_solution_tasks
  add column if not exists source_type text not null default 'admin',
  add column if not exists diagnostic_run_id uuid references public.studio_diagnostic_runs(id) on delete set null,
  add column if not exists expected_effect text,
  add column if not exists dependency_note text;

alter table public.studio_solution_tasks drop constraint if exists studio_solution_tasks_source_type_check;
alter table public.studio_solution_tasks add constraint studio_solution_tasks_source_type_check
check (source_type = any(array['admin'::text,'ai'::text,'system'::text]));

alter table public.studio_solution_tasks drop constraint if exists studio_solution_tasks_status_check;
alter table public.studio_solution_tasks add constraint studio_solution_tasks_status_check
check (status = any(array['proposed'::text,'todo'::text,'in_progress'::text,'blocked'::text,'done'::text,'rejected'::text]));

create or replace function public.studio_mark_diagnosis_stale()
returns trigger
language plpgsql
set search_path=pg_catalog,public
as $$
begin
  if old.analysis_state is distinct from 'analyzing' then
    new.analysis_state := 'stale';
  end if;
  return new;
end;
$$;

drop trigger if exists studio_discovery_mark_stale on public.studio_discovery_cases;
create trigger studio_discovery_mark_stale
before update of current_state,impact,affected_people,desired_outcome,evidence,prior_attempts,process_point,constraints
on public.studio_discovery_cases
for each row execute function public.studio_mark_diagnosis_stale();

alter table public.studio_discovery_answers
  drop constraint if exists studio_discovery_answers_question_key_check;
alter table public.studio_discovery_answers
  add constraint studio_discovery_answers_question_key_check
  check (question_key = any(array[
    'current_state'::text,'impact'::text,'affected_people'::text,'desired_outcome'::text,
    'evidence'::text,'prior_attempts'::text,'process_point'::text,'constraints'::text,
    'system_followup'::text
  ]));

create or replace function public.studio_portal_discovery_answer(
  p_question_key text,
  p_answer text
)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt()->>'email',''));
  v_lead public.studio_leads%rowtype;
  v_case public.studio_discovery_cases%rowtype;
  v_answer text := nullif(btrim(coalesce(p_answer,'')),'');
begin
  if v_uid is null or v_email='' then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  if p_question_key is null or p_question_key <> all(array[
    'current_state','impact','affected_people','desired_outcome',
    'evidence','prior_attempts','process_point','constraints','system_followup'
  ]) then
    raise exception 'Invalid discovery question';
  end if;
  if v_answer is null or length(v_answer)>5000 then
    raise exception 'A valid answer is required';
  end if;

  select * into v_lead
  from public.studio_leads
  where lower(email)=v_email
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'No Studio request is available for this verified email' using errcode='P0002';
  end if;
  if v_lead.status in ('won','lost') then
    raise exception 'Discovery is closed for this request';
  end if;

  select * into v_case from public.studio_discovery_cases where lead_id=v_lead.id;
  if not found then
    insert into public.studio_discovery_cases(lead_id,phase,source_snapshot)
    values(
      v_lead.id,'discovery',
      jsonb_build_object(
        'lead_code',v_lead.lead_code,'service',v_lead.service,'project_goal',v_lead.project_goal,
        'timeline',v_lead.timeline,'budget_range',v_lead.budget_range,'source',v_lead.source
      )
    ) returning * into v_case;
  end if;

  insert into public.studio_discovery_answers(
    case_id,question_key,answer,actor_type,source_channel,actor_user_id,is_read_by_admin
  ) values (
    v_case.id,p_question_key,v_answer,'prospect','portal',v_uid,false
  );

  update public.studio_discovery_cases
  set
    current_state=case when p_question_key='current_state' then v_answer else current_state end,
    impact=case when p_question_key='impact' then v_answer else impact end,
    affected_people=case when p_question_key='affected_people' then v_answer else affected_people end,
    desired_outcome=case when p_question_key='desired_outcome' then v_answer else desired_outcome end,
    evidence=case when p_question_key='evidence' then v_answer else evidence end,
    prior_attempts=case when p_question_key='prior_attempts' then v_answer else prior_attempts end,
    process_point=case when p_question_key='process_point' then v_answer else process_point end,
    constraints=case when p_question_key='constraints' then v_answer else constraints end,
    phase='discovery',
    analysis_state='stale'
  where id=v_case.id
  returning * into v_case;

  update public.studio_leads
  set status=case when status in ('new','contacted','reviewing') then 'discovery' else status end
  where id=v_lead.id;

  insert into public.studio_activity(actor_user_id,actor_type,entity_type,entity_id,action,metadata)
  values(
    v_uid,'prospect','lead',v_lead.id,'discovery_answered',
    jsonb_build_object(
      'case_id',v_case.id,'question_key',p_question_key,
      'answer_preview',left(v_answer,220),'readiness_score',v_case.readiness_score
    )
  );

  return jsonb_build_object(
    'case_id',v_case.id,'readiness_score',v_case.readiness_score,
    'analysis_state',v_case.analysis_state,
    'next_question',public.studio_discovery_next_question_json(v_case.id)
  );
end;
$$;

create or replace function public.studio_portal_access_context()
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt()->>'email',''));
  v_client public.studio_clients%rowtype;
  v_lead public.studio_leads%rowtype;
  v_proposal public.studio_proposals%rowtype;
  v_payment public.studio_payments%rowtype;
  v_discovery public.studio_discovery_cases%rowtype;
  v_next jsonb;
  v_validated_causes integer := 0;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if v_email = '' then raise exception 'Verified email required' using errcode='42501'; end if;

  select * into v_client
  from public.studio_clients
  where lower(email)=v_email
    and status in ('active','existing')
    and (auth_user_id is null or auth_user_id=v_uid)
  order by created_at asc limit 1;

  if found then
    if v_client.auth_user_id is null then
      update public.studio_clients set auth_user_id=v_uid,updated_at=now()
      where id=v_client.id and auth_user_id is null;
    end if;
    return jsonb_build_object(
      'mode','client','client_id',v_client.id,'client_code',v_client.client_code,
      'full_name',v_client.full_name,'email',v_client.email
    );
  end if;

  select * into v_lead
  from public.studio_leads
  where lower(email)=v_email
  order by created_at desc limit 1;

  if not found then
    raise exception 'No Studio request is available for this verified email' using errcode='P0002';
  end if;

  select * into v_discovery
  from public.studio_discovery_cases
  where lead_id=v_lead.id;

  if not found then
    insert into public.studio_discovery_cases(lead_id,phase,source_snapshot)
    values(
      v_lead.id,'discovery',
      jsonb_build_object(
        'lead_code',v_lead.lead_code,'service',v_lead.service,'project_goal',v_lead.project_goal,
        'timeline',v_lead.timeline,'budget_range',v_lead.budget_range,'source',v_lead.source
      )
    ) returning * into v_discovery;
  end if;

  if v_discovery.analysis_state='ready'
     and v_discovery.system_next_question is not null
     and nullif(btrim(coalesce(v_discovery.system_next_question->>'question','')),'') is not null then
    v_next := jsonb_build_object(
      'key','system_followup',
      'question',v_discovery.system_next_question->>'question',
      'reason',v_discovery.system_next_question->>'reason',
      'decision_value',v_discovery.system_next_question->>'decision_value',
      'source','diagnostic_engine'
    );
  else
    v_next := public.studio_discovery_next_question_json(v_discovery.id);
  end if;

  select count(*) into v_validated_causes
  from public.studio_root_causes
  where case_id=v_discovery.id and status='validated';

  select * into v_proposal
  from public.studio_proposals
  where lead_id=v_lead.id and status <> 'draft'
  order by created_at desc limit 1;

  if v_proposal.id is not null
     and v_proposal.status in ('sent','viewed')
     and v_proposal.valid_until is not null
     and v_proposal.valid_until < current_date then
    update public.studio_proposals set status='expired' where id=v_proposal.id;
    v_proposal.status := 'expired';
  end if;

  if v_proposal.id is not null and v_proposal.status='sent' then
    update public.studio_proposals set status='viewed' where id=v_proposal.id;
    v_proposal.status := 'viewed';
    insert into public.studio_activity(actor_user_id,actor_type,entity_type,entity_id,action,metadata)
    values(v_uid,'prospect','proposal',v_proposal.id,'proposal_viewed_by_client',jsonb_build_object('lead_id',v_lead.id));
  end if;

  if v_proposal.id is not null then
    select * into v_payment
    from public.studio_payments
    where proposal_id=v_proposal.id and payment_type='deposit' and status <> 'cancelled'
    order by created_at desc limit 1;
  end if;

  return jsonb_build_object(
    'mode','prospect',
    'lead',jsonb_build_object(
      'id',v_lead.id,'lead_code',v_lead.lead_code,'full_name',v_lead.full_name,'email',v_lead.email,
      'company_name',v_lead.company_name,'service',v_lead.service,'project_goal',v_lead.project_goal,
      'timeline',v_lead.timeline,'budget_range',v_lead.budget_range,'status',v_lead.status,'created_at',v_lead.created_at
    ),
    'discovery',jsonb_build_object(
      'id',v_discovery.id,'phase',v_discovery.phase,
      'readiness_score',v_discovery.readiness_score,'diagnosis_confidence',v_discovery.diagnosis_confidence,
      'analysis_state',v_discovery.analysis_state,'decision_stage',v_discovery.decision_stage,
      'system_confidence',v_discovery.system_confidence,
      'current_state',v_discovery.current_state,'impact',v_discovery.impact,
      'affected_people',v_discovery.affected_people,'desired_outcome',v_discovery.desired_outcome,
      'evidence',v_discovery.evidence,'prior_attempts',v_discovery.prior_attempts,
      'process_point',v_discovery.process_point,'constraints',v_discovery.constraints,
      'root_problem',case when v_validated_causes>0 then v_discovery.root_problem else null end,
      'validated_root_causes',v_validated_causes,
      'diagnosis_ready',(v_discovery.readiness_score>=75 and v_validated_causes>0),
      'next_question',v_next
    ),
    'proposal',case when v_proposal.id is null then null else jsonb_build_object(
      'id',v_proposal.id,'proposal_code',v_proposal.proposal_code,'title',v_proposal.title,'scope',v_proposal.scope,
      'deliverables',v_proposal.deliverables,'timeline_text',v_proposal.timeline_text,'revision_limit',v_proposal.revision_limit,
      'total_amount',v_proposal.total_amount,'currency',v_proposal.currency,'deposit_percent',v_proposal.deposit_percent,
      'valid_until',v_proposal.valid_until,'terms',v_proposal.terms,'status',v_proposal.status,'sent_at',v_proposal.sent_at,'accepted_at',v_proposal.accepted_at
    ) end,
    'deposit',case when v_payment.id is null then null else jsonb_build_object(
      'id',v_payment.id,'payment_code',v_payment.payment_code,'amount',v_payment.amount,'currency',v_payment.currency,
      'status',v_payment.status,'due_date',v_payment.due_date,'paid_at',v_payment.paid_at,'payment_method',v_payment.payment_method,
      'reference',v_payment.reference,'notes',v_payment.notes
    ) end
  );
end;
$function$;
