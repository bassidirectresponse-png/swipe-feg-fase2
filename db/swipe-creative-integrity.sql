-- Invariante de mídia + transcrição dos cards de Criativos.
-- Idempotente: pode ser executado novamente sem duplicar cards ou arquivos.

create index if not exists offers_media_archive_status_idx
  on public.offers ((data->>'mediaArchiveStatus'))
  where data->>'kind' = 'criativo';

create index if not exists offers_source_offer_idx
  on public.offers ((data->>'sourceOfferId'))
  where data->>'kind' = 'criativo';

create or replace function public.swipe_prepare_automation_state()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  item_kind text := coalesce(new.data->>'kind', 'oferta');
  has_library boolean := jsonb_typeof(new.data->'bibliotecas') = 'array'
    and jsonb_array_length(new.data->'bibliotecas') > 0;
  has_video boolean := nullif(btrim(coalesce(new.data->>'video', '')), '') is not null;
  has_image boolean := nullif(btrim(coalesce(new.data->>'print', new.data->>'img', '')), '') is not null;
  has_transcript boolean := nullif(btrim(coalesce(new.data->>'transcricao', '')), '') is not null;
  canonical_status text := lower(coalesce(new.data->>'transcriptionStatus', new.data->>'transcricaoStatus', ''));
  library_changed boolean := true;
  video_changed boolean := true;
  source_changed boolean := true;
begin
  if tg_op = 'UPDATE' then
    library_changed := old.data->'bibliotecas' is distinct from new.data->'bibliotecas';
    video_changed := old.data->>'video' is distinct from new.data->>'video';
    source_changed := old.data->>'linkAnuncio' is distinct from new.data->>'linkAnuncio';
  end if;

  if item_kind in ('oferta', 'brandsgeneral', 'brandsvalidated')
     and coalesce(new.data->>'tipoTrafego', 'meta') = 'meta'
     and has_library
     and library_changed then
    new.data := new.data || jsonb_build_object(
      'analysisStatus', 'pending', 'analysisAttempts', 0,
      'analysisStartedAt', '', 'analysisCompletedAt', '',
      'analysisLastError', '', 'analysisNextRetryAt', '', 'analysisVersion', '1'
    );
  end if;

  if item_kind = 'criativo'
     and nullif(btrim(coalesce(new.data->>'sourceOfferId', '')), '') is not null
     and coalesce(new.data->>'linkAnuncio', '') ~* '(facebook\.com|fb\.com|fb\.me|fb\.watch)'
     and not has_video and not has_image
     and (tg_op = 'INSERT' or source_changed or coalesce(new.data->>'mediaArchiveStatus', '') = '') then
    new.data := new.data || jsonb_build_object(
      'mediaArchiveRequired', true, 'mediaArchiveStatus', 'pending',
      'mediaArchiveAttempts', 0, 'mediaArchiveNextRetryAt', '',
      'fbIngestStatus', 'pending', 'mediaAttached', false,
      'transcriptionRequired', true, 'transcriptionStatus', 'waiting_for_media',
      'transcricaoStatus', 'waiting_for_media'
    );
  end if;

  if item_kind in ('criativo', 'megabrain') and has_video then
    if has_transcript then
      new.data := new.data || jsonb_build_object(
        'transcriptionRequired', true, 'transcriptionStatus', 'completed',
        'transcricaoStatus', 'done'
      );
    elsif video_changed or canonical_status in ('', 'completed', 'done', 'failed', 'error', 'not_applicable', 'waiting_for_media') then
      new.data := new.data || jsonb_build_object(
        'transcriptionRequired', true, 'transcriptionStatus', 'pending',
        'transcriptionAttempts', 0, 'transcriptionStartedAt', '',
        'transcriptionCompletedAt', '', 'transcriptionLastError', '',
        'transcriptionNextRetryAt', '', 'transcriptionProvider',
        coalesce(nullif(new.data->>'transcriptionProvider', ''), 'groq'),
        'transcriptionVersion', coalesce(nullif(new.data->>'transcriptionVersion', ''), '1'),
        'transcricaoStatus', 'pending'
      );
    end if;
  elsif item_kind = 'criativo' and has_image and not has_video then
    new.data := new.data || jsonb_build_object(
      'transcriptionRequired', false, 'transcriptionStatus', 'not_applicable',
      'transcricaoStatus', 'not_applicable'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists offers_prepare_automation_state on public.offers;
create trigger offers_prepare_automation_state
before insert or update of data on public.offers
for each row execute function public.swipe_prepare_automation_state();

-- Recupera todos os cards antigos do Facebook que ainda não têm mídia.
update public.offers
set data = data || jsonb_build_object(
  'mediaArchiveRequired', true,
  'mediaArchiveStatus', 'pending',
  'mediaArchiveAttempts', 0,
  'mediaArchiveQueuedAt', '',
  'mediaArchiveStartedAt', '',
  'mediaArchiveNextRetryAt', '',
  'mediaArchiveError', '',
  'mediaAttached', false,
  'fbIngestStatus', 'pending',
  'fbIngestError', '',
  'transcriptionRequired', true,
  'transcriptionStatus', 'waiting_for_media',
  'transcricaoStatus', 'waiting_for_media'
)
where data->>'kind' = 'criativo'
  and nullif(btrim(coalesce(data->>'sourceOfferId', '')), '') is not null
  and coalesce(data->>'linkAnuncio', '') ~* '(facebook\.com|fb\.com|fb\.me|fb\.watch)'
  and nullif(btrim(coalesce(data->>'video', '')), '') is null
  and nullif(btrim(coalesce(data->>'print', data->>'img', '')), '') is null;

-- Corrige inclusive o caso legado "done/completed" sem texto.
update public.offers
set data = data || jsonb_build_object(
  'transcriptionRequired', true,
  'transcriptionStatus', 'pending',
  'transcriptionAttempts', 0,
  'transcriptionStartedAt', '',
  'transcriptionCompletedAt', '',
  'transcriptionLastError', '',
  'transcriptionNextRetryAt', '',
  'transcriptionProvider', coalesce(nullif(data->>'transcriptionProvider', ''), 'groq'),
  'transcriptionVersion', coalesce(nullif(data->>'transcriptionVersion', ''), '1'),
  'transcricaoStatus', 'pending',
  'transcricaoError', ''
)
where data->>'kind' in ('criativo', 'megabrain')
  and nullif(btrim(coalesce(data->>'video', '')), '') is not null
  and nullif(btrim(coalesce(data->>'transcricao', '')), '') is null;

-- Normaliza cards que já têm texto, mas ficaram com estado antigo.
update public.offers
set data = data || jsonb_build_object(
  'transcriptionRequired', true,
  'transcriptionStatus', 'completed',
  'transcricaoStatus', 'done'
)
where data->>'kind' in ('criativo', 'megabrain')
  and nullif(btrim(coalesce(data->>'video', '')), '') is not null
  and nullif(btrim(coalesce(data->>'transcricao', '')), '') is not null;
