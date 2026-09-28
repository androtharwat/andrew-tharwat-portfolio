create table if not exists public.studio_social_brands (
  id uuid primary key default gen_random_uuid(),
  client_id uuid null references public.studio_clients(id) on delete set null,
  name text not null,
  handle text null,
  industry text null,
  audience text null,
  brand_voice text null,
  language text not null default 'ar' check (language in ('ar','en','mixed')),
  platforms text[] not null default array['facebook','instagram']::text[],
  primary_goal text null,
  products_services text null,
  content_notes text null,
  status text not null default 'active' check (status in ('active','paused','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.studio_social_plans (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.studio_social_brands(id) on delete cascade,
  month_start date not null,
  objective text null,
  offer_focus text null,
  monthly_notes text null,
  target_posts integer not null default 12 check (target_posts between 1 and 62),
  status text not null default 'draft' check (status in ('draft','active','completed','paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, month_start)
);

create table if not exists public.studio_social_content_items (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.studio_social_brands(id) on delete cascade,
  plan_id uuid null references public.studio_social_plans(id) on delete set null,
  publish_at timestamptz null,
  platforms text[] not null default '{}'::text[],
  format text not null default 'post' check (format in ('post','reel','story','carousel','video')),
  pillar text null,
  title text not null,
  hook text null,
  caption text null,
  cta text null,
  creative_brief text null,
  asset_url text null,
  status text not null default 'draft' check (status in ('idea','draft','design','review','needs_changes','approved','scheduled','published','paused')),
  approval_note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_social_brands_status_idx on public.studio_social_brands(status);
create index if not exists studio_social_plans_brand_month_idx on public.studio_social_plans(brand_id, month_start desc);
create index if not exists studio_social_content_brand_date_idx on public.studio_social_content_items(brand_id, publish_at);
create index if not exists studio_social_content_status_idx on public.studio_social_content_items(status);

alter table public.studio_social_brands enable row level security;
alter table public.studio_social_plans enable row level security;
alter table public.studio_social_content_items enable row level security;

grant select, insert, update, delete on table public.studio_social_brands to anon, authenticated, service_role;
grant select, insert, update, delete on table public.studio_social_plans to anon, authenticated, service_role;
grant select, insert, update, delete on table public.studio_social_content_items to anon, authenticated, service_role;

drop policy if exists studio_social_brands_trusted_device_all on public.studio_social_brands;
create policy studio_social_brands_trusted_device_all on public.studio_social_brands for all to anon, authenticated
using (portfolio_device_is_trusted()) with check (portfolio_device_is_trusted());

drop policy if exists studio_social_plans_trusted_device_all on public.studio_social_plans;
create policy studio_social_plans_trusted_device_all on public.studio_social_plans for all to anon, authenticated
using (portfolio_device_is_trusted()) with check (portfolio_device_is_trusted());

drop policy if exists studio_social_content_trusted_device_all on public.studio_social_content_items;
create policy studio_social_content_trusted_device_all on public.studio_social_content_items for all to anon, authenticated
using (portfolio_device_is_trusted()) with check (portfolio_device_is_trusted());
