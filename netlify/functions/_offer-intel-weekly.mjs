import { createHmac } from "node:crypto";
import { authenticate, isAdmin, trustedOrigin, preflight, json, readJson, rateLimit, SUPABASE_URL, safeRemoteFetch, boundedBuffer } from "./_security.mjs";
import { automationSigningSecret } from "./_supabase-admin.mjs";
import { ANTHROPIC_URL } from "./_ad-video-analysis.mjs";
import { IntelError, UUID } from "../../lib/offer-intel-core.mjs";
import { signedDispatch, verifyDispatch } from "../../lib/offer-intel-dispatch.mjs";
import { reviewDate, isReviewDate, reviewTitle, publicReport, publicAd, publicProduct, validateBullets, isMoney } from "../../lib/offer-intel-weekly.mjs";
import { createWeeklyStorage } from "../../lib/offer-intel-weekly-storage.mjs";
import { runCreativeReviewSlice, createWeeklyApify, createWeeklyArchive, createWeeklyClaude, createWeeklyOpenRouter } from "../../lib/offer-intel-weekly-worker.mjs";

const METHODS = "GET, POST, OPTIONS";
const FB_MEDIA_HOSTS = ["fbcdn.net", "facebook.com", "fbsbx.com", "akamaihd.net"];
// Direct Anthropic fallback (used only without OPENROUTER_API_KEY).
export const CREATIVE_REVIEW_MODEL = String(process.env.CREATIVE_REVIEW_MODEL || "claude-sonnet-5-5").trim();
// OpenRouter (preferred when its key exists): best cost/benefit measured on real ads on 28/10/2026 —
// Gemini 3.8 Flash for the ~240 ad analyses, Claude Sonnet 5.5 for the product/executive summaries shown in the meeting.
export const OPENROUTER_ADS_MODEL = String(process.env.OPENROUTER_MODEL_ADS || "google/gemini-3.8-flash").trim();
export const OPENROUTER_SUMMARY_MODEL = String(process.env.OPENROUTER_MODEL_SUMMARY || "anthropic/claude-sonnet-5.5").trim();
export function creativeReviewAi(env = process.env) {
  const openRouterKey = String(env.OPENROUTER_API_KEY || "").trim();
  if (openRouterKey) return { model: OPENROUTER_ADS_MODEL,
    claude: createWeeklyOpenRouter({ key: openRouterKey, adsModel: OPENROUTER_ADS_MODEL, summaryModel: OPENROUTER_SUMMARY_MODEL }) };
  return { model: CREATIVE_REVIEW_MODEL,
    claude: createWeeklyClaude({ key: env.ANTHROPIC_API_KEY || "", model: CREATIVE_REVIEW_MODEL, url: ANTHROPIC_URL }) };
}
// Domain separation: a weekly signature is never valid for the investigation worker and vice versa.
export const weeklySecret = secret => secret ? createHmac("sha256", secret).update("offer-intel-weekly/v1").digest("hex") : "";

