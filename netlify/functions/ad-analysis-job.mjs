import { getStore } from "@netlify/blobs";
import { authenticate, json, preflight, rateLimit, readJson, trustedOrigin } from "./_security.mjs";
import { AD_ANALYSIS_PROMPT_VERSION, validAdDuration } from "./_ad-video-analysis.mjs";

const METHODS = "GET, POST, OPTIONS";
const STORE = "ad-analysis-jobs";
const clean = (value) => String(value == null ? "" : value);

function publicJob(job) {
  return { id: job.id, status: job.status, progress: job.progress, message: job.message, error: job.error || "", report: job.report || "", promptVersion: AD_ANALYSIS_PROMPT_VERSION, updatedAt: job.updatedAt };
}

async function dispatch(req, job) {
  return fetch(new URL("/.netlify/functions/ad-analysis-background", req.url), {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: job.id, key: job.jobKey }),
  }).catch(() => null);
}

export default async (req) => {
  const options = preflight(req, METHODS); if (options) return options;
  if (!trustedOrigin(req)) return json(req, 403, { ok: false, error: "origem não autorizada" }, METHODS);
  const user = await authenticate(req);
  if (!user) return json(req, 401, { ok: false, error: "sessão inválida" }, METHODS);
  const store = getStore({ name: STORE, consistency: "strong" });
  const url = new URL(req.url);
  if (req.method === "GET") {
    const quota = await rateLimit("ad-analysis-read", user.id, { limit: 180, windowMs: 60_000 });
    if (!quota.allowed) return json(req, 429, { ok: false, error: "consultas demais" }, METHODS);
    const id = clean(url.searchParams.get("id"));
    const job = /^[a-f0-9-]{20,80}$/i.test(id) ? await store.get(id, { type: "json" }) : null;
    if (!job || job.owner !== user.id) return json(req, 404, { ok: false, error: "análise não encontrada" }, METHODS);
    const stalled = ["queued", "working"].includes(job.status) && Date.now() - Date.parse(job.updatedAt || job.createdAt) > 12 * 60_000;
    if (stalled) { job.status = "queued"; job.message = "Retomando a análise…"; job.updatedAt = new Date().toISOString(); await store.setJSON(job.id, job); await dispatch(req, job); }
    return json(req, 200, { ok: true, job: publicJob(job) }, METHODS);
  }
  if (req.method !== "POST") return json(req, 405, { ok: false, error: "método inválido" }, METHODS);
  if (!process.env.ANTHROPIC_API_KEY) return json(req, 500, { ok: false, error: "serviço não configurado" }, METHODS);
  const quota = await rateLimit("ad-analysis-write", user.id, { limit: 30, windowMs: 60 * 60_000 });
  if (!quota.allowed) return json(req, 429, { ok: false, error: "limite temporário atingido" }, METHODS);
  let body; try { body = await readJson(req, { maxBytes: 12 * 1024 * 1024 }); } catch (error) { return json(req, error.status || 400, { ok: false, error: error.message }, METHODS); }
  const duration = Number(body.duration);
  if (!validAdDuration(duration)) return json(req, 422, { ok: false, error: "a engenharia reversa aceita somente anúncios de até 10 minutos" }, METHODS);
  const transcript = clean(body.transcript).trim();
  if (!transcript) return json(req, 422, { ok: false, error: "transcrição original obrigatória" }, METHODS);
  const contactSheets = Array.isArray(body.contactSheets) ? body.contactSheets.slice(0, 5) : [];
  if (!contactSheets.length) return json(req, 422, { ok: false, error: "leitura visual do vídeo obrigatória" }, METHODS);
  const now = new Date().toISOString(), id = crypto.randomUUID();
  const job = {
    id, jobKey: `${crypto.randomUUID()}-${crypto.randomUUID()}`, owner: user.id,
    status: "queued", progress: 5, message: "Anúncio recebido para leitura visual.", error: "", report: "",
    input: {
      cardId: /^[a-f0-9-]{20,80}$/i.test(clean(body.cardId)) ? clean(body.cardId) : "",
      name: clean(body.name).slice(0, 240), niche: clean(body.niche).slice(0, 140), country: clean(body.country).slice(0, 80),
      language: clean(body.language).slice(0, 50), platform: clean(body.platform).slice(0, 80), notes: clean(body.notes).slice(0, 600),
      duration, transcript, segments: Array.isArray(body.segments) ? body.segments.slice(0, 8_000) : [], contactSheets,
    },
    createdAt: now, updatedAt: now,
  };
  await store.setJSON(id, job);
  const started = await dispatch(req, job);
  if (!started || !started.ok) { job.status = "error"; job.error = "Não foi possível iniciar a análise."; job.message = job.error; await store.setJSON(id, job); return json(req, 502, { ok: false, error: job.error }, METHODS); }
  return json(req, 202, { ok: true, id, status: "queued", promptVersion: AD_ANALYSIS_PROMPT_VERSION }, METHODS);
};

