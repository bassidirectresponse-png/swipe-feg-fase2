-- Swipe FEG — hardening de produção para o Supabase novo.
-- Idempotente. Execute inteiro no SQL Editor do projeto de produção.
--
-- Objetivos:
--   1. manter escrita restrita ao admin e ao usuário interno de automação;
--   2. permitir que o bot preserve vídeos/imagens no bucket `criativos`;
--   3. impedir perda de campos quando dois robôs atualizam o mesmo card;
--   4. substituir o índice GIN de todo o JSON por índices pequenos e direcionados.

create or replace function public.swipe_can_write()
returns boolean
language sql
stable
set search_path = public
as $$
  select lower(coalesce(auth.jwt()->>'email', '')) = any (array[
    'adminswipefeg@swipefeg.app',
    'userswipefeg@swipefeg.app',
    'noticias-bot@swipefeg.app'
  ]);
$$;

revoke all on function public.swipe_can_write() from public;
grant execute on function public.swipe_can_write() to authenticated, service_role;

alter table public.offers enable row level security;

drop policy if exists "offers_read_all_authenticated" on public.offers;
drop policy if exists "offers_insert_admin" on public.offers;
drop policy if exists "offers_update_admin" on public.offers;
drop policy if exists "offers_delete_admin" on public.offers;

create policy "offers_read_all_authenticated"
  on public.offers for select to authenticated using (true);
create policy "offers_insert_admin"
  on public.offers for insert to authenticated
  with check (public.swipe_can_write());
create policy "offers_update_admin"
  on public.offers for update to authenticated
  using (public.swipe_can_write())
  with check (public.swipe_can_write());
create policy "offers_delete_admin"
  on public.offers for delete to authenticated
  using (public.swipe_can_write());

-- Atualização rasa e atômica do JSON. Evita que uma transcrição apague uma
-- mídia recém-arquivada (ou vice-versa) ao concluir no mesmo instante.
create or replace function public.swipe_merge_offer_data(p_id uuid, p_patch jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  merged jsonb;
begin
  update public.offers
     set data = coalesce(data, '{}'::jsonb) || coalesce(p_patch, '{}'::jsonb)
   where id = p_id
   returning data into merged;
  return merged;
end;
$$;

revoke all on function public.swipe_merge_offer_data(uuid, jsonb) from public;
grant execute on function public.swipe_merge_offer_data(uuid, jsonb) to authenticated, service_role;

-- O GIN do documento JSON inteiro consumia memória, disco e I/O sem ser usado
-- pelas consultas atuais. Os filtros operacionais abaixo são suficientes.
drop index if exists public.offers_data_search_idx;
create index if not exists offers_kind_idx
  on public.offers ((coalesce(data->>'kind', 'oferta')));
create index if not exists offers_created_at_desc_idx
  on public.offers (created_at desc);
create index if not exists offers_analysis_status_idx
  on public.offers ((data->>'analysisStatus'))
  where coalesce(data->>'kind', 'oferta') in ('oferta', 'brandsgeneral', 'brandsvalidated');
create index if not exists offers_transcription_status_idx
  on public.offers ((coalesce(data->>'transcriptionStatus', data->>'transcricaoStatus')))
  where data->>'kind' in ('criativo', 'megabrain');
create index if not exists offers_media_archive_status_idx
  on public.offers ((data->>'mediaArchiveStatus'))
  where data->>'kind' = 'criativo' and data ? 'sourceOfferId';

update storage.buckets
set file_size_limit = 167772160,
    allowed_mime_types = array[
      'image/jpeg','image/png','image/webp',
      'video/mp4','video/webm','video/quicktime'
    ]
where id = 'criativos';

drop policy if exists "criativos_insert" on storage.objects;
drop policy if exists "criativos_update" on storage.objects;
drop policy if exists "criativos_delete" on storage.objects;

create policy "criativos_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'criativos'
    and public.swipe_can_write()
    and char_length(name) between 1 and 240
    and name !~ '(^|/)\.\.?(/|$)'
    and lower(storage.extension(name)) = any (array['jpg','jpeg','png','webp','mp4','webm','mov'])
  );

create policy "criativos_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'criativos' and public.swipe_can_write())
  with check (
    bucket_id = 'criativos'
    and public.swipe_can_write()
    and char_length(name) between 1 and 240
    and name !~ '(^|/)\.\.?(/|$)'
    and lower(storage.extension(name)) = any (array['jpg','jpeg','png','webp','mp4','webm','mov'])
  );

create policy "criativos_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'criativos' and public.swipe_can_write());

-- Conferência final: os três indicadores devem retornar TRUE/1.
select
  public.swipe_can_write() as usuario_pode_escrever,
  (select count(*) from pg_proc where proname = 'swipe_merge_offer_data') as merge_atomico,
  (select count(*) from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname in ('criativos_insert','criativos_update','criativos_delete')) as policies_storage;
