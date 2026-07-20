-- ============================================================================
-- CONTROLE DE ACESSO — Swipe FEG
-- Somente o ADMIN (e o BOT de automação) podem criar/editar/excluir.
-- Qualquer outro login apenas VISUALIZA (leitura).
--
-- COMO RODAR: Supabase → SQL Editor → cole tudo → Run.
-- É idempotente: pode rodar mais de uma vez sem problema.
--
-- Usuários (Auth → Users):
--   admin = ff9e002e-7ed1-4bc3-8571-18ffcb0c95c3  (adminswipefeg@swipefeg.app)
--   bot   = 8257fb1f-74de-47c8-8367-83b5095a1bc0  (noticias-bot@swipefeg.app)
-- ============================================================================

-- 1) RLS ligado na tabela de dados
alter table public.offers enable row level security;

-- 2) Remove TODAS as policies atuais de offers (estado limpo e previsível)
do $$
declare pol record;
begin
  for pol in select policyname from pg_policies
             where schemaname = 'public' and tablename = 'offers'
  loop
    execute format('drop policy if exists %I on public.offers', pol.policyname);
  end loop;
end $$;

-- 3) LEITURA: qualquer usuário logado pode ver tudo
create policy "offers_read_all_authenticated"
  on public.offers for select
  to authenticated
  using (true);

-- 4) ESCRITA: apenas admin e bot
create policy "offers_insert_admin"
  on public.offers for insert to authenticated
  with check (auth.uid() in (
    'ff9e002e-7ed1-4bc3-8571-18ffcb0c95c3',
    '8257fb1f-74de-47c8-8367-83b5095a1bc0'));

create policy "offers_update_admin"
  on public.offers for update to authenticated
  using (auth.uid() in (
    'ff9e002e-7ed1-4bc3-8571-18ffcb0c95c3',
    '8257fb1f-74de-47c8-8367-83b5095a1bc0'))
  with check (auth.uid() in (
    'ff9e002e-7ed1-4bc3-8571-18ffcb0c95c3',
    '8257fb1f-74de-47c8-8367-83b5095a1bc0'));

create policy "offers_delete_admin"
  on public.offers for delete to authenticated
  using (auth.uid() in (
    'ff9e002e-7ed1-4bc3-8571-18ffcb0c95c3',
    '8257fb1f-74de-47c8-8367-83b5095a1bc0'));

-- 5) STORAGE (bucket 'criativos'): leitura pública continua;
--    envio/alteração de arquivos só admin e bot (o resto é read-only).
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

-- 6) CONFERÊNCIA (opcional): lista as policies resultantes
-- select tablename, policyname, cmd from pg_policies
--   where (schemaname='public' and tablename='offers')
--      or (schemaname='storage' and tablename='objects' and policyname like 'criativos_%')
--   order by tablename, cmd;
