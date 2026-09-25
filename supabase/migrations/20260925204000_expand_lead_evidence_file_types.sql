-- Expand the existing private Studio file bucket for richer Discovery evidence.

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg','image/png','image/webp',
  'application/pdf','application/zip','application/json',
  'text/plain','text/csv','text/markdown','text/html','text/xml','text/rtf',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'video/mp4','video/webm','video/quicktime',
  'audio/wav','audio/mp3','audio/mpeg','audio/aac','audio/ogg','audio/flac','audio/m4a','audio/webm'
]::text[]
where id='studio-client-files';
