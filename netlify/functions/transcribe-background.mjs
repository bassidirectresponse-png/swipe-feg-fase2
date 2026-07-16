// Transcrição em segundo plano (Groq Whisper) — Swipe FEG
//
// Igual à transcribe.mjs, mas roda como BACKGROUND FUNCTION da Netlify:
// o nome termina em "-background", então a Netlify responde 202 na hora e
// deixa a função rodar até 15 min (sem o limite de ~10s das síncronas).
// Assim, adicionar vários criativos de uma vez não estoura mais o tempo.
// O app dispara e acompanha o resultado lendo a linha no Supabase.
//
// Env (Netlify): GROQ_API_KEY (obrigatória), SUPABASE_URL, SUPABASE_ANON_KEY,
//                ADMIN_EMAILS (csv; default adminswipefeg@swipefeg.app)

const SUPABASE_URL = (process.env.SUPABASE_URL || "https://ppaajtzbhjixhyfidojd.supabase.co").replace(/\/+$/, "");
const ANON = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwYWFqdHpiaGppeGh5Zmlkb2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMDkzNTcsImV4cCI6MjA5Njc4NTM1N30.uoC_3EHM_dfmkBHJYjPvlaC7DqkJziunz-tug0ItAJc";
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "adminswipefeg@swipefeg.app")
  .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
const GROQ_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = process.env.GROQ_MODEL || "whisper-large-v3-turbo";
const GROQ_FALLBACK_MODEL = process.env.GROQ_FALLBACK_MODEL || "whisper-large-v3";
const STORAGE_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/criativos/`;
const MAX_BYTES = 40 * 1024 * 1024;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function groqTranscribe(buf) {
  // Alterna o modelo em rate limit antes de repetir. Os limites de áudio da
  // Groq são por modelo, então isso evita travar lotes grandes no Turbo.
  let last = "";
  const models = [...new Set([GROQ_MODEL, GROQ_FALLBACK_MODEL].filter(Boolean))];
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) await sleep(3000);
    for (const model of models) {
      const form = new FormData();
      form.append("file", new Blob([buf], { type: "video/mp4" }), "audio.mp4");
      form.append("model", model);
      form.append("response_format", "verbose_json");
      form.append("timestamp_granularities[]", "word");
      form.append("timestamp_granularities[]", "segment");
      const g = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST", headers: { Authorization: `Bearer ${GROQ_KEY}` }, body: form,
      });
      const txt = await g.text();
      if (g.ok) {
        const j = JSON.parse(txt);
        const words = Array.isArray(j.words) ? j.words.map((w) => ({ word: String(w.word || "").trim(), start: +w.start || 0, end: +w.end || 0 })).filter((w) => w.word) : [];
        const segments = Array.isArray(j.segments) ? j.segments.map((s) => ({ text: String(s.text || "").trim(), start: +s.start || 0, end: +s.end || 0 })).filter((s) => s.text) : [];
        return { text: String(j.text || "").trim(), lang: String(j.language || ""), words, segments };
      }
      last = `Groq HTTP ${g.status}: ${txt.slice(0, 240)}`;
      if (g.status !== 429 && g.status < 500) throw new Error(last);
    }
  }
  throw new Error(last || "Groq falhou após retries");
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 202, body: "" };
  try {
    if (!GROQ_KEY) throw new Error("GROQ_API_KEY não configurada");
    const token = (event.headers.authorization || event.headers.Authorization || "").replace(/^Bearer\s+/i, "").trim();
    const { id, videoUrl } = JSON.parse(event.body || "{}");
    if (!token || !id || !videoUrl) throw new Error("faltou token/id/videoUrl");
    if (!String(videoUrl).startsWith(STORAGE_PREFIX)) throw new Error("vídeo fora do Storage");

    // admin?
    const u = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON, Authorization: `Bearer ${token}` } });
    if (!u.ok) throw new Error("sessão inválida");
    const email = String(((await u.json()) || {}).email || "").toLowerCase();
    if (!ADMIN_EMAILS.includes(email)) throw new Error("não é admin");

    // baixa
    const v = await fetch(videoUrl);
    if (!v.ok) throw new Error(`download HTTP ${v.status}`);
    const buf = Buffer.from(await v.arrayBuffer());
    if (buf.length > MAX_BYTES) throw new Error("vídeo grande demais");

    // transcreve
    const { text, lang, words, segments } = await groqTranscribe(buf);

    // grava de volta (token do admin; RLS confirma)
    const r = await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(id)}&select=data`,
      { headers: { apikey: ANON, Authorization: `Bearer ${token}` } });
    const rows = r.ok ? await r.json() : [];
    const data = (rows[0] && rows[0].data) || {};
    data.transcricao = text; data.transcricaoStatus = "done"; data.transcricaoLang = lang; data.transcricaoWords = words; data.transcricaoSegments = segments;
    await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ data }),
    });
    console.log(`transcrito ${id}: ${text.length} chars (${lang})`);
  } catch (e) {
    console.error("transcribe-background falhou:", String(e).slice(0, 200));
  }
  return { statusCode: 202, body: "" };
};
