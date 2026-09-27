-- Additive pilot engine. Existing Client Operations tables/policies are unchanged.
create schema if not exists ats_team_private;
revoke all on schema ats_team_private from public;
grant usage on schema ats_team_private to anon, authenticated;

create table public.studio_team_members (
 id uuid primary key default gen_random_uuid(),
 auth_user_id uuid unique references auth.users(id),
 email text not null unique check (email = lower(trim(email)) and position('@' in email)>1),
 full_name text not null check (length(trim(full_name)) between 1 and 160),
 member_type text not null default 'contributor' check (member_type in ('founder','core_partner_candidate','project_partner','contributor','external_supplier')),
 active boolean not null default true, available boolean not null default true,
 can_claim boolean not null default true, capacity integer not null default 2 check (capacity between 1 and 50),
 created_at timestamptz not null default now()
);
create table public.studio_member_skills (
 member_id uuid not null references public.studio_team_members(id),
 skill text not null check (skill=lower(trim(skill)) and length(skill) between 1 and 80),
 level integer not null check (level between 1 and 5), primary key(member_id,skill)
);
create table public.studio_project_workstreams (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.studio_projects(id),
 name text not null check(length(trim(name)) between 1 and 160), unique(project_id,name), unique(id,project_id)
);
create table public.studio_project_tasks (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.studio_projects(id),
 workstream_id uuid not null, title text not null check(length(trim(title)) between 1 and 200),
 required_skill text not null check(required_skill=lower(trim(required_skill)) and length(required_skill) between 1 and 80),
 required_level integer not null default 1 check(required_level between 1 and 5),
 expected_output text not null check(length(trim(expected_output)) between 1 and 10000),
 acceptance_criteria text not null check(length(trim(acceptance_criteria)) between 1 and 10000),
 owner_id uuid references public.studio_team_members(id),
 reviewer_id uuid not null references public.studio_team_members(id),
 admin_acceptance boolean not null default true,
 due_at timestamptz not null, base_tokens integer not null check(base_tokens between 1 and 100000),
 status text not null default 'available' check(status in ('available','assigned','in_progress','review','accepted','closed')),
 assignment_mode text not null default 'marketplace' check(assignment_mode in ('marketplace','direct')),
 submission text, rework_reason text, rework_category text check(rework_category in ('contributor_error','client_change','brief_issue')),
 escalate_hours integer not null default 24 check(escalate_hours between 1 and 720),
 available_since timestamptz not null default now(), created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), submitted_at timestamptz, accepted_at timestamptz,
 foreign key(workstream_id,project_id) references public.studio_project_workstreams(id,project_id),
 check(owner_id is null or owner_id<>reviewer_id),
 check((status='available' and owner_id is null) or (status<>'available' and owner_id is not null))
);
create index studio_tasks_project_idx on public.studio_project_tasks(project_id);
create index studio_tasks_owner_status_idx on public.studio_project_tasks(owner_id,status);
create index studio_tasks_reviewer_idx on public.studio_project_tasks(reviewer_id);
create index studio_tasks_workstream_idx on public.studio_project_tasks(workstream_id,project_id);
create index studio_tasks_queue_idx on public.studio_project_tasks(status,due_at);
create table public.studio_task_dependencies (
 task_id uuid not null references public.studio_project_tasks(id),
 depends_on uuid not null references public.studio_project_tasks(id),
 primary key(task_id,depends_on), check(task_id<>depends_on)
);
create index studio_dependencies_parent_idx on public.studio_task_dependencies(depends_on);
create table public.studio_task_events (
 id uuid primary key default gen_random_uuid(), task_id uuid references public.studio_project_tasks(id),
 member_id uuid references public.studio_team_members(id), actor_user_id uuid,
 actor_device_id text, action text not null, details jsonb not null default '{}',
 created_at timestamptz not null default now()
);
create index studio_task_events_task_idx on public.studio_task_events(task_id,created_at);
create index studio_task_events_member_idx on public.studio_task_events(member_id);
create table public.studio_token_ledger (
 id uuid primary key default gen_random_uuid(), task_id uuid not null references public.studio_project_tasks(id),
 project_id uuid not null references public.studio_projects(id), member_id uuid not null references public.studio_team_members(id),
 event_type text not null check(event_type in ('RESERVED','RELEASED','EARNED','BONUS')),
 tokens integer not null check(tokens>0), reason text not null,
 request_id uuid unique, actor_user_id uuid, actor_device_id text,
 created_at timestamptz not null default now()
);
create unique index studio_once_earned_idx on public.studio_token_ledger(task_id) where event_type='EARNED';
create index studio_tokens_member_idx on public.studio_token_ledger(member_id,project_id);
create index studio_tokens_project_idx on public.studio_token_ledger(project_id);
create index studio_tokens_task_idx on public.studio_token_ledger(task_id);

