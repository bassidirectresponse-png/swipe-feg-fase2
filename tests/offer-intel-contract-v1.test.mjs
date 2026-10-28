// Self-tests of the independent oracle, NOT backend integration.
import test from "node:test";
import assert from "node:assert/strict";
import { assertJobV1, assertDiscoveryV1, assertRelationV1, assertFunnelV1, assertErrorV1 } from "./helpers/offer-intel-contract-v1.mjs";
import { INVALID_ID_CASES, OFFER_REF_CASES, SSRF_URL_CASES, SSRF_TRANSPORT_CASES, PERSISTENCE_CASES } from "./fixtures/offer-intel-p0-cases.mjs";

const id = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const at = "2026-10-27T12:00:00.000Z";
const FAKE_evidence = { id, source: "domain_explorer", source_url: "https://example.com/", verification: "verified", observed_at: at, detail: "FAKE evidence" };
const FAKE_job = { id, offer_id: other, offer_ref_kind: "offer", seed_url: null, status: "partial", phase: "done", progress: 75, progress_detail: { done: 3, total: 4 }, counts: { discoveries: 1, relations: 0, funnels: 1, steps: 1 }, sources: [{ name: "domain_explorer", status: "succeeded", result_count: 1 }, { name: "screenshot", status: "unavailable", result_count: 0 }], error: null, created_at: at, started_at: at, finished_at: at, updated_at: at, next_retry_at: null, limits: {} };
const FAKE_discovery = { id, type: "domain", identity_key: "domain:example.com", title: "FAKE", page_id: null, page_name: null, domain: "example.com", url: "https://example.com", thumbnail_url: null, ads_count: null, first_seen: at, last_seen: at, source: "domain_explorer", status: "new", version: 1, already_in_swipe: false, existing_offer_id: null, existing_ref_kind: null, existing_ref_id: null, existing_matches: [], evidence: [FAKE_evidence] };
const FAKE_relation = { id, from: { key: "offer:" + other, kind: "offer", id: other, label: "FAKE offer" }, to: { key: "domain:example.com", kind: "domain", id: "example.com", label: "FAKE domain" }, relation_type: "redirect", status: "pending", version: 1, reason: null, evidence: [FAKE_evidence] };
const FAKE_funnel = { id, investigation_id: other, origin_url: "https://example.com", final_url: "https://example.com", start_step_id: id, technologies: [], steps: [{ id, kind: "upsell", label: "FAKE step", title: "FAKE", original_url: "https://example.com", final_url: "https://example.com", http_status: 200, redirects: [], verification: "verified", inaccessible_reason: null, classification_basis: {}, technologies: [], screenshot_url: null, screenshot_status: "unavailable", observed_at: at }], edges: [], limits: {} };

const forms = [
  ["Job", assertJobV1, FAKE_job],
  ["Discovery", assertDiscoveryV1, FAKE_discovery],
  ["Relation", assertRelationV1, FAKE_relation],
  ["Funnel", assertFunnelV1, FAKE_funnel]
];
for (const [name, check, FAKE_value] of forms) {
  test("QA oracle: accepts explicit FAKE " + name + " v1 without mutation", () => {
    const before = structuredClone(FAKE_value); check(FAKE_value); assert.deepEqual(FAKE_value, before);
  });
  test("QA oracle: rejects each missing required " + name + " field", () => {
    for (const key of Object.keys(FAKE_value)) {
      const broken = structuredClone(FAKE_value); delete broken[key];
      assert.throws(() => check(broken), undefined, name + "." + key);
    }
  });
}
test("QA oracle: rejects provisional shapes and false screenshot capability", () => {
  assert.throws(() => assertJobV1({ ...FAKE_job, progress: { percent: 75 } }));
  assert.throws(() => assertJobV1({ ...FAKE_job, status: "completed" }));
  assert.throws(() => assertJobV1({ ...FAKE_job, progress: NaN }));
  assert.throws(() => assertJobV1({ ...FAKE_job, progress: 101 }));
  assert.throws(() => assertJobV1({ ...FAKE_job, sources: [{ name: "screenshot", status: "succeeded", result_count: 1 }] }));
  assert.throws(() => assertDiscoveryV1({ ...FAKE_discovery, existing_offer_id: "brand-slug" }));
  assert.throws(() => assertRelationV1({ ...FAKE_relation, status: "review" }));
  const broken = structuredClone(FAKE_funnel); broken.steps[0].screenshot_url = "https://example.com/fake.png";
  assert.throws(() => assertFunnelV1(broken));
});
test("QA oracle: funnel references must resolve to unique steps", () => {
  assert.throws(() => assertFunnelV1({ ...FAKE_funnel, start_step_id: other }));
  assert.throws(() => assertFunnelV1({ ...FAKE_funnel, steps: [...FAKE_funnel.steps, ...FAKE_funnel.steps] }));
  assert.throws(() => assertFunnelV1({ ...FAKE_funnel, edges: [{ id: other, from: id, to: other, kind: "link", label: null, verification: "verified" }] }));
});
test("QA oracle: errors have structured code/message/retryability", () => {
  const FAKE_error = { ok: false, code: "blocked_url", error: "URL bloqueada", retryable: false };
  assertErrorV1(FAKE_error);
  assert.throws(() => assertErrorV1({ ...FAKE_error, retryable: "false" }));
  assert.throws(() => assertErrorV1({ ...FAKE_error, retry_after: -1 }));
});
test("QA corpus: unique cases include DNS, redirects, IDs and preservation (not backend execution)", () => {
  for (const table of [INVALID_ID_CASES, OFFER_REF_CASES, SSRF_URL_CASES, SSRF_TRANSPORT_CASES, PERSISTENCE_CASES]) {
    assert.equal(new Set(table.map(c => c.name)).size, table.length);
    assert.ok(table.length > 0);
  }
  assert.ok(SSRF_URL_CASES.some(c => c.url.includes("::ffff:")));
  assert.ok(SSRF_TRANSPORT_CASES.some(c => c.name === "DNS rebinding"));
  assert.ok(PERSISTENCE_CASES.some(c => c.name === "legacy preservation"));
});
