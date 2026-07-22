-- Swipe FEG: estados duráveis, reconciliação e índices das automações.
-- Seguro para executar mais de uma vez no SQL Editor do Supabase.

create index if not exists offers_kind_idx
  on public.offers ((coalesce(data->>'kind', 'oferta')));
create index if not exists offers_analysis_status_idx
  on public.offers ((data->>'analysisStatus'))
  where data ? 'analysisStatus';
create index if not exists offers_transcription_status_idx
  on public.offers ((data->>'transcriptionStatus'))
  where data ? 'transcriptionStatus';
create index if not exists offers_created_at_desc_idx
  on public.offers (created_at desc);
create index if not exists offers_data_search_idx
  on public.offers using gin (data jsonb_path_ops);

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
  has_transcript boolean := nullif(btrim(coalesce(new.data->>'transcricao', '')), '') is not null;
  library_changed boolean := true;
  video_changed boolean := true;
begin
  if tg_op = 'UPDATE' then
    library_changed := old.data->'bibliotecas' is distinct from new.data->'bibliotecas';
    video_changed := old.data->>'video' is distinct from new.data->>'video';
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

  if item_kind in ('criativo', 'megabrain') and has_video and not has_transcript
     and video_changed then
    new.data := new.data || jsonb_build_object(
      'transcriptionStatus', 'pending', 'transcriptionAttempts', 0,
      'transcriptionStartedAt', '', 'transcriptionCompletedAt', '',
      'transcriptionLastError', '', 'transcriptionNextRetryAt', '',
      'transcriptionProvider', 'faster-whisper', 'transcriptionVersion', '1',
      'transcricaoStatus', 'pending'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists offers_prepare_automation_state on public.offers;
create trigger offers_prepare_automation_state
before insert or update of data on public.offers
for each row execute function public.swipe_prepare_automation_state();

create or replace view public.swipe_automation_health
with (security_invoker = true)
as
select
  coalesce(data->>'kind', 'oferta') as kind,
  coalesce(data->>'analysisStatus', 'not_applicable') as analysis_status,
  coalesce(data->>'transcriptionStatus', data->>'transcricaoStatus', 'not_applicable') as transcription_status,
  count(*)::bigint as total
from public.offers
group by 1, 2, 3;

comment on view public.swipe_automation_health is
  'Resumo operacional das análises de biblioteca e transcrições; respeita o RLS de offers.';
