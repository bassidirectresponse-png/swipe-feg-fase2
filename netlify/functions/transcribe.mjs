// Transcrição instantânea de vídeo (Groq Whisper) — Swipe FEG
//
// Fluxo: o app manda { id, videoUrl } + o token do usuário logado.
// A função confere que o usuário é ADMIN, baixa o vídeo do Storage,
// manda pro Groq (whisper-large-v3-turbo) e grava a transcrição de volta
// na linha da oferta (com o token do próprio admin — o RLS confirma).
//
// Variáveis de ambiente (Netlify → Site settings → Environment variables):
//   GROQ_API_KEY        (obrigatória, secreta)  -> https://console.groq.com/keys
//   SUPABASE_URL        (opcional, tem default)
//   SUPABASE_ANON_KEY   (opcional, tem default; é pública)
//   ADMIN_EMAILS        (opcional, csv; default adminswipefeg@swipefeg.app)

const SUPABASE_URL = (process.env.SUPABASE_URL || "https://ppaajtzbhjixhyfidojd.supabase.co").replace(/\/+$/, "");
const ANON = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwYWFqdHpiaGppeGh5Zmlkb2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMDkzNTcsImV4cCI6MjA5Njc4NTM1N30.uoC_3EHM_dfmkBHJYjPvlaC7DqkJziunz-tug0ItAJc";
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "adminswipefeg@swipefeg.app")
  .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
const GROQ_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = process.env.GROQ_MODEL || "whisper-large-v3-turbo";
const STORAGE_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/criativos/`;
const MAX_BYTES = 24 * 1024 * 1024; // limite seguro do Groq (25MB)

const json = (status, obj) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(obj),
});

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, body: "" };
  // health-check seguro: NÃO expõe a chave, só se ela chegou na função
  if (event.httpMethod === "GET")
    return json(200, {
      ok: true, service: "transcribe",
      groqConfigured: !!GROQ_KEY,
      groqKeyLength: GROQ_KEY ? GROQ_KEY.length : 0,
      groqKeyPrefix: GROQ_KEY ? GROQ_KEY.slice(0, 3) : "",
      model: GROQ_MODEL, adminEmails: ADMIN_EMAILS,
    });
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "método inválido" });
  if (!GROQ_KEY) return json(500, { ok: false, error: "GROQ_API_KEY não configurada no Netlify" });

  // 1) token do usuário
  const auth = event.headers.authorization || event.headers.Authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json(401, { ok: false, error: "sem autenticação" });

  // 2) corpo
  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return json(400, { ok: false, error: "corpo inválido" }); }
  const { id, videoUrl } = body;
  if (!id || !videoUrl) return json(400, { ok: false, error: "faltou id ou videoUrl" });
  if (!String(videoUrl).startsWith(STORAGE_PREFIX))
    return json(400, { ok: false, error: "vídeo fora do Storage do projeto" });

  // 3) confere ADMIN
  let email = "";
  try {
    const u = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON, Authorization: `Bearer ${token}` } });
    if (!u.ok) return json(401, { ok: false, error: "sessão inválida" });
    email = String(((await u.json()) || {}).email || "").toLowerCase();
  } catch { return json(401, { ok: false, error: "não deu para validar a sessão" }); }
  if (!ADMIN_EMAILS.includes(email)) return json(403, { ok: false, error: "somente o admin pode transcrever" });

  // 4) baixa o vídeo
  let buf;
  try {
    const v = await fetch(videoUrl);
    if (!v.ok) return json(400, { ok: false, error: `download do vídeo falhou (HTTP ${v.status})` });
    buf = Buffer.from(await v.arrayBuffer());
  } catch (e) { return json(400, { ok: false, error: "download do vídeo falhou" }); }
  if (buf.length > MAX_BYTES)
    return json(413, { ok: false, error: "vídeo grande demais para a transcrição instantânea; o processo automático cuida dele" });

  // 5) Groq Whisper
  let text = "", lang = "";
  try {
    const form = new FormData();
    form.append("file", new Blob([buf], { type: "video/mp4" }), "audio.mp4");
    form.append("model", GROQ_MODEL);
    form.append("response_format", "verbose_json");
    const g = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_KEY}` },
      body: form,
    });
    const gt = await g.text();
    if (!g.ok) return json(502, { ok: false, error: `Groq HTTP ${g.status}: ${gt.slice(0, 160)}` });
    const gj = JSON.parse(gt);
    text = String(gj.text || "").trim();
    lang = String(gj.language || "");
  } catch (e) { return json(502, { ok: false, error: "falha ao chamar o Groq" }); }

  // 6) grava de volta (com o token do admin; o RLS confirma)
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(id)}&select=data`,
      { headers: { apikey: ANON, Authorization: `Bearer ${token}` } });
    const rows = r.ok ? await r.json() : [];
    const data = (rows[0] && rows[0].data) || {};
    data.transcricao = text;
    data.transcricaoStatus = "done";
    data.transcricaoLang = lang;
    const p = await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ data }),
    });
    if (!p.ok) return json(500, { ok: false, error: `gravação bloqueada (HTTP ${p.status})` });
  } catch (e) { return json(500, { ok: false, error: "falha ao gravar a transcrição" }); }

  return json(200, { ok: true, transcricao: text, lang });
};
