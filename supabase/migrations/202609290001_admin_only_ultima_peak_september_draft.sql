-- Dados provisórios de setembro para validação exclusiva do administrador.
-- Nada nesta migração atualiza public.offers; a versão compartilhada permanece intacta.

begin;

create table if not exists public.admin_offer_drafts (
  target_offer_id uuid primary key references public.offers(id) on delete cascade,
  label text not null,
  data_patch jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null default coalesce(auth.jwt()->>'email', 'migration')
);

alter table public.admin_offer_drafts enable row level security;
revoke all on public.admin_offer_drafts from anon;
grant select, insert, update, delete on public.admin_offer_drafts to authenticated;
grant all on public.admin_offer_drafts to service_role;

drop policy if exists "admin_offer_drafts_admin_only" on public.admin_offer_drafts;
create policy "admin_offer_drafts_admin_only"
  on public.admin_offer_drafts for all to authenticated
  using (public.swipe_is_admin())
  with check (public.swipe_is_admin());

insert into public.admin_offer_drafts (target_offer_id, label, data_patch)
values (
  '23681d5a-89f6-4f41-8afb-ba3c8ab9bed9',
  'Ultima Peak · Setembro 2026',
  $draft${
    "bmSpend7d":"US$ 8.379,11",
    "bmSpend14d":"US$ 16.027,54",
    "bmSpend30d":"US$ 34.397,81",
    "bmAvgConversion":"US$ 100,88",
    "bmCpc":"Não exibido no print de setembro",
    "bmCpcLink":"US$ 2,51",
    "bmCpm":"US$ 48,96",
    "bmCtr":"1,95%",
    "bmCostUnique":"Não exibido no print de setembro",
    "bmCostIc":"Não exibido no print de setembro",
    "bmRoas":"ROAS total não exibido no resumo de setembro",
    "bmUpdatedAt":"18/09/2026",
    "adsLibraryCheckedAt":"18/09/2026",
    "bmNotes":"A atualização de setembro é um rascunho para validação. No recorte de 30 dias, a campanha Aquec teve US$ 11,22 de gasto e 76 visitas à página/perfil; esses resultados não são compras e estão separados das 395 compras das quatro campanhas de venda. Valores em USD.",
    "bmReports":[
      {
        "key":"2026-09-18-30d","label":"Setembro 2026 · Últimos 30 dias","range":"20/08/2026 a 18/09/2026","level":"Campanhas","currency":"USD","capturedAt":"2026-09-18",
        "totals":{"spend":"US$ 34.397,81","roas":"—","avgConversion":"US$ 99,43","costResult":"—","results":"395 compras","ctr":"1,97%","cpc":"US$ 2,80","cpm":"US$ 55,12","otherResults":"Aquec: 76 visitas à página/perfil (não são compras)."},
        "campaigns":[
          {"name":"19/08/26 | BnB | BR-CBO | CA01","spend":"US$ 8.970,48","roas":"1,12","avgConversion":"US$ 97,86","costResult":"US$ 87,09","results":"103 compras","ctr":"1,39%","cpc":"US$ 3,15","cpm":"US$ 43,68"},
          {"name":"04/08/26 | BnB | BS-CBO | CA01 | OP","spend":"US$ 8.842,08","roas":"1,28","avgConversion":"US$ 99,15","costResult":"US$ 77,56","results":"114 compras","ctr":"2,32%","cpc":"US$ 2,67","cpm":"US$ 61,72"},
          {"name":"04/08/26 | BnB | BS-CBO | CA01","spend":"US$ 8.641,47","roas":"1,00","avgConversion":"US$ 99,33","costResult":"US$ 99,33","results":"87 compras","ctr":"2,61%","cpc":"US$ 2,62","cpm":"US$ 68,25"},
          {"name":"10/08/26 | BnB | BT-CBO | CA01","spend":"US$ 7.932,56","roas":"1,17","avgConversion":"US$ 101,99","costResult":"US$ 87,17","results":"91 compras","ctr":"1,86%","cpc":"US$ 2,88","cpm":"US$ 53,68"},
          {"name":"Aquec · visitas à página/perfil (não compra)","spend":"US$ 11,22","roas":"—","avgConversion":"—","costResult":"US$ 0,15","results":"76 visitas (não compras)","ctr":"4,98%","cpc":"US$ 0,22","cpm":"US$ 11,16"}
        ]
      },
      {
        "key":"2026-09-18-14d","label":"Setembro 2026 · Últimos 14 dias","range":"05/09/2026 a 18/09/2026","level":"Campanhas","currency":"USD","capturedAt":"2026-09-18",
        "totals":{"spend":"US$ 16.027,54","roas":"—","avgConversion":"US$ 98,25","costResult":"—","results":"180 compras","ctr":"1,89%","cpc":"US$ 2,62","cpm":"US$ 49,59"},
        "campaigns":[
          {"name":"19/08/26 | BnB | BR-CBO | CA01","spend":"US$ 4.235,86","roas":"1,01","avgConversion":"US$ 101,40","costResult":"US$ 100,85","results":"42 compras","ctr":"1,22%","cpc":"US$ 3,01","cpm":"US$ 36,93"},
          {"name":"04/08/26 | BnB | BS-CBO | CA01 | OP","spend":"US$ 4.215,69","roas":"1,13","avgConversion":"US$ 97,32","costResult":"US$ 86,03","results":"49 compras","ctr":"2,39%","cpc":"US$ 2,78","cpm":"US$ 66,25"},
          {"name":"04/08/26 | BnB | BS-CBO | CA01","spend":"US$ 4.051,16","roas":"0,87","avgConversion":"US$ 95,14","costResult":"US$ 109,49","results":"37 compras","ctr":"2,67%","cpc":"US$ 2,27","cpm":"US$ 60,53"},
          {"name":"10/08/26 | BnB | BT-CBO | CA01","spend":"US$ 3.524,83","roas":"1,46","avgConversion":"US$ 98,81","costResult":"US$ 67,79","results":"52 compras","ctr":"1,79%","cpc":"US$ 2,52","cpm":"US$ 45,23"}
        ]
      },
      {
        "key":"2026-09-18-7d","label":"Setembro 2026 · Últimos 7 dias","range":"12/09/2026 a 18/09/2026","level":"Campanhas","currency":"USD","capturedAt":"2026-09-18",
        "totals":{"spend":"US$ 8.379,11","roas":"—","avgConversion":"US$ 100,88","costResult":"—","results":"89 compras","ctr":"1,95%","cpc":"US$ 2,51","cpm":"US$ 48,96"},
        "campaigns":[
          {"name":"04/08/26 | BnB | BS-CBO | CA01","spend":"US$ 2.367,57","roas":"0,81","avgConversion":"US$ 101,26","costResult":"US$ 124,61","results":"19 compras","ctr":"2,98%","cpc":"US$ 2,16","cpm":"US$ 64,33"},
          {"name":"04/08/26 | BnB | BS-CBO | CA01 | OP","spend":"US$ 2.132,93","roas":"1,16","avgConversion":"US$ 98,79","costResult":"US$ 85,32","results":"25 compras","ctr":"2,58%","cpc":"US$ 2,59","cpm":"US$ 66,94"},
          {"name":"19/08/26 | BnB | BR-CBO | CA01","spend":"US$ 2.128,93","roas":"0,96","avgConversion":"US$ 102,49","costResult":"US$ 106,45","results":"20 compras","ctr":"1,17%","cpc":"US$ 2,82","cpm":"US$ 33,09"},
          {"name":"10/08/26 | BnB | BT-CBO | CA01","spend":"US$ 1.749,68","roas":"1,45","avgConversion":"US$ 101,40","costResult":"US$ 69,99","results":"25 compras","ctr":"1,76%","cpc":"US$ 2,60","cpm":"US$ 45,87"}
        ]
      },
      {
        "key":"2026-09-18-1d","label":"Setembro 2026 · Ontem","range":"18/09/2026","level":"Campanhas","currency":"USD","capturedAt":"2026-09-18",
        "totals":{"spend":"US$ 1.132,04","roas":"—","avgConversion":"US$ 108,76","costResult":"—","results":"16 compras","ctr":"2,06%","cpc":"US$ 2,21","cpm":"US$ 45,55"},
        "campaigns":[
          {"name":"19/08/26 | BnB | BR-CBO | CA01","spend":"US$ 300,25","roas":"1,41","avgConversion":"US$ 106,12","costResult":"US$ 75,06","results":"4 compras","ctr":"1,30%","cpc":"US$ 2,42","cpm":"US$ 31,57"},
          {"name":"04/08/26 | BnB | BS-CBO | CA01","spend":"US$ 288,84","roas":"1,16","avgConversion":"US$ 111,33","costResult":"US$ 96,28","results":"3 compras","ctr":"3,46%","cpc":"US$ 1,86","cpm":"US$ 64,55"},
          {"name":"04/08/26 | BnB | BS-CBO | CA01 | OP","spend":"US$ 288,24","roas":"2,30","avgConversion":"US$ 110,37","costResult":"US$ 48,04","results":"6 compras","ctr":"2,47%","cpc":"US$ 2,23","cpm":"US$ 55,12"},
          {"name":"10/08/26 | BnB | BT-CBO | CA01","spend":"US$ 254,71","roas":"1,25","avgConversion":"US$ 106,50","costResult":"US$ 84,90","results":"3 compras","ctr":"1,84%","cpc":"US$ 2,45","cpm":"US$ 45,19"}
        ]
      }
    ],
    "brandTopAds":[
      {"nome":"Setembro 2026 · Anúncio 01","link":"https://fb.me/adspreview/facebook/2a8usTObYiqpxsJ","period":"2026-09","sourceDate":"18/09/2026"},
      {"nome":"Setembro 2026 · Anúncio 02","link":"https://fb.me/adspreview/facebook/26UUCupgYBrwndj","period":"2026-09","sourceDate":"18/09/2026"},
      {"nome":"Setembro 2026 · Anúncio 03","link":"https://fb.me/adspreview/facebook/1WnUFco2E4hxdGo","period":"2026-09","sourceDate":"18/09/2026"}
    ],
    "bibliotecas":[
      {"nome":"Meta Ads Library · Ultima Peak · Setembro 2026","link":"https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&is_targeted_country=false&media_type=all&q=ultimapeak.com&search_type=keyword_unordered&sort_data[direction]=desc&sort_data[mode]=total_impressions"}
    ],
    "dominios":[
      {"nome":"Setembro 2026 · Quiz Funnel V2","linkDominio":"http://ultimapeak.com/pages/quiz-funnel-v2","linkCheckout":"","backRedirect":"","views":"","viewsPeriod":"","vslLink":"","vslVideo":""}
    ]
  }$draft$::jsonb
)
on conflict (target_offer_id) do update
set label = excluded.label,
    data_patch = excluded.data_patch,
    updated_at = now(),
    updated_by = 'migration';

commit;
