-- Local test doubles for existing Supabase auth and Client Operations only. Never deploy.
create role anon; create role authenticated; create schema auth;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.uid',true),'')::uuid$$;
grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
create function public.portfolio_device_is_trusted() returns boolean language sql stable as $$select coalesce(current_setting('test.admin',true),'false')='true'$$;
create function public.portfolio_request_header(text) returns text language sql stable as $$select 'test-device'::text$$;
create table public.studio_projects(id uuid primary key default gen_random_uuid(),title text,project_code text default 'ATS-PILOT',status text default 'active');
alter table public.studio_projects enable row level security;
grant select on public.studio_projects to anon,authenticated;
create policy project_admin on public.studio_projects for select using(public.portfolio_device_is_trusted());
insert into public.studio_projects(id,title) values('10000000-0000-0000-0000-000000000001','Pilot'),('10000000-0000-0000-0000-000000000002','Other');
insert into auth.users values('20000000-0000-0000-0000-000000000001','maker@test.invalid',now()),('20000000-0000-0000-0000-000000000002','reviewer@test.invalid',now()),('20000000-0000-0000-0000-000000000003','client@test.invalid',now());