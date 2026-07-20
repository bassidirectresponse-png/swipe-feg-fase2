-- Upload hardening for the public `criativos` bucket.
-- Run after db/rls-controle-acesso.sql in Supabase SQL Editor.

update storage.buckets
set file_size_limit = 167772160,
    allowed_mime_types = array[
      'image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'
    ]
where id = 'criativos';

drop policy if exists "criativos_insert" on storage.objects;
drop policy if exists "criativos_update" on storage.objects;

create policy "criativos_insert" on storage.objects for insert to authenticated
with check (
  bucket_id = 'criativos'
  and auth.uid() in (
    'ff9e002e-7ed1-4bc3-8571-18ffcb0c95c3',
    '8257fb1f-74de-47c8-8367-83b5095a1bc0'
  )
  and char_length(name) between 1 and 240
  and name !~ '(^|/)\.\.?(/|$)'
  and lower(storage.extension(name)) = any (array['jpg','jpeg','png','webp','mp4','webm','mov'])
  and lower(coalesce(metadata->>'mimetype', '')) = any (array[
    'image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'
  ])
  and case
    when coalesce(metadata->>'size', '') ~ '^[0-9]+$'
    then (metadata->>'size')::bigint between 1 and 167772160
    else false
  end
);

create policy "criativos_update" on storage.objects for update to authenticated
using (
  bucket_id = 'criativos'
  and auth.uid() in (
    'ff9e002e-7ed1-4bc3-8571-18ffcb0c95c3',
    '8257fb1f-74de-47c8-8367-83b5095a1bc0'
  )
)
with check (
  bucket_id = 'criativos'
  and auth.uid() in (
    'ff9e002e-7ed1-4bc3-8571-18ffcb0c95c3',
    '8257fb1f-74de-47c8-8367-83b5095a1bc0'
  )
  and char_length(name) between 1 and 240
  and name !~ '(^|/)\.\.?(/|$)'
  and lower(storage.extension(name)) = any (array['jpg','jpeg','png','webp','mp4','webm','mov'])
  and lower(coalesce(metadata->>'mimetype', '')) = any (array[
    'image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'
  ])
  and case
    when coalesce(metadata->>'size', '') ~ '^[0-9]+$'
    then (metadata->>'size')::bigint between 1 and 167772160
    else false
  end
);
