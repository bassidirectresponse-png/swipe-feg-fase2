import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { FAKE_SCAN, FAKE_SCAN_LIST, FAKE_REVIEW_FOLDER, FAKE_REVIEW_LIST, FAKE_REVIEW_PRODUCT } from "./offer-intel-FAKE-v2-fixtures.mjs";

const context = { globalThis: {}, URL, URLSearchParams, Intl, JSON, Promise, Error, Object, Number, Math, String, Date };
for (const file of ["offer-intel.js", "offer-intel-api.js"]) vm.runInNewContext(readFileSync(new URL(`../lib/${file}`, import.meta.url), "utf8"), context);
const OI = context.globalThis.OfferIntel, Api = context.globalThis.OfferIntelApi;
const j = value => JSON.parse(JSON.stringify(value));

test("rotas v2: /inteligencia/dominio/:scanId e /inteligencia/semanal?semana=", () => {
  const d = OI.parsePath("/inteligencia/dominio/scan-1", "");
  assert.equal(d.area, "dominio"); assert.equal(d.scanId, "scan-1"); assert.equal(d.notFound, false);
  assert.equal(OI.parsePath("/inteligencia/dominio", "").notFound, true);
  assert.equal(OI.parsePath("/inteligencia/dominio/a/b", "").notFound, true);
  assert.equal(OI.parsePath("/inteligencia/dominio/%3Cx%3E", "").notFound, true);
  assert.equal(OI.parsePath("/inteligencia/semanal", "").notFound, true, "legado vira redirect no app, não área da Inteligência");
  assert.equal(OI.buildPath({ area: "dominio", scanId: "scan-1" }), "/inteligencia/dominio/scan-1");
  assert.ok(!OI.AREAS.some(a => a.key === "semanal"));
  assert.equal(OI.areaMeta("dominio").title, "Raio-X do domínio");
});

test("formatClock: mm:ss e h:mm:ss; desconhecido vira vazio", () => {
  assert.equal(OI.formatClock(1834), "30:34"); assert.equal(OI.formatClock(5), "00:05"); assert.equal(OI.formatClock(3725), "1:02:05");
  for (const v of [null, undefined, "", -1, "x", true, NaN]) assert.equal(OI.formatClock(v), "");
});

