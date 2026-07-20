import {
  SUPABASE_ANON_KEY as ANON,
  SUPABASE_URL,
  authenticateToken,
  boundedBuffer,
  canAutomate,
  rateLimit,
  safeRemoteFetch,
} from "./_security.mjs";

const APIFY_TOKEN = process.env.APIFY_TOKEN || "";
const FB_ADS_ACTOR = process.env.FB_ADS_ACTOR || "curious_coder~facebook-ads-library-scraper";
const MAX_BYTES = 60 * 1024 * 1024;
const FB_MEDIA_HOSTS = ["facebook.com", "fbcdn.net", "fbsbx.com", "akamaihd.net"];

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

function deepValue(value, predicate) {
  let result = null;
  (function walk(current) {
    if (result != null) return;
    if (Array.isArray(current)) {
      for (const item of current) walk(item);
      return;
    }
    if (!current || typeof current !== "object") return;
    for (const [key, item] of Object.entries(current)) {
      if ((typeof item === "string" || typeof item === "number") && item !== "" && predicate(key, item)) {
        result = item;
        return;
      }
      walk(item);
      if (result != null) return;
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

function toUnix(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return value > 1e12 ? Math.floor(value / 1000) : Math.floor(value);
  const text = String(value).trim();
  if (/^\d+$/.test(text)) {
    const number = Number(text);
    return number > 1e12 ? Math.floor(number / 1000) : number;
  }
  const timestamp = Date.parse(text);
  return Number.isNaN(timestamp) ? null : Math.floor(timestamp / 1000);
}

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

async function scrapeAds(adUrl, count = 3) {
  if (!APIFY_TOKEN) throw new Error("serviço de importação não configurado");
  if (!/^[\w.-]+~[\w.-]+$/.test(FB_ADS_ACTOR)) throw new Error("configuração do coletor inválida");
  const input = { urls: [{ url: adUrl }], scrapeAdDetails: true, count, limitPerSource: count, activeStatus: "all" };
  const url = `https://api.apify.com/v2/acts/${FB_ADS_ACTOR}/run-sync-get-dataset-items?timeout=240`;
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${APIFY_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(250_000),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`coletor indisponível (HTTP ${response.status})`);
  let items;
  try { items = JSON.parse(text); } catch { throw new Error("resposta do coletor inválida"); }
  if (!Array.isArray(items)) throw new Error("coletor não retornou anúncios");
  return items;
}

async function abortStuckRuns() {
  for (const status of ["READY", "RUNNING"]) {
    const response = await fetch(`https://api.apify.com/v2/acts/${FB_ADS_ACTOR}/runs?status=${status}&limit=50&desc=1`, {
      headers: { Authorization: `Bearer ${APIFY_TOKEN}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) continue;
    const items = (await response.json())?.data?.items || [];
    for (const run of items) {
      if (/^[\w-]+$/.test(String(run.id || ""))) {
        await fetch(`https://api.apify.com/v2/actor-runs/${run.id}/abort`, {
          method: "POST",
          headers: { Authorization: `Bearer ${APIFY_TOKEN}` },
          signal: AbortSignal.timeout(15_000),
        });
      }
    }
  }
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

function adMetadata(ad) {
  const start = toUnix(deepValue(ad, key => /(ad_delivery_start_time|start_?date|start_?time)/i.test(key)));
  const end = toUnix(deepValue(ad, key => /(ad_delivery_stop_time|end_?date|stop_?time)/i.test(key)));
  const now = Math.floor(Date.now() / 1000);
  const active = !end || end > now;
  const metrics = {};
  for (const key of ["impressions", "spend", "reach"]) {
    const value = deepValue(ad, item => new RegExp(key, "i").test(item));
    if (value != null) metrics[key] = value;
  }
  return {
    startDateUnix: start || null,
    endDateUnix: end || null,
    startDate: start ? new Date(start * 1000).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "",
    active,
    daysActive: start ? Math.max(0, Math.floor(((active ? now : end) - start) / 86400)) : null,
    pageName: deepValue(ad, key => /page_?name/i.test(key)) || "",
    metrics,
  };
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
    const quota = await rateLimit("fb-ingest", user.id, { limit: 20, windowMs: 60 * 60_000 });
    if (!quota.allowed) throw new Error("limite temporário de importações atingido");

    if (body.batch === true) {
      await abortStuckRuns();
      const wanted = Math.max(1, Math.min(12, Array.isArray(body.links) ? body.links.length : 5));
      const ads = (await scrapeAds(sourceUrl, wanted + 5)).filter(item => pickVideoUrl(item) || pickImageUrl(item)).slice(0, wanted);
      const updates = [];
      for (let index = 0; index < wanted; index += 1) {
        const ad = ads[index];
        if (!ad) {
          updates.push({ ingestStatus: "error", ingestError: "anúncio não retornado", ingestedAt: new Date().toISOString() });
          continue;
        }
        const meta = adMetadata(ad);
        try {
          const media = await downloadAndStore(pickVideoUrl(ad) || pickImageUrl(ad), id, `top-${index + 1}`, token);
          updates.push({ ...meta, ...(media.type === "video" ? { video: media.url } : { img: media.url }), ingestStatus: "done", ingestError: "", ingestedAt: new Date().toISOString() });
        } catch {
          updates.push({ ...meta, ingestStatus: "partial", ingestError: "não foi possível preservar a mídia", ingestedAt: new Date().toISOString() });
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

    const ads = await scrapeAds(sourceUrl, 3);
    const ad = ads.find(item => pickVideoUrl(item)) || ads[0];
    if (!ad) throw new Error("nenhum anúncio encontrado");
    const mediaUrl = pickVideoUrl(ad) || pickImageUrl(ad);
    const meta = adMetadata(ad);
    let media = null;
    if (mediaUrl) media = await downloadAndStore(mediaUrl, id, targetIndex == null ? "criativo" : `top-${targetIndex + 1}`, token).catch(() => null);

    await patchOffer(id, token, data => {
      const status = media ? "done" : "partial";
      const error = media ? "" : "não foi possível preservar a mídia";
      if (targetIndex != null) {
        if (!Array.isArray(data.brandTopAds)) data.brandTopAds = [];
        const item = { ...(data.brandTopAds[targetIndex] || {}), ...meta, ingestStatus: status, ingestError: error, ingestedAt: new Date().toISOString() };
        if (media?.type === "video") item.video = media.url;
        if (media?.type === "image") item.img = media.url;
        data.brandTopAds[targetIndex] = item;
        return;
      }
      if (media?.type === "video") {
        data.video = media.url;
        if (!String(data.transcricao || "").trim()) data.transcricaoStatus = "pending";
      }
      if (media?.type === "image") data.img = media.url;
      data.fbStartDate = meta.startDateUnix;
      data.fbEndDate = meta.endDateUnix;
      data.fbActive = meta.active;
      data.fbDaysActive = meta.daysActive;
      if (meta.pageName) data.fbPageName = meta.pageName;
      if (Object.keys(meta.metrics).length) data.fbMetrics = meta.metrics;
      data.fbIngestStatus = status;
      data.fbIngestError = error;
      data.fbIngestAt = new Date().toISOString();
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
          }
        });
      } catch {}
    }
  }
  return { statusCode: 202, body: "" };
};
