// DADOS DE DEMONSTRAÇÃO (FAKE) — seguem os campos do contrato v2 (nota offer-intel-contratos, seção 10).
// Usados só em testes e no servidor descartável de capturas; nunca importados pelo app.
export const FAKE_SCAN_LIST = { ok: true, items: [
  { id: "scan-1", host: "exemplo-demo.com", registrable: "exemplo-demo.com", status: "succeeded", created_at: "2026-10-27T15:00:00.000Z", counts: { pages: 6, checkout: 2, pixels: 4, tech: 5, vsl: 1, ctas: 4 } },
  { id: "scan-2", host: "www.loja-demo.com.br", registrable: "loja-demo.com.br", status: "partial", created_at: "2026-10-26T12:00:00.000Z", counts: { pages: 0, checkout: 0, pixels: 0, tech: null, vsl: 0, ctas: 0 } }
] };

export const FAKE_SCAN = { ok: true, id: "scan-1", host: "exemplo-demo.com", registrable: "exemplo-demo.com", status: "succeeded", created_at: "2026-10-27T15:00:00.000Z",
  sources: [
    { name: "link", status: "succeeded", count: 3 }, { name: "sitemap", status: "succeeded", count: 4 }, { name: "wp", status: "skipped", count: 0 },
    { name: "wayback", status: "failed", count: 0, error: "timeout" }, { name: "probe", status: "succeeded", count: 2 }
  ],
  pages: [
    { url: "https://exemplo-demo.com/", title: "Home", kind: "landing", http_status: 200, verified: true, sources: ["link", "sitemap"] },
    { url: "https://exemplo-demo.com/vsl", title: "VSL <script>x</script>", kind: "vsl", http_status: 200, verified: true, sources: ["link", "probe"] },
    { url: "https://exemplo-demo.com/up1", title: "", kind: "upsell", http_status: 200, verified: true, sources: ["probe"] },
    { url: "https://exemplo-demo.com/obrigado", title: "Obrigado", kind: "thankyou", http_status: null, verified: false, sources: ["sitemap"] },
    { url: "https://blog.exemplo-demo.com/post-1", title: "Post 1", kind: "other", http_status: null, verified: false, sources: ["sitemap"] },
    { url: "javascript:alert(1)", title: "Inválida", kind: "other", verified: false, sources: ["link"] }
  ],
  subdomains: ["blog.exemplo-demo.com", "pay.exemplo-demo.com"],
  checkout: [{ platform: "Hotmart", url: "https://pay.hotmart.com/A123456B", page_url: "https://exemplo-demo.com/vsl" }, { platform: "Kiwify", url: "https://pay.kiwify.com.br/xYz", page_url: "https://exemplo-demo.com/up1" }],
  pixels: [{ type: "meta", id: "123456789012345", page_url: "https://exemplo-demo.com/" }, { type: "meta", id: "123456789012345", page_url: "https://exemplo-demo.com/vsl" }, { type: "meta", id: "998877665544332", page_url: "https://exemplo-demo.com/" }, { type: "ga4", id: "G-ABCDE12345", page_url: "https://exemplo-demo.com/" }, { type: "gtm", id: "GTM-ABC123", page_url: "https://exemplo-demo.com/" }],
  tech: [{ category: "page_builder", name: "Elementor", page_url: "https://exemplo-demo.com/" }, { category: "cms", name: "WordPress", page_url: "https://exemplo-demo.com/" }, { category: "vsl_player", name: "VTurb", page_url: "https://exemplo-demo.com/vsl" }, { category: "cdn", name: "Cloudflare", page_url: "https://exemplo-demo.com/" }, { category: "page_builder", name: "Elementor", page_url: "https://exemplo-demo.com/vsl" }],
  vsl: [{ provider: "vturb", page_url: "https://exemplo-demo.com/vsl", player_id: "64a1b2c3d4e5f6a7b8c9d0e1", media_url: "https://cdn.converteai.net/acc/mid/main.m3u8", duration_s: 1834, height: 720, pitch_s: 1215 }],
  ctas: [{ page_url: "https://exemplo-demo.com/vsl", text: "QUERO COMPRAR AGORA", href: "https://pay.hotmart.com/A123456B", hidden: true, show_on_s: 1215 }, { page_url: "https://exemplo-demo.com/", text: "Assistir ao vídeo", href: "https://exemplo-demo.com/vsl", hidden: false, show_on_s: null }, { page_url: "https://exemplo-demo.com/", text: "Comprar", href: "javascript:void(0)", hidden: false, show_on_s: null }],
  assets: { images: [{ url: "https://exemplo-demo.com/img/hero.jpg", page_url: "https://exemplo-demo.com/" }, { url: "https://exemplo-demo.com/img/produto.png", page_url: "https://exemplo-demo.com/vsl" }], videos: [{ url: "https://exemplo-demo.com/media/teaser.mp4", page_url: "https://exemplo-demo.com/" }] },
  ads_library: { domain_search_url: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=exemplo-demo.com&search_type=keyword_unordered&sort_data[mode]=total_impressions&sort_data[direction]=desc" } };

const ad = (n, over) => Object.assign({ rank: n, ad_archive_id: String(1000000000 + n), page_name: `Página Demo ${n}`, page_source: n % 3 === 0 ? "encontrada" : "cadastrada",
  ad_text: `Texto do anúncio de demonstração ${n}. Descubra o método que mudou tudo.`, cta_text: "Saiba mais", landing_url: `https://oferta-demo-${n}.com/vsl`, started_at: "2026-08-20T00:00:00.000Z",
  ad_library_url: `https://www.facebook.com/ads/library/?id=${1000000000 + n}`, days_active: 90 - n * 5, repetitions: 20 - n, score: 96.5 - n * 4.3, is_new: n === 2, rank_change: n === 1 ? 0 : n === 3 ? 4 : n === 4 ? -2 : 0,
  media: { thumb_url: null, video_url: null, archived: false },
  analysis: n <= 3 ? { gancho: "Pergunta direta sobre dor.", angulo: "Descoberta recente.", promessa: "Resultado em 7 dias.", mecanismo: "Composto exclusivo.", formato: "UGC vertical", cta: "Saiba mais", publico: "Mulheres 40+", por_que_funciona: "Prova social forte e promessa específica." } : null }, over || {});

export const FAKE_REVIEW_LIST = { ok: true, items: [
  { id: "r1", review_date: "2026-10-21", title: "Creative Review 21/10/2026", status: "succeeded", finished_at: "2026-10-21T01:40:00.000Z", products_count: 2, ads_count: 20, cost: { apify_usd_est: 12.4 } },
  { id: "r2", review_date: "2026-10-28", title: "Creative Review 28/10/2026", status: "succeeded", finished_at: "2026-10-28T13:10:00.000Z", products_count: 3, ads_count: 30, cost: { apify_usd_est: 14.2 } },
  { id: "r0", review_date: "2026-10-14", title: "Creative Review 14/10/2026", status: "failed", finished_at: null, products_count: null, ads_count: null, cost: null }
] };

const PRODUCTS = [
  { offer_id: "11111111-1111-4111-8111-111111111111", offer_name: "Produto Demo Alfa", brand: "Marca FAKE", section: "brandsvalidated", thumb_url: null, pages_count: 4, ads_collected: 96, top: [{ rank: 1, thumb_url: null, score: 92.2 }, { rank: 2, thumb_url: null, score: 87.9 }, { rank: 3, thumb_url: null, score: 83.6 }], summary: { bullets: ["Escalando: UGC vertical com prova social.", "Ângulo dominante: descoberta recente.", "Formato: vídeo 30–45 s."] }, is_new_leader: true },
  { offer_id: "22222222-2222-4222-8222-222222222222", offer_name: "Produto Demo Beta", brand: "Marca FAKE 2", section: "brandsgeneral", thumb_url: null, pages_count: 2, ads_collected: 40, top: [{ rank: 1, thumb_url: null, score: 71 }], summary: null, is_new_leader: false },
  { offer_id: "33333333-3333-4333-8333-333333333333", offer_name: "Produto Demo Gama <b>", brand: "", section: "brandsvalidated", thumb_url: null, pages_count: 1, ads_collected: 12, top: [], summary: { bullets: ["Poucos anúncios ativos."] }, is_new_leader: false }
];
export const FAKE_REVIEW_FOLDER = { ok: true,
  report: { id: "r2", review_date: "2026-10-28", title: "Creative Review 28/10/2026", status: "succeeded", phase: "done", progress: 100, finished_at: "2026-10-28T13:10:00.000Z", cost: { apify_usd_est: 14.2 } },
  summary: { bullets: ["Anúncios em vídeo UGC dominam o Top 10.", "Três novidades entram nesta semana.", "O ângulo de descoberta científica cresceu.", "Repetição média subiu para 12 criativos.", "Dois produtos têm novo líder."] },
  products: PRODUCTS };
export const FAKE_REVIEW_PRODUCT = (offerId) => ({ ok: true,
  report: FAKE_REVIEW_FOLDER.report, product: PRODUCTS.find(p => p.offer_id === offerId) || PRODUCTS[0],
  ads: Array.from({ length: 10 }, (_, i) => ad(i + 1)) });
