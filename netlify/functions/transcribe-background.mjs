import { createHmac, timingSafeEqual } from "node:crypto";
import {
  SUPABASE_ANON_KEY as ANON,
  SUPABASE_URL,
  authenticateToken,
  boundedBuffer,
  isAdmin,
  rateLimit,
} from "./_security.mjs";
import { automationSigningSecret, supabaseAdminHeaders } from "./_supabase-admin.mjs";

const GROQ_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = process.env.GROQ_MODEL || "whisper-large-v3-turbo";
const GROQ_FALLBACK_MODEL = process.env.GROQ_FALLBACK_MODEL || "whisper-large-v3";
const MAX_BYTES = 24 * 1024 * 1024;
const STORAGE_ORIGIN = new URL(SUPABASE_URL).origin;
const STORAGE_PATH = "/storage/v1/object/public/criativos/";
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

function validInternalSignature(raw, supplied) {
  const secret = automationSigningSecret();
  if (!secret || !/^[a-f0-9]{64}$/i.test(String(supplied || ""))) return false;
  const expected = createHmac("sha256", secret).update(raw).digest();
  const received = Buffer.from(String(supplied), "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

async function dataHeaders(token, internal, extra = {}) {
  if (internal) return supabaseAdminHeaders(extra);
  return { apikey: ANON, Authorization: `Bearer ${token}`, ...extra };
}

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

async function groqTranscribe(buffer) {
  const models = [...new Set([GROQ_MODEL, GROQ_FALLBACK_MODEL].filter(Boolean))];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (attempt) await sleep(3_000);
    for (const model of models) {
      const form = new FormData();
      form.append("file", new Blob([buffer], { type: "video/mp4" }), "audio.mp4");
      form.append("model", model);
      form.append("response_format", "verbose_json");
      form.append("timestamp_granularities[]", "word");
      form.append("timestamp_granularities[]", "segment");
      const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_KEY}` },
        body: form,
        signal: AbortSignal.timeout(180_000),
      });
      if (response.ok) {
        const result = await response.json();
        const words = Array.isArray(result.words) ? result.words.slice(0, 200_000).map(word => ({
          word: String(word.word || "").trim().slice(0, 200),
          start: Math.max(0, Number(word.start) || 0),
          end: Math.max(0, Number(word.end) || 0),
        })).filter(word => word.word && word.end >= word.start) : [];
        const segments = Array.isArray(result.segments) ? result.segments.slice(0, 50_000).map(segment => ({
          text: String(segment.text || "").trim().slice(0, 10_000),
          start: Math.max(0, Number(segment.start) || 0),
          end: Math.max(0, Number(segment.end) || 0),
        })).filter(segment => segment.text && segment.end >= segment.start) : [];
        return {
          text: String(result.text || "").trim().slice(0, 2_000_000),
          lang: String(result.language || "").slice(0, 40),
          words,
          segments,
        };
      }
      if (response.status === 413) {
        const error = new Error("arquivo excede o limite remoto de transcrição");
        error.code = "TRANSCRIPTION_FILE_TOO_LARGE";
        throw error;
      }
      if (response.status !== 429 && response.status < 500) throw new Error(`serviço de transcrição recusou o arquivo (${response.status})`);
      await response.body?.cancel().catch(() => {});
    }
  }
  throw new Error("serviço de transcrição indisponível após novas tentativas");
}

async function loadOffer(id, token, internal) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(id)}&select=data`, {
    headers: await dataHeaders(token, internal),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("criativo não encontrado");
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error("criativo não encontrado");
  return rows[0].data || {};
}

function shallowPatch(before, after) {
  const patch = {};
  for (const key of new Set([...Object.keys(before || {}), ...Object.keys(after || {})])) {
    const previous = Object.prototype.hasOwnProperty.call(before || {}, key) ? before[key] : null;
    const next = Object.prototype.hasOwnProperty.call(after || {}, key) ? after[key] : null;
    if (JSON.stringify(previous) !== JSON.stringify(next)) patch[key] = next;
  }
  return patch;
}

async function patchOffer(id, token, internal, mutate) {
  const before = await loadOffer(id, token, internal);
  const data = structuredClone(before);
  mutate(data);
  const headers = await dataHeaders(token, internal, { "Content-Type": "application/json", Prefer: "return=minimal" });
  const rpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/swipe_merge_offer_data`, {
    method: "POST",
    headers,
    body: JSON.stringify({ p_id: id, p_patch: shallowPatch(before, data) }),
    signal: AbortSignal.timeout(10_000),
  });
  if (rpc.ok) return;
  if (![400, 404].includes(rpc.status)) throw new Error("falha ao gravar a transcrição");

  // Compatibilidade temporária enquanto a função atômica é publicada no banco.
  const update = await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ data }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!update.ok) throw new Error("falha ao gravar a transcrição");
}

async function routeToFasterWhisper(id, token, internal, reason = "") {
  await patchOffer(id, token, internal, data => {
    data.transcriptionStatus = "pending";
    data.transcricaoStatus = "pending";
    data.transcriptionProvider = "faster-whisper";
    data.transcriptionLastError = reason;
    data.transcriptionNextRetryAt = "";
  });
  console.log(`transcribe-background ${id}: encaminhado ao faster-whisper`);
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 202, body: "" };
  let id = "";
  let token = "";
  let internal = false;
  let attempt = 1;
  try {
    if (!GROQ_KEY) throw new Error("serviço de transcrição não configurado");
    const raw = String(event.body || "");
    internal = validInternalSignature(raw, event.headers["x-feg-transcription-signature"]);
    token = String(event.headers.authorization || event.headers.Authorization || "").replace(/^Bearer\s+/i, "").trim();
    if (Buffer.byteLength(raw, "utf8") > 64 * 1024) throw new Error("requisição muito grande");
    const body = JSON.parse(raw || "{}");
    id = String(body.id || "");
    attempt = Math.max(1, Number(body.attempt) || 1);
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) throw new Error("requisição inválida");
    if (!internal) {
      if (!token) throw new Error("requisição inválida");
      const user = await authenticateToken(token);
      if (!user) throw new Error("sessão inválida");
      if (!isAdmin(user)) throw new Error("não é admin");
      const quota = await rateLimit("transcribe-background", user.id, { limit: 20, windowMs: 60 * 60_000 });
      if (!quota.allowed) throw new Error("limite temporário de transcrições atingido");
    }
    const current = await loadOffer(id, token, internal);
    const videoUrl = storageVideoUrl(internal ? current.video : body.videoUrl);
    if (!videoUrl || !["criativo", "megabrain"].includes(current.kind)) throw new Error("requisição inválida");
    await patchOffer(id, token, internal, data => {
      data.transcriptionRequired = true;
      data.transcriptionStatus = "processing";
      data.transcricaoStatus = "processing";
      data.transcriptionStartedAt = new Date().toISOString();
      data.transcriptionLastError = "";
      data.transcriptionNextRetryAt = "";
      data.transcriptionProvider = "groq";
      data.transcriptionVersion = String(data.transcriptionVersion || "1");
    });

    const response = await fetch(videoUrl, { redirect: "error", signal: AbortSignal.timeout(45_000) });
    if (!response.ok) throw new Error(`download indisponível (${response.status})`);
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > MAX_BYTES) {
      await response.body?.cancel().catch(() => {});
      await routeToFasterWhisper(id, token, internal, "arquivo acima de 24 MB");
      return { statusCode: 202, body: "" };
    }
    let buffer;
    try {
      buffer = await boundedBuffer(response, MAX_BYTES);
    } catch (error) {
      if (/limite|excede/i.test(String(error?.message || error))) {
        await routeToFasterWhisper(id, token, internal, "arquivo acima de 24 MB");
        return { statusCode: 202, body: "" };
      }
      throw error;
    }
    if (!isVideo(buffer)) throw new Error("arquivo não é um vídeo suportado");
    let result;
    try {
      result = await groqTranscribe(buffer);
    } catch (error) {
      if (error?.code === "TRANSCRIPTION_FILE_TOO_LARGE") {
        await routeToFasterWhisper(id, token, internal, "limite do provedor online excedido");
        return { statusCode: 202, body: "" };
      }
      throw error;
    }
    const text = result.text || "[Sem fala detectada no vídeo]";
    await patchOffer(id, token, internal, data => {
      data.transcricao = text;
      data.transcricaoStatus = "done";
      data.transcricaoLang = result.lang;
      data.transcricaoWords = result.words;
      data.transcricaoSegments = result.segments;
      data.transcricaoError = "";
      data.transcricaoConcluidaEm = new Date().toISOString();
      data.transcriptionStatus = "completed";
      data.transcriptionCompletedAt = new Date().toISOString();
      data.transcriptionLastError = "";
      data.transcriptionNextRetryAt = "";
      data.transcriptionInvalid = false;
      data.transcriptionIncomplete = false;
    });
    console.log(`transcribe-background ${id}: concluído`);
  } catch (error) {
    const internalError = String(error && error.message || error).slice(0, 180);
    const message = /sessão|admin|requisição|vídeo|arquivo|gravar|criativo/.test(internalError) ? internalError : "não foi possível concluir a transcrição";
    console.error("transcribe-background falhou:", message);
    if (id && (token || internal)) {
      try {
        await patchOffer(id, token, internal, data => {
          const delayMinutes = Math.min(6 * 60, 15 * (2 ** Math.min(7, Math.max(0, attempt - 1))));
          data.transcricaoStatus = "pending";
          data.transcricaoError = "Falha temporária; uma nova tentativa será feita automaticamente.";
          data.transcriptionStatus = "retry_scheduled";
          data.transcriptionLastError = message;
          data.transcriptionNextRetryAt = new Date(Date.now() + delayMinutes * 60_000).toISOString();
        });
      } catch {}
    }
  }
  return { statusCode: 202, body: "" };
};
