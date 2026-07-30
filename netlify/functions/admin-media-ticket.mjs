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
const MEDIA_PATH = /^criativo\/wl-feg\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:mp4|mov|webm|m4v)$/i;

function encodedPath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

export default async req => {
  const pre = preflight(req, METHODS);
  if (pre) return pre;
  if (req.method !== "POST") return json(req, 405, { ok: false, error: "método não permitido" }, METHODS);
  if (!trustedOrigin(req)) return json(req, 403, { ok: false, error: "origem não autorizada" }, METHODS);

  try {
    const user = await authenticate(req);
    if (!isAdmin(user)) return json(req, 403, { ok: false, error: "somente o administrador pode enviar este lote" }, METHODS);
    const quota = await rateLimit("admin-media-ticket", user.id, { limit: 40, windowMs: 60 * 60_000 });
    if (!quota.allowed) return json(req, 429, { ok: false, error: "limite temporário atingido" }, METHODS);

    const body = await readJson(req, { maxBytes: 4 * 1024 });
    const path = String(body.path || "").trim();
    if (!MEDIA_PATH.test(path)) return json(req, 400, { ok: false, error: "caminho de mídia inválido" }, METHODS);

    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/upload/sign/criativos/${encodedPath(path)}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${bearerToken(req)}`,
        "Content-Type": "application/json",
        "x-upsert": "false",
      },
      body: JSON.stringify({ upsert: false }),
      signal: AbortSignal.timeout(20_000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return json(req, response.status, {
        ok: false,
        error: String(payload.message || payload.error || `Storage HTTP ${response.status}`).slice(0, 180),
      }, METHODS);
    }
    const rawSignedUrl = String(payload.url || payload.signedURL || payload.signedUrl || "");
    const signedUrl = rawSignedUrl && !/^https?:\/\//i.test(rawSignedUrl)
      ? `${SUPABASE_URL}/storage/v1${rawSignedUrl.startsWith("/") ? "" : "/"}${rawSignedUrl}`
      : rawSignedUrl;
    let token = String(payload.token || "");
    if (!token && signedUrl) {
      try { token = new URL(signedUrl).searchParams.get("token") || ""; } catch {}
    }
    if (!signedUrl && !token) throw new Error("o armazenamento não retornou o destino assinado");
    return json(req, 200, { ok: true, signedUrl, token }, METHODS);
  } catch (error) {
    console.error("admin-media-ticket:", String(error?.message || error).slice(0, 220));
    return json(req, 400, { ok: false, error: String(error?.message || "falha ao preparar o envio").slice(0, 180) }, METHODS);
  }
};
