// Cria e consulta jobs persistentes do Dissecador de VSL.
// O conteúdo pesado fica no Netlify Blobs; a Background Function recebe apenas
// id + segredo e pode encadear quantas execuções forem necessárias.
import { getStore } from "@netlify/blobs";

const SUPABASE_URL = (process.env.SUPABASE_URL || "https://ppaajtzbhjixhyfidojd.supabase.co").replace(/\/+$/, "");
const ANON = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwYWFqdHpiaGppeGh5Zmlkb2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMDkzNTcsImV4cCI6MjA5Njc4NTM1N30.uoC_3EHM_dfmkBHJYjPvlaC7DqkJziunz-tug0ItAJc";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const json = (status, body) => Response.json(body, { status, headers: { ...CORS, "Cache-Control": "no-store" } });
const clean = (value) => String(value == null ? "" : value)
  .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
  .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");

async function authenticated(req) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON, Authorization: `Bearer ${token}` } });
    return response.ok ? await response.json() : null;
  } catch { return null; }
}

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

export default async (req) => {
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: CORS });
  const url = new URL(req.url);
  if (req.method === "GET" && !url.searchParams.get("id")) {
    return json(200, { ok: true, service: "vsl-job", ready: !!process.env.ANTHROPIC_API_KEY });
  }

  const user = await authenticated(req);
  if (!user) return json(401, { ok: false, error: "sessão inválida — faça login novamente" });
  const store = getStore({ name: "vsl-jobs", consistency: "strong" });

  if (req.method === "GET") {
    const id = url.searchParams.get("id") || "";
    if (!/^[a-f0-9-]{20,80}$/i.test(id)) return json(400, { ok: false, error: "id inválido" });
    const job = await store.get(id, { type: "json" });
    if (!job || job.owner !== String(user.id || "")) return json(404, { ok: false, error: "análise não encontrada" });
    return json(200, { ok: true, job: publicJob(job) });
  }
  if (req.method !== "POST") return json(405, { ok: false, error: "método inválido" });
  if (!process.env.ANTHROPIC_API_KEY) return json(500, { ok: false, error: "ANTHROPIC_API_KEY não configurada no Netlify" });

  let body;
  try { body = await req.json(); } catch { return json(400, { ok: false, error: "JSON inválido" }); }
  const transcript = clean(body.transcript || "").trim();
  const organized = clean(body.organizedTranscript || "").trim();
  const canonical = clean(body.canonicalScript || "").trim();
  if (!transcript && !organized && !canonical) return json(400, { ok: false, error: "transcrição vazia" });

  const id = crypto.randomUUID();
  const jobKey = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const job = {
    id,
    jobKey,
    owner: String(user.id || ""),
    status: "queued",
    phase: "core",
    chunkIndex: 0,
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
      language: clean(body.language || "").slice(0, 30),
      duration: Math.max(0, Number(body.duration) || 0),
      transcript,
      organizedTranscript: organized,
      canonicalScript: canonical,
      contactSheets: Array.isArray(body.contactSheets) ? body.contactSheets.slice(0, 5) : [],
    },
    createdAt: now,
    updatedAt: now,
  };
  await store.setJSON(id, job);

  const backgroundUrl = new URL("/.netlify/functions/vsl-dissector-background", req.url);
  const started = await fetch(backgroundUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, key: jobKey, phase: "core", index: 0 }),
  }).catch(() => null);
  if (!started || !started.ok) {
    job.status = "error";
    job.error = "Não foi possível iniciar o processamento em segundo plano.";
    job.message = job.error;
    job.updatedAt = new Date().toISOString();
    await store.setJSON(id, job);
    return json(502, { ok: false, error: job.error });
  }
  return json(202, { ok: true, id, status: "queued" });
};
