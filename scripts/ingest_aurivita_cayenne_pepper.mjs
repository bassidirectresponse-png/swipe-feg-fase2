// Registro auditável da ingestão manual de 27/09/2026.
// A persistência é feita pelo fluxo autenticado de Ingestão Manual/Supabase.
export const manifest = {
  batchDate: "2026-09-27",
  items: [{
    kind: "brandsvalidated",
    name: "Aurivita Cayenne Pepper",
    brand: "Aurivita",
    niche: "Saúde Cardiovascular",
    format: "Softgels de pimenta-caiena",
    image: "https://pkvzwtstidtobpdngxnd.supabase.co/storage/v1/object/public/criativos/brands/aurivita-cayenne-pepper/product-cover.png",
    activeAds: null,
    libraries: [{ name: "Aurivita · Meta Ads Library · Setembro 2026", url: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&is_targeted_country=false&media_type=image&q=aurivita.co&search_type=keyword_unordered&sort_data[mode]=total_impressions&sort_data[direction]=desc" }],
    domains: [{ name: "Página de vendas", offer: "https://aurivita.co/products/cayenne-pepper-softgels" }],
    ads: [
      { name: "Anúncio 1", url: "https://fb.me/adspreview/facebook/2blrGI8pSAHtTyS", creativeName: "Aurivita Cayenne Pepper — Anúncio 1 — Setembro 2026 — 21 a 27", platform: "meta" },
      { name: "Anúncio 2", url: "https://fb.me/adspreview/facebook/2AU8J6DznpKIqJW", creativeName: "Aurivita Cayenne Pepper — Anúncio 2 — Setembro 2026 — 21 a 27", platform: "meta" },
      { name: "Anúncio 3", url: "https://fb.me/adspreview/facebook/2bz5IQT2mto3LVs", creativeName: "Aurivita Cayenne Pepper — Anúncio 3 — Setembro 2026 — 21 a 27", platform: "meta" },
    ],
  }],
};

export const reports = [
  ["Ontem", "27/09/2026", "US$ 24.959,28", "0,68", "US$ 78,70", "220 compras", "3,18%", "US$ 1,59", "US$ 50,58"],
  ["Últimos 7 dias", "21/09/2026 a 27/09/2026", "US$ 138.116,29", "0,72", "US$ 79,95", "1.276 compras", "2,87%", "US$ 1,68", "US$ 48,38"],
  ["Últimos 14 dias", "14/09/2026 a 27/09/2026", "US$ 235.291,83", "0,74", "US$ 77,21", "2.244 compras", "2,86%", "US$ 1,67", "US$ 47,69"],
  ["Últimos 30 dias", "29/08/2026 a 27/09/2026", "US$ 337.333,79", "0,75", "US$ 76,32", "3.308 compras", "2,68%", "US$ 1,70", "US$ 44,59"],
];
