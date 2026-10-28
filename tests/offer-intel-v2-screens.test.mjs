import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { FAKE_SCAN, FAKE_SCAN_LIST, FAKE_WEEKLY, FAKE_WEEKLY_LIST } from "./offer-intel-FAKE-v2-fixtures.mjs";

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
  const w = OI.parsePath("/inteligencia/semanal", "?semana=2026-10-27");
  assert.equal(w.area, "semanal"); assert.equal(w.query.semana, "2026-10-27");
  assert.equal(OI.parsePath("/inteligencia/semanal", "?semana=2026-13-40").query.semana, "");
  assert.equal(OI.parsePath("/inteligencia/semanal", "?semana=javascript:1").query.semana, "");
  assert.equal(OI.buildPath({ area: "dominio", scanId: "scan-1" }), "/inteligencia/dominio/scan-1");
  assert.equal(OI.buildPath({ area: "semanal", query: { semana: "2026-10-27" } }), "/inteligencia/semanal?semana=2026-10-27");
  assert.ok(OI.AREAS.some(a => a.key === "semanal" && a.label === "Relatório semanal"));
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

test("Semanal: lista, relatório, selos, score e análise", () => {
  const list = OI.formatWeeklyList(FAKE_WEEKLY_LIST.items);
  assert.equal(list[0].weekLabel, "Semana de 27/10/2026"); assert.equal(list[0].costLabel, "US$ 12,40"); assert.equal(list[0].statusLabel, "Concluído");
  assert.equal(list[2].costLabel, ""); assert.equal(list[2].finishedAt, ""); assert.equal(list[1].statusLabel, "Parcial");
  const r = OI.formatWeeklyReport(FAKE_WEEKLY);
  assert.equal(r.registered.length, 10); assert.equal(r.discovered.length, 10);
  assert.equal(r.summary.length, 5);
  assert.equal(r.meta.adsCollected, 2010); assert.equal(r.meta.pages, 58);
  const [a1, a2, a3, a4] = r.registered;
  assert.equal(a1.rank, 1); assert.equal(a1.score, 92.2); assert.equal(a2.isNew, true);
  assert.equal(a3.rankChange, 4); assert.equal(a4.rankChange, -2); assert.equal(a1.rankChange, 0);
  assert.equal(a1.offerId, "11111111-1111-4111-8111-111111111111"); assert.equal(r.registered[1].offerId, "");
  assert.equal(a1.analysis.length, 8); assert.equal(a1.analysis[0].label, "Gancho"); assert.equal(r.registered[5].analysis.length, 0);
  assert.equal(a1.libraryUrl, "https://www.facebook.com/ads/library/?id=1000000001");
  assert.equal(a1.thumbUrl, ""); assert.equal(a1.videoUrl, "");
});

test("Semanal: mídia insegura é descartada; resumo só aceita {bullets}; lista vazia", () => {
  const ad = OI.formatWeeklyAd({ rank: 1, media: { thumb_url: "javascript:x", video_url: "https://x.supabase.co/v.mp4" }, ad_archive_id: "abc", score: "x", rank_change: "NaN" });
  assert.equal(ad.thumbUrl, ""); assert.equal(ad.videoUrl, "https://x.supabase.co/v.mp4"); assert.equal(ad.score, null); assert.equal(ad.libraryUrl, ""); assert.equal(ad.rankChange, 0);
  assert.deepEqual(j(OI.formatWeeklyReport({ report: { status: "weird" }, summary: "Texto único" }).summary), [], "só {bullets} é aceito");
  assert.deepEqual(j(OI.formatWeeklyReport({ summary: ["a"] }).summary), []);
  assert.deepEqual(j(OI.formatWeeklyReport({ summary: { bullets: ["a", 5, " b "] } }).summary), ["a", "b"]);
  assert.deepEqual(j(OI.formatWeeklyReport({ summary: null }).summary), []);
  const empty = OI.formatWeeklyReport(null);
  assert.equal(empty.registered.length, 0); assert.equal(empty.meta.status, "queued");
  assert.deepEqual(j(OI.formatWeeklyList(null)), []);
  assert.equal(OI.formatWeeklyReport({ report: { status: "running" } }).meta.active, true);
});

test("cliente v2: endpoints, parâmetros e POST de execução", async () => {
  const calls = [];
  const client = Api.createClient({ getToken: async () => "t", newKey: () => "k", fetch: async (url, init) => { calls.push({ url, init }); return { ok: true, status: 200, json: async () => ({ ok: true, items: [] }), headers: { get: () => null } }; } });
  await client.listDomainScans({ offerId: "o1", offerRefKind: "admin_draft" });
  await client.listDomainScans({ jobId: "j1" });
  await client.getDomainScan("scan-1");
  await client.listWeekly(); await client.getWeekly(); await client.getWeekly("2026-10-27"); await client.runWeekly();
  assert.equal(calls[0].url, "/.netlify/functions/offer-intel-domain-scans?offer_id=o1&offer_ref_kind=admin_draft");
  assert.equal(calls[1].url, "/.netlify/functions/offer-intel-domain-scans?job_id=j1");
  assert.equal(calls[2].url, "/.netlify/functions/offer-intel-domain-scan?id=scan-1");
  assert.equal(calls[3].url, "/.netlify/functions/offer-intel-weekly");
  assert.equal(calls[4].url, "/.netlify/functions/offer-intel-weekly?week=latest");
  assert.equal(calls[5].url, "/.netlify/functions/offer-intel-weekly?week=2026-10-27");
  assert.equal(calls[6].init.method, "POST"); assert.deepEqual(JSON.parse(calls[6].init.body), { action: "run" });
});

test("QA-UI-R6-01: scansByHost compara o timestamp bruto e normaliza www", () => {
  const old = OI.formatScanSummary({ id: "old", host: "example.com", status: "succeeded", created_at: "2026-10-31T12:00:00.000Z" });
  const next = OI.formatScanSummary({ id: "new", host: "www.example.com", status: "succeeded", created_at: "2026-11-01T12:00:00.000Z" });
  assert.equal(OI.scansByHost([old, next])["example.com"].id, "new");
  assert.equal(OI.scansByHost([next, old])["example.com"].id, "new");
  const dec = OI.formatScanSummary({ id: "dez", host: "a.com", created_at: "2026-12-01T00:00:00.000Z" }), jan = OI.formatScanSummary({ id: "jan", host: "a.com", created_at: "2027-01-02T00:00:00.000Z" });
  assert.equal(OI.scansByHost([dec, jan])["a.com"].id, "jan", "01/12/2026 > 02/01/2027 como texto não pode vencer");
});

test("QA-UI-R6-02: score desconhecido (null, vazio, boolean) fica null, nunca 0", () => {
  for (const v of [null, undefined, "", false, true, "x"]) assert.equal(OI.formatWeeklyAd({ score: v }).score, null, String(v));
  assert.equal(OI.formatWeeklyAd({ score: 0 }).score, 0);
  assert.equal(OI.formatWeeklyAd({ score: "42.46" }).score, 42.5);
});
