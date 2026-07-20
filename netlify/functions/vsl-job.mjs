// Cria e consulta jobs persistentes do Dissecador de VSL.
// O conteúdo pesado fica no Netlify Blobs; a Background Function recebe apenas
// id + segredo e pode encadear quantas execuções forem necessárias.
import { getStore } from "@netlify/blobs";
import { authenticate, corsHeaders, json, preflight, rateLimit, readJson, trustedOrigin } from "./_security.mjs";

const METHODS = "GET, POST, OPTIONS";
const clean = (value) => String(value == null ? "" : value)
  .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
  .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");

function publicJob(job) {
  return {
    id: job.id,
    status: job.status,
    phase: job.phase,
    progress: job.progress,
    message: job.message,
    error: job.error || "",
    name: job.input && job.input.name,
    niche: job.input && job.input.niche,
    language: job.input && job.input.language,
    duration: job.input && job.input.duration,
    transcriptDoc: job.transcriptDoc || "",
    analysisDoc: job.analysisDoc || "",
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

const isPortuguese = (language) => /^(pt|portugu)/i.test(String(language || "").trim());
const checkpointIndex = (job) => job.phase === "translation" ? Number(job.translationIndex || 0) : Number(job.chunkIndex || 0);
const canResumeAutomatically = (job) => job.status === "error" && /terminou antes de ficar completa|extensa demais para uma única etapa/i.test(String(job.error || job.message || ""));

async function dispatchBackground(req, job) {
  const backgroundUrl = new URL("/.netlify/functions/vsl-dissector-background", req.url);
  return fetch(backgroundUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: job.id, key: job.jobKey, phase: job.phase, index: checkpointIndex(job) }),
  }).catch(() => null);
}

export default async (req) => {
  const options = preflight(req, METHODS); if (options) return options;
  const url = new URL(req.url);
  if (req.method === "GET" && !url.searchParams.get("id")) {
    return json(req, 200, { ok: true, service: "vsl-job", ready: !!process.env.ANTHROPIC_API_KEY }, METHODS);
  }

  if (!trustedOrigin(req)) return json(req, 403, { ok: false, error: "origem não autorizada" }, METHODS);
  const user = await authenticate(req);
  if (!user) return json(req, 401, { ok: false, error: "sessão inválida — faça login novamente" }, METHODS);
  const store = getStore({ name: "vsl-jobs", consistency: "strong" });

  if (req.method === "GET") {
    const quota = await rateLimit("vsl-job-read", user.id, { limit: 180, windowMs: 60_000 });
    if (!quota.allowed) return json(req, 429, { ok: false, error: "consultas demais; aguarde um instante", retryAfter: quota.retryAfter }, METHODS);
    const id = url.searchParams.get("id") || "";
    if (!/^[a-f0-9-]{20,80}$/i.test(id)) return json(req, 400, { ok: false, error: "id inválido" }, METHODS);
    const job = await store.get(id, { type: "json" });
    if (!job || job.owner !== String(user.id || "")) return json(req, 404, { ok: false, error: "análise não encontrada" }, METHODS);
    const idleMs = Date.now() - (Date.parse(job.updatedAt || job.createdAt || "") || 0);
    const needsRecovery = canResumeAutomatically(job) || (job.status === "queued" && idleMs > 15_000) || (job.status === "working" && idleMs > 12 * 60_000);
    if (needsRecovery) {
      job.status = "queued";
      job.message = "Retomando a análise do último ponto salvo…";
      job.updatedAt = new Date().toISOString();
      job.dispatchCount = Number(job.dispatchCount || 0) + 1;
      await store.setJSON(job.id, job);
      await dispatchBackground(req, job);
    }
    return json(req, 200, { ok: true, job: publicJob(job) }, METHODS);
  }
  if (req.method !== "POST") return json(req, 405, { ok: false, error: "método inválido" }, METHODS);
  if (!process.env.ANTHROPIC_API_KEY) return json(req, 500, { ok: false, error: "serviço não configurado" }, METHODS);
  const quota = await rateLimit("vsl-job-write", user.id, { limit: 6, windowMs: 10 * 60_000 });
  if (!quota.allowed) return json(req, 429, { ok: false, error: "limite temporário de análises atingido", retryAfter: quota.retryAfter }, METHODS);

  let body;
  try { body = await readJson(req, { maxBytes: 12 * 1024 * 1024 }); }
  catch (error) { return json(req, error.status || 400, { ok: false, error: error.message }, METHODS); }
  if (body.action === "retry") {
    const retryId = String(body.id || "");
    if (!/^[a-f0-9-]{20,80}$/i.test(retryId)) return json(req, 400, { ok: false, error: "id inválido" }, METHODS);
    const previous = await store.get(retryId, { type: "json" });
    if (!previous || previous.owner !== String(user.id || "")) return json(req, 404, { ok: false, error: "análise não encontrada" }, METHODS);
    if (previous.status === "complete") return json(req, 200, { ok: true, id: previous.id, status: previous.status }, METHODS);
    previous.status = "queued";
    previous.error = "";
    previous.message = "Retomando a análise do último ponto salvo…";
    previous.updatedAt = new Date().toISOString();
    previous.dispatchCount = Number(previous.dispatchCount || 0) + 1;
    await store.setJSON(previous.id, previous);
    const restarted = await dispatchBackground(req, previous);
    if (!restarted || !restarted.ok) return json(req, 502, { ok: false, error: "Não foi possível retomar agora. Tente novamente em instantes." }, METHODS);
    return json(req, 202, { ok: true, id: previous.id, status: "queued" }, METHODS);
  }
  const transcript = clean(body.transcript || "").trim();
  const organized = clean(body.organizedTranscript || "").trim();
  const canonical = clean(body.canonicalScript || "").trim();
  if (!transcript && !organized && !canonical) return json(req, 400, { ok: false, error: "transcrição vazia" }, METHODS);

  const id = crypto.randomUUID();
  const jobKey = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const language = clean(body.language || "").slice(0, 30);
  const phase = isPortuguese(language) ? "core" : "translation";
  const job = {
    id,
    jobKey,
    owner: String(user.id || ""),
    status: "queued",
    phase,
    chunkIndex: 0,
    translationInitialized: true,
    translationIndex: 0,
    translationParts: [],
    coreParts: [],
    synthesisDoc: "",
    assetsDoc: "",
    progress: 70,
    message: "Análise recebida; preparando a dissecação em segundo plano…",
    error: "",
    transcriptDoc: organized,
    analysisDoc: "",
    input: {
      name: clean(body.name || "VSL sem título").slice(0, 240),
      niche: clean(body.niche || "").slice(0, 140),
      language,
      duration: Math.max(0, Number(body.duration) || 0),
      transcript,
      organizedTranscript: organized,
      canonicalScript: canonical,
      contactSheets: Array.isArray(body.contactSheets) ? body.contactSheets.slice(0, 5) : [],
    },
    createdAt: now,
    updatedAt: now,
    dispatchCount: 1,
  };
  await store.setJSON(id, job);
  const started = await dispatchBackground(req, job);
  if (!started || !started.ok) {
    job.status = "error";
    job.error = "Não foi possível iniciar o processamento em segundo plano.";
    job.message = job.error;
    job.updatedAt = new Date().toISOString();
    await store.setJSON(id, job);
    return json(req, 502, { ok: false, error: job.error }, METHODS);
  }
  return json(req, 202, { ok: true, id, status: "queued" }, METHODS);
};
