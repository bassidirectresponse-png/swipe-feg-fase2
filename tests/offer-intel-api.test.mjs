import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const context = { globalThis: {}, URLSearchParams, JSON, Promise, Error, Object, Number, Math, String };
vm.runInNewContext(readFileSync(new URL("../lib/offer-intel-api.js", import.meta.url), "utf8"), context);
const Api = context.globalThis.OfferIntelApi;

// FAKE: fetch simulado; nenhuma chamada de rede real.
function fakeFetch(responses) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    const headers = new Map(Object.entries(next.headers || {}));
    return { status: next.status, ok: next.status >= 200 && next.status < 300, headers: { get: key => headers.get(key) ?? null }, json: async () => { if (next.badJson) throw new Error("json"); return next.body; } };
  };
  fn.calls = calls;
  return fn;
}
const client = (responses, extra = {}) => {
  const fetch = fakeFetch(responses);
  return { fetch, api: Api.createClient({ fetch, getToken: async () => "tok", newKey: () => "key-1", ...extra }) };
};
const fail = async promise => { try { await promise; } catch (error) { return error; } assert.fail("deveria falhar"); };

test("envia Bearer, no-store e idempotency_key; capture_screenshots nunca é pedido", async () => {
  const { api, fetch } = client([{ status: 202, body: { ok: true, job_id: "j1", status: "queued", reused: false } }]);
  const result = await api.startInvestigation({ offerId: "o1", offerRefKind: "admin_draft", options: { collect_ads: true, explore_domains: false, capture_screenshots: true } });
  assert.equal(result.job_id, "j1");
  const call = fetch.calls[0];
  assert.equal(call.url, "/.netlify/functions/offer-intel-investigations");
  assert.equal(call.init.method, "POST");
  assert.equal(call.init.cache, "no-store");
  assert.equal(call.init.headers.Authorization, "Bearer tok");
  assert.deepEqual(JSON.parse(call.init.body), { idempotency_key: "key-1", options: { collect_ads: true, explore_domains: false, capture_screenshots: false }, offer_id: "o1", offer_ref_kind: "admin_draft" });
});

test("GET monta query sem valores vazios e inclui offer_ref_kind só com offer_id", async () => {
  const { api, fetch } = client([{ status: 200, body: { ok: true, items: [], next_cursor: null } }, { status: 200, body: { ok: true, items: [] } }]);
  await api.listDiscoveries({ offerId: "o1" }, { type: "page", status: "", q: "a b", sort: "ads", limit: 25 });
  await api.listInvestigations({ url: "https://a.com" }, {});
  assert.equal(fetch.calls[0].url, "/.netlify/functions/offer-intel-discoveries?offer_id=o1&offer_ref_kind=offer&type=page&q=a+b&sort=ads&limit=25");
  assert.equal(fetch.calls[1].url, "/.netlify/functions/offer-intel-investigations?url=https%3A%2F%2Fa.com");
  assert.equal(fetch.calls[0].init.body, undefined);
});

test("review envia expected_version e idempotency_key", async () => {
  const { api, fetch } = client([{ status: 200, body: { ok: true, id: "d1", status: "confirmed", version: 4 } }]);
  await api.setDiscoveryStatus("d1", "confirmed", 3);
  assert.deepEqual(JSON.parse(fetch.calls[0].init.body), { id: "d1", status: "confirmed", expected_version: 3, idempotency_key: "key-1" });
});

test("erros HTTP viram mensagens PT-BR por código e por status", async () => {
  const cases = [
    [401, { ok: false, code: "session_expired" }, /sessão expirou/, "session_expired"],
    [403, { ok: false, code: "forbidden" }, /permissão/, "forbidden"],
    [409, { ok: false, code: "conflict" }, /alterado por outra pessoa/, "conflict"],
    [409, { ok: false, code: "job_active" }, /em andamento/, "job_active"],
    [422, { ok: false, code: "blocked_url" }, /bloqueado/, "blocked_url"],
    [422, { ok: false, code: "offer_not_found" }, /Oferta não encontrada/, "offer_not_found"],
    [422, { ok: false, code: "algo_novo" }, /não puderam ser processados/, "algo_novo"],
    [502, { ok: false, code: "provider_error" }, /fonte de dados externa/, "provider_error"],
    [503, { ok: false, code: "capability_unavailable" }, /não está disponível nesta versão/, "capability_unavailable"],
    [503, { ok: false, code: "credentials_missing" }, /não está configurada/, "credentials_missing"],
    [500, null, /Erro no servidor/, "http_500"]
  ];
  for (const [status, body, pattern, code] of cases) {
    const { api } = client([{ status, body }]);
    const error = await fail(api.getJob("j1"));
    assert.ok(error instanceof Api.ApiError);
    assert.match(error.message, pattern, `${status} ${code}`);
    assert.equal(error.code, code);
    assert.equal(error.status, status);
  }
});

