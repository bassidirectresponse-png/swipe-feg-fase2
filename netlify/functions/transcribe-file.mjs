// Transcritor avulso (Groq Whisper) — Swipe FEG
//
// A seção "Transcritor" extrai o ÁUDIO do vídeo no próprio navegador (16kHz mono),
// corta em pedaços e manda cada pedaço (WAV) direto pra cá. Assim:
//   - não há limite de tamanho/duração (o cliente fatia);
//   - não precisa de Storage (o áudio vem no corpo da requisição);
//   - qualquer usuário LOGADO pode usar (a função só lê — não grava nada).
//
// Recebe: corpo = bytes WAV (Content-Type: audio/wav) + ?lang=pt|en|...|auto
// Devolve: { ok, text, language, duration, segments:[...], words:[{word,start,end}] }
//
// Env (Netlify): GROQ_API_KEY (obrigatória), SUPABASE_URL, SUPABASE_ANON_KEY.

import { authenticate, boundedBuffer, json, preflight, rateLimit, trustedOrigin } from "./_security.mjs";
const GROQ_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = process.env.GROQ_MODEL || "whisper-large-v3-turbo";
const GROQ_FALLBACK_MODEL = process.env.GROQ_FALLBACK_MODEL || "whisper-large-v3";
const MAX_BYTES = 12 * 1024 * 1024; // cada pedaço é pequeno; guarda de segurança
const GROQ_BUDGET_MS = 7000; // responde antes do limite síncrono da Netlify; o cliente subdivide se necessário
const GROQ_ATTEMPT_MS = 5500;
const LANGS_OK = new Set(["pt", "en", "es", "fr", "de", "it", "nl", "ja", "zh", "ru", "ar", "hi", "ko", "pl", "tr", "id", "uk", "sv", "cs", "ro"]);
const METHODS = "POST, GET, OPTIONS";
async function timedFetch(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(250, timeoutMs));
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

export default async (req) => {
  const options = preflight(req, METHODS); if (options) return options;
  if (req.method === "GET") return json(req, 200, { ok: true, service: "transcribe-file", ready: !!GROQ_KEY }, METHODS);
  if (req.method !== "POST") return json(req, 405, { ok: false, error: "método inválido" }, METHODS);
  if (!trustedOrigin(req)) return json(req, 403, { ok: false, error: "origem não autorizada" }, METHODS);
  if (!GROQ_KEY) return json(req, 500, { ok: false, error: "serviço não configurado" }, METHODS);
  const contentType = String(req.headers.get("content-type") || "").toLowerCase();
  if (!/^audio\/(wav|x-wav)(?:;|$)/.test(contentType)) return json(req, 415, { ok: false, error: "formato de áudio não permitido" }, METHODS);

  const user = await authenticate(req);
  if (!user) return json(req, 401, { ok: false, error: "sessão inválida — faça login de novo" }, METHODS);
  // Uma VSL longa pode precisar de dezenas de partes e de subdivisões quando o
  // provedor demora. O limite continua por usuário, mas não interrompe um único
  // trabalho legítimo no meio.
  const quota = await rateLimit("transcribe-file", user.id, { limit: 240, windowMs: 10 * 60_000 });
  if (!quota.allowed) return json(req, 429, { ok: false, error: "limite temporário de transcrição atingido", retryAfter: quota.retryAfter }, METHODS);

  let language = String(new URL(req.url).searchParams.get("lang") || "").toLowerCase().trim();

  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > MAX_BYTES) return json(req, 413, { ok: false, error: "pedaço de áudio grande demais" }, METHODS);
  let buf;
  try { buf = await boundedBuffer(req, MAX_BYTES); }
  catch (error) {
    const tooLarge = /excede o limite/i.test(String(error && error.message || error));
    return json(req, tooLarge ? 413 : 400, { ok: false, error: tooLarge ? "pedaço de áudio grande demais" : "áudio inválido" }, METHODS);
  }
  if (!buf || !buf.length) return json(req, 400, { ok: false, error: "áudio vazio" }, METHODS);
  if (buf.length > MAX_BYTES) return json(req, 413, { ok: false, error: "pedaço de áudio grande demais" }, METHODS);
  if (buf.length < 12 || buf.subarray(0, 4).toString("ascii") !== "RIFF" || buf.subarray(8, 12).toString("ascii") !== "WAVE") {
    return json(req, 415, { ok: false, error: "arquivo WAV inválido" }, METHODS);
  }

  try {
    let lastStatus = 502, lastText = "", retryAfter = 0, startedAt = Date.now();
    const models = [...new Set([GROQ_MODEL, GROQ_FALLBACK_MODEL].filter(Boolean))];
    for (const model of models) {
      const remaining = GROQ_BUDGET_MS - (Date.now() - startedAt);
      if (remaining < 500) { lastStatus = 504; lastText = "tempo limite interno atingido"; break; }
      const form = new FormData();
      form.append("file", new Blob([buf], { type: "audio/wav" }), "audio.wav");
      form.append("model", model);
      form.append("response_format", "verbose_json");
      form.append("timestamp_granularities[]", "word");
      form.append("timestamp_granularities[]", "segment");
      if (language && language !== "auto" && LANGS_OK.has(language)) form.append("language", language);
      let g;
      try {
        g = await timedFetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST", headers: { Authorization: `Bearer ${GROQ_KEY}` }, body: form,
        }, Math.min(GROQ_ATTEMPT_MS, remaining));
      } catch (e) {
        if (e && e.name === "AbortError") { lastStatus = 504; lastText = `o modelo ${model} excedeu o tempo seguro`; continue; }
        throw e;
      }
      const gt = await g.text();
      if (g.ok) {
        const gj = JSON.parse(gt);
        const segments = Array.isArray(gj.segments)
          ? gj.segments.map(s => ({ start: +s.start || 0, end: +s.end || 0, text: String(s.text || "").trim() })).filter(s => s.text)
          : [];
        const words = Array.isArray(gj.words)
          ? gj.words.map(w => ({ word: String(w.word || "").trim(), start: +w.start || 0, end: +w.end || 0 })).filter(w => w.word)
          : [];
        return json(req, 200, { ok: true, text: String(gj.text || "").trim(), language: String(gj.language || ""), duration: +gj.duration || 0, segments, words }, METHODS);
      }
      lastStatus = g.status; lastText = gt;
      if (g.status === 429) {
        retryAfter = Math.max(2, Number.parseInt(g.headers.get("retry-after") || "0", 10) || 12);
        break;
      }
      if (g.status !== 429 && g.status < 500) break;
    }
    const status = lastStatus === 429 ? 429 : lastStatus === 504 ? 504 : 502;
    return json(req, status, { ok: false, retryable: status === 429 || status >= 500, retryAfter, error: status === 429 ? "serviço temporariamente ocupado" : "a transcrição excedeu o tempo seguro" }, METHODS);
  } catch { return json(req, 502, { ok: false, error: "falha temporária no serviço de transcrição" }, METHODS); }
};
