import { createHmac, timingSafeEqual } from "node:crypto";
import {
  SUPABASE_URL,
  boundedBuffer,
  safeRemoteFetch,
} from "./_security.mjs";
import {
  automationSigningSecret,
  mergeSupabaseOfferData,
  shallowDataPatch,
  supabaseAdminHeaders,
} from "./_supabase-admin.mjs";
import { resolveFacebookMedia } from "./_facebook-media-resolver.mjs";
import {
  applyArchivedMedia,
  hasStoredMedia,
} from "./_creative-integrity.mjs";

const MAX_BYTES = 60 * 1024 * 1024;
const FB_MEDIA_HOSTS = ["facebook.com", "fbcdn.net", "fbsbx.com", "akamaihd.net"];

const serverHeaders = supabaseAdminHeaders;

function validSignature(raw, supplied) {
  const secret = automationSigningSecret();
  if (!secret || !/^[a-f0-9]{64}$/i.test(String(supplied || ""))) return false;
  const expected = createHmac("sha256", secret).update(raw).digest();
  const received = Buffer.from(String(supplied), "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

function isFacebookUrl(value) {
  try {
    const url = new URL(String(value || ""));
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    return url.protocol === "https:" && !url.username && !url.password
      && ["facebook.com", "fb.com", "fb.me", "fb.watch"].some(suffix => host === suffix || host.endsWith(`.${suffix}`));
  } catch {
    return false;
  }
}

function detectMedia(buffer) {
  if (buffer.length > 12 && buffer.subarray(4, 8).toString("latin1") === "ftyp") return { type: "video", contentType: "video/mp4", ext: "mp4" };
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { type: "image", contentType: "image/jpeg", ext: "jpg" };
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { type: "image", contentType: "image/png", ext: "png" };
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return { type: "image", contentType: "image/webp", ext: "webp" };
  throw new Error("mídia retornada em formato inválido");
}

async function loadCreative(id) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(id)}&select=data`, {
    headers: await serverHeaders({ accept: "application/json" }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error("criativo não encontrado");
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error("criativo não encontrado");
  return rows[0].data || {};
}

async function saveCreative(id, before, data) {
  await mergeSupabaseOfferData(id, shallowDataPatch(before, data), data);
}

async function downloadAndStore(mediaUrl, sourceOfferId, id) {
  const response = await safeRemoteFetch(mediaUrl, { allowedHostSuffixes: FB_MEDIA_HOSTS, timeoutMs: 40_000 });
  if (!response.ok) throw new Error(`download indisponível (HTTP ${response.status})`);
  const buffer = await boundedBuffer(response, MAX_BYTES);
  if (!buffer.length) throw new Error("mídia vazia");
  const media = detectMedia(buffer);
  const safeOffer = String(sourceOfferId || "sem-oferta").replace(/[^a-z0-9-]/gi, "").slice(0, 64);
  const path = `ofertas/${safeOffer}/${id}/facebook.${media.ext}`;
  const upload = await fetch(`${SUPABASE_URL}/storage/v1/object/criativos/${path}`, {
    method: "POST",
    headers: await serverHeaders({ "Content-Type": media.contentType, "x-upsert": "true" }),
    body: buffer,
    signal: AbortSignal.timeout(90_000),
  });
  if (!upload.ok) throw new Error(`armazenamento indisponível (HTTP ${upload.status})`);
  return {
    type: media.type,
    url: `${SUPABASE_URL}/storage/v1/object/public/criativos/${path}`,
  };
}

function retryAt(attempt) {
  const minutes = Math.min(12 * 60, Math.max(10, 10 * (2 ** Math.max(0, Number(attempt || 1) - 1))));
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

export const handler = async event => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "" };
  const raw = String(event.body || "");
  if (Buffer.byteLength(raw, "utf8") > 32 * 1024 || !validSignature(raw, event.headers["x-feg-archive-signature"])) {
    return { statusCode: 401, body: "" };
  }

  let id = "";
  let attempt = 1;
  try {
    const body = JSON.parse(raw || "{}");
    id = String(body.id || "");
    attempt = Math.max(1, Number(body.attempt) || 1);
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id) || !isFacebookUrl(body.adUrl)) throw new Error("requisição inválida");

    const current = await loadCreative(id);
    if (current.kind !== "criativo" || !current.sourceOfferId || !isFacebookUrl(current.linkAnuncio)) {
      throw new Error("criativo não pertence a uma oferta do Facebook");
    }
    if (hasStoredMedia(current)) {
      const type = String(current.video || "").trim() ? "video" : "image";
      const url = type === "video" ? current.video : (current.print || current.img);
      await saveCreative(id, current, applyArchivedMedia(current, { type, url }, {
        source: current.mediaArchiveSource || "storage-existing",
        now: current.mediaArchivedAt || new Date().toISOString(),
      }));
      return { statusCode: 202, body: "" };
    }

    current.fbIngestStatus = "working";
    current.mediaArchiveStatus = "working";
    current.fbIngestError = "";
    current.mediaArchiveStartedAt = new Date().toISOString();
    const beforeWorking = { ...current };
    await saveCreative(id, beforeWorking, current);

    const scraped = await resolveFacebookMedia(current.linkAnuncio);
    const media = await downloadAndStore(scraped.mediaUrl, current.sourceOfferId, id);
    const beforeArchived = await loadCreative(id);
    const latest = applyArchivedMedia(beforeArchived, media, {
      source: scraped.source,
      now: new Date().toISOString(),
    });
    await saveCreative(id, beforeArchived, latest);
    console.log(`offer archive ${id}: ${media.type} preservado`);
  } catch (error) {
    const unavailable = error?.code === "FACEBOOK_MEDIA_UNAVAILABLE";
    const message = unavailable
      ? "Mídia ainda não disponibilizada publicamente pelo Facebook; nova tentativa automática agendada."
      : String(error?.message || error).slice(0, 180);
    console.error(`offer archive ${id || "unknown"}:`, message);
    if (id) {
      try {
        const beforeFailure = await loadCreative(id);
        const latest = { ...beforeFailure };
        latest.fbIngestStatus = "error";
        latest.fbIngestError = message;
        latest.fbIngestAt = new Date().toISOString();
        latest.mediaArchiveRequired = true;
        latest.mediaArchiveStatus = "error";
        latest.mediaArchiveError = message;
        latest.mediaArchiveNextRetryAt = unavailable
          ? new Date(Date.now() + 12 * 60 * 60_000).toISOString()
          : retryAt(attempt);
        await saveCreative(id, beforeFailure, latest);
      } catch {}
    }
  }
  return { statusCode: 202, body: "" };
};
