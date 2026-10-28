// Independent QA assertions for offer-intel-contratos v1, section 6.
// No backend import, storage, network, or claim of integration coverage.
import assert from "node:assert/strict";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const object = (v, name) => assert.ok(v && typeof v === "object" && !Array.isArray(v), name);
const fields = (v, names) => { object(v, "object expected"); for (const k of names.split(" ")) assert.ok(Object.hasOwn(v, k), "missing " + k); };
const oneOf = (v, values) => assert.ok(values.split(" ").includes(v), "unexpected enum: " + v);
const text = v => assert.equal(typeof v, "string");
const nullableText = v => { if (v !== null) text(v); };
const uuid = v => { text(v); assert.match(v, UUID); };
const nullableUuid = v => { if (v !== null) uuid(v); };
const count = v => assert.ok(Number.isInteger(v) && v >= 0, "nonnegative integer expected");
const date = v => { text(v); assert.match(v, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/); assert.ok(Number.isFinite(Date.parse(v))); };
const nullableDate = v => { if (v !== null) date(v); };
const array = (v, check) => { assert.ok(Array.isArray(v)); v.forEach(check); };
const ref = v => oneOf(v, "offer admin_draft");
const verification = v => oneOf(v, "verified inferred inaccessible");

export function assertEvidenceV1(v) {
  fields(v, "id source source_url verification observed_at detail");
  uuid(v.id); text(v.source); nullableText(v.source_url); verification(v.verification); date(v.observed_at);
  // detail's scalar/object shape is not specified in v1; do not invent it here.
}

export function assertJobV1(v) {
  fields(v, "id offer_id offer_ref_kind seed_url status phase progress progress_detail counts sources error created_at started_at finished_at updated_at next_retry_at limits");
  uuid(v.id); nullableUuid(v.offer_id); if (v.offer_ref_kind !== null) ref(v.offer_ref_kind);
  nullableText(v.seed_url);
  oneOf(v.status, "queued running partial succeeded failed cancelled");
  oneOf(v.phase, "validation collect_ads explore_domains classify persist done");
  assert.ok(typeof v.progress === "number" && Number.isFinite(v.progress) && v.progress >= 0 && v.progress <= 100);
  fields(v.progress_detail, "done total"); count(v.progress_detail.done); count(v.progress_detail.total);
  fields(v.counts, "discoveries relations funnels steps"); Object.values(v.counts).forEach(count);
  array(v.sources, s => {
    fields(s, "name status result_count");
    oneOf(s.name, "apify domain_explorer screenshot");
    oneOf(s.status, "pending running succeeded failed skipped unavailable");
    count(s.result_count);
    if (s.error !== undefined && s.error !== null) { fields(s.error, "code message"); text(s.error.code); text(s.error.message); }
    if (s.name === "screenshot") assert.ok(["skipped", "unavailable"].includes(s.status), "v1 has no screenshot capability");
  });
  if (v.error !== null) { fields(v.error, "code message retryable"); text(v.error.code); text(v.error.message); assert.equal(typeof v.error.retryable, "boolean"); }
  date(v.created_at); date(v.updated_at);
  for (const k of ["started_at", "finished_at", "next_retry_at"]) nullableDate(v[k]);
  object(v.limits, "limits");
  return v;
}

export function assertDiscoveryV1(v) {
  fields(v, "id type identity_key title page_id page_name domain url thumbnail_url ads_count first_seen last_seen source status version already_in_swipe existing_offer_id existing_ref_kind existing_ref_id existing_matches evidence");
  uuid(v.id); oneOf(v.type, "ad page domain"); text(v.identity_key);
  for (const k of ["title", "page_id", "page_name", "domain", "url", "thumbnail_url"]) nullableText(v[k]);
  if (v.ads_count !== null) count(v.ads_count);
  date(v.first_seen); date(v.last_seen); text(v.source);
  oneOf(v.status, "new confirmed ignored review"); count(v.version); assert.equal(typeof v.already_in_swipe, "boolean");
  nullableUuid(v.existing_offer_id); nullableUuid(v.existing_ref_id);
  if (v.existing_ref_kind !== null) ref(v.existing_ref_kind);
  array(v.existing_matches, m => { fields(m, "ref_kind ref_id label"); ref(m.ref_kind); uuid(m.ref_id); text(m.label); });
  array(v.evidence, assertEvidenceV1);
  // UUID shape cannot prove offers existence: adapters must assert storage lookup.
  return v;
}

function endpoint(v) {
  fields(v, "key kind id label"); text(v.key); text(v.kind); text(v.id); text(v.label);
  assert.match(v.key, /^(?:offer:|admin_draft:|meta:page:|meta:ad:|url:|domain:).+$/);
}
export function assertRelationV1(v) {
  fields(v, "id from to relation_type status version reason evidence");
  uuid(v.id); endpoint(v.from); endpoint(v.to);
  oneOf(v.relation_type, "same_page same_domain same_destination_url similar_creative redirect");
  oneOf(v.status, "pending confirmed ignored"); count(v.version); nullableText(v.reason);
  array(v.evidence, assertEvidenceV1);
  return v;
}

export function assertFunnelV1(v) {
  fields(v, "id investigation_id origin_url final_url start_step_id technologies steps edges limits");
  uuid(v.id); uuid(v.investigation_id); nullableText(v.origin_url); nullableText(v.final_url); nullableUuid(v.start_step_id);
  assert.ok(Array.isArray(v.technologies)); object(v.limits, "limits");
  const ids = new Set();
  array(v.steps, s => {
    fields(s, "id kind label title original_url final_url http_status redirects verification inaccessible_reason classification_basis technologies screenshot_url screenshot_status observed_at");
    uuid(s.id); assert.ok(!ids.has(s.id), "duplicate step"); ids.add(s.id);
    oneOf(s.kind, "landing presell quiz vsl sales checkout upsell unknown");
    for (const k of ["label", "title", "original_url", "final_url", "inaccessible_reason"]) nullableText(s[k]);
    if (s.http_status !== null) assert.ok(Number.isInteger(s.http_status) && s.http_status >= 100 && s.http_status <= 599);
    assert.ok(Array.isArray(s.redirects)); verification(s.verification); object(s.classification_basis, "classification_basis");
    assert.ok(Array.isArray(s.technologies)); date(s.observed_at);
    assert.equal(s.screenshot_status, "unavailable"); assert.equal(s.screenshot_url, null);
  });
  if (v.start_step_id !== null) assert.ok(ids.has(v.start_step_id), "unknown start");
  const edges = new Set();
  array(v.edges, e => {
    fields(e, "id from to kind label verification"); uuid(e.id);
    assert.ok(!edges.has(e.id), "duplicate edge"); edges.add(e.id);
    assert.ok(ids.has(e.from) && ids.has(e.to), "dangling edge");
    oneOf(e.kind, "redirect link inferred"); nullableText(e.label); verification(e.verification);
  });
  return v;
}

export function assertErrorV1(v) {
  fields(v, "ok code error retryable"); assert.equal(v.ok, false); text(v.code); text(v.error);
  assert.equal(typeof v.retryable, "boolean");
  if (v.retry_after !== undefined) assert.ok(Number.isFinite(v.retry_after) && v.retry_after >= 0);
  return v;
}
