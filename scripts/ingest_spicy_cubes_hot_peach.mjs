// Registro auditável da ingestão manual de 27/09/2026.
export const manifest = {
  batchDate: "2026-09-27",
  items: [{
    kind: "brandsvalidated", name: "Spicy Cubes Hot Peach Edition", brand: "Spicy Cubes", niche: "Saúde íntima / libido", format: "Gomas funcionais", activeAds: null,
    image: "https://pkvzwtstidtobpdngxnd.supabase.co/storage/v1/object/public/criativos/brands/spicy-cubes-hot-peach/product-cover.png",
    libraries: [{ name: "Spicy Cubes · Meta Ads Library · Setembro 2026", url: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&is_targeted_country=false&media_type=all&q=spicycubes.com&search_type=keyword_unordered&sort_data[mode]=total_impressions&sort_data[direction]=desc" }],
    domains: [{ name: "Página de vendas", offer: "https://www.spicycubes.com/products/spicy-cubes-hot-peach-edition" }],
    ads: ["2pRdup6yz0Oazss", "1VkT482U2ktvfr7", "1WPwT79AFFDZdeX"].map((id, index) => ({ name: `Anúncio ${index + 1}`, url: `https://fb.me/adspreview/facebook/${id}`, creativeName: `Spicy Cubes Hot Peach Edition — Anúncio ${index + 1} — Setembro 2026 — 21 a 27`, platform: "meta" })),
  }],
};
