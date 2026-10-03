-- Independent Move Now data; no access to ATS client/project tables.
create table if not exists public.move_now_leads (
 id uuid primary key, name text not null, phone text not null,
 service text not null check (service in ('buy','finish','rent','both')),
 details text not null,
 status text not null default 'new' check (status in ('new','contacted','visit','offer','active','done','closed')),
 assigned text not null default '', notes text not null default '', next_followup text not null default '',
 created_at bigint not null, updated_at bigint not null
);
create index if not exists move_now_leads_created_idx on public.move_now_leads(created_at desc);
create index if not exists move_now_leads_status_idx on public.move_now_leads(status);
create table if not exists public.move_now_admins (
 email text primary key check (email=lower(email)), name text not null, created_at bigint not null
);
create table if not exists public.move_now_submissions (
 key text primary key, window_start bigint not null, count integer not null
);
alter table public.move_now_leads enable row level security;
alter table public.move_now_admins enable row level security;
alter table public.move_now_submissions enable row level security;
revoke all on public.move_now_leads,public.move_now_admins,public.move_now_submissions from public,anon,authenticated;
grant all on public.move_now_leads,public.move_now_admins,public.move_now_submissions to service_role;
create or replace function public.move_now_submission_attempt(p_key text,p_window bigint)
returns integer language sql security invoker set search_path=public,pg_temp as $$
 insert into public.move_now_submissions as s(key,window_start,count) values(p_key,p_window,1)
 on conflict(key) do update set window_start=excluded.window_start,
 count=case when s.window_start=excluded.window_start then s.count+1 else 1 end
 returning count;
$$;
create or replace function public.move_now_stats()
returns table(status text,count bigint) language sql security invoker set search_path=public,pg_temp as $$
 select l.status,count(*) from public.move_now_leads l group by l.status;
$$;
revoke all on function public.move_now_submission_attempt(text,bigint),public.move_now_stats() from public,anon,authenticated;
grant execute on function public.move_now_submission_attempt(text,bigint),public.move_now_stats() to service_role;
