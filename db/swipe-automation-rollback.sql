-- Rollback estrutural das automações do Swipe.
-- Não remove estados já gravados no JSONB para preservar o histórico.

drop trigger if exists offers_prepare_automation_state on public.offers;
drop function if exists public.swipe_prepare_automation_state();
drop view if exists public.swipe_automation_health;

drop index if exists public.offers_kind_idx;
drop index if exists public.offers_analysis_status_idx;
drop index if exists public.offers_transcription_status_idx;
drop index if exists public.offers_created_at_desc_idx;
drop index if exists public.offers_data_search_idx;
