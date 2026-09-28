alter table public.studio_social_brands
  add column if not exists project_id uuid null references public.studio_projects(id) on delete set null,
  add column if not exists source_lead_id uuid null references public.studio_leads(id) on delete set null,
  add column if not exists source_task_id uuid null references public.studio_project_tasks(id) on delete set null,
  add column if not exists responsible_member_id uuid null references public.studio_team_members(id) on delete set null,
  add column if not exists reviewer_member_id uuid null references public.studio_team_members(id) on delete set null,
  add column if not exists brief_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists launch_reason text null,
  add column if not exists launched_at timestamptz null;

create unique index if not exists studio_social_brands_project_unique
  on public.studio_social_brands(project_id)
  where project_id is not null;

create index if not exists studio_social_brands_owner_idx
  on public.studio_social_brands(responsible_member_id);

create index if not exists studio_social_brands_source_task_idx
  on public.studio_social_brands(source_task_id);
