import {
  SUPABASE_ANON_KEY as ANON,
  SUPABASE_URL,
  authenticateToken,
  boundedBuffer,
  isAdmin,
  rateLimit,
} from "./_security.mjs";

const GROQ_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = process.env.GROQ_MODEL || "whisper-large-v3-turbo";
const MAX_BYTES = 24 * 1024 * 1024;
const STORAGE_ORIGIN = new URL(SUPABASE_URL).origin;
const STORAGE_PATH = "/storage/v1/object/public/criativos/";

const headers = {
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};
const json = (statusCode, body, extra = {}) => ({ statusCode, headers: { ...headers, ...extra }, body: JSON.stringify(body) });

function storageVideoUrl(value) {
  let url;
  try { url = new URL(String(value || "")); } catch { return null; }
  if (url.origin !== STORAGE_ORIGIN || !url.pathname.startsWith(STORAGE_PATH) || url.username || url.password) return null;
  return url;
}

function isVideo(buffer) {
  return (buffer.length > 12 && buffer.subarray(4, 8).toString("latin1") === "ftyp")
    || (buffer.length > 4 && buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3);
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod === "GET") return json(200, { ok: true, service: "transcribe", ready: !!GROQ_KEY });
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "método inválido" });
  if (!GROQ_KEY) return json(503, { ok: false, error: "serviço de transcrição indisponível" });
  if (Buffer.byteLength(event.body || "", "utf8") > 64 * 1024) return json(413, { ok: false, error: "requisição muito grande" });

  const token = String(event.headers.authorization || event.headers.Authorization || "").replace(/^Bearer\s+/i, "").trim();
  const user = await authenticateToken(token);
  if (!user) return json(401, { ok: false, error: "sessão inválida" });
  if (!isAdmin(user)) return json(403, { ok: false, error: "somente o admin pode transcrever" });
  const limit = await rateLimit("transcribe-sync", user.id, { limit: 12, windowMs: 10 * 60_000 });
  if (!limit.allowed) return json(429, { ok: false, error: "muitas transcrições; tente novamente em instantes" }, { "Retry-After": String(limit.retryAfter) });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { ok: false, error: "corpo inválido" }); }
  const id = String(body.id || "");
  const videoUrl = storageVideoUrl(body.videoUrl);
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id) || !videoUrl) return json(400, { ok: false, error: "id ou vídeo inválido" });

  let buffer;
  try {
    const response = await fetch(videoUrl, { redirect: "error", signal: AbortSignal.timeout(30_000) });
    if (!response.ok) return json(400, { ok: false, error: `download do vídeo falhou (HTTP ${response.status})` });
    buffer = await boundedBuffer(response, MAX_BYTES);
    if (!isVideo(buffer)) return json(415, { ok: false, error: "arquivo não é um vídeo suportado" });
  } catch (error) {
    if (/excede o limite/.test(String(error && error.message || error))) return json(413, { ok: false, error: "vídeo grande demais para a transcrição instantânea" });
    return json(400, { ok: false, error: "download do vídeo falhou" });
  }

  let text = "";
  let language = "";
  try {
    const form = new FormData();
    form.append("file", new Blob([buffer], { type: "video/mp4" }), "audio.mp4");
    form.append("model", GROQ_MODEL);
    form.append("response_format", "verbose_json");
    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_KEY}` },
      body: form,
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) return json(502, { ok: false, error: "serviço de transcrição não concluiu o arquivo" });
    const result = await response.json();
    text = String(result.text || "").trim().slice(0, 2_000_000);
    language = String(result.language || "").slice(0, 40);
  } catch { return json(502, { ok: false, error: "falha ao chamar o serviço de transcrição" }); }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(id)}&select=data`, {
      headers: { apikey: ANON, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
    const rows = response.ok ? await response.json() : [];
    if (rows.length !== 1) return json(404, { ok: false, error: "criativo não encontrado" });
    const data = rows[0].data || {};
    data.transcricao = text;
    data.transcricaoStatus = "done";
    data.transcricaoLang = language;
    const update = await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ data }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!update.ok) return json(500, { ok: false, error: "falha ao gravar a transcrição" });
  } catch { return json(500, { ok: false, error: "falha ao gravar a transcrição" }); }
  return json(200, { ok: true, transcricao: text, lang: language });
};
