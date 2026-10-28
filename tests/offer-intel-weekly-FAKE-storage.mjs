// FAKE in-memory Creative Review storage for tests only. Mirrors the SQL RPC semantics of
// supabase/migrations/202610280004_offer_intel_weekly.sql (lease fence, nonce, continue, USD ceilings in cents).
import { randomUUID } from "node:crypto";
import { IntelError } from "../lib/offer-intel-core.mjs";

const CAPS = { apify: 1500, ai: 1000 };
export function createFAKEWeeklyStorage({ offers = [], discoveries = [], clock = () => Date.now() } = {}) {
  const reports = new Map(), products = new Map(), ads = new Map(), runs = new Map(), dispatches = new Map(), ledger = [];
  const conflict = () => new IntelError(409, "conflict", "Operação não permitida no estado atual.");
  const fenced = p => {
    const r = reports.get(p.report_id);
    if (!r || r.status !== "running" || r.lease_token !== p.lease_token || !(r.lease_until > clock())) throw conflict();
    r.lease_until = clock() + 300_000; return r;
  };
  const copy = v => structuredClone(v);
  const nonceFor = id => { const nonce = randomUUID(); dispatches.set(nonce, { report_id: id, used: false, expires: clock() + 300_000 }); return nonce; };
  const fake = {
    reports, products, ads, runs, dispatches, ledger, calls: [],
    async enqueue({ review_date, trigger, actor_id }) {
      let r = [...reports.values()].find(x => x.review_date === review_date);
      if (!r) {
        r = { id: randomUUID(), review_date, status: "queued", phase: "queued", progress: 0, trigger, actor_id, cost: {}, summary: null,
          error: null, lease_token: null, lease_until: 0, attempt: 0, slices: 0, updated_at_ms: clock() };
        reports.set(r.id, r);
      } else {
        if ((r.status === "running" && r.lease_until > clock()) || (r.status === "queued" && r.updated_at_ms > clock() - 300_000))
          throw new IntelError(409, "job_active", "O Creative Review desta semana já está em execução.", true, 60);
        Object.assign(r, { status: "queued", phase: "queued", progress: 0, error: null, attempt: 0, slices: 0, lease_token: null, lease_until: 0, trigger, updated_at_ms: clock() });
      }
      return { report: copy(r), nonce: nonceFor(r.id) };
    },
    async claim({ report_id, nonce }) {
      const r = reports.get(report_id), n = dispatches.get(nonce);
      if (!r || !["queued", "running"].includes(r.status) || r.lease_until > clock() || r.attempt >= 3) return null;
      if (!n || n.report_id !== r.id || n.used || n.expires <= clock()) return null;
      n.used = true;
      Object.assign(r, { status: "running", phase: r.phase === "queued" ? "select" : r.phase, lease_token: randomUUID(), lease_until: clock() + 300_000, attempt: r.attempt + 1 });
      return copy(r);
    },
    async continue(p) {
      const r = fenced(p);
      if (r.slices >= 24) throw new IntelError(400, "invalid_request", "Requisição inválida.");
      Object.assign(r, { lease_token: null, lease_until: 0, attempt: 0, slices: r.slices + 1 });
      return { nonce: nonceFor(r.id) };
    },
    async checkpoint(p) {
      const r = fenced(p), v = p.patch || {};
      for (const k of ["status", "phase", "progress", "summary", "error"]) if (k in v) r[k] = copy(v[k]);
      if ("cost" in v) r.cost = { ...r.cost, ...copy(v.cost) };
      if (v.status && v.status !== "running") { r.finished_at = new Date(clock()).toISOString(); r.lease_until = 0; }
      return copy(r);
    },
    async budgetUsage({ review_date, kind }) {
      const cents = ledger.filter(l => l.review_date === review_date && l.kind === kind).reduce((s, l) => s + Math.round(l.usd * 100), 0);
      return { review_date, kind, used_usd: cents / 100, cap_usd: CAPS[kind] / 100 };
    },
    async budgetReserve({ review_date, kind, reservation, usd }) {
      fake.calls.push(["reserve", kind, reservation, usd]);
      if (!(kind in CAPS) || typeof usd !== "number" || !(usd > 0)) throw new IntelError(400, "invalid_request", "Requisição inválida.");
      const mine = ledger.filter(l => l.review_date === review_date && l.kind === kind);
      const used = mine.reduce((s, l) => s + l.usd, 0);
      if (mine.some(l => l.reservation === reservation)) return { review_date, kind, used_usd: used, reused: true };
      if (used + usd > CAPS[kind] / 100 + 1e-9) throw new IntelError(429, "budget_exceeded", "Teto semanal atingido.");
      ledger.push({ review_date, kind, reservation, usd });
      return { review_date, kind, used_usd: used + usd, reused: false };
    },
    async run(p) {
      fenced(p);
      const key = p.report_id + ":" + p.batch_key, row = runs.get(key);
      if (!row) {
        if (!p.patch) return null;
        const created = { report_id: p.report_id, batch_key: p.batch_key, provider_run_id: null, dataset_id: null, ...copy(p.patch) };
        runs.set(key, created); return copy(created);
      }
      if (p.patch) {
        if (p.expected_state !== row.state) throw conflict();
        for (const [k, v] of Object.entries(p.patch)) if (v !== undefined && v !== null) row[k] = v;
      }
      return copy(row);
    },
    async listRuns(id) { return [...runs.values()].filter(r => r.report_id === id).map(copy); },
    async saveProducts(p) {
      fenced(p);
      for (const [k, v] of products) if (v.report_id === p.report_id) products.delete(k);
      for (const x of p.products) products.set(p.report_id + ":" + x.offer_id, { report_id: p.report_id, ...copy(x) });
      return p.products.length;
    },
    async saveProduct(p) {
      fenced(p);
      const x = products.get(p.report_id + ":" + p.offer_id); if (!x) throw new IntelError(404, "not_found", "Registro não encontrado.");
      if ("ads_collected" in p.patch) x.ads_collected = p.patch.ads_collected;
      if ("summary" in p.patch) x.summary = copy(p.patch.summary);
      return copy(x);
    },
    async listProducts(id) { return [...products.values()].filter(x => x.report_id === id).sort((a, b) => a.position - b.position).map(copy); },
    async saveAds(p) {
      fenced(p);
      for (const [id, a] of ads) if (a.report_id === p.report_id) ads.delete(id);
      for (const a of p.ads) { const id = randomUUID(); ads.set(id, { id, report_id: p.report_id, ...copy(a) }); }
      return p.ads.length;
    },
    async saveAd(p) {
      fenced(p);
      const a = ads.get(p.id); if (!a || a.report_id !== p.report_id) throw new IntelError(404, "not_found", "Registro não encontrado.");
      if ("media" in p.patch) a.media = copy(p.patch.media);
      if ("analysis" in p.patch) a.analysis = copy(p.patch.analysis);
      return copy(a);
    },
    async listReports() { return [...reports.values()].sort((a, b) => b.review_date.localeCompare(a.review_date)).map(copy); },
    async getReport({ id, date, latest }) {
      const all = await fake.listReports();
      if (id) return all.find(r => r.id === id) || null;
      if (date) return all.find(r => r.review_date === date) || null;
      return latest ? all[0] || null : null;
    },
    async listAds(id) { return [...ads.values()].filter(a => a.report_id === id).sort((a, b) => a.offer_id.localeCompare(b.offer_id) || a.rank - b.rank).map(copy); },
    async loadSources() { return { offers: copy(offers), discoveries: copy(discoveries) }; },
  };
  return fake;
}

/** FAKE Apify provider: dataset items generated per requested start URL, never a network call. */
export function createFAKEWeeklyApify({ itemsFor = () => [], finalStatus = "SUCCEEDED", startError = null, pendingPolls = 0 } = {}) {
  const fake = { available: true, starts: [], datasets: new Map(), polls: 0,
    async start({ actorInput, runOptions }, marker, maxUsd) {
      fake.starts.push({ actorInput, runOptions, marker, maxUsd });
      if (startError) throw startError;
      const n = fake.starts.length, dataset = "FAKEds" + n;
      fake.datasets.set(dataset, actorInput.startUrls.flatMap(u => itemsFor(u.url)).slice(0, runOptions.maxItems));
      return { id: "FAKErun" + n, dataset_id: dataset };
    },
    async status() { fake.polls++; return { status: fake.polls <= pendingPolls ? "RUNNING" : finalStatus, dataset_id: null }; },
    async items(datasetId, limit) { return (fake.datasets.get(datasetId) || []).slice(0, limit); },
  };
  return fake;
}
