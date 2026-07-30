import { createHmac, timingSafeEqual } from "node:crypto";
import {
  SUPABASE_URL,
  boundedBuffer,
  safeRemoteFetch,
} from "./_security.mjs";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const APIFY_TOKEN = process.env.APIFY_TOKEN || "";
const FB_ADS_ACTOR = process.env.FB_ADS_ACTOR || "curious_coder~facebook-ads-library-scraper";
const MAX_BYTES = 60 * 1024 * 1024;
const FB_MEDIA_HOSTS = ["facebook.com", "fbcdn.net", "fbsbx.com", "akamaihd.net"];

function serverHeaders(extra = {}) {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    ...extra,
  };
}

function validSignature(raw, supplied) {
  if (!SERVICE_KEY || !/^[a-f0-9]{64}$/i.test(String(supplied || ""))) return false;
  const expected = createHmac("sha256", SERVICE_KEY).update(raw).digest();
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

function deepFind(value, predicate) {
  let result = null;
  (function walk(current) {
    if (result) return;
    if (Array.isArray(current)) {
      for (const item of current) walk(item);
      return;
    }
    if (!current || typeof current !== "object") return;
    for (const [key, item] of Object.entries(current)) {
      if (typeof item === "string" && item.startsWith("https://") && predicate(key, item)) {
        result = item;
        return;
      }
      walk(item);
      if (result) return;
    }
  })(value);
  return result;
}

function pickVideoUrl(item) {
  return deepFind(item, key => /video_hd_url/i.test(key))
    || deepFind(item, key => /video_sd_url/i.test(key))
    || deepFind(item, (key, value) => /video/i.test(key) && !/thumb|image|cover|preview|poster/i.test(key) && /\.(mp4|mov|m4v)(\?|$)/i.test(value))
    || deepFind(item, (_key, value) => /\.(mp4|mov|m4v)(\?|$)/i.test(value));
}

function pickImageUrl(item) {
  return deepFind(item, key => /(image_snapshot_url|original_image_url|image_url|thumbnail_url)/i.test(key))
    || deepFind(item, (key, value) => /image|thumb|cover|poster|preview/i.test(key) && /\.(jpe?g|png|webp)(\?|$)/i.test(value));
}

function detectMedia(buffer) {
  if (buffer.length > 12 && buffer.subarray(4, 8).toString("latin1") === "ftyp") return { type: "video", contentType: "video/mp4", ext: "mp4" };
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { type: "image", contentType: "image/jpeg", ext: "jpg" };
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { type: "image", contentType: "image/png", ext: "png" };
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return { type: "image", contentType: "image/webp", ext: "webp" };
  throw new Error("mídia retornada em formato inválido");
}

async function scrapeAd(adUrl) {
  if (!APIFY_TOKEN) throw new Error("APIFY_TOKEN não configurado");
  if (!/^[\w.-]+~[\w.-]+$/.test(FB_ADS_ACTOR)) throw new Error("coletor inválido");
  const response = await fetch(`https://api.apify.com/v2/acts/${FB_ADS_ACTOR}/run-sync-get-dataset-items?timeout=240`, {
    method: "POST",
    headers: { Authorization: `Bearer ${APIFY_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      urls: [{ url: adUrl }],
      scrapeAdDetails: true,
      count: 3,
      limitPerSource: 3,
      activeStatus: "all",
    }),
    signal: AbortSignal.timeout(250_000),
  });
  if (!response.ok) throw new Error(`coletor indisponível (HTTP ${response.status})`);
  const items = await response.json().catch(() => null);
  if (!Array.isArray(items) || !items.length) throw new Error("anúncio não encontrado");
  const ad = items.find(item => pickVideoUrl(item)) || items.find(item => pickImageUrl(item));
  if (!ad) throw new Error("anúncio sem mídia disponível");
  return { mediaUrl: pickVideoUrl(ad) || pickImageUrl(ad) };
}

async function loadCreative(id) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(id)}&select=data`, {
    headers: serverHeaders({ accept: "application/json" }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error("criativo não encontrado");
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error("criativo não encontrado");
  return rows[0].data || {};
}

async function saveCreative(id, data) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: serverHeaders({ "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify({ data }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`não foi possível atualizar o criativo (HTTP ${response.status})`);
}

async function downloadAndStore(mediaUrl, sourceOfferId, id) {
  const response = await safeRemoteFetch(mediaUrl, { allowedHostSuffixes: FB_MEDIA_HOSTS, timeoutMs: 40_000 });
  if (!response.ok) throw new Error(`download indisponível (HTTP ${response.status})`);
  const buffer = await boundedBuffer(response, MAX_BYTES);
  if (!buffer.length) throw new Error("mídia vazia");
  const media = detectMedia(buffer);
  const safeOffer = String(sourceOfferId || "sem-oferta").replace(/[^a-z0-9-]/gi, "").slice(0, 64);
  const path = `ofertas/${safeOffer}/${id}/facebook-${Date.now()}.${media.ext}`;
  const upload = await fetch(`${SUPABASE_URL}/storage/v1/object/criativos/${path}`, {
    method: "POST",
    headers: serverHeaders({ "Content-Type": media.contentType, "x-upsert": "false" }),
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
    if (current.kind !== "criativo" || !current.sourceOfferId || !current.mediaArchiveRequired || !isFacebookUrl(current.linkAnuncio)) {
      throw new Error("criativo não pertence a uma oferta do Facebook");
    }
    if (String(current.video || "").trim() || String(current.print || current.img || "").trim()) {
      current.fbIngestStatus = "done";
      current.mediaArchiveStatus = "done";
      current.mediaArchivedAt ||= new Date().toISOString();
      current.mediaArchiveNextRetryAt = "";
      await saveCreative(id, current);
      return { statusCode: 202, body: "" };
    }

    current.fbIngestStatus = "working";
    current.mediaArchiveStatus = "working";
    current.fbIngestError = "";
    current.mediaArchiveStartedAt = new Date().toISOString();
    await saveCreative(id, current);

    const scraped = await scrapeAd(current.linkAnuncio);
    const media = await downloadAndStore(scraped.mediaUrl, current.sourceOfferId, id);
    const latest = await loadCreative(id);
    if (media.type === "video") {
      latest.video = media.url;
      latest.videoPoster = latest.videoPoster || "";
      if (!String(latest.transcricao || "").trim()) latest.transcricaoStatus = "pending";
    } else {
      latest.img = media.url;
      latest.print = media.url;
    }
    latest.fbIngestStatus = "done";
    latest.fbIngestError = "";
    latest.fbIngestAt = new Date().toISOString();
    latest.mediaArchiveRequired = true;
    latest.mediaArchiveStatus = "done";
    latest.mediaArchivedAt = new Date().toISOString();
    latest.mediaArchiveNextRetryAt = "";
    latest.mediaArchiveSource = "facebook";
    await saveCreative(id, latest);
    console.log(`offer archive ${id}: ${media.type} preservado`);
  } catch (error) {
    const message = String(error?.message || error).slice(0, 180);
    console.error(`offer archive ${id || "unknown"}:`, message);
    if (id) {
      try {
        const latest = await loadCreative(id);
        latest.fbIngestStatus = "error";
        latest.fbIngestError = message;
        latest.fbIngestAt = new Date().toISOString();
        latest.mediaArchiveRequired = true;
        latest.mediaArchiveStatus = "error";
        latest.mediaArchiveError = message;
        latest.mediaArchiveNextRetryAt = retryAt(attempt);
        await saveCreative(id, latest);
      } catch {}
    }
  }
  return { statusCode: 202, body: "" };
};
