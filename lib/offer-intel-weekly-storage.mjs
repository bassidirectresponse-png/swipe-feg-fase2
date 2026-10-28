import { IntelError } from "./offer-intel-core.mjs";
import { WEEKLY_SECTIONS } from "./offer-intel-weekly.mjs";

/** Creative Review storage contract. Atomicity (lease, nonce, USD ceilings) lives in SQL RPCs; tests use a FAKE. */
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
      if (code === "job_active") throw new IntelError(409, "job_active", "O Creative Review desta semana já está em execução.", true, 60);
      if (code === "budget_exceeded") throw new IntelError(429, "budget_exceeded", "Teto semanal atingido.");
      if (code === "conflict") throw new IntelError(409, "conflict", "Operação não permitida no estado atual.");
      if (code === "not_found") throw new IntelError(404, "not_found", "Registro não encontrado.");
      if (code === "invalid_request") throw new IntelError(400, "invalid_request", "Requisição inválida.");
      throw new IntelError(503, "capability_unavailable", "Armazenamento do Creative Review indisponível.", true);
    }
    return res.json();
  }
  const rpc = (name, p) => request("rpc/offer_intel_weekly_" + name, "POST", { p });
  const select = (table, params) => request(table + "?" + new URLSearchParams(params));
  return {
    enqueue: p => rpc("enqueue", p), claim: p => rpc("claim", p), continue: p => rpc("continue", p), checkpoint: p => rpc("checkpoint", p),
    budgetReserve: p => rpc("budget_reserve", p), budgetSettle: p => rpc("budget_settle", p), budgetUsage: p => rpc("budget_usage", p),
    run: p => rpc("run", p), saveProducts: p => rpc("save_products", p), saveProduct: p => rpc("save_product", p),
    saveAds: p => rpc("save_ads", p), saveAd: p => rpc("save_ad", p),
    listRuns: id => select("offer_intel_weekly_runs", { select: "*", report_id: "eq." + id }),
    listReports: ({ limit = 52 } = {}) => select("offer_intel_weekly_reports", {
      select: "id,review_date,status,phase,progress,trigger,started_at,finished_at,updated_at,cost,error", order: "review_date.desc", limit: String(limit) }),
    // latest = the newest folder whatever its status, so a run in progress is visible (and polled) by the UI.
    async getReport({ id, date, latest }) {
      const params = { select: "*", limit: "1", order: "review_date.desc" };
      if (id) params.id = "eq." + id;
      else if (date) params.review_date = "eq." + date;
      else if (!latest) return null;
      return (await select("offer_intel_weekly_reports", params))[0] || null;
    },
    listProducts: id => select("offer_intel_weekly_products", { select: "*", report_id: "eq." + id, order: "position.asc" }),
    listAds: id => select("offer_intel_weekly_ads", { select: "*", report_id: "eq." + id, order: "offer_id.asc,rank.asc", limit: "5000" }),
    async loadSources() {
      const offers = await select("offers", { select: "id,data", "data->>kind": "in.(" + WEEKLY_SECTIONS.join(",") + ")", limit: "5000" });
      const discoveries = await select("offer_intel_discoveries", {
        select: "scope_key,type,identity_key,status,data", type: "eq.page", status: "eq.confirmed", scope_key: "like.offer:*", limit: "5000" });
      return { offers, discoveries };
    },
  };
}
