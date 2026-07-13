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
drop policy if exists "criativos_insert" on storage.objects;
drop policy if exists "criativos_update" on storage.objects;
drop policy if exists "criativos_delete" on storage.objects;

create policy "criativos_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'criativos' and auth.uid() in (
    'ff9e002e-7ed1-4bc3-8571-18ffcb0c95c3',
    '8257fb1f-74de-47c8-8367-83b5095a1bc0'));

create policy "criativos_update" on storage.objects for update to authenticated
  using (bucket_id = 'criativos' and auth.uid() in (
    'ff9e002e-7ed1-4bc3-8571-18ffcb0c95c3',
    '8257fb1f-74de-47c8-8367-83b5095a1bc0'))
  with check (bucket_id = 'criativos' and auth.uid() in (
    'ff9e002e-7ed1-4bc3-8571-18ffcb0c95c3',
    '8257fb1f-74de-47c8-8367-83b5095a1bc0'));

create policy "criativos_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'criativos' and auth.uid() in (
    'ff9e002e-7ed1-4bc3-8571-18ffcb0c95c3',
    '8257fb1f-74de-47c8-8367-83b5095a1bc0'));

-- Conferência (opcional): deve listar as 3 policies criativos_*
-- select policyname, cmd from pg_policies
--   where schemaname='storage' and tablename='objects' and policyname like 'criativos_%';
