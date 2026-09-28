insert into public.portfolio_site_settings(key,value,updated_at)
values(
  'ats_team_notifications',
  '{"custom_resend_enabled":false,"sender_from":"AT Studio <onboarding@resend.dev>"}'::jsonb,
  now()
)
on conflict(key) do update
set value=excluded.value,updated_at=excluded.updated_at;
