import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { setTimeout as pause } from "node:timers/promises";
import { detectMedia, isMetaMediaUrl, planMetaAds } from "../lib/apify-brand-archive.mjs";

const PAGE_ID = "688168747706811";
const BRAND = "Ultima Peak";
const ACTOR = "apify~facebook-ads-scraper";
const MAX_MEDIA_BYTES = 120 * 1024 * 1024;
const capturedAt = new Date().toISOString();
const apifyToken = process.env.APIFY_TOKEN;
const botToken = process.env.SUPABASE_BOT_ACCESS_TOKEN;
if (!apifyToken || !botToken) throw new Error("APIFY_TOKEN e SUPABASE_BOT_ACCESS_TOKEN são obrigatórios");

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const supabaseUrl = html.match(/const DEFAULT_URL="([^"]+)"/)?.[1];
const anonKey = html.match(/const DEFAULT_KEY="([^"]+)"/)?.[1];
if (!supabaseUrl || !anonKey) throw new Error("configuração pública do Supabase ausente");
const supabaseHeaders = { apikey: anonKey, Authorization: `Bearer ${botToken}` };
const apifyHeaders = { Authorization: `Bearer ${apifyToken}` };

async function apifyJson(path, options = {}) {
  const response = await fetch(`https://api.apify.com/v2/${path}`, {
    ...options,
    headers: { ...apifyHeaders, ...(options.body ? { "Content-Type": "application/json" } : {}) },
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) throw new Error(`Apify HTTP ${response.status}: ${(await response.text()).slice(0, 180)}`);
  return response.json();
}

async function readOffer() {
  const query = new URL(`${supabaseUrl}/rest/v1/offers`);
  query.searchParams.set("select", "id,data");
  query.searchParams.set("data->>kind", "eq.brandsvalidated");
  query.searchParams.set("data->>nomeOferta", `eq.${BRAND}`);
  const response = await fetch(query, { headers: supabaseHeaders, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`leitura da oferta falhou: HTTP ${response.status}`);
  const rows = await response.json();
  if (rows.length !== 1 || rows[0].data?.nomeOferta !== BRAND || !rows[0].data?.bibliotecas?.some(item => String(item.link || "").includes(`view_all_page_id=${PAGE_ID}`))) {
    throw new Error("card Ultima Peak ou ID da página Meta não corresponde ao cadastro");
  }
  return rows[0];
}

async function scrapeAds(libraryUrl) {
  const input = { startUrls: [{ url: libraryUrl }], resultsLimit: 50, onlyTotal: false, includeAboutPage: false, isDetailsPerAd: false };
  const started = await apifyJson(`acts/${ACTOR}/runs?timeout=30`, { method: "POST", body: JSON.stringify(input) });
  let run = started.data;
  if (!run?.id) throw new Error("Apify não retornou ID da execução");
  const deadline = Date.now() + 8 * 60_000;
  while (!["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(run.status) && Date.now() < deadline) {
    await pause(10_000);
    run = (await apifyJson(`actor-runs/${run.id}?waitForFinish=30`)).data;
  }
  if (run?.status !== "SUCCEEDED" || !run.defaultDatasetId) throw new Error(`Apify terminou com status ${run?.status || "desconhecido"}`);
  const rows = await apifyJson(`datasets/${run.defaultDatasetId}/items?clean=true&limit=100`);
  if (!Array.isArray(rows)) throw new Error("dataset Apify inválido");
  return { runId: run.id, rows };
}

async function downloadOriginal(asset) {
  if (!isMetaMediaUrl(asset.sourceUrl)) throw new Error("host de mídia não autorizado");
  let currentUrl = asset.sourceUrl, response;
  for (let redirects = 0; redirects <= 3; redirects++) {
    response = await fetch(currentUrl, { signal: AbortSignal.timeout(90_000), redirect: "manual" });
    if (response.status < 300 || response.status >= 400) break;
    const next = new URL(response.headers.get("location") || "", currentUrl).href;
    if (!isMetaMediaUrl(next)) throw new Error("redirecionamento para host não autorizado");
    currentUrl = next;
  }
  if (response.status >= 300 && response.status < 400) throw new Error("muitos redirecionamentos");
  if (!response.ok) throw new Error(`download HTTP ${response.status}`);
  if (!response.body) throw new Error("download sem corpo");
  const announced = Number(response.headers.get("content-length") || 0);
  if (announced > MAX_MEDIA_BYTES) throw new Error("mídia excede 120 MB");
  const reader = response.body.getReader(), chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_MEDIA_BYTES) { await reader.cancel(); throw new Error("mídia excede 120 MB"); }
    chunks.push(value);
  }
  if (size < 1024) throw new Error("mídia vazia ou incompleta");
  const buffer = Buffer.concat(chunks);
  const detected = detectMedia(buffer);
  if (detected.type !== asset.type) throw new Error("tipo de mídia diferente do anunciado");
  return { buffer, ...detected };
}

async function uploadMedia(adId, index, asset) {
  const downloaded = await downloadOriginal(asset);
  const sha256 = createHash("sha256").update(downloaded.buffer).digest("hex");
  const objectPath = `brands/ultima-peak/archive/${adId}/${String(index + 1).padStart(2, "0")}-${sha256.slice(0, 16)}.${downloaded.ext}`;
  const response = await fetch(`${supabaseUrl}/storage/v1/object/criativos/${objectPath}`, {
    method: "POST",
    headers: { ...supabaseHeaders, "Content-Type": downloaded.contentType, "x-upsert": "true" },
    body: downloaded.buffer,
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`Storage HTTP ${response.status}`);
  return {
    type: downloaded.type, quality: asset.quality, bytes: downloaded.buffer.length, sha256,
    url: `${supabaseUrl}/storage/v1/object/public/criativos/${objectPath}`,
  };
}

const offer = await readOffer();
const libraryUrl = offer.data.bibliotecas.find(item => String(item.link || "").includes(`view_all_page_id=${PAGE_ID}`)).link;
const { runId, rows } = await scrapeAds(libraryUrl);
const planned = planMetaAds(rows, PAGE_ID, 50);
if (!planned.length) throw new Error("Apify não retornou anúncios da página exata da Ultima Peak; nada foi alterado");
const existing = new Map((offer.data.brandArchivedAds || []).map(ad => [String(ad.adArchiveId), ad]));
let downloaded = 0, failedMedia = 0, skipped = 0;
for (const ad of planned) {
  if (existing.get(ad.adArchiveId)?.media?.length) { skipped++; continue; }
  const media = [];
  for (let index = 0; index < ad.media.length; index++) {
    try { media.push(await uploadMedia(ad.adArchiveId, index, ad.media[index])); downloaded++; }
    catch (error) { failedMedia++; console.warn(`Ad ${ad.adArchiveId} mídia ${index + 1}: ${String(error.message).slice(0, 120)}`); }
  }
  if (media.length) existing.set(ad.adArchiveId, { ...ad, media, capturedAt, sourceActor: ACTOR, apifyRunId: runId });
}
if (!downloaded && !skipped) throw new Error("nenhuma mídia original pôde ser armazenada; card não alterado");
const current = await readOffer();
const merged = new Map((current.data.brandArchivedAds || []).map(ad => [String(ad.adArchiveId), ad]));
for (const [id, ad] of existing) if (!merged.get(id)?.media?.length) merged.set(id, ad);
const data = { ...current.data, brandArchivedAds: [...merged.values()], brandArchiveUpdatedAt: capturedAt };
const saved = await fetch(`${supabaseUrl}/rest/v1/offers?id=eq.${encodeURIComponent(current.id)}`, {
  method: "PATCH", headers: { ...supabaseHeaders, "Content-Type": "application/json", Prefer: "return=representation" },
  body: JSON.stringify({ data }), signal: AbortSignal.timeout(30_000),
});
if (!saved.ok) throw new Error(`gravação no card falhou: HTTP ${saved.status}`);
const verified = await readOffer();
const archived = verified.data.brandArchivedAds || [];
if (!archived.some(ad => ad.apifyRunId === runId && ad.media?.length) && downloaded) throw new Error("mídias enviadas, mas vínculo no card não foi confirmado");
console.log(JSON.stringify({ ok: true, brand: BRAND, offerId: current.id, apifyRunId: runId, datasetAds: rows.length, plannedAds: planned.length, archivedAds: archived.filter(ad => ad.media?.length).length, downloadedMedia: downloaded, reusedAds: skipped, failedMedia }));
