create table if not exists public.studio_knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  domain text not null,
  title text not null,
  publisher text not null,
  source_type text not null check (source_type in ('standard','regulator','government','peer_reviewed','first_party','professional')),
  authority_tier smallint not null default 3 check (authority_tier between 1 and 4),
  url text not null,
  version_label text null,
  jurisdiction text not null default 'global',
  principles jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active','draft','superseded','retired')),
  verified_at timestamptz null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.studio_task_playbooks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null unique references public.studio_solution_tasks(id) on delete cascade,
  domain text not null,
  risk_level text not null default 'medium' check (risk_level in ('low','medium','high','critical')),
  human_gate_required boolean not null default false,
  method_name text not null,
  objective text not null,
  checklist jsonb not null default '[]'::jsonb,
  required_evidence jsonb not null default '[]'::jsonb,
  source_refs jsonb not null default '[]'::jsonb,
  completion_rule text null,
  progress jsonb not null default '[]'::jsonb,
  result_summary text null,
  generation_notes text null,
  model text null,
  status text not null default 'ready' check (status in ('draft','ready','review_required','completed')),
  human_reviewed_by text null,
  human_reviewed_at timestamptz null,
  human_review_note text null,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_knowledge_sources_domain_idx on public.studio_knowledge_sources(domain,status,authority_tier);
create index if not exists studio_task_playbooks_domain_idx on public.studio_task_playbooks(domain,status);
create index if not exists studio_task_playbooks_task_idx on public.studio_task_playbooks(task_id);

alter table public.studio_knowledge_sources enable row level security;
alter table public.studio_task_playbooks enable row level security;

grant select, insert, update, delete on table public.studio_knowledge_sources to anon, authenticated, service_role;
grant select, insert, update, delete on table public.studio_task_playbooks to anon, authenticated, service_role;

drop policy if exists studio_knowledge_sources_trusted_device_all on public.studio_knowledge_sources;
create policy studio_knowledge_sources_trusted_device_all
on public.studio_knowledge_sources for all to anon, authenticated
using (portfolio_device_is_trusted()) with check (portfolio_device_is_trusted());

drop policy if exists studio_task_playbooks_trusted_device_all on public.studio_task_playbooks;
create policy studio_task_playbooks_trusted_device_all
on public.studio_task_playbooks for all to anon, authenticated
using (portfolio_device_is_trusted()) with check (portfolio_device_is_trusted());

insert into public.studio_knowledge_sources
(source_key,domain,title,publisher,source_type,authority_tier,url,version_label,jurisdiction,principles,status,verified_at,notes)
values
('iso_9241_210_2019','product_ux','ISO 9241-210:2019 — Human-centred design for interactive systems','International Organization for Standardization','standard',1,'https://www.iso.org/standard/77520.html','2019','global','["Base design decisions on an explicit understanding of users, tasks, and context of use.","Use evaluation with users to drive and refine design decisions.","Treat design as iterative and address the whole user experience.","Use multidisciplinary perspectives when designing interactive systems."]'::jsonb,'active',now(),'Current published edition; ISO reports it was reviewed and confirmed in 2025.'),
('wcag_2_2','accessibility','Web Content Accessibility Guidelines (WCAG) 2.2','W3C Web Accessibility Initiative','standard',1,'https://www.w3.org/TR/WCAG22/','2.2','global','["Evaluate web content for perceivability, operability, understandability, and robustness.","Check keyboard and focus behavior, form labels and errors, target sizes, redundant entry, and accessible authentication where relevant.","Do not claim conformance unless all applicable success criteria at the claimed level are satisfied."]'::jsonb,'active',now(),'W3C Recommendation; approved as ISO/IEC 40500:2025.'),
('core_web_vitals','web_performance','Core Web Vitals','Google web.dev','first_party',2,'https://web.dev/articles/vitals','Current metrics','global','["Use LCP to assess loading, INP to assess interaction responsiveness, and CLS to assess visual stability.","A good target is LCP at or below 2.5 seconds, INP at or below 200 milliseconds, and CLS at or below 0.1.","Assess thresholds at the 75th percentile and distinguish field data from one-off lab tests."]'::jsonb,'active',now(),'First-party web performance guidance; thresholds are not a substitute for end-user testing.'),
('nist_ssdf_1_1','software_security','NIST SP 800-218 — Secure Software Development Framework (SSDF) Version 1.1','National Institute of Standards and Technology','government',1,'https://csrc.nist.gov/pubs/sp/800/218/final','1.1','US/global reference','["Integrate secure software development practices into the software development life cycle.","Use practices that reduce vulnerabilities, reduce the impact of undetected vulnerabilities, and address root causes to prevent recurrence.","Treat security as a lifecycle activity rather than a final release check."]'::jsonb,'active',now(),'Version 1.1 is final; NIST SP 800-218 Rev.1 / SSDF 1.2 is still a draft as of this verification.'),
('owasp_asvs_5_0_0','software_security','OWASP Application Security Verification Standard (ASVS)','OWASP Foundation','professional',2,'https://owasp.org/projects/asvs','5.0.0','global','["Use a defined verification standard for web application technical security controls.","Select an appropriate level of rigor for the application and test controls rather than relying on assumptions.","Reference versioned requirement identifiers when recording verification evidence."]'::jsonb,'active',now(),'OWASP lists 5.0.0 as the latest stable ASVS release on the project page.'),
('iso_31000_2018','risk_management','ISO 31000:2018 — Risk management — Guidelines','International Organization for Standardization','standard',1,'https://www.iso.org/standard/65694.html','2018','global','["Use a structured process to identify, analyze, evaluate, treat, monitor, and communicate risk.","Adapt risk management to the organization and context rather than applying a one-size-fits-all process.","Monitor and review risk treatments and continually improve the process."]'::jsonb,'active',now(),'Current published edition; a third-edition committee draft is under development.'),
('iso_45001_2018','hse','ISO 45001:2018 — Occupational health and safety management systems','International Organization for Standardization','standard',1,'https://www.iso.org/standard/45001','2018 + Amd 1:2024','global','["Use a systematic OH&S management approach to prevent work-related injury and ill health and improve OH&S performance.","Identify hazards, address OH&S risks and opportunities, and improve system effectiveness continually.","Do not treat a management-system checklist as a substitute for competent site-specific hazard assessment."]'::jsonb,'active',now(),'Current published edition with 2024 amendment; a replacement Draft International Standard is under development.'),
('osha_hierarchy_controls','hse','Hazard Prevention and Control / Hierarchy of Controls','US Occupational Safety and Health Administration','regulator',1,'https://www.osha.gov/safety-management/hazard-prevention','Current guidance','US / general reference','["Prefer elimination and substitution before engineering controls, administrative or work-practice controls, and PPE when selecting hazard controls.","Involve workers and competent experts in evaluating control feasibility and effectiveness.","Plan implementation and verify that selected controls are effective and do not introduce new hazards."]'::jsonb,'active',now(),'Use alongside applicable local law, codes, competent-person assessment, manufacturer information, and site-specific evidence.')
on conflict (source_key) do update set
 domain=excluded.domain,title=excluded.title,publisher=excluded.publisher,source_type=excluded.source_type,
 authority_tier=excluded.authority_tier,url=excluded.url,version_label=excluded.version_label,
 jurisdiction=excluded.jurisdiction,principles=excluded.principles,status=excluded.status,
 verified_at=excluded.verified_at,notes=excluded.notes,updated_at=now();
