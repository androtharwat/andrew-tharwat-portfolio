-- ATS Problem-Solving OS
-- Discovery -> Evidence -> Root Cause -> Solution Tasks -> Diagnosis Gate
-- Applied to Supabase on 2026-09-25.

alter table public.studio_activity drop constraint if exists studio_activity_actor_type_check;
alter table public.studio_activity
  add constraint studio_activity_actor_type_check
  check (actor_type = any(array['system'::text,'admin'::text,'client'::text,'prospect'::text]));

create table if not exists public.studio_discovery_cases (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references public.studio_leads(id) on delete cascade,
  phase text not null default 'discovery'
    check (phase = any(array['intake'::text,'discovery'::text,'diagnosis'::text,'solution_ready'::text,'closed'::text])),
  source_snapshot jsonb not null default '{}'::jsonb,
  current_state text,
  impact text,
  affected_people text,
  desired_outcome text,
  evidence text,
  prior_attempts text,
  process_point text,
  constraints text,
  root_problem text,
  diagnosis_summary text,
  readiness_score integer not null default 0 check (readiness_score between 0 and 100),
  diagnosis_confidence integer not null default 0 check (diagnosis_confidence between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.studio_discovery_answers (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.studio_discovery_cases(id) on delete cascade,
  question_key text not null
    check (question_key = any(array[
      'current_state'::text,'impact'::text,'affected_people'::text,'desired_outcome'::text,
      'evidence'::text,'prior_attempts'::text,'process_point'::text,'constraints'::text
    ])),
  answer text not null check (length(btrim(answer)) between 1 and 5000),
  actor_type text not null check (actor_type = any(array['system'::text,'admin'::text,'prospect'::text])),
  source_channel text not null default 'portal'
    check (source_channel = any(array['intake'::text,'portal'::text,'whatsapp'::text,'email'::text,'call'::text,'admin'::text])),
  actor_user_id uuid references auth.users(id) on delete set null,
  is_read_by_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.studio_root_causes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.studio_discovery_cases(id) on delete cascade,
  category text not null default 'other'
    check (category = any(array[
      'strategy'::text,'process'::text,'people'::text,'technology'::text,'content'::text,
      'experience'::text,'environment'::text,'hse'::text,'commercial'::text,'other'::text
    ])),
  statement text not null check (length(btrim(statement)) between 3 and 3000),
  evidence_for text,
  evidence_against text,
  confidence integer not null default 50 check (confidence between 0 and 100),
  status text not null default 'suspected'
    check (status = any(array['suspected'::text,'validated'::text,'rejected'::text])),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.studio_solution_tasks (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.studio_discovery_cases(id) on delete cascade,
  root_cause_id uuid references public.studio_root_causes(id) on delete set null,
  task_type text not null default 'solution'
    check (task_type = any(array['investigate'::text,'solution'::text,'implementation'::text,'verification'::text,'client_action'::text])),
  title text not null check (length(btrim(title)) between 3 and 500),
  rationale text,
  owner_type text not null default 'ats'
    check (owner_type = any(array['ats'::text,'client'::text,'shared'::text])),
  priority text not null default 'medium'
    check (priority = any(array['critical'::text,'high'::text,'medium'::text,'low'::text])),
  status text not null default 'todo'
    check (status = any(array['todo'::text,'in_progress'::text,'blocked'::text,'done'::text])),
  acceptance_criteria text,
  due_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.studio_discovery_answers
  add column if not exists is_read_by_admin boolean not null default false;

create index if not exists studio_discovery_answers_case_created_idx on public.studio_discovery_answers(case_id,created_at desc);
create index if not exists studio_discovery_answers_unread_idx on public.studio_discovery_answers(is_read_by_admin,created_at desc) where actor_type='prospect';
create index if not exists studio_root_causes_case_status_idx on public.studio_root_causes(case_id,status,created_at desc);
create index if not exists studio_solution_tasks_case_status_idx on public.studio_solution_tasks(case_id,status,sort_order,created_at);
create index if not exists studio_discovery_cases_readiness_idx on public.studio_discovery_cases(readiness_score,updated_at desc);

alter table public.studio_discovery_cases enable row level security;
alter table public.studio_discovery_answers enable row level security;
alter table public.studio_root_causes enable row level security;
alter table public.studio_solution_tasks enable row level security;

grant select,insert,update,delete on public.studio_discovery_cases to anon,authenticated;
grant select,insert,update,delete on public.studio_discovery_answers to anon,authenticated;
grant select,insert,update,delete on public.studio_root_causes to anon,authenticated;
grant select,insert,update,delete on public.studio_solution_tasks to anon,authenticated;

drop policy if exists studio_discovery_cases_trusted_device_all on public.studio_discovery_cases;
create policy studio_discovery_cases_trusted_device_all on public.studio_discovery_cases for all to anon,authenticated
using (public.portfolio_device_is_trusted()) with check (public.portfolio_device_is_trusted());

drop policy if exists studio_discovery_answers_trusted_device_all on public.studio_discovery_answers;
create policy studio_discovery_answers_trusted_device_all on public.studio_discovery_answers for all to anon,authenticated
using (public.portfolio_device_is_trusted()) with check (public.portfolio_device_is_trusted());

drop policy if exists studio_root_causes_trusted_device_all on public.studio_root_causes;
create policy studio_root_causes_trusted_device_all on public.studio_root_causes for all to anon,authenticated
using (public.portfolio_device_is_trusted()) with check (public.portfolio_device_is_trusted());

drop policy if exists studio_solution_tasks_trusted_device_all on public.studio_solution_tasks;
create policy studio_solution_tasks_trusted_device_all on public.studio_solution_tasks for all to anon,authenticated
using (public.portfolio_device_is_trusted()) with check (public.portfolio_device_is_trusted());

create or replace function public.studio_problem_touch_updated_at()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin new.updated_at := now(); return new; end;
$$;

drop trigger if exists studio_discovery_cases_touch on public.studio_discovery_cases;
create trigger studio_discovery_cases_touch before update on public.studio_discovery_cases
for each row execute function public.studio_problem_touch_updated_at();

drop trigger if exists studio_root_causes_touch on public.studio_root_causes;
create trigger studio_root_causes_touch before update on public.studio_root_causes
for each row execute function public.studio_problem_touch_updated_at();

drop trigger if exists studio_solution_tasks_touch on public.studio_solution_tasks;
create trigger studio_solution_tasks_touch before update on public.studio_solution_tasks
for each row execute function public.studio_problem_touch_updated_at();

create or replace function public.studio_discovery_recalculate()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
declare v_count integer := 0;
begin
  v_count :=
    (case when nullif(btrim(coalesce(new.current_state,'')),'') is not null then 1 else 0 end) +
    (case when nullif(btrim(coalesce(new.impact,'')),'') is not null then 1 else 0 end) +
    (case when nullif(btrim(coalesce(new.affected_people,'')),'') is not null then 1 else 0 end) +
    (case when nullif(btrim(coalesce(new.desired_outcome,'')),'') is not null then 1 else 0 end) +
    (case when nullif(btrim(coalesce(new.evidence,'')),'') is not null then 1 else 0 end) +
    (case when nullif(btrim(coalesce(new.prior_attempts,'')),'') is not null then 1 else 0 end) +
    (case when nullif(btrim(coalesce(new.process_point,'')),'') is not null then 1 else 0 end) +
    (case when nullif(btrim(coalesce(new.constraints,'')),'') is not null then 1 else 0 end);
  new.readiness_score := round(v_count * 100.0 / 8.0);
  return new;
end;
$$;

drop trigger if exists studio_discovery_recalculate_trigger on public.studio_discovery_cases;
create trigger studio_discovery_recalculate_trigger
before insert or update of current_state,impact,affected_people,desired_outcome,evidence,prior_attempts,process_point,constraints
on public.studio_discovery_cases for each row execute function public.studio_discovery_recalculate();

create or replace function public.studio_init_discovery_case()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_current text; v_affected text; v_outcome text;
begin
  v_current := coalesce(
    nullif(btrim(substring(new.project_goal from 'Core problem:[[:space:]]*([^\n\r]+)')),''),
    nullif(btrim(substring(new.project_goal from 'Challenge / Goal:[[:space:]]*([^\n\r]+)')),''),
    nullif(btrim(substring(new.project_goal from 'Issue:[[:space:]]*([^\n\r]+)')),''),
    nullif(btrim(substring(new.project_goal from 'المشكلة:[[:space:]]*([^\n\r]+)')),'')
  );
  v_affected := coalesce(
    nullif(btrim(substring(new.project_goal from 'Audience:[[:space:]]*([^\n\r]+)')),''),
    nullif(btrim(substring(new.project_goal from 'People exposed:[[:space:]]*([^\n\r]+)')),''),
    nullif(btrim(substring(new.project_goal from 'الأشخاص المعرضون:[[:space:]]*([^\n\r]+)')),'')
  );
  v_outcome := nullif(btrim(substring(new.project_goal from 'Success looks like:[[:space:]]*([^\n\r]+)')),'');
  insert into public.studio_discovery_cases(lead_id,phase,source_snapshot,current_state,affected_people,desired_outcome)
  values(new.id,'discovery',jsonb_build_object(
    'lead_code',new.lead_code,'service',new.service,'project_goal',new.project_goal,
    'timeline',new.timeline,'budget_range',new.budget_range,'source',new.source,'source_path',new.source_path
  ),v_current,v_affected,v_outcome)
  on conflict (lead_id) do nothing;
  return new;
end;
$$;

drop trigger if exists studio_lead_init_discovery on public.studio_leads;
create trigger studio_lead_init_discovery after insert on public.studio_leads
for each row execute function public.studio_init_discovery_case();

insert into public.studio_discovery_cases(lead_id,phase,source_snapshot,current_state,affected_people,desired_outcome)
select l.id,'discovery',
  jsonb_build_object('lead_code',l.lead_code,'service',l.service,'project_goal',l.project_goal,'timeline',l.timeline,'budget_range',l.budget_range,'source',l.source,'source_path',l.source_path),
  coalesce(
    nullif(btrim(substring(l.project_goal from 'Core problem:[[:space:]]*([^\n\r]+)')),''),
    nullif(btrim(substring(l.project_goal from 'Challenge / Goal:[[:space:]]*([^\n\r]+)')),''),
    nullif(btrim(substring(l.project_goal from 'Issue:[[:space:]]*([^\n\r]+)')),''),
    nullif(btrim(substring(l.project_goal from 'المشكلة:[[:space:]]*([^\n\r]+)')),'')
  ),
  coalesce(
    nullif(btrim(substring(l.project_goal from 'Audience:[[:space:]]*([^\n\r]+)')),''),
    nullif(btrim(substring(l.project_goal from 'People exposed:[[:space:]]*([^\n\r]+)')),''),
    nullif(btrim(substring(l.project_goal from 'الأشخاص المعرضون:[[:space:]]*([^\n\r]+)')),'')
  ),
  nullif(btrim(substring(l.project_goal from 'Success looks like:[[:space:]]*([^\n\r]+)')),'')
from public.studio_leads l on conflict (lead_id) do nothing;

insert into public.studio_discovery_answers(case_id,question_key,answer,actor_type,source_channel,is_read_by_admin)
select c.id,'current_state',c.current_state,'system','intake',true
from public.studio_discovery_cases c
where nullif(btrim(coalesce(c.current_state,'')),'') is not null
and not exists(select 1 from public.studio_discovery_answers a where a.case_id=c.id and a.question_key='current_state' and a.source_channel='intake');

insert into public.studio_discovery_answers(case_id,question_key,answer,actor_type,source_channel,is_read_by_admin)
select c.id,'affected_people',c.affected_people,'system','intake',true
from public.studio_discovery_cases c
where nullif(btrim(coalesce(c.affected_people,'')),'') is not null
and not exists(select 1 from public.studio_discovery_answers a where a.case_id=c.id and a.question_key='affected_people' and a.source_channel='intake');

insert into public.studio_discovery_answers(case_id,question_key,answer,actor_type,source_channel,is_read_by_admin)
select c.id,'desired_outcome',c.desired_outcome,'system','intake',true
from public.studio_discovery_cases c
where nullif(btrim(coalesce(c.desired_outcome,'')),'') is not null
and not exists(select 1 from public.studio_discovery_answers a where a.case_id=c.id and a.question_key='desired_outcome' and a.source_channel='intake');

update public.studio_discovery_answers set is_read_by_admin=true where actor_type in ('system','admin');

create or replace function public.studio_discovery_next_question_json(p_case_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare c public.studio_discovery_cases%rowtype;
begin
  select * into c from public.studio_discovery_cases where id=p_case_id;
  if not found then return null; end if;
  if nullif(btrim(coalesce(c.current_state,'')),'') is null then
    return jsonb_build_object('key','current_state','en','What is happening now that should not be happening?','ar','إيه اللي بيحصل دلوقتي ومفروض مايحصلش؟','why_en','This separates the real current condition from the solution you may already have in mind.','why_ar','ده بيفصل الوضع الحقيقي الحالي عن الحل اللي ممكن يكون في بالك من البداية.');
  elsif nullif(btrim(coalesce(c.impact,'')),'') is null then
    return jsonb_build_object('key','impact','en','When this happens, what is the real impact?','ar','لما المشكلة دي بتحصل، تأثيرها الحقيقي إيه؟','why_en','Impact tells us what matters most: time, money, safety, quality, sales, trust or rework.','why_ar','التأثير بيحدد إيه الأهم فعلًا: وقت، تكلفة، سلامة، جودة، مبيعات، ثقة أو إعادة شغل.');
  elsif nullif(btrim(coalesce(c.evidence,'')),'') is null then
    return jsonb_build_object('key','evidence','en','What evidence or real example confirms this problem?','ar','إيه الدليل أو المثال الحقيقي اللي بيأكد وجود المشكلة؟','why_en','We separate facts from assumptions before diagnosing a root cause.','why_ar','بنفرق بين الحقائق والافتراضات قبل ما نحدد السبب الجذري.');
  elsif nullif(btrim(coalesce(c.affected_people,'')),'') is null then
    return jsonb_build_object('key','affected_people','en','Who is most affected by this problem?','ar','مين أكتر ناس متأثرين بالمشكلة دي؟','why_en','The affected people often reveal where the problem is actually experienced.','why_ar','الأشخاص المتأثرين بيوضحوا غالبًا فين المشكلة بتظهر فعليًا.');
  elsif nullif(btrim(coalesce(c.process_point,'')),'') is null then
    return jsonb_build_object('key','process_point','en','Where exactly in the current process or customer journey does the problem appear?','ar','المشكلة بتظهر فين بالظبط داخل العملية أو رحلة العميل الحالية؟','why_en','A precise failure point helps us investigate causes instead of treating symptoms.','why_ar','تحديد نقطة ظهور المشكلة بيساعدنا نبحث عن السبب بدل ما نعالج الأعراض.');
  elsif nullif(btrim(coalesce(c.prior_attempts,'')),'') is null then
    return jsonb_build_object('key','prior_attempts','en','What have you already tried, and what happened?','ar','إيه اللي جرّبته قبل كده لحل المشكلة، وإيه اللي حصل؟','why_en','Previous attempts show what has already failed, helped, or exposed a deeper cause.','why_ar','المحاولات السابقة بتوضح إيه اللي فشل أو نفع أو كشف سبب أعمق.');
  elsif nullif(btrim(coalesce(c.desired_outcome,'')),'') is null then
    return jsonb_build_object('key','desired_outcome','en','If this is solved correctly, what should be different?','ar','لو اتحلت المشكلة صح، إيه اللي المفروض يتغير؟','why_en','The desired outcome becomes the verification target for the final solution.','why_ar','النتيجة المطلوبة هتبقى معيار التحقق من نجاح الحل في النهاية.');
  elsif nullif(btrim(coalesce(c.constraints,'')),'') is null then
    return jsonb_build_object('key','constraints','en','What constraints must the solution respect?','ar','إيه القيود اللي لازم الحل يلتزم بيها؟','why_en','Budget, time, regulation, technology or operational limits shape a realistic solution.','why_ar','الميزانية والوقت واللوائح والتقنية وظروف التشغيل هي اللي بتحدد الحل الواقعي.');
  end if;
  return null;
end;
$$;

revoke all on function public.studio_discovery_next_question_json(uuid) from public,anon,authenticated;

create or replace function public.studio_portal_discovery_answer(p_question_key text,p_answer text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt()->>'email',''));
  v_lead public.studio_leads%rowtype;
  v_case public.studio_discovery_cases%rowtype;
  v_answer text := nullif(btrim(coalesce(p_answer,'')),'');
begin
  if v_uid is null or v_email='' then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_question_key is null or p_question_key <> all(array['current_state','impact','affected_people','desired_outcome','evidence','prior_attempts','process_point','constraints']) then raise exception 'Invalid discovery question'; end if;
  if v_answer is null or length(v_answer)>5000 then raise exception 'A valid answer is required'; end if;

  select * into v_lead from public.studio_leads where lower(email)=v_email order by created_at desc limit 1;
  if not found then raise exception 'No Studio request is available for this verified email' using errcode='P0002'; end if;
  if v_lead.status in ('won','lost') then raise exception 'Discovery is closed for this request'; end if;

  select * into v_case from public.studio_discovery_cases where lead_id=v_lead.id;
  if not found then
    insert into public.studio_discovery_cases(lead_id,phase,source_snapshot)
    values(v_lead.id,'discovery',jsonb_build_object('lead_code',v_lead.lead_code,'service',v_lead.service,'project_goal',v_lead.project_goal,'timeline',v_lead.timeline,'budget_range',v_lead.budget_range,'source',v_lead.source))
    returning * into v_case;
  end if;

  insert into public.studio_discovery_answers(case_id,question_key,answer,actor_type,source_channel,actor_user_id,is_read_by_admin)
  values(v_case.id,p_question_key,v_answer,'prospect','portal',v_uid,false);

  update public.studio_discovery_cases set
    current_state=case when p_question_key='current_state' then v_answer else current_state end,
    impact=case when p_question_key='impact' then v_answer else impact end,
    affected_people=case when p_question_key='affected_people' then v_answer else affected_people end,
    desired_outcome=case when p_question_key='desired_outcome' then v_answer else desired_outcome end,
    evidence=case when p_question_key='evidence' then v_answer else evidence end,
    prior_attempts=case when p_question_key='prior_attempts' then v_answer else prior_attempts end,
    process_point=case when p_question_key='process_point' then v_answer else process_point end,
    constraints=case when p_question_key='constraints' then v_answer else constraints end,
    phase='discovery'
  where id=v_case.id returning * into v_case;

  update public.studio_leads set status=case when status in ('new','contacted','reviewing') then 'discovery' else status end where id=v_lead.id;

  insert into public.studio_activity(actor_user_id,actor_type,entity_type,entity_id,action,metadata)
  values(v_uid,'prospect','lead',v_lead.id,'discovery_answered',jsonb_build_object('case_id',v_case.id,'question_key',p_question_key,'answer_preview',left(v_answer,220),'readiness_score',v_case.readiness_score));

  return jsonb_build_object('case_id',v_case.id,'readiness_score',v_case.readiness_score,'next_question',public.studio_discovery_next_question_json(v_case.id));
end;
$$;

revoke all on function public.studio_portal_discovery_answer(text,text) from public,anon;
grant execute on function public.studio_portal_discovery_answer(text,text) to authenticated;

create or replace function public.studio_portal_access_context()
returns jsonb language plpgsql security definer set search_path to 'pg_catalog','public' as $function$
declare
  v_uid uuid := auth.uid(); v_email text := lower(coalesce(auth.jwt()->>'email',''));
  v_client public.studio_clients%rowtype; v_lead public.studio_leads%rowtype;
  v_proposal public.studio_proposals%rowtype; v_payment public.studio_payments%rowtype;
  v_discovery public.studio_discovery_cases%rowtype; v_next jsonb; v_validated_causes integer := 0;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if v_email = '' then raise exception 'Verified email required' using errcode='42501'; end if;

  select * into v_client from public.studio_clients
  where lower(email)=v_email and status in ('active','existing') and (auth_user_id is null or auth_user_id=v_uid)
  order by created_at asc limit 1;

  if found then
    if v_client.auth_user_id is null then update public.studio_clients set auth_user_id=v_uid,updated_at=now() where id=v_client.id and auth_user_id is null; end if;
    return jsonb_build_object('mode','client','client_id',v_client.id,'client_code',v_client.client_code,'full_name',v_client.full_name,'email',v_client.email);
  end if;

  select * into v_lead from public.studio_leads where lower(email)=v_email order by created_at desc limit 1;
  if not found then raise exception 'No Studio request is available for this verified email' using errcode='P0002'; end if;

  select * into v_discovery from public.studio_discovery_cases where lead_id=v_lead.id;
  if not found then
    insert into public.studio_discovery_cases(lead_id,phase,source_snapshot)
    values(v_lead.id,'discovery',jsonb_build_object('lead_code',v_lead.lead_code,'service',v_lead.service,'project_goal',v_lead.project_goal,'timeline',v_lead.timeline,'budget_range',v_lead.budget_range,'source',v_lead.source))
    returning * into v_discovery;
  end if;
  v_next := public.studio_discovery_next_question_json(v_discovery.id);
  select count(*) into v_validated_causes from public.studio_root_causes where case_id=v_discovery.id and status='validated';

  select * into v_proposal from public.studio_proposals where lead_id=v_lead.id and status <> 'draft' order by created_at desc limit 1;
  if v_proposal.id is not null and v_proposal.status in ('sent','viewed') and v_proposal.valid_until is not null and v_proposal.valid_until < current_date then
    update public.studio_proposals set status='expired' where id=v_proposal.id; v_proposal.status := 'expired';
  end if;
  if v_proposal.id is not null and v_proposal.status='sent' then
    update public.studio_proposals set status='viewed' where id=v_proposal.id; v_proposal.status := 'viewed';
    insert into public.studio_activity(actor_user_id,actor_type,entity_type,entity_id,action,metadata)
    values(v_uid,'prospect','proposal',v_proposal.id,'proposal_viewed_by_client',jsonb_build_object('lead_id',v_lead.id));
  end if;
  if v_proposal.id is not null then
    select * into v_payment from public.studio_payments
    where proposal_id=v_proposal.id and payment_type='deposit' and status <> 'cancelled'
    order by created_at desc limit 1;
  end if;

  return jsonb_build_object(
    'mode','prospect',
    'lead',jsonb_build_object('id',v_lead.id,'lead_code',v_lead.lead_code,'full_name',v_lead.full_name,'email',v_lead.email,'company_name',v_lead.company_name,'service',v_lead.service,'project_goal',v_lead.project_goal,'timeline',v_lead.timeline,'budget_range',v_lead.budget_range,'status',v_lead.status,'created_at',v_lead.created_at),
    'discovery',jsonb_build_object('id',v_discovery.id,'phase',v_discovery.phase,'readiness_score',v_discovery.readiness_score,'diagnosis_confidence',v_discovery.diagnosis_confidence,'current_state',v_discovery.current_state,'impact',v_discovery.impact,'affected_people',v_discovery.affected_people,'desired_outcome',v_discovery.desired_outcome,'evidence',v_discovery.evidence,'prior_attempts',v_discovery.prior_attempts,'process_point',v_discovery.process_point,'constraints',v_discovery.constraints,'root_problem',case when v_validated_causes>0 then v_discovery.root_problem else null end,'validated_root_causes',v_validated_causes,'diagnosis_ready',(v_discovery.readiness_score>=75 and v_validated_causes>0),'next_question',v_next),
    'proposal',case when v_proposal.id is null then null else jsonb_build_object('id',v_proposal.id,'proposal_code',v_proposal.proposal_code,'title',v_proposal.title,'scope',v_proposal.scope,'deliverables',v_proposal.deliverables,'timeline_text',v_proposal.timeline_text,'revision_limit',v_proposal.revision_limit,'total_amount',v_proposal.total_amount,'currency',v_proposal.currency,'deposit_percent',v_proposal.deposit_percent,'valid_until',v_proposal.valid_until,'terms',v_proposal.terms,'status',v_proposal.status,'sent_at',v_proposal.sent_at,'accepted_at',v_proposal.accepted_at) end,
    'deposit',case when v_payment.id is null then null else jsonb_build_object('id',v_payment.id,'payment_code',v_payment.payment_code,'amount',v_payment.amount,'currency',v_payment.currency,'status',v_payment.status,'due_date',v_payment.due_date,'paid_at',v_payment.paid_at,'payment_method',v_payment.payment_method,'reference',v_payment.reference,'notes',v_payment.notes) end
  );
end;
$function$;