test("429 informa quando tentar de novo, usando o corpo ou o header Retry-After", async () => {
  let r = client([{ status: 429, body: { ok: false, code: "cooldown", retry_after: 5400, retryable: true } }]);
  let error = await fail(r.api.startInvestigation({ offerId: "o", options: {} }));
  assert.match(error.message, /investigada há pouco.*Tente novamente em 2 h\./);
  assert.equal(error.retryable, true);
  r = client([{ status: 429, body: { ok: false, code: "rate_limited" }, headers: { "Retry-After": "30" } }]);
  error = await fail(r.api.getJob("j"));
  assert.match(error.message, /Tente novamente em 30 s\./);
  assert.equal(error.retryAfter, 30);
});

test("falha de rede e JSON inválido não vazam detalhes técnicos", async () => {
  let r = client([new Error("ECONNRESET 10.0.0.1")]);
  let error = await fail(r.api.getJob("j"));
  assert.equal(error.code, "network");
  assert.doesNotMatch(error.message, /ECONNRESET|10\.0/);
  r = client([{ status: 200, badJson: true }]);
  error = await fail(r.api.getJob("j"));
  assert.ok(error instanceof Api.ApiError);
  r = client([{ status: 200, body: { ok: false, code: "conflict" } }]);
  error = await fail(r.api.getJob("j"));
  assert.equal(error.code, "conflict");
});

test("401 tenta renovar o token uma única vez; sem sessão não chama a rede", async () => {
  let r = client([{ status: 401, body: { ok: false, code: "session_expired" } }, { status: 200, body: { ok: true, id: "j1" } }], { refreshToken: async () => "fresh" });
  assert.equal((await r.api.getJob("j1")).id, "j1");
  assert.equal(r.fetch.calls[1].init.headers.Authorization, "Bearer fresh");
  r = client([{ status: 401, body: { ok: false } }, { status: 401, body: { ok: false } }], { refreshToken: async () => "fresh" });
  const error = await fail(r.api.getJob("j1"));
  assert.equal(error.code, "session_expired");
  assert.equal(r.fetch.calls.length, 2);
  const none = client([], { getToken: async () => "" });
  assert.equal((await fail(none.api.getJob("j1"))).code, "session_expired");
  assert.equal(none.fetch.calls.length, 0);
});

test("polling: 3 s em execução, 15 s ocioso, pausa com aba oculta e retoma", async () => {
  const timers = [];
  const state = { hidden: false, active: true, work: true, ticks: 0 };
  const poller = Api.createPoller({
    activeMs: 3000, idleMs: 15000,
    isHidden: () => state.hidden, isActive: () => state.active, hasWork: () => state.work,
    tick: async () => { state.ticks++; },
    setTimer: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    clearTimer: id => { timers[id - 1].cleared = true; }
  });
  poller.start();
  assert.equal(timers[0].ms, 3000);
  await timers[0].fn();
  assert.equal(state.ticks, 1);
  assert.equal(timers[1].ms, 3000);
  state.active = false;
  await timers[1].fn();
  assert.equal(timers[2].ms, 15000);
  state.hidden = true;
  await timers[2].fn();
  assert.equal(state.ticks, 2, "aba oculta não consulta");
  assert.equal(timers.length, 3, "aba oculta não agenda");
  state.hidden = false;
  poller.kick();
  await Promise.resolve();
  assert.equal(state.ticks, 3);
  state.work = false;
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(timers.length, 3, "sem trabalho não agenda");
  poller.stop();
});

test("polling sobrevive a erro no tick e para ao parar", async () => {
  const timers = [];
  let ticks = 0;
  const poller = Api.createPoller({ activeMs: 1, idleMs: 2, isHidden: () => false, isActive: () => true, hasWork: () => true, tick: async () => { ticks++; throw new Error("x"); }, setTimer: fn => { timers.push(fn); return timers.length; }, clearTimer() {} });
  poller.start();
  await timers[0]();
  assert.equal(timers.length, 2);
  poller.stop();
  await timers[1]();
  assert.equal(ticks, 1);
});
