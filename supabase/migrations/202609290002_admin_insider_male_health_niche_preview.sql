-- Prévia administrativa: quatro nichos canônicos; somente disfunção erétil é
-- migrada automaticamente para Saúde masculina. Nichos antigos não mapeados
-- ficam em Pendente de revisão, conforme solicitado. Dados públicos intactos.
begin;

insert into public.admin_offer_drafts (target_offer_id, label, data_patch)
select
  o.id,
  'Classificação de nicho · prévia admin',
  jsonb_build_object('nicho', case
    when lower(coalesce(o.data->>'nicho', '')) like '%disfunção erétil%'
      or lower(coalesce(o.data->>'nicho', '')) like '%disfuncao eretil%'
      then 'Saúde masculina'
    when lower(coalesce(o.data->>'nicho', '')) = 'saúde masculina' then 'Saúde masculina'
    when lower(coalesce(o.data->>'nicho', '')) = 'saúde feminina' then 'Saúde feminina'
    when lower(coalesce(o.data->>'nicho', '')) = 'nicho pet' then 'Nicho pet'
    when lower(coalesce(o.data->>'nicho', '')) = 'saúde mental' then 'Saúde mental'
    else 'Pendente de revisão'
  end)
from public.offers as o
  where o.data->>'kind' = 'brandsvalidated'
on conflict (target_offer_id) do update
set label = case
      when public.admin_offer_drafts.label = 'Ultima Peak · Setembro 2026'
        then public.admin_offer_drafts.label
      else excluded.label
    end,
    data_patch = public.admin_offer_drafts.data_patch || excluded.data_patch,
    updated_at = now(),
    updated_by = 'migration';

commit;
