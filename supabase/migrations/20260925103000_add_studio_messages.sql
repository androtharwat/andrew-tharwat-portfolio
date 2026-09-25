-- ATS unified admin: direct client/admin project messages.
-- Applied to Supabase on 2026-09-25; this migration records the live schema change.

create table if not exists public.studio_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects(id) on delete cascade,
  client_id uuid not null references public.studio_clients(id) on delete cascade,
  sender_type text not null check (sender_type in ('client','admin')),
  body text not null check (length(btrim(body)) between 1 and 4000),
  is_read_by_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists studio_messages_project_created_idx
  on public.studio_messages(project_id, created_at);

create index if not exists studio_messages_admin_unread_idx
  on public.studio_messages(is_read_by_admin, created_at desc)
  where sender_type='client';

alter table public.studio_messages enable row level security;

grant select, insert, update on table public.studio_messages to anon, authenticated;

drop policy if exists studio_messages_trusted_device_all on public.studio_messages;
create policy studio_messages_trusted_device_all
on public.studio_messages
for all
to anon, authenticated
using (public.portfolio_device_is_trusted())
with check (public.portfolio_device_is_trusted());

drop policy if exists studio_messages_client_read_own on public.studio_messages;
create policy studio_messages_client_read_own
on public.studio_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.studio_projects p
    join public.studio_clients c on c.id=p.client_id
    where p.id=studio_messages.project_id
      and c.id=studio_messages.client_id
      and c.auth_user_id=(select auth.uid())
  )
);

drop policy if exists studio_messages_client_insert_own on public.studio_messages;
create policy studio_messages_client_insert_own
on public.studio_messages
for insert
to authenticated
with check (
  sender_type='client'
  and exists (
    select 1
    from public.studio_projects p
    join public.studio_clients c on c.id=p.client_id
    where p.id=studio_messages.project_id
      and c.id=studio_messages.client_id
      and c.auth_user_id=(select auth.uid())
  )
);
