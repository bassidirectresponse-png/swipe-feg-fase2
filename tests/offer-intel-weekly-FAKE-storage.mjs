// FAKE in-memory weekly storage for tests only. Mirrors the SQL RPC semantics of
// supabase/migrations/202610280004_offer_intel_weekly.sql (lease fence, nonce, USD ceiling).
import { randomUUID } from "node:crypto";
import { IntelError } from "../lib/offer-intel-core.mjs";

export function createFAKEWeeklyStorage({ offers = [], discoveries = [], clock = () => Date.now() } = {}) {
  const reports = new Map(), ads = new Map(), runs = new Map(), dispatches = new Map(), ledger = [];
  const conflict = () => new IntelError(409, "conflict", "Operação não permitida no estado atual.");
  const fenced = p => {
    const r = reports.get(p.report_id);
    if (!r || r.status !== "running" || r.lease_token !== p.lease_token || r.lease_until <= clock()) throw conflict();
    r.lease_until = clock() + 300_000; return r;
  };
  const copy = v => structuredClone(v);
  const fake = {
    reports, ads, runs, dispatches, ledger, calls: [],
    async enqueue({ week_start, trigger, actor_id }) {
      let r = [...reports.values()].find(x => x.week_start === week_start);
      if (!r) {
        r = { id: randomUUID(), week_start, status: "queued", phase: "queued", progress: 0, trigger, actor_id, cost: {}, summary: null,
          error: null, lease_token: null, lease_until: 0, attempt: 0, updated_at_ms: clock(), created_at: new Date(clock()).toISOString() };
        reports.set(r.id, r);
      } else {
        if ((r.status === "running" && r.lease_until > clock()) || (r.status === "queued" && r.updated_at_ms > clock() - 300_000))
          throw new IntelError(409, "job_active", "O relatório desta semana já está em execução.", true, 60);
        if (r.status === "succeeded") return { report: copy(r), reused: true, nonce: null };
        Object.assign(r, { status: "queued", phase: "queued", progress: 0, error: null, attempt: 0, lease_token: null, lease_until: 0, trigger, updated_at_ms: clock() });
      }
      const nonce = randomUUID(); dispatches.set(nonce, { report_id: r.id, used: false, expires: clock() + 300_000 });
      return { report: copy(r), reused: false, nonce };
    },
    async claim({ report_id, nonce }) {
      const r = reports.get(report_id), n = dispatches.get(nonce);
      if (!r || !["queued", "running"].includes(r.status) || r.lease_until > clock() || r.attempt >= 3) return null;
      if (!n || n.report_id !== r.id || n.used || n.expires <= clock()) return null;
      n.used = true;
      Object.assign(r, { status: "running", phase: "select", lease_token: randomUUID(), lease_until: clock() + 300_000, attempt: r.attempt + 1 });
      return copy(r);
    },
    async checkpoint(p) {
      const r = fenced(p), v = p.patch || {};
      for (const k of ["status", "phase", "progress", "cost", "summary", "error"]) if (k in v) r[k] = copy(v[k]);
      if (v.status && v.status !== "running") { r.finished_at = new Date(clock()).toISOString(); r.lease_until = 0; }
      return copy(r);
    },
    async budgetUsage({ week_start }) {
      return { week_start, used_usd: Math.round(ledger.filter(l => l.week_start === week_start).reduce((s, l) => s + l.usd * 100, 0)) / 100, cap_usd: 15 };
    },
    async budgetReserve({ week_start, reservation, usd }) {
      fake.calls.push(["reserve", reservation, usd]);
      const usedCents = ledger.filter(l => l.week_start === week_start).reduce((s, l) => s + Math.round(l.usd * 100), 0);
      if (ledger.some(l => l.week_start === week_start && l.reservation === reservation)) return { week_start, used_usd: usedCents / 100, cap_usd: 15, reused: true };
      if (usedCents + Math.round(usd * 100) > 1500) throw new IntelError(429, "budget_exceeded", "Teto semanal de coleta atingido.");
      ledger.push({ week_start, reservation, usd });
      return { week_start, used_usd: (usedCents + Math.round(usd * 100)) / 100, cap_usd: 15, reused: false };
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
    async saveAds(p) {
      fenced(p);
      if (!Array.isArray(p.ads) || p.ads.length > 20) throw new IntelError(400, "invalid_request", "Requisição inválida.");
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
    async listReports() { return [...reports.values()].sort((a, b) => b.week_start.localeCompare(a.week_start)).map(copy); },
    async getReport({ id, week, latest }) {
      const all = await fake.listReports();
      if (id) return all.find(r => r.id === id) || null;
      if (week) return all.find(r => r.week_start === week) || null;
      return all.find(r => ["succeeded", "partial"].includes(r.status)) || all[0] || null;
    },
    async listAds(id) { return [...ads.values()].filter(a => a.report_id === id).sort((a, b) => a.group.localeCompare(b.group) || a.rank - b.rank).map(copy); },
    async loadSources() { return { offers: copy(offers), discoveries: copy(discoveries) }; },
  };
  return fake;
}

/** FAKE Apify provider: dataset items are generated per requested Page, never a network call. */
export function createFAKEWeeklyApify({ itemsFor = () => [], finalStatus = "SUCCEEDED", startError = null } = {}) {
  const fake = { available: true, starts: [], datasets: new Map(),
    async start({ actorInput, runOptions }, marker, maxUsd) {
      fake.starts.push({ actorInput, runOptions, marker, maxUsd });
      if (startError) throw startError;
      const id = "FAKErun" + fake.starts.length, dataset = "FAKEds" + fake.starts.length;
      const pageIds = actorInput.startUrls.map(u => new URL(u.url).searchParams.get("view_all_page_id"));
      fake.datasets.set(dataset, pageIds.flatMap(itemsFor).slice(0, runOptions.maxItems));
      return { id, dataset_id: dataset };
    },
    async status() { return { status: finalStatus, dataset_id: null }; },
    async items(datasetId, limit) { return (fake.datasets.get(datasetId) || []).slice(0, limit); },
  };
  return fake;
}