test("Raio-X: formata resumo, descarta URLs inseguras e dedupe de pixels/tecnologias", () => {
  const s = OI.formatDomainScan(FAKE_SCAN);
  assert.equal(s.host, "exemplo-demo.com"); assert.equal(s.statusLabel, "Concluído");
  assert.equal(s.pages.length, 5, "página com javascript: é descartada");
  assert.ok(s.pages.every(p => /^https?:/.test(p.url)));
  assert.deepEqual(j(s.summary.checkoutPlatforms), ["Hotmart", "Kiwify"]);
  assert.equal(s.summary.pixels.length, 4, "o mesmo ID em duas páginas aparece uma vez");
  assert.equal(s.vsl[0].durationLabel, "30:34"); assert.equal(s.vsl[0].pitchLabel, "20:15"); assert.equal(s.vsl[0].providerLabel, "VTurb");
  assert.equal(s.ctas[0].hidden, true); assert.equal(s.ctas[0].showOnLabel, "20:15");
  assert.equal(s.ctas[2].href, "", "href javascript: é descartado");
  assert.equal(s.sources.find(x => x.name === "wayback").statusLabel, "Falhou");
  assert.equal(s.sources.find(x => x.name === "wayback").label, "Wayback Machine");
  assert.match(s.adsLibraryUrl, /^https:\/\/www\.facebook\.com\/ads\/library\//);
  assert.equal(OI.formatDomainScan({ ads_library: { domain_search_url: "https://evil.example/ads/library" } }).adsLibraryUrl, "");
  const groups = OI.groupTech(s.tech);
  assert.deepEqual(j(groups.map(g => g.label)), ["Construtor de páginas", "CMS", "Player de VSL", "CDN"]);
  assert.deepEqual(j(groups[0].names), ["Elementor"]);
  assert.equal(s.assets.images.length, 2); assert.equal(s.assets.videos.length, 1);
});

test("Raio-X: filtro de páginas por fonte, verificada e texto; contagem por fonte", () => {
  const s = OI.formatDomainScan(FAKE_SCAN);
  const counts = OI.countPageSources(s.pages);
  assert.equal(counts.find(c => c.source === "sitemap").count, 3);
  assert.equal(counts.find(c => c.source === "probe").label, "Sondagem de caminhos");
  assert.equal(OI.filterPages(s.pages, { source: "sitemap" }).length, 3);
  assert.equal(OI.filterPages(s.pages, { verified: "yes" }).length, 3);
  assert.equal(OI.filterPages(s.pages, { verified: "no", source: "sitemap" }).length, 2);
  assert.equal(OI.filterPages(s.pages, { q: "UP1" }).length, 1);
  assert.equal(OI.filterPages(s.pages, {}).length, 5);
});

test("Raio-X: contagens nulas ficam nulas e prototype pollution não passa", () => {
  const sum = OI.formatScanSummary(FAKE_SCAN_LIST.items[1]);
  assert.equal(sum.counts.tech, null); assert.equal(sum.counts.pages, 0); assert.equal(sum.statusLabel, "Parcial");
  const map = OI.scansByHost(FAKE_SCAN_LIST.items.map(OI.formatScanSummary));
  assert.equal(map["exemplo-demo.com"].id, "scan-1"); assert.equal(map["loja-demo.com.br"].id, "scan-2");
  assert.equal(map["__proto__"], undefined); assert.equal(map.constructor, undefined);
  const odd = OI.formatDomainScan({ pages: [{ url: "https://a.com/", sources: ["__proto__"] }], tech: [{ name: "X", category: "__proto__" }] });
  assert.equal(OI.countPageSources(odd.pages)[0].source, "__proto__");
  assert.equal(OI.groupTech(odd.tech)[0].names[0], "X");
  const none = OI.formatDomainScan(null);
  assert.deepEqual([none.pages.length, none.vsl.length, none.summary.vsl], [0, 0, null]);
});

test("Creative Review: rotas /creative-review, data e produto", () => {
  assert.deepEqual(j(OI.parseReviewPath("/creative-review")), { notFound: false, view: "list", date: "", offerId: "" });
  assert.deepEqual(j(OI.parseReviewPath("/creative-review/2026-10-28")), { notFound: false, view: "folder", date: "2026-10-28", offerId: "" });
  assert.deepEqual(j(OI.parseReviewPath("/creative-review/2026-10-28/abc-1/")), { notFound: false, view: "product", date: "2026-10-28", offerId: "abc-1" });
  for (const bad of ["/creative-review/2026-13-40", "/creative-review/ontem", "/creative-review/2026-10-28/a/b", "/creative-review/2026-10-28/../x", "/outra"]) assert.equal(OI.parseReviewPath(bad).notFound, true, bad);
  assert.equal(OI.buildReviewPath("2026-10-28", "abc"), "/creative-review/2026-10-28/abc");
  assert.equal(OI.buildReviewPath("lixo"), "/creative-review");
  assert.equal(OI.reviewTitle("2026-10-28"), "Creative Review 28/10/2026");
});

test("Creative Review: lista ordena a mais recente primeiro e mantém desconhecidos nulos", () => {
  const list = OI.formatReviewList(FAKE_REVIEW_LIST.items);
  assert.deepEqual(list.map(x => x.date), ["2026-10-28", "2026-10-21", "2026-10-14"]);
  assert.equal(list[0].title, "Creative Review 28/10/2026"); assert.equal(list[0].costLabel, "US$ 14,20"); assert.equal(list[0].productsCount, 3);
  assert.equal(list[2].productsCount, null); assert.equal(list[2].adsCount, null); assert.equal(list[2].statusLabel, "Falhou");
  const running = OI.formatReviewMeta({ review_date: "2026-11-04", status: "running", phase: "coleta", progress: 42 });
  assert.equal(running.active, true); assert.equal(running.progress, 42); assert.equal(running.title, "Creative Review 04/11/2026");
  assert.equal(OI.formatReviewMeta({ status: "running", progress: 250 }).progress, 100);
  assert.equal(OI.formatReviewMeta({ status: "running" }).progress, null);
  assert.equal(OI.formatReviewMeta({ status: "x" }).status, "queued");
});

test("Creative Review: pasta e produto seguem o contrato 10.5", () => {
  const f = OI.formatReviewFolder(FAKE_REVIEW_FOLDER);
  assert.equal(f.summary.length, 5); assert.equal(f.products.length, 3);
  assert.equal(f.products[0].summary.length, 3); assert.equal(f.products[1].summary.length, 0); assert.equal(f.products[0].isNewLeader, true);
  assert.equal(f.products[0].top.length, 3); assert.equal(f.products[0].top[0].score, 92.2);
  assert.equal(OI.formatReviewFolder({ summary: ["x"], products: [{ offer_id: "../x" }] }).products.length, 0);
  assert.deepEqual(j(OI.formatReviewFolder({ summary: null }).summary), []);
  const p = OI.formatReviewProduct(FAKE_REVIEW_PRODUCT("22222222-2222-4222-8222-222222222222"));
  assert.equal(p.product.name, "Produto Demo Beta"); assert.equal(p.ads.length, 10);
  const [a1, a2, a3, a4] = p.ads;
  assert.equal(a1.score, 92.2); assert.equal(a2.isNew, true); assert.equal(a3.rankChange, 4); assert.equal(a4.rankChange, -2);
  assert.equal(a3.pageSource, "encontrada"); assert.equal(a1.pageSource, "cadastrada");
  assert.equal(a1.analysis.length, 8); assert.equal(p.ads[5].analysis.length, 0);
  assert.equal(a1.libraryUrl, "https://www.facebook.com/ads/library/?id=1000000001");
  assert.equal(OI.formatReviewProduct({ ads: new Array(15).fill({}) }).ads.length, 10);
});

test("score desconhecido e mídia insegura nos anúncios", () => {
  const ad = OI.formatWeeklyAd({ rank: 1, media: { thumb_url: "javascript:x", video_url: "https://x.supabase.co/v.mp4" }, ad_archive_id: "abc", score: "x", rank_change: "NaN" });
  assert.equal(ad.thumbUrl, ""); assert.equal(ad.videoUrl, "https://x.supabase.co/v.mp4"); assert.equal(ad.score, null); assert.equal(ad.libraryUrl, ""); assert.equal(ad.rankChange, 0);
  assert.deepEqual(j(OI.formatReviewFolder({ report: { status: "partial" }, summary: { bullets: ["a", 5, " b "] } }).summary), ["a", "b"]);
  assert.deepEqual(j(OI.formatReviewFolder({ summary: "Texto" }).summary), []);
});

test("QA-UI-R6-02: score desconhecido (null, vazio, boolean) fica null, nunca 0", () => {
  for (const v of [null, undefined, "", false, true, "x"]) assert.equal(OI.formatWeeklyAd({ score: v }).score, null, String(v));
  assert.equal(OI.formatWeeklyAd({ score: 0 }).score, 0);
  assert.equal(OI.formatWeeklyAd({ score: "42.46" }).score, 42.5);
});

test("cliente v2: endpoints, parâmetros e POST de execução", async () => {
  const calls = [];
  const client = Api.createClient({ getToken: async () => "t", newKey: () => "k", fetch: async (url, init) => { calls.push({ url, init }); return { ok: true, status: 200, json: async () => ({ ok: true, items: [] }), headers: { get: () => null } }; } });
  await client.listDomainScans({ offerId: "o1", offerRefKind: "admin_draft" });
  await client.listDomainScans({ jobId: "j1" });
  await client.getDomainScan("scan-1");
  await client.listReviews(); await client.getReview(); await client.getReview("2026-10-28"); await client.getReviewProduct("2026-10-28", "o1"); await client.runReview();
  assert.equal(calls[0].url, "/.netlify/functions/offer-intel-domain-scans?offer_id=o1&offer_ref_kind=admin_draft");
  assert.equal(calls[1].url, "/.netlify/functions/offer-intel-domain-scans?job_id=j1");
  assert.equal(calls[2].url, "/.netlify/functions/offer-intel-domain-scan?id=scan-1");
  assert.equal(calls[3].url, "/.netlify/functions/offer-intel-weekly");
  assert.equal(calls[4].url, "/.netlify/functions/offer-intel-weekly?date=latest");
  assert.equal(calls[5].url, "/.netlify/functions/offer-intel-weekly?date=2026-10-28");
  assert.equal(calls[6].url, "/.netlify/functions/offer-intel-weekly?date=2026-10-28&offer_id=o1");
  assert.equal(calls[7].init.method, "POST"); assert.deepEqual(JSON.parse(calls[7].init.body), { action: "run" });
});

test("QA-UI-R6-01: scansByHost compara o timestamp bruto e normaliza www", () => {
  const old = OI.formatScanSummary({ id: "old", host: "example.com", status: "succeeded", created_at: "2026-10-31T12:00:00.000Z" });
  const next = OI.formatScanSummary({ id: "new", host: "www.example.com", status: "succeeded", created_at: "2026-11-01T12:00:00.000Z" });
  assert.equal(OI.scansByHost([old, next])["example.com"].id, "new");
  assert.equal(OI.scansByHost([next, old])["example.com"].id, "new");
  const dec = OI.formatScanSummary({ id: "dez", host: "a.com", created_at: "2026-12-01T00:00:00.000Z" }), jan = OI.formatScanSummary({ id: "jan", host: "a.com", created_at: "2027-01-02T00:00:00.000Z" });
  assert.equal(OI.scansByHost([dec, jan])["a.com"].id, "jan", "01/12/2026 > 02/01/2027 como texto não pode vencer");
});
