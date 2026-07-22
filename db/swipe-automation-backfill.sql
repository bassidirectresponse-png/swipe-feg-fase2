-- Enfileira somente itens antigos elegíveis que ainda não têm estado durável.
-- Execute depois de db/swipe-automation-hardening.sql.

update public.offers
set data = data || jsonb_build_object(
  'analysisStatus', 'pending', 'analysisAttempts', 0,
  'analysisStartedAt', '', 'analysisCompletedAt', '',
  'analysisLastError', '', 'analysisNextRetryAt', '', 'analysisVersion', '1'
)
where coalesce(data->>'kind', 'oferta') in ('oferta', 'brandsgeneral', 'brandsvalidated')
  and coalesce(data->>'tipoTrafego', 'meta') = 'meta'
  and jsonb_typeof(data->'bibliotecas') = 'array'
  and jsonb_array_length(data->'bibliotecas') > 0
  and not (data ? 'analysisStatus');

update public.offers
set data = data || jsonb_build_object(
  'transcriptionStatus', 'pending', 'transcriptionAttempts', 0,
  'transcriptionStartedAt', '', 'transcriptionCompletedAt', '',
  'transcriptionLastError', '', 'transcriptionNextRetryAt', '',
  'transcriptionProvider', 'faster-whisper', 'transcriptionVersion', '1',
  'transcricaoStatus', 'pending'
)
where data->>'kind' in ('criativo', 'megabrain')
  and nullif(btrim(coalesce(data->>'video', '')), '') is not null
  and nullif(btrim(coalesce(data->>'transcricao', '')), '') is null
  and not (data ? 'transcriptionStatus');
