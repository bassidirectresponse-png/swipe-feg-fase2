import { createHmac } from "node:crypto";
import { authenticate, isAdmin, trustedOrigin, preflight, json, readJson, rateLimit, SUPABASE_URL, safeRemoteFetch, boundedBuffer } from "./_security.mjs";
import { automationSigningSecret } from "./_supabase-admin.mjs";
import { AD_ANALYSIS_MODEL, ANTHROPIC_URL } from "./_ad-video-analysis.mjs";
import { IntelError, UUID } from "../../lib/offer-intel-core.mjs";
import { signedDispatch, verifyDispatch } from "../../lib/offer-intel-dispatch.mjs";
import { weekStart, isWeekStart, publicWeeklyReport, publicWeeklyAd, validateSummary } from "../../lib/offer-intel-weekly.mjs";
import { createWeeklyStorage } from "../../lib/offer-intel-weekly-storage.mjs";
import { runWeeklyReport, createWeeklyApify, createWeeklyArchive, createWeeklyClaude } from "../../lib/offer-intel-weekly-worker.mjs";

const METHODS = "GET, POST, OPTIONS";
const FB_MEDIA_HOSTS = ["fbcdn.net", "facebook.com", "fbsbx.com", "akamaihd.net"];
// Domain separation: a weekly signature is never valid for the investigation worker and vice versa.
export const weeklySecret = secret => secret ? createHmac("sha256", secret).update("offer-intel-weekly/v1").digest("hex") : "";

