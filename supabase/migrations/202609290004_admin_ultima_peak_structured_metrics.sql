-- Prévia administrativa: os prints não integram o card de Ultima Peak.
-- Se a versão 003 antiga chegou a ser aplicada, esta migração limpa os anexos
-- do rascunho, preservando relatórios, anúncios, links e a oferta publicada.
begin;

update public.admin_offer_drafts
set data_patch = data_patch || jsonb_build_object('bmPrints', '[]'::jsonb),
    updated_at = now(),
    updated_by = 'migration'
where target_offer_id = '23681d5a-89f6-4f41-8afb-ba3c8ab9bed9';

commit;