export function weeklyRuntime() {
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const storage = createWeeklyStorage({ url: SUPABASE_URL, serviceKey });
  const secret = weeklySecret(automationSigningSecret());
  return {
    storage, secret, ...creativeReviewAi(),
    apify: createWeeklyApify({ token: String(process.env.APIFY_TOKEN || "").trim() }),
    archive: createWeeklyArchive({
      publicUrl: path => SUPABASE_URL + "/storage/v1/object/public/criativos/" + path,
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
      if (!response.ok) throw new IntelError(503, "capability_unavailable", "Não foi possível iniciar o Creative Review.", true);
    },
  };
}

export function createWeeklyHandlers(overrides = {}) {
  const deps = { authenticate, isAdmin, trustedOrigin, preflight, json, readJson, rateLimit, getServices: weeklyRuntime, now: () => new Date(), sliceMs: 12 * 60_000, ...overrides };
  function errorResponse(req, error) {
    const known = error instanceof IntelError;
    const status = known ? error.status : ([400, 413, 415].includes(error?.status) ? error.status : 503);
    const body = { ok: false, code: known ? error.code : (status === 503 ? "capability_unavailable" : "invalid_request"),
      error: known ? error.message : (status === 503 ? "Creative Review indisponível." : "Requisição inválida."),
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
    const review_date = reviewDate(deps.now());
    const result = await services.storage.enqueue({ review_date, trigger, actor_id });
    await services.dispatch(result.report.id, result.nonce);
    return { review_date, report: result.report };
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
        return deps.json(req, 202, { ok: true, report_id: result.report.id, review_date: result.review_date, title: reviewTitle(result.review_date),
          status: result.report.status }, METHODS);
      }
      const quota = await deps.rateLimit("offer-intel-read", user.id, { limit: 180, windowMs: 60000 });
      if (!quota.allowed) throw new IntelError(429, "rate_limited", "Consultas demais; aguarde.", true, quota.retryAfter || 60);
      const params = new URL(req.url).searchParams, date = params.get("date"), offerId = params.get("offer_id"), { storage } = deps.getServices();
      if (date === null) {
        if (offerId !== null) throw new IntelError(400, "invalid_request", "Informe date junto com offer_id.");
        const rows = await storage.listReports({ limit: 52 });
        return deps.json(req, 200, { ok: true, items: rows.map(r => { const p = publicReport(r), c = r.cost || {};
          return { id: p.id, review_date: p.review_date, title: p.title, status: p.status, active: p.active, phase: p.phase, progress: p.progress,
            finished_at: p.finished_at, updated_at: p.updated_at, products_count: isMoney(c.products) ? c.products : 0,
            ads_count: isMoney(c.ads_ranked) ? c.ads_ranked : 0, cost: p.cost }; }) }, METHODS);
      }
      if (date !== "latest" && !isReviewDate(date)) throw new IntelError(400, "invalid_request", "Data inválida (use AAAA-MM-DD de uma quarta-feira ou latest).");
      if (offerId !== null && (!UUID.test(offerId))) throw new IntelError(400, "invalid_request", "offer_id inválido.");
      const report = await storage.getReport(date === "latest" ? { latest: true } : { date });
      if (!report) throw new IntelError(404, "not_found", "Creative Review não encontrado.");
      const ads = (await storage.listAds(report.id)).map(publicAd), products = (await storage.listProducts(report.id)).map(p => publicProduct(p, ads));
      const head = publicReport(report);
      if (offerId !== null) {
        const product = products.find(p => p.offer_id === offerId.toLowerCase());
        if (!product) throw new IntelError(404, "not_found", "Produto não encontrado nesta pasta.");
        const index = products.indexOf(product);
        return deps.json(req, 200, { ok: true, report: head, product: { ...product, prev_offer_id: products[index - 1]?.offer_id || null,
          next_offer_id: products[index + 1]?.offer_id || null }, ads: ads.filter(a => a.offer_id === product.offer_id).sort((a, b) => a.rank - b.rank) }, METHODS);
      }
      return deps.json(req, 200, { ok: true, report: head, summary: validateBullets(report.summary, 5), products }, METHODS);
    } catch (error) { return errorResponse(req, error); }
  }

  /** One signed slice; when work remains, releases the lease and re-dispatches itself with a fresh nonce. */
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
      const fence = { report_id: report.id, lease_token: report.lease_token };
      try {
        const result = await runCreativeReviewSlice({ report, storage: services.storage, apify: services.apify, archive: services.archive,
          claude: services.claude, model: services.model, now: deps.now, deadline: Date.now() + (typeof deps.sliceMs === "function" ? deps.sliceMs() : deps.sliceMs) });
        if (!result.done) {
          const next = await services.storage.continue(fence);
          await services.dispatch(report.id, next.nonce);
        }
      } catch (error) {
        if (error?.code !== "conflict") await services.storage.checkpoint({ ...fence,
          patch: { status: "failed", phase: "done", progress: 100, error: { code: error instanceof IntelError ? error.code : "provider_error",
            message: error instanceof IntelError ? error.message : "Falha no processamento do Creative Review.", retryable: true } } }).catch(() => {});
      }
      return deps.json(req, 202, { ok: true }, METHODS);
    } catch (error) { return errorResponse(req, error); }
  }

  async function scheduled() {
    try {
      const result = await enqueue(deps.getServices(), { trigger: "schedule" });
      return Response.json({ ok: true, review_date: result.review_date, status: result.report.status });
    } catch (error) {
      const code = error instanceof IntelError ? error.code : "capability_unavailable";
      console.error("offer-intel-weekly scheduled:", code);
      return Response.json({ ok: code === "job_active", code }, { status: code === "job_active" ? 200 : 500 });
    }
  }
  return { api, background, scheduled };
}