create function ats_team_private.member_id() returns uuid language sql stable security definer set search_path='' as $$
 select id from public.studio_team_members where auth_user_id=auth.uid() and active and auth.uid() is not null
$$;
create function ats_team_private.eligible(p_task uuid,p_member uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.studio_project_tasks t join public.studio_team_members m on m.id=p_member
 join public.studio_member_skills s on s.member_id=m.id and s.skill=t.required_skill and s.level>=t.required_level
 where t.id=p_task and t.status='available' and t.assignment_mode='marketplace'
 and exists(select 1 from public.studio_projects p where p.id=t.project_id and p.status not in ('completed','cancelled'))
 and m.active and m.available and m.can_claim and m.id<>t.reviewer_id
 and (select count(*) from public.studio_project_tasks a where a.owner_id=m.id and a.status in ('assigned','in_progress','review'))<m.capacity
 and not exists(select 1 from public.studio_task_dependencies d join public.studio_project_tasks dep on dep.id=d.depends_on where d.task_id=t.id and dep.status not in ('accepted','closed')))
$$;
create function ats_team_private.can_read_task(p_task uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.portfolio_device_is_trusted() or (auth.uid() is not null and exists(
 select 1 from public.studio_project_tasks t where t.id=p_task and
 (t.owner_id=ats_team_private.member_id() or t.reviewer_id=ats_team_private.member_id() or ats_team_private.eligible(t.id,ats_team_private.member_id()))))
$$;

-- Append-only at the database boundary, including accidental privileged writes.
create function ats_team_private.immutable_event() returns trigger language plpgsql set search_path='' as $$
 begin raise exception 'Audit and token history is append-only'; end
$$;
create trigger studio_tokens_immutable before update or delete on public.studio_token_ledger for each row execute function ats_team_private.immutable_event();
create trigger studio_task_events_immutable before update or delete on public.studio_task_events for each row execute function ats_team_private.immutable_event();

alter table public.studio_team_members enable row level security;
alter table public.studio_member_skills enable row level security;
alter table public.studio_project_workstreams enable row level security;
alter table public.studio_project_tasks enable row level security;
alter table public.studio_task_dependencies enable row level security;
alter table public.studio_task_events enable row level security;
alter table public.studio_token_ledger enable row level security;
create policy team_read on public.studio_team_members for select to anon,authenticated using ((select public.portfolio_device_is_trusted()) or id=(select ats_team_private.member_id()));
create policy skills_read on public.studio_member_skills for select to anon,authenticated using ((select public.portfolio_device_is_trusted()) or member_id=(select ats_team_private.member_id()));
create policy streams_read on public.studio_project_workstreams for select to anon,authenticated using ((select public.portfolio_device_is_trusted()) or exists(select 1 from public.studio_project_tasks t where t.workstream_id=studio_project_workstreams.id));
create policy tasks_read on public.studio_project_tasks for select to anon,authenticated using (ats_team_private.can_read_task(id));
create policy dependencies_read on public.studio_task_dependencies for select to anon,authenticated using (ats_team_private.can_read_task(task_id));
create policy events_read on public.studio_task_events for select to anon,authenticated using ((select public.portfolio_device_is_trusted()) or (member_id=(select ats_team_private.member_id()) and task_id is not null));
create policy tokens_read on public.studio_token_ledger for select to anon,authenticated using ((select public.portfolio_device_is_trusted()) or member_id=(select ats_team_private.member_id()));
revoke all on public.studio_team_members,public.studio_member_skills,public.studio_project_workstreams,public.studio_project_tasks,public.studio_task_dependencies,public.studio_task_events,public.studio_token_ledger from anon,authenticated;
grant select on public.studio_team_members,public.studio_member_skills,public.studio_project_workstreams,public.studio_project_tasks,public.studio_task_dependencies,public.studio_task_events,public.studio_token_ledger to anon,authenticated;

create function ats_team_private.command(p_action text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 admin boolean := coalesce(public.portfolio_device_is_trusted(),false);
 me uuid := ats_team_private.member_id(); uid uuid := auth.uid();
 device text := case when admin then public.portfolio_request_header('x-portfolio-device-id') else null end;
 t public.studio_project_tasks%rowtype; m public.studio_team_members%rowtype;
 tid uuid; mid uuid; wid uuid; pid uuid; deps uuid[]; dep uuid; verified_email text;
 note text:=trim(coalesce(p->>'reason','')); next_status text; n integer; details jsonb;
begin
 if not admin and uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 -- One lock for short pilot writes: serializes claims, capacity changes and dependency edits.
 perform pg_advisory_xact_lock(724901,1);
 admin:=coalesce(public.portfolio_device_is_trusted(),false);
 me:=ats_team_private.member_id();
 if p_action='activate' then
   if uid is null then raise exception 'Sign in with your member email'; end if;
   select lower(email) into verified_email from auth.users where id=uid and email_confirmed_at is not null;
   update public.studio_team_members set auth_user_id=uid where email=verified_email and active and (auth_user_id is null or auth_user_id=uid) returning id into mid;
   if mid is null then raise exception 'No active ATS membership for this verified email'; end if;
   return jsonb_build_object('member_id',mid);
 end if;
 if not admin and me is null then raise exception 'Active ATS membership required' using errcode='42501'; end if;
 if p_action='save_member' then
   if not admin then raise exception 'Admin only' using errcode='42501'; end if;
   mid:=coalesce(nullif(p->>'id','')::uuid,gen_random_uuid());
   select * into m from public.studio_team_members where id=mid;
   if found and m.auth_user_id is not null and m.email<>lower(trim(p->>'email')) then raise exception 'Linked member email cannot be changed'; end if;
   insert into public.studio_team_members(id,email,full_name,member_type,capacity,active,available,can_claim)
   values(mid,lower(trim(p->>'email')),trim(p->>'full_name'),coalesce(p->>'member_type','contributor'),coalesce((p->>'capacity')::int,2),coalesce((p->>'active')::boolean,true),coalesce((p->>'available')::boolean,true),coalesce((p->>'can_claim')::boolean,true))
   on conflict(id) do update set email=excluded.email,full_name=excluded.full_name,member_type=excluded.member_type,capacity=excluded.capacity,active=excluded.active,available=excluded.available,can_claim=excluded.can_claim;
   delete from public.studio_member_skills where member_id=mid;
   insert into public.studio_member_skills(member_id,skill,level) select mid,lower(trim(x->>'skill')),(x->>'level')::int from jsonb_array_elements(coalesce(p->'skills','[]')) x;
   insert into public.studio_task_events(member_id,actor_user_id,actor_device_id,action,details) values(mid,uid,device,p_action,jsonb_build_object('before',to_jsonb(m),'after',p));
   return jsonb_build_object('id',mid);
 end if;
 if p_action in ('create_task','edit_task') then
   if not admin then raise exception 'Admin only' using errcode='42501'; end if;
   tid:=case when p_action='edit_task' then (p->>'id')::uuid else gen_random_uuid() end;
   if p_action='edit_task' then
     select * into t from public.studio_project_tasks where id=tid for update;
     if not found or t.status<>'available' then raise exception 'Only available task scope can be edited'; end if;
     if note='' then raise exception 'Record a reason for changing task scope'; end if;
   end if;
   pid:=(p->>'project_id')::uuid;
   if t.id is not null and t.project_id<>pid then raise exception 'Task project cannot change'; end if;
   if not exists(select 1 from public.studio_projects where id=pid and status not in ('completed','cancelled')) then raise exception 'Choose an active project'; end if;
   if not exists(select 1 from public.studio_team_members where id=(p->>'reviewer_id')::uuid and active) then raise exception 'Choose an active reviewer'; end if;
   insert into public.studio_project_workstreams(project_id,name) values(pid,trim(p->>'workstream')) on conflict(project_id,name) do update set name=excluded.name returning id into wid;
   insert into public.studio_project_tasks(id,project_id,workstream_id,title,required_skill,required_level,expected_output,acceptance_criteria,reviewer_id,admin_acceptance,due_at,base_tokens,assignment_mode,escalate_hours)
   values(tid,pid,wid,trim(p->>'title'),lower(trim(p->>'required_skill')),coalesce((p->>'required_level')::int,1),trim(p->>'expected_output'),trim(p->>'acceptance_criteria'),(p->>'reviewer_id')::uuid,coalesce((p->>'admin_acceptance')::boolean,true),(p->>'due_at')::timestamptz,(p->>'base_tokens')::int,coalesce(p->>'assignment_mode','marketplace'),coalesce((p->>'escalate_hours')::int,24))
   on conflict(id) do update set workstream_id=excluded.workstream_id,title=excluded.title,required_skill=excluded.required_skill,required_level=excluded.required_level,expected_output=excluded.expected_output,acceptance_criteria=excluded.acceptance_criteria,reviewer_id=excluded.reviewer_id,admin_acceptance=excluded.admin_acceptance,due_at=excluded.due_at,base_tokens=excluded.base_tokens,assignment_mode=excluded.assignment_mode,escalate_hours=excluded.escalate_hours,updated_at=now();
   select coalesce(array_agg(value::uuid),'{}') into deps from jsonb_array_elements_text(coalesce(p->'dependencies','[]'));
   delete from public.studio_task_dependencies where task_id=tid;
   foreach dep in array deps loop
     if dep=tid or not exists(select 1 from public.studio_project_tasks where id=dep and project_id=pid) then raise exception 'Dependency must be another task in this project'; end if;
     if exists(with recursive chain(id) as (select dep union select d.depends_on from public.studio_task_dependencies d join chain c on d.task_id=c.id) select 1 from chain where id=tid) then raise exception 'Dependency cycle is not allowed'; end if;
     insert into public.studio_task_dependencies values(tid,dep) on conflict do nothing;
   end loop;
   insert into public.studio_task_events(task_id,actor_user_id,actor_device_id,action,details) values(tid,uid,device,p_action,jsonb_build_object('before',to_jsonb(t),'after',p));
   return jsonb_build_object('id',tid);
 end if;
 tid:=(p->>'id')::uuid;
 select * into t from public.studio_project_tasks where id=tid for update;
 if not found then raise exception 'Task unavailable'; end if;
 if not admin and t.owner_id is distinct from me and t.reviewer_id is distinct from me and not ats_team_private.eligible(tid,me) then raise exception 'Task unavailable' using errcode='42501'; end if;
 next_status:=t.status;
 if p_action in ('claim','assign') then
   if p_action='assign' and not admin then raise exception 'Admin only' using errcode='42501'; end if;
   mid:=case when p_action='assign' then (p->>'member_id')::uuid else me end;
   if t.status<>'available' then raise exception 'Task already assigned'; end if;
   if not exists(select 1 from public.studio_projects where id=t.project_id and status not in ('completed','cancelled')) then raise exception 'Project is no longer active'; end if;
   select * into m from public.studio_team_members where id=mid and active for update;
   if not found or mid=t.reviewer_id then raise exception 'Choose an active owner different from the reviewer'; end if;
   if p_action='claim' and not ats_team_private.eligible(tid,mid) then raise exception 'Task does not match your skills, availability or capacity'; end if;
   if not exists(select 1 from public.studio_member_skills where member_id=mid and skill=t.required_skill and level>=t.required_level) then raise exception 'Required skill or level missing'; end if;
   if not m.available then raise exception 'Member is unavailable'; end if;
   if exists(select 1 from public.studio_task_dependencies d join public.studio_project_tasks a on a.id=d.depends_on where d.task_id=tid and a.status not in ('accepted','closed')) then raise exception 'Dependencies must be accepted first'; end if;
   select count(*) into n from public.studio_project_tasks where owner_id=mid and status in ('assigned','in_progress','review');
   if n>=m.capacity and not (admin and coalesce((p->>'override_capacity')::boolean,false) and note<>'') then raise exception 'Capacity reached; admin override requires a reason'; end if;
   update public.studio_project_tasks set owner_id=mid,status='assigned',submission=null,rework_reason=null,rework_category=null,submitted_at=null where id=tid;
   insert into public.studio_token_ledger(task_id,project_id,member_id,event_type,tokens,reason,actor_user_id,actor_device_id) values(tid,t.project_id,mid,'RESERVED',t.base_tokens,'Task assigned',uid,device);
   next_status:='assigned';
 elsif p_action='unassign' then
   if not admin then raise exception 'Admin only' using errcode='42501'; end if;
   if t.status not in ('assigned','in_progress','review') or note='' then raise exception 'Active assignment and reason required'; end if;
   insert into public.studio_token_ledger(task_id,project_id,member_id,event_type,tokens,reason,actor_user_id,actor_device_id) values(tid,t.project_id,t.owner_id,'RELEASED',t.base_tokens,note,uid,device);
   update public.studio_project_tasks set owner_id=null,status='available',submission=null,rework_reason=null,rework_category=null,submitted_at=null,available_since=now() where id=tid;
   next_status:='available';
 elsif p_action='start' then
   if t.status<>'assigned' or (not admin and t.owner_id is distinct from me) then raise exception 'Only the assigned owner may start'; end if;
   if exists(select 1 from public.studio_task_dependencies d join public.studio_project_tasks a on a.id=d.depends_on where d.task_id=tid and a.status not in ('accepted','closed')) then raise exception 'Dependencies must be accepted first'; end if;
   next_status:='in_progress';
 elsif p_action='submit' then
   if t.status<>'in_progress' or (not admin and t.owner_id is distinct from me) then raise exception 'Only the working owner may submit'; end if;
   if length(trim(coalesce(p->>'submission',''))) not between 1 and 10000 then raise exception 'Add delivery evidence or a link'; end if;
   update public.studio_project_tasks set submission=trim(p->>'submission'),submitted_at=now() where id=tid;
   next_status:='review';
 elsif p_action in ('accept','rework') then
   if t.status<>'review' then raise exception 'Task must be under review'; end if;
   if not admin and (t.reviewer_id is distinct from me or (p_action='accept' and t.admin_acceptance)) then raise exception 'Reviewer or admin approval required' using errcode='42501'; end if;
   if p_action='rework' then
     if note='' or coalesce(p->>'category','') not in ('contributor_error','client_change','brief_issue') then raise exception 'Rework category and reason required'; end if;
     update public.studio_project_tasks set rework_reason=note,rework_category=p->>'category' where id=tid;
     next_status:='in_progress';
   else
     insert into public.studio_token_ledger(task_id,project_id,member_id,event_type,tokens,reason,actor_user_id,actor_device_id) values
      (tid,t.project_id,t.owner_id,'RELEASED',t.base_tokens,'Accepted: reservation converted to earned',uid,device),
      (tid,t.project_id,t.owner_id,'EARNED',t.base_tokens,'Acceptance criteria met',uid,device);
     update public.studio_project_tasks set accepted_at=now(),rework_reason=null,rework_category=null where id=tid;
     next_status:='accepted';
   end if;
 elsif p_action='bonus' then
   if not admin then raise exception 'Admin only' using errcode='42501'; end if;
   if t.status not in ('accepted','closed') or note='' or (p->>'tokens') is null or (p->>'tokens')::int not between 1 and 100000 or nullif(p->>'request_id','') is null then raise exception 'Accepted task, positive tokens, reason and request ID required'; end if;
   insert into public.studio_token_ledger(task_id,project_id,member_id,event_type,tokens,reason,request_id,actor_user_id,actor_device_id) values(tid,t.project_id,t.owner_id,'BONUS',(p->>'tokens')::int,note,(p->>'request_id')::uuid,uid,device);
 elsif p_action='deadline' then
   if not admin then raise exception 'Admin only' using errcode='42501'; end if;
   if t.status in ('accepted','closed') or note='' then raise exception 'Open task and change reason required'; end if;
   update public.studio_project_tasks set due_at=(p->>'due_at')::timestamptz where id=tid;
 elsif p_action='close' then
   if not admin or t.status<>'accepted' then raise exception 'Admin can close accepted tasks only'; end if;
   next_status:='closed';
 else raise exception 'Unknown task action';
 end if;
 update public.studio_project_tasks set status=next_status,updated_at=now() where id=tid;
 details:=p - 'id';
 insert into public.studio_task_events(task_id,member_id,actor_user_id,actor_device_id,action,details) values(tid,coalesce(mid,t.owner_id),uid,device,p_action,details||jsonb_build_object('from',t.status,'to',next_status,'previous_deadline',t.due_at));
 return jsonb_build_object('id',tid,'status',next_status);
end $$;

create function public.studio_team_command(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$
 select ats_team_private.command(p_action,p_payload)
$$;
revoke all on all functions in schema ats_team_private from public;
-- eligible is internal only; clients use can_read_task without choosing a member.
grant execute on function ats_team_private.member_id(),ats_team_private.can_read_task(uuid),ats_team_private.command(text,jsonb) to anon,authenticated;
revoke all on function public.studio_team_command(text,jsonb) from public;
grant execute on function public.studio_team_command(text,jsonb) to anon,authenticated;

-- Minimal task context; never grants members access to commercial project rows.
create function ats_team_private.task_context() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not coalesce(public.portfolio_device_is_trusted(),false) and (auth.uid() is null or ats_team_private.member_id() is null) then
   raise exception 'Active membership required' using errcode='42501';
 end if;
 return coalesce((select jsonb_agg(jsonb_build_object('task_id',t.id,'project_title',p.title,'project_code',p.project_code,'owner_name',o.full_name,'reviewer_name',r.full_name))
 from public.studio_project_tasks t join public.studio_projects p on p.id=t.project_id
 left join public.studio_team_members o on o.id=t.owner_id join public.studio_team_members r on r.id=t.reviewer_id
 where ats_team_private.can_read_task(t.id)),'[]'::jsonb);
end $$;
create function public.studio_team_context() returns jsonb language sql security invoker set search_path='' as $$ select ats_team_private.task_context() $$;
revoke all on function ats_team_private.task_context(),public.studio_team_context() from public;
grant execute on function ats_team_private.task_context(),public.studio_team_context() to anon,authenticated;
