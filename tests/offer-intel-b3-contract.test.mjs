import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const context = { globalThis: {}, URL, URLSearchParams, Intl, JSON, Promise, Error, Object, Number, Math, String };
for (const file of ["offer-intel.js", "offer-intel-api.js"]) vm.runInNewContext(readFileSync(new URL(`../lib/${file}`, import.meta.url), "utf8"), context);
const OI = context.globalThis.OfferIntel, Api = context.globalThis.OfferIntelApi;
const j = value => JSON.parse(JSON.stringify(value));

// Exemplos ILUSTRATIVOS do Backend (B3, commit f61d1df) — FAKE: nenhuma chamada real.
const DISCOVERY = { id: "d1", type: "page", identity_key: "meta:page:123", title: "Página X", page_id: "123", page_name: "Página X", domain: "x.com", url: "https://x.com/", thumbnail_url: null, ads_count: 7, first_seen: "2026-10-01T00:00:00.000Z", last_seen: "2026-10-27T00:00:00.000Z", source: "apify", status: "new", version: 1, already_in_swipe: false, existing_offer_id: null, existing_ref_kind: null, existing_ref_id: null, existing_matches: [], evidence: [] };

test("B3: descoberta nova e já existente no Swipe", () => {
  const d = OI.formatDiscovery(DISCOVERY);
  assert.equal(d.status, "new");
  assert.equal(d.version, 1);
  assert.equal(d.alreadyInSwipe, false);
  assert.equal(d.existingOfferId, "");
  assert.equal(d.thumbnail, "");
  assert.equal(d.adsLabel, "7 anúncios");
  assert.match(d.disclaimer, /não confirmada/);
  const existing = OI.formatDiscovery({ ...DISCOVERY, already_in_swipe: true, existing_offer_id: "11111111-1111-4111-8111-111111111111", existing_ref_kind: "offer", existing_ref_id: "11111111-1111-4111-8111-111111111111", existing_matches: [{ ref_kind: "offer", ref_id: "11111111-1111-4111-8111-111111111111", label: "Oferta A" }] });
  assert.equal(existing.alreadyInSwipe, true);
  assert.equal(existing.existingMatches[0].label, "Oferta A");
});

test("B3: review CAS envia expected_version e 409 conflict vira mensagem de recarga", async () => {
  const calls = [];
  const responses = [
    { status: 200, body: { ok: true, ...DISCOVERY, status: "confirmed", version: 2 } },
    { status: 409, body: { ok: false, code: "conflict", error: "x", retryable: false } },
    { status: 200, body: { ok: true, items: [DISCOVERY], next_cursor: null, limits: {} } },
    { status: 200, body: { ok: true, active_job: null, last_job: null, counts: { new: 0, review: 0, confirmed: 0, ignored: 0, relations_pending: 0, funnels: 0 }, latest_at: null, limits: {} } }
  ];
  const fetch = async (url, init) => { calls.push({ url, init }); const r = responses.shift(); return { status: r.status, ok: r.status < 300, headers: { get: () => null }, json: async () => r.body }; };
  const api = Api.createClient({ fetch, getToken: async () => "t", newKey: () => "review-key-123" });
  const done = OI.formatDiscovery(await api.setDiscoveryStatus("d1", "confirmed", 1));
  assert.equal(done.status, "confirmed");
  assert.equal(done.version, 2);
  assert.deepEqual(JSON.parse(calls[0].init.body), { id: "d1", status: "confirmed", expected_version: 1, idempotency_key: "review-key-123" });
  await assert.rejects(api.setDiscoveryStatus("d1", "ignored", 1), e => e.status === 409 && /alterado por outra pessoa/.test(e.message));
  await api.listDiscoveries({ jobId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }, { type: "page", sort: "ads", limit: 25 });
  assert.equal(calls[2].url, "/.netlify/functions/offer-intel-discoveries?job_id=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa&type=page&sort=ads&limit=25");
  await api.summary("o1", "offer");
  assert.equal(calls[3].url, "/.netlify/functions/offer-intel-summary?offer_id=o1&offer_ref_kind=offer");
});

test("B3: funil vazio (sem etapas) não quebra e captura indisponível é explícita", () => {
  const funnel = { ok: true, id: "f1", investigation_id: "j1", origin_url: "https://x.com/", final_url: "https://x.com/", start_step_id: null, technologies: [], steps: [], edges: [], limits: {} };
  const layout = OI.layoutFunnel(funnel);
  assert.equal(layout.nodes.length, 0);
  const one = OI.layoutFunnel({ ...funnel, start_step_id: "s1", steps: [{ id: "s1", kind: "landing", label: "Home", title: "Home", original_url: "https://x.com/", final_url: "https://x.com/", http_status: 200, redirects: [], verification: "verified", inaccessible_reason: null, technologies: [], screenshot_url: null, screenshot_status: "unavailable", observed_at: "2026-10-27T00:00:00.000Z" }] });
  assert.equal(one.nodes[0].screenshotLabel, "Captura indisponível nesta versão");
  assert.equal(one.start, "s1");
  assert.equal(OI.formatFunnelSummary(funnel).stepsCount, null);
});

test("B3: relação pending/confirmed/ignored com chaves tipadas", () => {
  const r = OI.formatConnection({ id: "r1", from: { key: "offer:11111111-1111-4111-8111-111111111111", kind: "offer", id: "11111111-1111-4111-8111-111111111111", label: "Oferta A" }, to: { key: "domain:x.com", kind: "domain", id: null, label: "x.com" }, relation_type: "same_domain", status: "pending", version: 1, reason: null, evidence: [] });
  assert.equal(r.status, "pending");
  assert.equal(r.to.id, "");
  assert.equal(r.to.key, "domain:x.com");
  assert.equal(r.relationLabel, "Mesmo domínio observado");
});
