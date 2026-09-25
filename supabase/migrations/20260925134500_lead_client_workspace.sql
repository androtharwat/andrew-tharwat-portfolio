-- ATS Lead -> Client Workspace data model.
-- Applied to Supabase on 2026-09-25; this migration records the live schema change.

alter table public.studio_leads
  add column if not exists ats_understanding text,
  add column if not exists missing_information text[] not null default '{}',
  add column if not exists next_action text,
  add column if not exists next_action_due_at timestamptz,
  add column if not exists fit_reason text,
  add column if not exists preferred_contact_channel text,
  add column if not exists last_contacted_at timestamptz;

alter table public.studio_leads
  drop constraint if exists studio_leads_status_check;

alter table public.studio_leads
  add constraint studio_leads_status_check
  check (status = any (array[
    'new'::text,
    'contacted'::text,
    'discovery'::text,
    'reviewing'::text,
    'qualified'::text,
    'proposal_sent'::text,
    'negotiation'::text,
    'won'::text,
    'lost'::text
  ]));

alter table public.studio_leads
  drop constraint if exists studio_leads_preferred_contact_channel_check;

alter table public.studio_leads
  add constraint studio_leads_preferred_contact_channel_check
  check (
    preferred_contact_channel is null
    or preferred_contact_channel = any(array['whatsapp'::text,'email'::text,'call'::text,'portal'::text])
  );

create index if not exists studio_leads_next_action_due_idx
  on public.studio_leads(next_action_due_at)
  where next_action_due_at is not null and status not in ('won','lost');

drop policy if exists studio_leads_public_insert on public.studio_leads;

create policy studio_leads_public_insert
on public.studio_leads
for insert
to anon, authenticated
with check (
  status='new'
  and fit is null
  and fit_reason is null
  and ats_understanding is null
  and missing_information='{}'::text[]
  and next_action is null
  and next_action_due_at is null
  and preferred_contact_channel is null
  and last_contacted_at is null
  and internal_notes is null
  and lost_reason is null
  and (
    existing_client_id is null
    or exists (
      select 1 from public.studio_clients c
      where c.id=studio_leads.existing_client_id
        and c.auth_user_id=(select auth.uid())
    )
  )
);

create index if not exists studio_activity_entity_timeline_idx
  on public.studio_activity(entity_type,entity_id,created_at desc);
