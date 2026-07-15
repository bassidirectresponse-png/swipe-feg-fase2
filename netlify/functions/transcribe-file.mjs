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

const SUPABASE_URL = (process.env.SUPABASE_URL || "https://ppaajtzbhjixhyfidojd.supabase.co").replace(/\/+$/, "");
const ANON = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwYWFqdHpiaGppeGh5Zmlkb2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMDkzNTcsImV4cCI6MjA5Njc4NTM1N30.uoC_3EHM_dfmkBHJYjPvlaC7DqkJziunz-tug0ItAJc";
const GROQ_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = process.env.GROQ_MODEL || "whisper-large-v3-turbo";
const MAX_BYTES = 12 * 1024 * 1024; // cada pedaço é pequeno; guarda de segurança
const LANGS_OK = new Set(["pt", "en", "es", "fr", "de", "it", "nl", "ja", "zh", "ru", "ar", "hi", "ko", "pl", "tr", "id", "uk", "sv", "cs", "ro"]);
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type", "Access-Control-Allow-Methods": "POST, GET, OPTIONS" };
const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...CORS } });

export default async (req) => {
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: CORS });
  if (req.method === "GET") return json(200, { ok: true, service: "transcribe-file", ready: !!GROQ_KEY });
  if (req.method !== "POST") return json(405, { ok: false, error: "método inválido" });
  if (!GROQ_KEY) return json(500, { ok: false, error: "GROQ_API_KEY não configurada no Netlify" });

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return json(401, { ok: false, error: "sem autenticação" });
  // qualquer usuário logado pode transcrever (a função é só leitura)
  try {
    const u = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON, Authorization: `Bearer ${token}` } });
    if (!u.ok) return json(401, { ok: false, error: "sessão inválida — faça login de novo" });
  } catch { return json(401, { ok: false, error: "não deu para validar a sessão" }); }

  let language = String(new URL(req.url).searchParams.get("lang") || "").toLowerCase().trim();

  let buf;
  try { buf = Buffer.from(await req.arrayBuffer()); } catch { return json(400, { ok: false, error: "áudio inválido" }); }
  if (!buf || !buf.length) return json(400, { ok: false, error: "áudio vazio" });
  if (buf.length > MAX_BYTES) return json(413, { ok: false, error: "pedaço de áudio grande demais" });

  try {
    const form = new FormData();
    form.append("file", new Blob([buf], { type: "audio/wav" }), "audio.wav");
    form.append("model", GROQ_MODEL);
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "word");
    form.append("timestamp_granularities[]", "segment");
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
    const words = Array.isArray(gj.words)
      ? gj.words.map(w => ({ word: String(w.word || "").trim(), start: +w.start || 0, end: +w.end || 0 })).filter(w => w.word)
      : [];
    return json(200, { ok: true, text: String(gj.text || "").trim(), language: String(gj.language || ""), duration: +gj.duration || 0, segments, words });
  } catch (e) { return json(502, { ok: false, error: "falha ao chamar o Groq: " + String(e && e.message ? e.message : e).slice(0, 120) }); }
};
