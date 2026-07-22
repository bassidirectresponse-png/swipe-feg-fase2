// Persistência das transcrições avulsas em Netlify Blobs.
// O áudio nunca é armazenado: somente texto, segmentos e timestamps por palavra.
import { getStore } from "@netlify/blobs";
import { authenticate, json, preflight, rateLimit, readJson, trustedOrigin } from "./_security.mjs";

const METHODS = "GET, POST, OPTIONS";
const finite = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
const cleanSegments = value => Array.isArray(value) ? value.slice(0, 20_000).map(item => ({
  start: finite(item && item.start), end: finite(item && item.end), text: String(item && item.text || "").slice(0, 4_000),
})).filter(item => item.text) : [];
const cleanWords = value => Array.isArray(value) ? value.slice(0, 100_000).map(item => ({
  start: finite(item && item.start), end: finite(item && item.end), word: String(item && item.word || "").slice(0, 240),
})).filter(item => item.word) : [];

export default async (req) => {
  const options = preflight(req, METHODS); if (options) return options;
  if (!trustedOrigin(req)) return json(req, 403, { ok: false, error: "origem não autorizada" }, METHODS);
  const user = await authenticate(req);
  if (!user) return json(req, 401, { ok: false, error: "sessão inválida" }, METHODS);
  const store = getStore({ name: "transcricoes", consistency: "strong" });

  if (req.method === "GET") {
    const quota = await rateLimit("transcript-read", user.id, { limit: 120, windowMs: 60_000 });
    if (!quota.allowed) return json(req, 429, { ok: false, error: "consultas demais; aguarde um instante", retryAfter: quota.retryAfter }, METHODS);
    const id = new URL(req.url).searchParams.get("id") || "";
    if (!/^[a-f0-9-]{20,50}$/i.test(id)) return json(req, 400, { ok: false, error: "id inválido" }, METHODS);
    const entry = await store.get(id, { type: "json" });
    return entry ? json(req, 200, { ok: true, transcript: entry }, METHODS) : json(req, 404, { ok: false, error: "transcrição não encontrada" }, METHODS);
  }
  if (req.method !== "POST") return json(req, 405, { ok: false, error: "método inválido" }, METHODS);
  const quota = await rateLimit("transcript-write", user.id, { limit: 20, windowMs: 10 * 60_000 });
  if (!quota.allowed) return json(req, 429, { ok: false, error: "limite temporário atingido", retryAfter: quota.retryAfter }, METHODS);

  let input;
  try { input = await readJson(req, { maxBytes: 4 * 1024 * 1024 }); }
  catch (error) { return json(req, error.status || 400, { ok: false, error: error.message }, METHODS); }
  const text = String(input.text || "").trim();
  const segments = cleanSegments(input.segments);
  const words = cleanWords(input.words);
  if (!text && !segments.length) return json(req, 400, { ok: false, error: "transcrição vazia" }, METHODS);
  const id = crypto.randomUUID();
  const transcript = {
    id,
    text: text.slice(0, 2_000_000),
    segments,
    words,
    language: String(input.language || "").slice(0, 20),
    translation: String(input.translation || "").trim().slice(0, 2_000_000),
    translationLanguage: String(input.translationLanguage || "").slice(0, 20),
    duration: Math.max(0, +input.duration || 0),
    fileName: String(input.fileName || "transcricao").slice(0, 240),
    createdAt: new Date().toISOString(),
    createdBy: String(user.id || "")
  };
  await store.setJSON(id, transcript);
  return json(req, 201, { ok: true, id }, METHODS);
};
