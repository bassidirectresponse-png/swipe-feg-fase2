import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const context = { globalThis: {}, URL, URLSearchParams, Intl, JSON, Promise, Error, Object, Number, Math, String };
for (const file of ["offer-intel.js", "offer-intel-api.js"]) vm.runInNewContext(readFileSync(new URL(`../lib/${file}`, import.meta.url), "utf8"), context);
const OI = context.globalThis.OfferIntel, Api = context.globalThis.OfferIntelApi;
const j = value => JSON.parse(JSON.stringify(value));

// Exemplos ILUSTRATIVOS enviados pelo Backend (B2, commit 792b09a) — FAKE: nenhuma chamada real.
const LIMITS = { apify: { available: false, daily_max_runs: 15, cooldown_hours: 6, max_queries: 2, results_per_query: 15, cooldown_until: "2026-10-28T06:00:00.000Z" }, domain_explorer: { available: false, max_pages: 20, max_depth: 2, max_redirects: 5, page_timeout_s: 20, max_html_bytes: 2097152 }, screenshot: { available: false, reason: "Captura indisponível nesta versão" } };
const JOB = { ok: true, id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", offer_id: null, offer_ref_kind: null, seed_url: "https://example.com/", status: "queued", phase: "validation", progress: 0, progress_detail: { done: 0, total: 0 }, counts: { discoveries: 0, relations: 0, funnels: 0, steps: 0 }, sources: [{ name: "apify", status: "skipped", result_count: 0 }, { name: "domain_explorer", status: "pending", result_count: 0 }, { name: "screenshot", status: "skipped", result_count: 0 }], error: null, created_at: "2026-10-28T00:00:00.000Z", started_at: null, finished_at: null, updated_at: "2026-10-28T00:00:00.000Z", next_retry_at: null, limits: LIMITS };

test("B2: job manual por URL (offer_id/offer_ref_kind nulos) é formatado sem inventar valores", () => {
  const job = OI.formatJob(JOB);
  assert.equal(job.offerId, "");
  assert.equal(job.seedUrlLabel, "example.com");
  assert.equal(job.status, "queued");
  assert.equal(job.active, true);
  assert.equal(job.phaseLabel, "Validando");
  assert.equal(job.progressPercent, 0);
  assert.equal(job.progressTotal, 0);
  assert.equal(job.startedAt, "");
  assert.deepEqual(j(job.sources.map(s => [s.name, s.status, s.resultCount])), [["Biblioteca de anúncios", "skipped", 0], ["Explorador de domínios", "pending", 0], ["Captura de tela", "skipped", 0]]);
});

test("B2: job falho por capability_unavailable mostra a falha sem fingir análise", () => {
  const job = OI.formatJob({ ...JOB, status: "failed", phase: "explore_domains", error: { code: "capability_unavailable", message: "Fonte indisponível nesta versão.", retryable: false }, finished_at: "2026-10-28T00:00:05.000Z" });
  assert.equal(job.status, "failed");
  assert.equal(job.terminal, true);
  assert.equal(job.error.code, "capability_unavailable");
  assert.equal(job.error.retryable, false);
  assert.equal(job.counts.discoveries, 0);
});

test("B2: limits com fontes indisponíveis desabilitam as opções e não mostram contagem inventada", () => {
  const lim = OI.formatLimits(LIMITS, Date.parse("2026-10-28T00:00:00Z"));
  assert.equal(lim.apifyAvailable, false);
  assert.equal(lim.domainAvailable, false);
  assert.equal(lim.screenshotUnavailable, true);
  assert.deepEqual(j(lim.lines), ["Coleta de anúncios indisponível", "Exploração de domínios indisponível"]);
});

test("B2: POST de início usa os campos do contrato e 503 credentials_missing vira mensagem PT-BR", async () => {
  const calls = [];
  const responses = [
    { status: 202, body: { ok: true, job_id: JOB.id, status: "queued", reused: false, limits: LIMITS } },
    { status: 503, body: { ok: false, code: "credentials_missing", error: "x", retryable: false, limits: LIMITS } },
    { status: 200, body: JOB }
  ];
  const fetch = async (url, init) => { calls.push({ url, init }); const r = responses.shift(); return { status: r.status, ok: r.status < 300, headers: { get: () => null }, json: async () => r.body }; };
  const api = Api.createClient({ fetch, getToken: async () => "t", newKey: () => "manual-investigation-001" });
  const started = await api.startInvestigation({ url: "https://example.com/", options: { collect_ads: false, explore_domains: true, capture_screenshots: true } });
  assert.equal(started.job_id, JOB.id);
  assert.deepEqual(JSON.parse(calls[0].init.body), { idempotency_key: "manual-investigation-001", options: { collect_ads: false, explore_domains: true, capture_screenshots: false }, url: "https://example.com/" });
  await assert.rejects(api.startInvestigation({ offerId: "o1", options: { collect_ads: true, explore_domains: false } }), error => error.code === "credentials_missing" && /não está configurada/.test(error.message) && error.status === 503);
  const job = await api.getJob(JOB.id);
  assert.equal(calls[2].url, `/.netlify/functions/offer-intel-job?job_id=${JOB.id}`);
  assert.equal(OI.formatJob(job).id, JOB.id);
});

test("B2/B3: só as áreas com endpoint existente ficam ativas", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /const OI_BACKEND_READY=false;/);
  assert.match(html, /const OI_LIVE_AREAS=new Set\(\["historico","investigacao","investigar","oferta","descobertas","conexoes","funis"\]\);/);
  assert.match(html, /const OI_SUMMARY_LIVE=true;/);
  assert.match(html, /if\(!oiAreaLive\(route\.area\)\|\|!OI_LOADERS\[route\.area\]\)return;/);
  assert.match(html, /ctx\.offerId&&OI_SUMMARY_LIVE\?await oiApi\.summary/);
  assert.match(html, /lim\.domainAvailable===false\)off\("#oiOptDom"/);
});
