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
const MEDIA_URL = /^https:\/\/[^/]+\/storage\/v1\/object\/public\/criativos\/(?:criativo\/wl-feg\/[0-9a-f-]+\.(?:mp4|mov|webm|m4v)|organic\/ad-feg-ed\/[0-9a-f-]+\.(?:mp4|mov|webm|m4v)|brands\/balls-n-brains\/creatives\/[0-9a-f-]+\.(?:mp4|mov|webm|m4v|jpe?g|png|webp))(?:\?.*)?$/i;

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
    const quota = await rateLimit("admin-creative-import", user.id, { limit: 220, windowMs: 60 * 60_000 });
    if (!quota.allowed) return json(req, 429, { ok: false, error: "limite temporário atingido" }, METHODS);

    const body = await readJson(req, { maxBytes: 16 * 1024 });
    const video = clean(body.video, 900);
    const print = clean(body.print, 900);
    const brandMode = body.division === "fegbrands" && body.brandSlug === "balls-n-brains";
    const organicMode = body.division === "organic";
    const sourceFile = clean(body.sourceFile, 220);
    const sourceHash = clean(body.sourceHash, 64).toLowerCase();
    const sourceKey = clean(body.sourceKey, 360).toLowerCase();
    const importBatch = clean(body.importBatch, 120);
    const nome = clean(body.nome, 120);
    const nomeOriginal = clean(body.nomeOriginal, 180);
    const nicho = clean(body.nicho, 80);
    const plataforma = ["meta", "taboola"].includes(clean(body.plataforma, 20).toLowerCase())
      ? clean(body.plataforma, 20).toLowerCase()
      : "meta";
    const linkAnuncio = clean(body.linkAnuncio, 900);
    const media = video || print;
    if (!MEDIA_URL.test(media) || !sourceFile || !nome || !nomeOriginal || (!brandMode && !organicMode && !nicho)
      || (sourceHash && !/^[a-f0-9]{64}$/.test(sourceHash))
      || (linkAnuncio && !/^https:\/\//i.test(linkAnuncio))) {
      return json(req, 400, { ok: false, error: "dados do criativo inválidos" }, METHODS);
    }

    const data = organicMode ? {
      kind: "criativo", division: "organic", collectionLabel: "VIDEO ORGANICO",
      nome, nomeOriginal, nicho: "", marca: "FEG Organic", plataforma: "organic", linkAnuncio: "",
      video, print: "", copyLink: "", transcricao: "", transcricaoPt: "", transcricaoPtStatus: "pending",
      transcriptionRequired: true, transcriptionStatus: "pending", transcricaoStatus: "pending", transcriptionAttempts: 0,
      transcriptionProvider: "faster-whisper", transcriptionVersion: "1",
      importBatch: "AD FEG ED", sourceKey: `organic/ad-feg-ed/${sourceFile.toLowerCase()}`, sourceFile, sourceHash,
    } : brandMode ? {
      kind: "criativo", division: "fegbrands", brandSlug: "balls-n-brains", collectionLabel: "Balls n Brains",
      nome, nomeOriginal, nicho: "", marca: "Balls n Brains", plataforma: "meta", linkAnuncio: "",
      video, print, copyLink: "", transcricao: "", transcricaoPt: "",
      transcriptionStatus: video ? "pending" : "", transcricaoStatus: video ? "pending" : "", transcriptionAttempts: 0,
      transcriptionProvider: video ? "faster-whisper" : "", transcriptionVersion: video ? "1" : "",
      importBatch: "Balls n Brains", sourceKey: `balls-n-brains/${sourceFile.toLowerCase()}`, sourceFile, sourceHash,
    } : {
      kind: "criativo",
      nome,
      nomeOriginal,
      nicho,
      marca: "WL FEG",
      plataforma,
      linkAnuncio,
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
      importBatch: importBatch || "WL FEG",
      sourceKey: sourceKey || `${(importBatch || "WL FEG").toLowerCase()}/${sourceFile.toLowerCase()}`,
      sourceHash,
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
