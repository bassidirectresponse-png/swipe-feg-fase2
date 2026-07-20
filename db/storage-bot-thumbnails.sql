-- ============================================================================
-- STORAGE — habilita escrita do BOT (e admin) no bucket 'criativos'
-- Necessário para RE-HOSPEDAR as capas do TikTok de forma permanente
-- (as URLs do CDN da TikTok expiram ~24h; no Storage não expiram).
--
-- COMO RODAR: Supabase → SQL Editor → cole tudo → Run.
-- É idempotente: pode rodar mais de uma vez sem problema.
--
-- Usuários (Auth → Users):
--   admin = ff9e002e-7ed1-4bc3-8571-18ffcb0c95c3  (adminswipefeg@swipefeg.app)
--   bot   = 8257fb1f-74de-47c8-8367-83b5095a1bc0  (noticias-bot@swipefeg.app)
-- ============================================================================

-- leitura pública das capas continua (bucket é público); só a ESCRITA é restrita.
update storage.buckets
set file_size_limit = 167772160,
    allowed_mime_types = array[
      'image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'
    ]
where id = 'criativos';

drop policy if exists "criativos_insert" on storage.objects;
drop policy if exists "criativos_update" on storage.objects;
drop policy if exists "criativos_delete" on storage.objects;

create policy "criativos_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'criativos' and auth.uid() in (
    'ff9e002e-7ed1-4bc3-8571-18ffcb0c95c3',
    '8257fb1f-74de-47c8-8367-83b5095a1bc0')
    and char_length(name) between 1 and 240
    and name !~ '(^|/)\.\.?(/|$)'
    and lower(storage.extension(name)) = any (array['jpg','jpeg','png','webp','mp4','webm','mov'])
    and lower(coalesce(metadata->>'mimetype', '')) = any (array[
      'image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'
    ])
    and case when coalesce(metadata->>'size', '') ~ '^[0-9]+$'
      then (metadata->>'size')::bigint between 1 and 167772160 else false end);

create policy "criativos_update" on storage.objects for update to authenticated
  using (bucket_id = 'criativos' and auth.uid() in (
    'ff9e002e-7ed1-4bc3-8571-18ffcb0c95c3',
    '8257fb1f-74de-47c8-8367-83b5095a1bc0'))
  with check (bucket_id = 'criativos' and auth.uid() in (
    'ff9e002e-7ed1-4bc3-8571-18ffcb0c95c3',
    '8257fb1f-74de-47c8-8367-83b5095a1bc0')
    and char_length(name) between 1 and 240
    and name !~ '(^|/)\.\.?(/|$)'
    and lower(storage.extension(name)) = any (array['jpg','jpeg','png','webp','mp4','webm','mov'])
    and lower(coalesce(metadata->>'mimetype', '')) = any (array[
      'image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'
    ])
    and case when coalesce(metadata->>'size', '') ~ '^[0-9]+$'
      then (metadata->>'size')::bigint between 1 and 167772160 else false end);

create policy "criativos_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'criativos' and auth.uid() in (
    'ff9e002e-7ed1-4bc3-8571-18ffcb0c95c3',
    '8257fb1f-74de-47c8-8367-83b5095a1bc0'));

-- Conferência (opcional): deve listar as 3 policies criativos_*
-- select policyname, cmd from pg_policies
--   where schemaname='storage' and tablename='objects' and policyname like 'criativos_%';
