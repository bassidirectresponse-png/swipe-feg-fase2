import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  authenticate,
  bearerToken,
  isAdmin,
  json,
  preflight,
  rateLimit,
  readJson,
  trustedOrigin,
} from "./_security.mjs";

const METHODS = "POST, OPTIONS";
const MEDIA_URL = /^https:\/\/[^/]+\/storage\/v1\/object\/public\/criativos\/criativo\/wl-feg\/[0-9a-f-]+\.(?:mp4|mov|webm|m4v)(?:\?.*)?$/i;

function clean(value, limit = 180) {
  return String(value || "").trim().slice(0, limit);
}

export default async req => {
  const pre = preflight(req, METHODS);
  if (pre) return pre;
  if (req.method !== "POST") return json(req, 405, { ok: false, error: "método não permitido" }, METHODS);
  if (!trustedOrigin(req)) return json(req, 403, { ok: false, error: "origem não autorizada" }, METHODS);

  try {
    const user = await authenticate(req);
    if (!isAdmin(user)) return json(req, 403, { ok: false, error: "somente o administrador pode importar este lote" }, METHODS);
    const quota = await rateLimit("admin-creative-import", user.id, { limit: 40, windowMs: 60 * 60_000 });
    if (!quota.allowed) return json(req, 429, { ok: false, error: "limite temporário atingido" }, METHODS);

    const body = await readJson(req, { maxBytes: 16 * 1024 });
    const video = clean(body.video, 900);
    const sourceFile = clean(body.sourceFile, 220);
    const nome = clean(body.nome, 120);
    const nomeOriginal = clean(body.nomeOriginal, 180);
    const nicho = clean(body.nicho, 80);
    if (!MEDIA_URL.test(video) || !sourceFile || !nome || !nomeOriginal || !nicho) {
      return json(req, 400, { ok: false, error: "dados do criativo inválidos" }, METHODS);
    }

    const data = {
      kind: "criativo",
      nome,
      nomeOriginal,
      nicho,
      marca: "WL FEG",
      plataforma: "meta",
      linkAnuncio: "",
      video,
      print: "",
      copyLink: "",
      transcricao: "",
      transcricaoPt: "",
      transcriptionStatus: "pending",
      transcricaoStatus: "pending",
      transcriptionAttempts: 0,
      transcriptionProvider: "faster-whisper",
      transcriptionVersion: "1",
      importBatch: "WL FEG",
      sourceFile,
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/offers?select=*`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${bearerToken(req)}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ data }),
      signal: AbortSignal.timeout(25_000),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = Array.isArray(payload) ? payload[0]?.message : payload?.message || payload?.error;
      return json(req, response.status, { ok: false, error: clean(message || `Banco HTTP ${response.status}`) }, METHODS);
    }
    const row = Array.isArray(payload) ? payload[0] : payload;
    if (!row?.id) throw new Error("o banco não confirmou o novo criativo");
    return json(req, 200, { ok: true, row }, METHODS);
  } catch (error) {
    console.error("admin-creative-import:", String(error?.message || error).slice(0, 220));
    return json(req, 400, { ok: false, error: clean(error?.message || "falha ao salvar o criativo") }, METHODS);
  }
};
