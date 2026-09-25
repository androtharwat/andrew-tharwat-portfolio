-- Evidence references for the ATS Diagnostic Decision Engine.
-- No new user-facing workflow: evidence refs are generated automatically by the engine.

alter table public.studio_root_causes
  add column if not exists evidence_refs jsonb not null default '[]'::jsonb,
  add column if not exists missing_evidence_refs jsonb not null default '[]'::jsonb;

alter table public.studio_solution_tasks
  add column if not exists evidence_refs jsonb not null default '[]'::jsonb;