export function weeklyRuntime() {
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const storage = createWeeklyStorage({ url: SUPABASE_URL, serviceKey });
  const secret = weeklySecret(automationSigningSecret());
  const publicUrl = path => SUPABASE_URL + "/storage/v1/object/public/criativos/" + path;
  return {
    storage, secret,
    apify: createWeeklyApify({ token: String(process.env.APIFY_TOKEN || "").trim() }),
    claude: createWeeklyClaude({ key: process.env.ANTHROPIC_API_KEY || "", model: AD_ANALYSIS_MODEL, url: ANTHROPIC_URL }),
    archive: createWeeklyArchive({
      publicUrl,
      async download(url, maxBytes) {
        const response = await safeRemoteFetch(url, { allowedHostSuffixes: FB_MEDIA_HOSTS, timeoutMs: 40_000 });
        if (!response.ok) throw new Error("download indisponível");
        return boundedBuffer(response, maxBytes);
      },
      async upload(path, buffer, contentType) {
        const response = await fetch(SUPABASE_URL + "/storage/v1/object/criativos/" + path, { method: "POST",
          headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey, "Content-Type": contentType, "x-upsert": "true" },
          body: buffer, signal: AbortSignal.timeout(90_000) });
        if (!response.ok) throw new Error("armazenamento indisponível");
      },
    }),
    async dispatch(reportId, nonce) {
      const origin = new URL(process.env.URL || "https://benchmarkinggrupofeg.site").origin;
      const response = await fetch(origin + "/.netlify/functions/offer-intel-weekly-background", {
        method: "POST", ...signedDispatch(reportId, nonce, secret), signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new IntelError(503, "capability_unavailable", "Não foi possível iniciar o relatório.", true);
    },
  };
}

export function createWeeklyHandlers(overrides = {}) {
  const deps = { authenticate, isAdmin, trustedOrigin, preflight, json, readJson, rateLimit, getServices: weeklyRuntime, now: () => new Date(), ...overrides };
  function errorResponse(req, error) {
    const known = error instanceof IntelError;
    const status = known ? error.status : ([400, 413, 415].includes(error?.status) ? error.status : 503);
    const body = { ok: false, code: known ? error.code : (status === 503 ? "capability_unavailable" : "invalid_request"),
      error: known ? error.message : (status === 503 ? "Relatório semanal indisponível." : "Requisição inválida."),
      retryable: known ? !!error.retryable : status === 503, ...(known && error.retryAfter ? { retry_after: Math.ceil(error.retryAfter) } : {}) };
    const res = deps.json(req, status, body, METHODS);
    if (body.retry_after) res.headers.set("Retry-After", String(body.retry_after));
    return res;
  }
  async function auth(req) {
    if (!["GET", "POST"].includes(req.method)) throw new IntelError(405, "invalid_request", "Método inválido.");
    if (!deps.trustedOrigin(req)) throw new IntelError(403, "forbidden", "Origem não autorizada.");
    const user = await deps.authenticate(req);
    if (!user) throw new IntelError(401, "session_expired", "Sessão expirada.");
    if (!deps.isAdmin(user)) throw new IntelError(403, "forbidden", "Acesso restrito ao administrador.");
    return user;
  }
  async function enqueue(services, { trigger, actor_id = null }) {
    const week_start = weekStart(deps.now());
    const result = await services.storage.enqueue({ week_start, trigger, actor_id });
    if (result.nonce && result.report.status === "queued") await services.dispatch(result.report.id, result.nonce);
    return { week_start, report: result.report, reused: !!result.reused };
  }

  async function api(req) {
    const pre = deps.preflight(req, METHODS); if (pre) return pre;
    try {
      const user = await auth(req);
      if (req.method === "POST") {
        const body = await deps.readJson(req, { maxBytes: 1024 });
        if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 1 || body.action !== "run")
          throw new IntelError(400, "invalid_request", "Ação inválida.");
        const quota = await deps.rateLimit("offer-intel-weekly-run", user.id, { limit: 6, windowMs: 3_600_000 });
        if (!quota.allowed) throw new IntelError(429, "rate_limited", "Execuções demais; aguarde.", true, quota.retryAfter || 60);
        const result = await enqueue(deps.getServices(), { trigger: "manual", actor_id: user.id });
        return deps.json(req, result.reused ? 200 : 202, { ok: true, report_id: result.report.id, week_start: result.week_start,
          status: result.report.status, reused: result.reused }, METHODS);
      }
      const quota = await deps.rateLimit("offer-intel-read", user.id, { limit: 180, windowMs: 60000 });
      if (!quota.allowed) throw new IntelError(429, "rate_limited", "Consultas demais; aguarde.", true, quota.retryAfter || 60);
      const params = new URL(req.url).searchParams, week = params.get("week"), { storage } = deps.getServices();
      if (week === null) {
        const rows = await storage.listReports({ limit: 52 });
        return deps.json(req, 200, { ok: true, items: rows.map(r => { const p = publicWeeklyReport(r);
          return { id: p.id, week_start: p.week_start, status: p.status, finished_at: p.finished_at, cost: p.cost }; }) }, METHODS);
      }
      if (week !== "latest" && !isWeekStart(week)) throw new IntelError(400, "invalid_request", "Semana inválida (use YYYY-MM-DD de uma terça ou latest).");
      const report = await storage.getReport(week === "latest" ? { latest: true } : { week });
      if (!report) throw new IntelError(404, "not_found", "Relatório não encontrado.");
      const ads = (await storage.listAds(report.id)).map(publicWeeklyAd);
      const summary = validateSummary(report.summary);
      return deps.json(req, 200, { ok: true, report: publicWeeklyReport(report),
        registered: ads.filter(a => a.group === "registered").sort((a, b) => a.rank - b.rank),
        discovered: ads.filter(a => a.group === "discovered").sort((a, b) => a.rank - b.rank),
        summary: summary ? { ...summary, generated_at: typeof report.summary.generated_at === "string" ? report.summary.generated_at : null } : null }, METHODS);
    } catch (error) { return errorResponse(req, error); }
  }

  async function background(req) {
    try {
      if (req.method !== "POST") throw new IntelError(405, "invalid_request", "Método inválido.");
      const services = deps.getServices();
      if (+req.headers.get("content-length") > 4096) throw new IntelError(413, "invalid_request", "Corpo excede o limite.");
      const raw = await req.text();
      if (Buffer.byteLength(raw) > 4096) throw new IntelError(413, "invalid_request", "Corpo excede o limite.");
      const signed = verifyDispatch(raw, req.headers, services.secret);
      if (!signed) throw new IntelError(403, "forbidden", "Assinatura interna inválida.");
      const report = await services.storage.claim({ report_id: signed.job_id, nonce: signed.nonce });
      if (!report || !UUID.test(report.lease_token || "")) return deps.json(req, 202, { ok: true }, METHODS);
      try {
        await runWeeklyReport({ report, storage: services.storage, apify: services.apify, archive: services.archive,
          claude: services.claude, now: deps.now, deadline: Date.now() + 13 * 60_000 });
      } catch (error) {
        if (error?.code !== "conflict") await services.storage.checkpoint({ report_id: report.id, lease_token: report.lease_token,
          patch: { status: "failed", phase: "done", progress: 100, error: { code: error instanceof IntelError ? error.code : "provider_error",
            message: error instanceof IntelError ? error.message : "Falha no processamento do relatório.", retryable: true } } }).catch(() => {});
      }
      return deps.json(req, 202, { ok: true }, METHODS);
    } catch (error) { return errorResponse(req, error); }
  }

  async function scheduled() {
    try {
      const result = await enqueue(deps.getServices(), { trigger: "schedule" });
      return Response.json({ ok: true, week_start: result.week_start, status: result.report.status, reused: result.reused });
    } catch (error) {
      const code = error instanceof IntelError ? error.code : "capability_unavailable";
      console.error("offer-intel-weekly scheduled:", code);
      return Response.json({ ok: code === "job_active", code }, { status: code === "job_active" ? 200 : 500 });
    }
  }
  return { api, background, scheduled };
}
