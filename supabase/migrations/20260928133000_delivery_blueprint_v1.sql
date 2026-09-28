create table if not exists public.studio_delivery_blueprints (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references public.studio_discovery_cases(id) on delete cascade,
  lead_id uuid not null references public.studio_leads(id) on delete cascade,
  project_id uuid null references public.studio_projects(id) on delete set null,
  status text not null default 'ready' check (status in ('draft','ready','needs_evidence','approved','activated')),
  blueprint jsonb not null default '{"domains":[]}'::jsonb,
  source_snapshot jsonb not null default '{}'::jsonb,
  model text null,
  generation_notes text null,
  generated_at timestamptz not null default now(),
  approved_at timestamptz null,
  activated_at timestamptz null,
  updated_at timestamptz not null default now()
);

alter table public.studio_delivery_blueprints enable row level security;
grant select,insert,update,delete on public.studio_delivery_blueprints to anon,authenticated,service_role;

drop policy if exists studio_delivery_blueprints_trusted_all on public.studio_delivery_blueprints;
create policy studio_delivery_blueprints_trusted_all
on public.studio_delivery_blueprints
for all to anon,authenticated
using (portfolio_device_is_trusted())
with check (portfolio_device_is_trusted());

create index if not exists studio_delivery_blueprints_lead_idx
  on public.studio_delivery_blueprints(lead_id,status);
create index if not exists studio_delivery_blueprints_project_idx
  on public.studio_delivery_blueprints(project_id);

alter table public.studio_project_tasks
  add column if not exists source_blueprint_task_key text null;

create unique index if not exists studio_project_tasks_blueprint_unique
  on public.studio_project_tasks(project_id,source_blueprint_task_key)
  where source_blueprint_task_key is not null;
