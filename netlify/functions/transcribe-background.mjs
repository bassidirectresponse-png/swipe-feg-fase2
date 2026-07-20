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
const GROQ_FALLBACK_MODEL = process.env.GROQ_FALLBACK_MODEL || "whisper-large-v3";
const MAX_BYTES = 40 * 1024 * 1024;
const STORAGE_ORIGIN = new URL(SUPABASE_URL).origin;
const STORAGE_PATH = "/storage/v1/object/public/criativos/";
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

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
      if (response.status !== 429 && response.status < 500) throw new Error(`serviço de transcrição recusou o arquivo (${response.status})`);
      await response.body?.cancel().catch(() => {});
    }
  }
  throw new Error("serviço de transcrição indisponível após novas tentativas");
}

async function patchOffer(id, token, mutate) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(id)}&select=data`, {
    headers: { apikey: ANON, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("criativo não encontrado");
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error("criativo não encontrado");
  const data = rows[0].data || {};
  mutate(data);
  const update = await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ data }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!update.ok) throw new Error("falha ao gravar a transcrição");
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 202, body: "" };
  let id = "";
  let token = "";
  try {
    if (!GROQ_KEY) throw new Error("serviço de transcrição não configurado");
    token = String(event.headers.authorization || event.headers.Authorization || "").replace(/^Bearer\s+/i, "").trim();
    if (Buffer.byteLength(event.body || "", "utf8") > 64 * 1024) throw new Error("requisição muito grande");
    const body = JSON.parse(event.body || "{}");
    id = String(body.id || "");
    const videoUrl = storageVideoUrl(body.videoUrl);
    if (!token || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id) || !videoUrl) throw new Error("requisição inválida");
    const user = await authenticateToken(token);
    if (!user) throw new Error("sessão inválida");
    if (!isAdmin(user)) throw new Error("não é admin");
    const quota = await rateLimit("transcribe-background", user.id, { limit: 20, windowMs: 60 * 60_000 });
    if (!quota.allowed) throw new Error("limite temporário de transcrições atingido");

    const response = await fetch(videoUrl, { redirect: "error", signal: AbortSignal.timeout(45_000) });
    if (!response.ok) throw new Error(`download indisponível (${response.status})`);
    const buffer = await boundedBuffer(response, MAX_BYTES);
    if (!isVideo(buffer)) throw new Error("arquivo não é um vídeo suportado");
    const result = await groqTranscribe(buffer);
    await patchOffer(id, token, data => {
      data.transcricao = result.text;
      data.transcricaoStatus = "done";
      data.transcricaoLang = result.lang;
      data.transcricaoWords = result.words;
      data.transcricaoSegments = result.segments;
      data.transcricaoError = "";
    });
    console.log(`transcribe-background ${id}: concluído`);
  } catch (error) {
    const internal = String(error && error.message || error).slice(0, 180);
    const message = /sessão|admin|requisição|vídeo|arquivo|gravar|criativo/.test(internal) ? internal : "não foi possível concluir a transcrição";
    console.error("transcribe-background falhou:", message);
    if (id && token) {
      try {
        await patchOffer(id, token, data => {
          data.transcricaoStatus = "error";
          data.transcricaoError = message;
        });
      } catch {}
    }
  }
  return { statusCode: 202, body: "" };
};
