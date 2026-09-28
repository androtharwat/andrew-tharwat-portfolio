create index if not exists studio_social_brands_client_idx
  on public.studio_social_brands(client_id);
create index if not exists studio_social_brands_source_lead_idx
  on public.studio_social_brands(source_lead_id);
create index if not exists studio_social_brands_reviewer_idx
  on public.studio_social_brands(reviewer_member_id);
