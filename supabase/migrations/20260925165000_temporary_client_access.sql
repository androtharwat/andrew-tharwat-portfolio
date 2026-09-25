-- ATS temporary Client Access for pre-domain testing.
-- Admin issues a one-time 6-digit code. Edge Function exchanges it for a real Supabase Auth session.

create table if not exists public.studio_client_access_codes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.studio_leads(id) on delete cascade,
  client_id uuid references public.studio_clients(id) on delete cascade,
  email_snapshot text not null,
  code_hash text not null,
  status text not null default 'active'
    check (status = any(array['active'::text,'used'::text,'revoked'::text,'locked'::text,'expired'::text])),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  expires_at timestamptz not null,
  used_at timestamptz,
  issued_by_device_id text,
  created_at timestamptz not null default now(),
  check (num_nonnulls(lead_id,client_id)=1)
);

create index if not exists studio_client_access_codes_email_idx
  on public.studio_client_access_codes(lower(email_snapshot),created_at desc);
create index if not exists studio_client_access_codes_active_idx
  on public.studio_client_access_codes(status,expires_at)
  where status='active';

alter table public.studio_client_access_codes enable row level security;
revoke all on table public.studio_client_access_codes from anon,authenticated;
grant select,insert,update,delete on public.studio_client_access_codes to service_role;

create or replace function public.studio_admin_issue_client_access_code(
  p_lead_id uuid,
  p_ttl_minutes integer default 60
)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public,extensions
as $$
declare
  v_lead public.studio_leads%rowtype;
  v_code text;
  v_raw bigint;
  v_exp timestamptz;
  v_device_id text;
begin
  if not public.portfolio_device_is_trusted() then
    raise exception 'Trusted admin device required' using errcode='42501';
  end if;
  if p_ttl_minutes is null or p_ttl_minutes < 10 or p_ttl_minutes > 1440 then
    raise exception 'TTL must be between 10 and 1440 minutes';
  end if;

  select * into v_lead from public.studio_leads where id=p_lead_id;
  if not found then raise exception 'Lead not found' using errcode='P0002'; end if;
  if nullif(btrim(coalesce(v_lead.email,'')),'') is null then
    raise exception 'Lead email is required before issuing access' using errcode='22023';
  end if;
  if v_lead.status='lost' then
    raise exception 'Cannot issue access for a closed lead' using errcode='22023';
  end if;

  v_raw := (('x'||encode(extensions.gen_random_bytes(4),'hex'))::bit(32)::bigint);
  v_code := lpad((v_raw % 1000000)::text,6,'0');
  v_exp := now() + make_interval(mins=>p_ttl_minutes);
  v_device_id := public.portfolio_request_header('x-portfolio-device-id');

  update public.studio_client_access_codes
  set status='revoked'
  where status='active'
    and (lead_id=p_lead_id or lower(email_snapshot)=lower(v_lead.email));

  insert into public.studio_client_access_codes(
    lead_id,email_snapshot,code_hash,status,attempt_count,max_attempts,expires_at,issued_by_device_id
  ) values (
    p_lead_id,lower(v_lead.email),
    encode(extensions.digest(lower(v_lead.email)||':'||v_code,'sha256'),'hex'),
    'active',0,5,v_exp,v_device_id
  );

  insert into public.studio_activity(actor_type,entity_type,entity_id,action,metadata)
  values ('admin','lead',p_lead_id,'client_access_code_issued',
    jsonb_build_object('expires_at',v_exp,'ttl_minutes',p_ttl_minutes));

  return jsonb_build_object(
    'code',v_code,'email',lower(v_lead.email),'lead_id',p_lead_id,
    'expires_at',v_exp,'ttl_minutes',p_ttl_minutes,'max_attempts',5
  );
end;
$$;

revoke all on function public.studio_admin_issue_client_access_code(uuid,integer) from public;
grant execute on function public.studio_admin_issue_client_access_code(uuid,integer) to anon,authenticated;

create or replace function public.studio_exchange_client_access_code(p_email text,p_code text)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public,extensions
as $$
declare
  v_email text := lower(btrim(coalesce(p_email,'')));
  v_code text := btrim(coalesce(p_code,''));
  v_row public.studio_client_access_codes%rowtype;
  v_expected text;
  v_next_attempt integer;
begin
  if v_email='' or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Invalid access credentials' using errcode='28000';
  end if;
  if v_code !~ '^[0-9]{6}$' then
    raise exception 'Invalid access credentials' using errcode='28000';
  end if;

  select * into v_row
  from public.studio_client_access_codes
  where lower(email_snapshot)=v_email and status='active'
  order by created_at desc limit 1 for update;

  if not found then raise exception 'Invalid or expired access code' using errcode='28000'; end if;
  if v_row.expires_at <= now() then
    update public.studio_client_access_codes set status='expired' where id=v_row.id;
    raise exception 'Invalid or expired access code' using errcode='28000';
  end if;
  if v_row.attempt_count >= v_row.max_attempts then
    update public.studio_client_access_codes set status='locked' where id=v_row.id;
    raise exception 'Invalid or expired access code' using errcode='28000';
  end if;

  v_expected := encode(extensions.digest(v_email||':'||v_code,'sha256'),'hex');
  if v_expected <> v_row.code_hash then
    v_next_attempt := v_row.attempt_count + 1;
    update public.studio_client_access_codes
    set attempt_count=v_next_attempt,
        status=case when v_next_attempt>=v_row.max_attempts then 'locked' else status end
    where id=v_row.id;
    raise exception 'Invalid or expired access code' using errcode='28000';
  end if;

  update public.studio_client_access_codes
  set status='used',used_at=now(),attempt_count=attempt_count+1
  where id=v_row.id;

  insert into public.studio_activity(actor_type,entity_type,entity_id,action,metadata)
  values ('system',
    case when v_row.lead_id is not null then 'lead' else 'client' end,
    coalesce(v_row.lead_id,v_row.client_id),
    'client_access_code_redeemed',
    jsonb_build_object('access_code_id',v_row.id,'email',v_email));

  return jsonb_build_object(
    'ok',true,'email',v_email,'lead_id',v_row.lead_id,
    'client_id',v_row.client_id,'access_code_id',v_row.id
  );
end;
$$;

revoke all on function public.studio_exchange_client_access_code(text,text) from public,anon,authenticated;
grant execute on function public.studio_exchange_client_access_code(text,text) to service_role;
