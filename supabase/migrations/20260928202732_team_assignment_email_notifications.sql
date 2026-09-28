create table if not exists public.studio_team_notifications (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('domain_assigned','task_assigned','assignment_summary')),
  member_id uuid not null references public.studio_team_members(id) on delete cascade,
  project_id uuid references public.studio_projects(id) on delete cascade,
  workstream_id uuid references public.studio_project_workstreams(id) on delete cascade,
  task_id uuid references public.studio_project_tasks(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','sent','fallback_sent','failed')),
  provider text,
  provider_id text,
  error text,
  attempt_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.studio_team_notifications enable row level security;

drop policy if exists studio_team_notifications_read on public.studio_team_notifications;
create policy studio_team_notifications_read
on public.studio_team_notifications
for select
to anon, authenticated
using (
  public.portfolio_device_is_trusted()
  or member_id = ats_team_private.member_id()
);

do $$
declare
  v_id uuid;
begin
  if not exists(select 1 from vault.decrypted_secrets where name='ats_team_notify_webhook_secret') then
    select vault.create_secret(encode(gen_random_bytes(32),'hex'),'ats_team_notify_webhook_secret')
    into v_id;
  end if;
end $$;

create or replace function public.get_ats_team_notify_webhook_secret()
returns text
language plpgsql
security definer
set search_path to 'public','vault'
as $function$
begin
  if auth.role() <> 'service_role' then
    raise exception 'not allowed';
  end if;
  return (
    select decrypted_secret
    from vault.decrypted_secrets
    where name='ats_team_notify_webhook_secret'
    order by created_at desc
    limit 1
  );
end
$function$;

create or replace function public.get_ats_resend_api_key()
returns text
language plpgsql
security definer
set search_path to 'public','vault'
as $function$
begin
  if auth.role() <> 'service_role' then
    raise exception 'not allowed';
  end if;
  return (
    select decrypted_secret
    from vault.decrypted_secrets
    where name='do_resend_api_key'
    order by created_at desc
    limit 1
  );
end
$function$;

revoke all on function public.get_ats_team_notify_webhook_secret() from public,anon,authenticated;
grant execute on function public.get_ats_team_notify_webhook_secret() to service_role;
revoke all on function public.get_ats_resend_api_key() from public,anon,authenticated;
grant execute on function public.get_ats_resend_api_key() to service_role;

create or replace function ats_team_private.dispatch_assignment_notification()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_notification_id uuid;
  v_member_id uuid;
  v_project_id uuid;
  v_workstream_id uuid;
  v_task_id uuid;
  v_event_type text;
  v_secret text;
  v_request_id bigint;
begin
  if tg_table_name='studio_project_workstreams' then
    if new.lead_member_id is null or new.lead_member_id is not distinct from old.lead_member_id then
      return new;
    end if;
    v_event_type:='domain_assigned';
    v_member_id:=new.lead_member_id;
    v_project_id:=new.project_id;
    v_workstream_id:=new.id;
    v_task_id:=null;
  elsif tg_table_name='studio_project_tasks' then
    if new.owner_id is null
       or new.owner_id is not distinct from old.owner_id
       or new.status<>'assigned'
       or coalesce(new.assignment_mode,'')<>'direct' then
      return new;
    end if;
    v_event_type:='task_assigned';
    v_member_id:=new.owner_id;
    v_project_id:=new.project_id;
    v_workstream_id:=new.workstream_id;
    v_task_id:=new.id;
  else
    return new;
  end if;

  insert into public.studio_team_notifications(
    event_type,member_id,project_id,workstream_id,task_id,metadata
  ) values (
    v_event_type,v_member_id,v_project_id,v_workstream_id,v_task_id,
    jsonb_build_object('trigger_table',tg_table_name)
  )
  returning id into v_notification_id;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name='ats_team_notify_webhook_secret'
  order by created_at desc
  limit 1;

  if v_secret is null then
    update public.studio_team_notifications
    set status='failed',error='Notification webhook secret missing',updated_at=now()
    where id=v_notification_id;
    return new;
  end if;

  select net.http_post(
    url:='https://sivyynuhluhvjcdicwxn.supabase.co/functions/v1/ats-team-notify',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'x-ats-notify-secret',v_secret
    ),
    body:=jsonb_build_object('notification_id',v_notification_id),
    timeout_milliseconds:=5000
  ) into v_request_id;

  update public.studio_team_notifications
  set metadata=metadata||jsonb_build_object('pg_net_request_id',v_request_id),
      updated_at=now()
  where id=v_notification_id;

  return new;
end
$function$;

drop trigger if exists studio_notify_domain_assignment on public.studio_project_workstreams;
create trigger studio_notify_domain_assignment
after update of lead_member_id on public.studio_project_workstreams
for each row execute function ats_team_private.dispatch_assignment_notification();

drop trigger if exists studio_notify_task_assignment on public.studio_project_tasks;
create trigger studio_notify_task_assignment
after update of owner_id,status on public.studio_project_tasks
for each row execute function ats_team_private.dispatch_assignment_notification();
