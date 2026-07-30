import {
  SUPABASE_ANON_KEY as ANON,
  SUPABASE_URL,
  authenticateToken,
  boundedBuffer,
  canAutomate,
  rateLimit,
  safeRemoteFetch,
} from "./_security.mjs";
import { resolveFacebookMedia } from "./_facebook-media-resolver.mjs";
import { applyArchivedMedia } from "./_creative-integrity.mjs";

const MAX_BYTES = 60 * 1024 * 1024;
const FB_MEDIA_HOSTS = ["facebook.com", "fbcdn.net", "fbsbx.com", "akamaihd.net"];

function isFacebookUrl(value) {
  let url;
  try { url = new URL(String(value || "")); } catch { return false; }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  return url.protocol === "https:" && !url.username && !url.password
    && ["facebook.com", "fb.com", "fb.me", "fb.watch"].some(suffix => hostname === suffix || hostname.endsWith(`.${suffix}`));
}

function detectMedia(buffer) {
  if (buffer.length > 12 && buffer.subarray(4, 8).toString("latin1") === "ftyp") return { type: "video", contentType: "video/mp4", ext: "mp4" };
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { type: "image", contentType: "image/jpeg", ext: "jpg" };
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { type: "image", contentType: "image/png", ext: "png" };
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return { type: "image", contentType: "image/webp", ext: "webp" };
  throw new Error("mídia remota possui formato inválido");
}

async function downloadAndStore(mediaUrl, id, label, token) {
  const response = await safeRemoteFetch(mediaUrl, { allowedHostSuffixes: FB_MEDIA_HOSTS, timeoutMs: 30_000 });
  if (!response.ok) throw new Error(`download indisponível (HTTP ${response.status})`);
  const buffer = await boundedBuffer(response, MAX_BYTES);
  if (!buffer.length) throw new Error("mídia remota vazia");
  const media = detectMedia(buffer);
  const path = `brands/${id}/${label}-${Date.now()}.${media.ext}`;
  const upload = await fetch(`${SUPABASE_URL}/storage/v1/object/criativos/${path}`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": media.contentType, "x-upsert": "true" },
    body: buffer,
    signal: AbortSignal.timeout(60_000),
  });
  if (!upload.ok) throw new Error(`armazenamento indisponível (HTTP ${upload.status})`);
  return { type: media.type, url: `${SUPABASE_URL}/storage/v1/object/public/criativos/${path}` };
}

async function patchOffer(id, token, mutate) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(id)}&select=data`, {
    headers: { apikey: ANON, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("oferta não encontrada");
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error("oferta não encontrada");
  const data = rows[0].data || {};
  mutate(data);
  const update = await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ data }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!update.ok) throw new Error("não foi possível atualizar a oferta");
}

function publicError(error) {
  const message = String(error && error.message || error).slice(0, 180);
  if (/sessão|permissão|requisição|link do Facebook|não configurado/.test(message)) return message;
  return "não foi possível importar este anúncio";
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 202, body: "" };
  let id = "";
  let token = "";
  let targetIndex = null;
  try {
    token = String(event.headers.authorization || event.headers.Authorization || "").replace(/^Bearer\s+/i, "").trim();
    if (Buffer.byteLength(event.body || "", "utf8") > 128 * 1024) throw new Error("requisição muito grande");
    const body = JSON.parse(event.body || "{}");
    id = String(body.id || "");
    targetIndex = Number.isInteger(body.targetIndex) && body.targetIndex >= 0 && body.targetIndex < 100 ? body.targetIndex : null;
    const sourceUrl = body.libraryUrl || body.adUrl;
    if (!token || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id) || !isFacebookUrl(sourceUrl)) throw new Error("requisição inválida");
    const user = await authenticateToken(token);
    if (!user) throw new Error("sessão inválida");
    if (!canAutomate(user)) throw new Error("usuário sem permissão de escrita");
    const quota = await rateLimit("fb-ingest", user.id, { limit: 80, windowMs: 60 * 60_000 });
    if (!quota.allowed) throw new Error("limite temporário de importações atingido");

    if (body.batch === true) {
      const links = (Array.isArray(body.links) ? body.links : [sourceUrl])
        .map(value => typeof value === "string" ? value : value?.url || value?.link)
        .filter(isFacebookUrl)
        .slice(0, 12);
      if (!links.length) throw new Error("nenhum link público de anúncio foi informado");
      const updates = [];
      for (let index = 0; index < links.length; index += 1) {
        try {
          const extracted = await resolveFacebookMedia(links[index]);
          const media = await downloadAndStore(extracted.mediaUrl, id, `top-${index + 1}`, token);
          updates.push({ link: links[index], ...(media.type === "video" ? { video: media.url } : { img: media.url }), ingestStatus: "done", ingestError: "", ingestedAt: new Date().toISOString() });
        } catch (error) {
          updates.push({ link: links[index], ingestStatus: "partial", ingestError: String(error?.message || "não foi possível preservar a mídia").slice(0, 180), ingestedAt: new Date().toISOString() });
        }
      }
      await patchOffer(id, token, data => {
        if (!Array.isArray(data.brandTopAds)) data.brandTopAds = [];
        updates.forEach((update, index) => { data.brandTopAds[index] = { ...(data.brandTopAds[index] || {}), ...update }; });
        data.brandMediaBatchAt = new Date().toISOString();
      });
      console.log(`fb-ingest batch ${id}: ${updates.length} item(ns)`);
      return { statusCode: 202, body: "" };
    }

    const extracted = await resolveFacebookMedia(sourceUrl);
    let media = null;
    media = await downloadAndStore(extracted.mediaUrl, id, targetIndex == null ? "criativo" : `top-${targetIndex + 1}`, token).catch(() => null);

    await patchOffer(id, token, data => {
      const status = media ? "done" : "partial";
      const error = media ? "" : "não foi possível preservar a mídia";
      if (targetIndex != null) {
        if (!Array.isArray(data.brandTopAds)) data.brandTopAds = [];
        const item = { ...(data.brandTopAds[targetIndex] || {}), ingestStatus: status, ingestError: error, ingestedAt: new Date().toISOString() };
        if (media?.type === "video") item.video = media.url;
        if (media?.type === "image") item.img = media.url;
        data.brandTopAds[targetIndex] = item;
        return;
      }
      if (media) Object.assign(data, applyArchivedMedia(data, media, {
        source: extracted.source,
        now: new Date().toISOString(),
      }));
      else {
        data.fbIngestStatus = status;
        data.fbIngestError = error;
        data.fbIngestAt = new Date().toISOString();
        data.mediaArchiveRequired = true;
        data.mediaArchiveStatus = status;
        data.mediaArchivedAt = "";
      }
    });
    console.log(`fb-ingest ${id}: concluído`);
  } catch (error) {
    const message = publicError(error);
    console.error("fb-ingest-background falhou:", message);
    if (id && token) {
      try {
        await patchOffer(id, token, data => {
          if (targetIndex != null) {
            if (!Array.isArray(data.brandTopAds)) data.brandTopAds = [];
            data.brandTopAds[targetIndex] = { ...(data.brandTopAds[targetIndex] || {}), ingestStatus: "error", ingestError: message, ingestedAt: new Date().toISOString() };
          } else {
            data.fbIngestStatus = "error";
            data.fbIngestError = message;
            data.fbIngestAt = new Date().toISOString();
            data.mediaArchiveRequired = true;
            data.mediaArchiveStatus = "error";
          }
        });
      } catch {}
    }
  }
  return { statusCode: 202, body: "" };
};
