-- Allow client evidence files during Lead / Discovery before a project exists.

alter table public.studio_files
  alter column project_id drop not null;

alter table public.studio_files
  add column if not exists lead_id uuid references public.studio_leads(id) on delete cascade,
  add column if not exists mime_type text,
  add column if not exists file_size bigint,
  add column if not exists analysis_status text not null default 'not_analyzed',
  add column if not exists analysis_summary text,
  add column if not exists analysis_json jsonb not null default '{}'::jsonb,
  add column if not exists analysis_model text,
  add column if not exists analyzed_at timestamptz;

alter table public.studio_files drop constraint if exists studio_files_owner_scope_check;
alter table public.studio_files add constraint studio_files_owner_scope_check
check (num_nonnulls(project_id,lead_id)=1);

alter table public.studio_files drop constraint if exists studio_files_analysis_status_check;
alter table public.studio_files add constraint studio_files_analysis_status_check
check (analysis_status = any(array[
  'not_analyzed'::text,'analyzing'::text,'ready'::text,'error'::text,'unsupported'::text
]));

create index if not exists studio_files_lead_created_idx
on public.studio_files(lead_id,created_at desc)
where lead_id is not null;

drop policy if exists studio_files_insert_own_lead_upload on public.studio_files;
create policy studio_files_insert_own_lead_upload
on public.studio_files for insert to authenticated
with check (
  uploaded_by=auth.uid()
  and category='client_upload'
  and visibility='client_visible'
  and project_id is null
  and lead_id is not null
  and exists (
    select 1 from public.studio_leads l
    where l.id=studio_files.lead_id
      and lower(l.email)=lower(coalesce(auth.jwt()->>'email',''))
      and l.status not in ('won','lost')
  )
);

drop policy if exists studio_files_read_own_lead_upload on public.studio_files;
create policy studio_files_read_own_lead_upload
on public.studio_files for select to authenticated
using (
  visibility='client_visible'
  and lead_id is not null
  and exists (
    select 1 from public.studio_leads l
    where l.id=studio_files.lead_id
      and lower(l.email)=lower(coalesce(auth.jwt()->>'email',''))
  )
);

drop policy if exists studio_storage_lead_insert on storage.objects;
create policy studio_storage_lead_insert
on storage.objects for insert to authenticated
with check (
  bucket_id='studio-client-files'
  and split_part(name,'/',1)='leads'
  and split_part(name,'/',3)='client_upload'
  and exists (
    select 1 from public.studio_leads l
    where l.id::text=split_part(objects.name,'/',2)
      and lower(l.email)=lower(coalesce(auth.jwt()->>'email',''))
      and l.status not in ('won','lost')
  )
);

drop policy if exists studio_storage_lead_select on storage.objects;
create policy studio_storage_lead_select
on storage.objects for select to authenticated
using (
  bucket_id='studio-client-files'
  and split_part(name,'/',1)='leads'
  and split_part(name,'/',3)='client_upload'
  and exists (
    select 1
    from public.studio_files f
    join public.studio_leads l on l.id=f.lead_id
    where f.storage_path=objects.name
      and f.visibility='client_visible'
      and lower(l.email)=lower(coalesce(auth.jwt()->>'email',''))
  )
);
