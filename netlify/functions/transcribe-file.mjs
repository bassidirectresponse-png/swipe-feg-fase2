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
// Mantém margem para a resposta da função, mas não aborta blocos saudáveis
// durante picos normais do provedor. Dois modelos ainda cabem no orçamento.
const GROQ_BUDGET_MS = 24_000;
const GROQ_ATTEMPT_MS = 11_500;
const LANGS_OK = new Set(["pt", "en", "es", "fr", "de", "it", "nl", "ja", "zh", "ru", "ar", "hi", "ko", "pl", "tr", "id", "uk", "sv", "cs", "ro"]);
const METHODS = "POST, GET, OPTIONS";

function findWavData(buf) {
  if (!buf || buf.length < 44) return null;
  let offset = 12;
  while (offset + 8 <= buf.length) {
    const id = buf.subarray(offset, offset + 4).toString("ascii");
    const size = buf.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (id === "data" && start + size <= buf.length) return { start, size };
    offset = start + size + (size % 2);
  }
  return null;
}

// O navegador envia PCM 16-bit mono. Medir a energia antes de chamar o
// provedor evita que silêncio/ruído seja transformado em frases inventadas.
export function wavSignalStats(buf) {
  const data = findWavData(buf);
  if (!data || data.size < 2) return { rms: 0, peak: 0, samples: 0 };
  const samples = Math.floor(data.size / 2);
  const stride = Math.max(1, Math.floor(samples / 160_000));
  let sum = 0, peak = 0, count = 0;
  for (let i = 0; i < samples; i += stride) {
    const value = Math.abs(buf.readInt16LE(data.start + i * 2) / 32768);
    sum += value * value; peak = Math.max(peak, value); count += 1;
  }
  return { rms: count ? Math.sqrt(sum / count) : 0, peak, samples };
}

export function suspiciousTranscript(text) {
  const tokens = String(text || "").toLocaleLowerCase("en-US")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .match(/[\p{L}\p{N}']+/gu) || [];
  if (tokens.length < 5) return false;
  const counts = new Map();
  for (const token of tokens) counts.set(token, (counts.get(token) || 0) + 1);
  const top = Math.max(...counts.values());
  const uniqueRatio = counts.size / tokens.length;
  return top / tokens.length >= 0.72 || (tokens.length >= 8 && uniqueRatio <= 0.22);
}

function noSpeechFromSegments(segments) {
  const probabilities = segments.map(item => Number(item && item.no_speech_prob)).filter(Number.isFinite);
  return probabilities.length > 0 && probabilities.every(value => value >= 0.72);
}

function cleanGroqPayload(gj) {
  const sourceSegments = Array.isArray(gj.segments) ? gj.segments : [];
  const segments = sourceSegments
    .map(s => ({ start: +s.start || 0, end: +s.end || 0, text: String(s.text || "").trim() }))
    .filter(s => s.text);
  const words = Array.isArray(gj.words)
    ? gj.words.map(w => ({ word: String(w.word || "").trim(), start: +w.start || 0, end: +w.end || 0 })).filter(w => w.word)
    : [];
  return {
    text: String(gj.text || "").trim(), language: String(gj.language || ""),
    duration: +gj.duration || 0, segments, words,
    noSpeech: noSpeechFromSegments(sourceSegments),
  };
}

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

  const signal = wavSignalStats(buf);
  if (!signal.samples) return json(req, 415, { ok: false, error: "arquivo WAV sem áudio" }, METHODS);
  if (signal.peak < 0.006 || signal.rms < 0.0008) {
    return json(req, 200, { ok: true, noSpeech: true, text: "", language: language === "auto" ? "" : language, duration: 0, segments: [], words: [] }, METHODS);
  }

  try {
    let lastStatus = 502, lastText = "", retryAfter = 0, startedAt = Date.now(), suspiciousCandidate = null;
    const models = [...new Set([GROQ_MODEL, GROQ_FALLBACK_MODEL].filter(Boolean))];
    for (const model of models) {
      const remaining = GROQ_BUDGET_MS - (Date.now() - startedAt);
      if (remaining < 500) { lastStatus = 504; lastText = "tempo limite interno atingido"; break; }
      const form = new FormData();
      form.append("file", new Blob([buf], { type: "audio/wav" }), "audio.wav");
      form.append("model", model);
      form.append("response_format", "verbose_json");
      form.append("temperature", "0");
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
        const candidate = cleanGroqPayload(gj);
        if (candidate.noSpeech && !candidate.text) {
          return json(req, 200, { ok: true, noSpeech: true, text: "", language: candidate.language, duration: candidate.duration, segments: [], words: [] }, METHODS);
        }
        if (suspiciousTranscript(candidate.text) || candidate.noSpeech) {
          suspiciousCandidate = candidate;
          lastStatus = 422;
          lastText = "transcrição inconsistente";
          continue;
        }
        return json(req, 200, { ok: true, ...candidate, noSpeech: false }, METHODS);
      }
      lastStatus = g.status; lastText = gt;
      if (g.status === 429) {
        retryAfter = Math.max(2, Number.parseInt(g.headers.get("retry-after") || "0", 10) || 12);
        break;
      }
      if (g.status !== 429 && g.status < 500) break;
    }
    if (suspiciousCandidate) {
      return json(req, 422, {
        ok: false, retryable: true,
        error: "a fala não foi reconhecida com confiança; tentando novamente em partes menores",
      }, METHODS);
    }
    const status = lastStatus === 429 ? 429 : lastStatus === 504 ? 504 : 502;
    return json(req, status, { ok: false, retryable: status === 429 || status >= 500, retryAfter, error: status === 429 ? "serviço temporariamente ocupado" : "a transcrição excedeu o tempo seguro" }, METHODS);
  } catch { return json(req, 502, { ok: false, error: "falha temporária no serviço de transcrição" }, METHODS); }
};
