-- Allow document-derived discovery signals while preserving source traceability.

alter table public.studio_discovery_answers
  drop constraint if exists studio_discovery_answers_source_channel_check;
alter table public.studio_discovery_answers
  add constraint studio_discovery_answers_source_channel_check
  check (source_channel = any(array[
    'intake'::text,'portal'::text,'whatsapp'::text,'email'::text,'call'::text,'admin'::text,'document'::text
  ]));
