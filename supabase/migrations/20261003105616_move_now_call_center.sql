create table public.move_now_calls (
 id uuid primary key, lead_id uuid references public.move_now_leads(id),
 agent_email text not null check(agent_email=lower(agent_email)), raw_notes text not null check(length(raw_notes)<=12000),
 crm jsonb not null, analysis jsonb not null default '{}'::jsonb,
 stage text not null default 'draft' check(stage in ('draft','completed')),
 created_at bigint not null, updated_at bigint not null
);
create index move_now_calls_agent_date_idx on public.move_now_calls(agent_email,created_at desc);
create index move_now_calls_lead_date_idx on public.move_now_calls(lead_id,created_at desc) where lead_id is not null;
create table public.move_now_ai_usage(key text primary key,count integer not null);
create table public.move_now_ai_runs(
 id uuid primary key, call_id uuid not null, agent_email text not null,
 input_hash text not null, model text not null, result jsonb,
 state text not null check(state in ('pending','complete','error')),
 token_usage jsonb, estimated_cost_usd numeric, created_at bigint not null
);
create index move_now_ai_runs_call_date_idx on public.move_now_ai_runs(call_id,created_at desc);
create index move_now_ai_runs_cache_idx on public.move_now_ai_runs(agent_email,input_hash) where state='complete';
alter table public.move_now_calls enable row level security;
alter table public.move_now_ai_usage enable row level security;
alter table public.move_now_ai_runs enable row level security;
revoke all on public.move_now_calls,public.move_now_ai_usage,public.move_now_ai_runs from public,anon,authenticated;
grant all on public.move_now_calls,public.move_now_ai_usage,public.move_now_ai_runs to service_role;
create function public.move_now_ai_attempt(p_agent text) returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare daily integer; minute_count integer;
begin
 insert into public.move_now_ai_usage(key,count) values('day:'||to_char(now() at time zone 'Africa/Cairo','YYYY-MM-DD'),1)
 on conflict(key) do update set count=move_now_ai_usage.count+1 returning count into daily;
 insert into public.move_now_ai_usage(key,count) values('minute:'||p_agent||':'||floor(extract(epoch from now())/60)::text,1)
 on conflict(key) do update set count=move_now_ai_usage.count+1 returning count into minute_count;
 return daily<=500 and minute_count<=20;
end $$;
create function public.move_now_save_call(p_record jsonb,p_expected bigint,p_lead jsonb,p_publish boolean,p_owner boolean)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare previous public.move_now_calls; saved public.move_now_calls; linked uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_record->>'id',0));
 select * into previous from public.move_now_calls where id=(p_record->>'id')::uuid for update;
 if found then
  if previous.agent_email<>p_record->>'agent_email' and not p_owner then raise exception 'call belongs to another teammate'; end if;
  if previous.updated_at<>p_expected or previous.stage='completed' then raise exception 'call changed or already completed'; end if;
  linked:=previous.lead_id;
 elsif p_expected<>0 then raise exception 'call no longer exists';
 else linked:=nullif(p_record->>'lead_id','')::uuid;
 end if;
 if p_publish then
  if linked is null then
   linked:=(p_record->>'id')::uuid;
   insert into public.move_now_leads(id,name,phone,service,details,status,assigned,notes,next_followup,created_at,updated_at)
   values(linked,p_lead->>'name',p_lead->>'phone',p_lead->>'service',p_lead->>'details','contacted',p_record->>'agent_email',
    p_lead->>'notes','',(p_record->>'created_at')::bigint,(p_record->>'updated_at')::bigint);
  else
   update public.move_now_leads set
    status=case when status='new' then 'contacted' else status end,
    assigned=case when assigned='' then p_record->>'agent_email' else assigned end,
    notes=concat_ws(E'\n\n',nullif(notes,''),p_lead->>'notes'),updated_at=(p_record->>'updated_at')::bigint
   where id=linked;
   if not found then raise exception 'linked request missing'; end if;
  end if;
 end if;
 insert into public.move_now_calls(id,lead_id,agent_email,raw_notes,crm,analysis,stage,created_at,updated_at)
 values((p_record->>'id')::uuid,linked,p_record->>'agent_email',p_record->>'raw_notes',p_record->'crm',p_record->'analysis',
 case when p_publish then 'completed' else 'draft' end,coalesce(previous.created_at,(p_record->>'created_at')::bigint),(p_record->>'updated_at')::bigint)
 on conflict(id) do update set lead_id=excluded.lead_id,raw_notes=excluded.raw_notes,crm=excluded.crm,analysis=excluded.analysis,
 stage=excluded.stage,updated_at=excluded.updated_at returning * into saved;
 return to_jsonb(saved);
end $$;
revoke all on function public.move_now_ai_attempt(text),public.move_now_save_call(jsonb,bigint,jsonb,boolean,boolean) from public,anon,authenticated;
grant execute on function public.move_now_ai_attempt(text),public.move_now_save_call(jsonb,bigint,jsonb,boolean,boolean) to service_role;
alter table public.move_now_leads drop constraint move_now_leads_service_check;
alter table public.move_now_leads add constraint move_now_leads_service_check check(service in ('buy','rent','both','buy_cash','buy_installments','finish','finish_sale','finish_rent','finish_furnish_rent','sell'));

