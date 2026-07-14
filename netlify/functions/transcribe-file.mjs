// Transcritor avulso (Groq Whisper) — Swipe FEG
//
// A seção "Transcritor" sobe um vídeo/áudio pro Storage e chama esta função com
// { videoUrl, language }. Ela baixa o arquivo, manda pro Groq Whisper e DEVOLVE o
// texto (+ idioma detectado, duração e segmentos com tempos). Não grava nada.
//
// Env (Netlify): GROQ_API_KEY (obrigatória), SUPABASE_URL, SUPABASE_ANON_KEY,
//                ADMIN_EMAILS (csv; default adminswipefeg@swipefeg.app)

const SUPABASE_URL = (process.env.SUPABASE_URL || "https://ppaajtzbhjixhyfidojd.supabase.co").replace(/\/+$/, "");
const ANON = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwYWFqdHpiaGppeGh5Zmlkb2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMDkzNTcsImV4cCI6MjA5Njc4NTM1N30.uoC_3EHM_dfmkBHJYjPvlaC7DqkJziunz-tug0ItAJc";
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "adminswipefeg@swipefeg.app")
  .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
const GROQ_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = process.env.GROQ_MODEL || "whisper-large-v3-turbo";
const STORAGE_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/criativos/`;
const MAX_BYTES = 25 * 1024 * 1024; // limite do Groq (~25MB)
const LANGS_OK = new Set(["pt", "en", "es", "fr", "de", "it", "nl", "ja", "zh", "ru", "ar", "hi", "ko", "pl", "tr", "id", "uk", "sv", "cs", "ro"]);

const json = (status, obj) => ({ statusCode: status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) });

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, body: "" };
  if (event.httpMethod === "GET") return json(200, { ok: true, service: "transcribe-file", ready: !!GROQ_KEY });
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "método inválido" });
  if (!GROQ_KEY) return json(500, { ok: false, error: "GROQ_API_KEY não configurada no Netlify" });

  const auth = event.headers.authorization || event.headers.Authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json(401, { ok: false, error: "sem autenticação" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { ok: false, error: "corpo inválido" }); }
  const { videoUrl } = body;
  let language = String(body.language || "").toLowerCase().trim();
  if (!videoUrl) return json(400, { ok: false, error: "faltou o arquivo (videoUrl)" });
  if (!String(videoUrl).startsWith(STORAGE_PREFIX)) return json(400, { ok: false, error: "arquivo fora do Storage do projeto" });

  // confere admin (o upload no Storage já é restrito ao admin)
  let email = "";
  try {
    const u = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON, Authorization: `Bearer ${token}` } });
    if (!u.ok) return json(401, { ok: false, error: "sessão inválida" });
    email = String(((await u.json()) || {}).email || "").toLowerCase();
  } catch { return json(401, { ok: false, error: "não deu para validar a sessão" }); }
  if (!ADMIN_EMAILS.includes(email)) return json(403, { ok: false, error: "somente o admin pode transcrever por enquanto" });

  // baixa o arquivo
  let buf;
  try {
    const v = await fetch(videoUrl);
    if (!v.ok) return json(400, { ok: false, error: `download do arquivo falhou (HTTP ${v.status})` });
    buf = Buffer.from(await v.arrayBuffer());
  } catch { return json(400, { ok: false, error: "download do arquivo falhou" }); }
  if (!buf.length) return json(400, { ok: false, error: "arquivo vazio" });
  if (buf.length > MAX_BYTES) return json(413, { ok: false, error: "arquivo grande demais (máx ~25MB). Envie só o áudio ou um trecho." });

  // Groq Whisper (verbose_json → texto + idioma + duração + segmentos com tempos)
  try {
    const form = new FormData();
    form.append("file", new Blob([buf]), "audio.mp4");
    form.append("model", GROQ_MODEL);
    form.append("response_format", "verbose_json");
    if (language && language !== "auto" && LANGS_OK.has(language)) form.append("language", language);
    const g = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST", headers: { Authorization: `Bearer ${GROQ_KEY}` }, body: form,
    });
    const gt = await g.text();
    if (!g.ok) return json(502, { ok: false, error: `Groq HTTP ${g.status}: ${gt.slice(0, 160)}` });
    const gj = JSON.parse(gt);
    const segments = Array.isArray(gj.segments)
      ? gj.segments.map(s => ({ start: +s.start || 0, end: +s.end || 0, text: String(s.text || "").trim() })).filter(s => s.text)
      : [];
    return json(200, {
      ok: true,
      text: String(gj.text || "").trim(),
      language: String(gj.language || ""),
      duration: +gj.duration || 0,
      segments,
    });
  } catch (e) { return json(502, { ok: false, error: "falha ao chamar o Groq: " + String(e && e.message ? e.message : e).slice(0, 120) }); }
};
