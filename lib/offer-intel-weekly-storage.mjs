import { IntelError } from "./offer-intel-core.mjs";
import { WEEKLY_SECTIONS } from "./offer-intel-weekly.mjs";

/** Weekly storage contract. Atomicity (lease, nonce, USD ceiling) lives in SQL RPCs; tests use a FAKE. */
export function createWeeklyStorage({ url, serviceKey, fetcher = fetch }) {
  if (!serviceKey) throw new IntelError(503, "credentials_missing", "Credencial interna não configurada.");
  const base = new URL("/rest/v1/", url);
  async function request(path, method = "GET", body) {
    const res = await fetcher(new URL(path, base), {
      method, headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      const code = (await res.json().catch(() => ({}))).message;
      if (code === "job_active") throw new IntelError(409, "job_active", "O relatório desta semana já está em execução.", true, 60);
      if (code === "budget_exceeded") throw new IntelError(429, "budget_exceeded", "Teto semanal de coleta atingido.");
      if (code === "conflict") throw new IntelError(409, "conflict", "Operação não permitida no estado atual.");
      if (code === "not_found") throw new IntelError(404, "not_found", "Registro não encontrado.");
      if (code === "invalid_request") throw new IntelError(400, "invalid_request", "Requisição inválida.");
      throw new IntelError(503, "capability_unavailable", "Armazenamento do relatório indisponível.", true);
    }
    return res.json();
  }
  const rpc = (name, p) => request("rpc/offer_intel_weekly_" + name, "POST", { p });
  const select = (table, params) => request(table + "?" + new URLSearchParams(params));
  return {
    enqueue: p => rpc("enqueue", p), claim: p => rpc("claim", p), checkpoint: p => rpc("checkpoint", p),
    budgetReserve: p => rpc("budget_reserve", p), budgetUsage: p => rpc("budget_usage", p),
    run: p => rpc("run", p), saveAds: p => rpc("save_ads", p), saveAd: p => rpc("save_ad", p),
    listRuns: id => select("offer_intel_weekly_runs", { select: "*", report_id: "eq." + id }),
    listReports: ({ limit = 52 } = {}) => select("offer_intel_weekly_reports", {
      select: "id,week_start,status,phase,progress,trigger,started_at,finished_at,updated_at,cost,error", order: "week_start.desc", limit: String(limit) }),
    async getReport({ id, week, latest }) {
      const params = { select: "*", limit: "1", order: "week_start.desc" };
      if (id) params.id = "eq." + id;
      else if (week) params.week_start = "eq." + week;
      else if (latest) {
        // Latest finished report first; fall back to the newest one (e.g. first run still running).
        const done = await select("offer_intel_weekly_reports", { ...params, status: "in.(succeeded,partial)" });
        if (done[0]) return done[0];
      }
      return (await select("offer_intel_weekly_reports", params))[0] || null;
    },
    listAds: id => select("offer_intel_weekly_ads", { select: "*", report_id: "eq." + id, order: "group.asc,rank.asc" }),
    async loadSources() {
      const offers = await select("offers", { select: "id,data", "data->>kind": "in.(" + WEEKLY_SECTIONS.join(",") + ")", limit: "5000" });
      const discoveries = await select("offer_intel_discoveries", {
        select: "scope_key,type,identity_key,status,data", type: "eq.page", status: "neq.ignored", limit: "5000" });
      return { offers, discoveries };
    },
  };
}
