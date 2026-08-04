import fs from "node:fs/promises";
import path from "node:path";
import { authHeaders, productionAdminAuth } from "./_supabase-auth.mjs";

const args = process.argv.slice(2);
const valueOf = flag => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : "";
};
const PREPARED = path.resolve(valueOf("--prepared") || ".tmp/angelica-honeypeak-ready");
const AUDIT_ONLY = args.includes("--audit");
const SKIP_UPLOAD = args.includes("--skip-upload");
const MANIFEST = JSON.parse(await fs.readFile(path.join(PREPARED, "manifest.json"), "utf8"));
const seenHoneyHashes = new Set();
const HONEY_VSLS = MANIFEST.honeyPeak.filter(item => {
  if (seenHoneyHashes.has(item.hash)) return false;
  seenHoneyHashes.add(item.hash);
  return true;
});

const auth = await productionAdminAuth();
const SUPABASE_URL = auth.url;
const headers = authHeaders(auth, {
  "Content-Type": "application/json",
});

const textKey = value => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

function canonicalUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    url.hash = "";
    const ignored = /^(utm_|fbclid$|subid|sid|rtk|twrclid|hcid|tid$|click_id$|ref_id$|tblci$|media_type$|src$|cp$|ip$)/i;
    for (const key of [...url.searchParams.keys()]) if (ignored.test(key)) url.searchParams.delete(key);
    return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/+$/, "")}${url.search}`;
  } catch {
    return String(value || "").trim().toLowerCase();
  }
}

async function api(pathname, options = {}) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, {
        ...options,
        headers: { ...headers, ...(options.headers || {}) },
        signal: AbortSignal.timeout(60_000),
      });
      const body = await response.text();
      if (response.ok) return body ? JSON.parse(body) : null;
      if (attempt < 3 && (response.status === 408 || response.status === 429 || response.status >= 500)) {
        await new Promise(resolve => setTimeout(resolve, 2_000 * (attempt + 1)));
        continue;
      }
      throw new Error(`Supabase ${response.status}: ${body.slice(0, 300)}`);
    } catch (error) {
      if (attempt >= 3) throw error;
      await new Promise(resolve => setTimeout(resolve, 2_000 * (attempt + 1)));
    }
  }
  throw new Error("Supabase indisponível após as tentativas seguras");
}

async function readRows(select, filters = {}) {
  const rows = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const query = new URLSearchParams({ select, order: "created_at.asc" });
    for (const [key, value] of Object.entries(filters)) query.set(key, value);
    const page = await api(`offers?${query}`, {
      headers: { "Range-Unit": "items", Range: `${offset}-${offset + pageSize - 1}` },
    });
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

async function fullRows(ids) {
  if (!ids.length) return [];
  const result = [];
  for (let offset = 0; offset < ids.length; offset += 50) {
    result.push(...await readRows("id,created_at,data", { id: `in.(${ids.slice(offset, offset + 50).join(",")})` }));
  }
  return result;
}

async function saveRow(existing, data) {
  if (!existing) {
    const saved = await api("offers", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ data }),
    });
    return (Array.isArray(saved) ? saved[0] : saved) || null;
  }
  const before = existing.data || {};
  const patch = Object.fromEntries(
    [...new Set([...Object.keys(before), ...Object.keys(data)])]
      .filter(key => JSON.stringify(before[key]) !== JSON.stringify(data[key]))
      .map(key => [key, Object.hasOwn(data, key) ? data[key] : null]),
  );
  try {
    const saved = await api("rpc/swipe_merge_offer_data", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ p_id: existing.id, p_patch: patch }),
    });
    const merged = Array.isArray(saved) ? saved[0] : saved;
    return merged && typeof merged === "object"
      ? { ...existing, data: merged.data && typeof merged.data === "object" ? merged.data : merged }
      : { ...existing, data: { ...before, ...patch } };
  } catch (error) {
    if (!/Supabase (400|404):/.test(String(error?.message || error))) throw error;
    const saved = await api(`offers?id=eq.${encodeURIComponent(existing.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ data }),
    });
    return (Array.isArray(saved) ? saved[0] : saved) || existing;
  }
}

async function removeRow(id) {
  await api(`offers?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
}

const publicObject = objectPath => `${SUPABASE_URL}/storage/v1/object/public/criativos/${objectPath}`;

async function assertStoredObject(objectPath, expectedBytes) {
  const response = await fetch(publicObject(objectPath), {
    method: "HEAD",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Mídia ausente no Storage: ${objectPath} (HTTP ${response.status})`);
  const storedBytes = Number(response.headers.get("content-length") || 0);
  if (expectedBytes && storedBytes !== expectedBytes) {
    throw new Error(`Mídia incompleta no Storage: ${objectPath} (${storedBytes}/${expectedBytes} bytes)`);
  }
}

async function uploadFile(filename, objectPath, contentType) {
  const body = await fs.readFile(path.join(PREPARED, filename));
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/criativos/${objectPath}`, {
    method: "POST",
    headers: {
      ...authHeaders(auth),
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body,
    signal: AbortSignal.timeout(15 * 60_000),
  });
  if (!response.ok) throw new Error(`Upload ${objectPath}: ${response.status} ${(await response.text()).slice(0, 220)}`);
  return publicObject(objectPath);
}

function mergeUnique(current, added, keyOf) {
  const output = [];
  const seen = new Set();
  for (const item of [...(Array.isArray(current) ? current : []), ...added]) {
    const key = keyOf(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

function mergeHistory(history, point) {
  const byDate = new Map();
  for (const item of [...(Array.isArray(history) ? history : []), point]) {
    const date = String(item?.d || "");
    const number = Number(item?.n);
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(number) && number >= 0) {
      byDate.set(date, { d: date, n: Math.round(number) });
    }
  }
  return [...byDate.values()].sort((a, b) => a.d.localeCompare(b.d));
}

function hasTranscript(data) {
  return Boolean(String(data?.transcricao || data?.copy || "").trim());
}

const projectedMegaBrain = await readRows(
  "id,created_at,nome:data->>nome,autor:data->>autor",
  // Use um prefixo ASCII comum a "Angelica" e "Angélica". O Postgres não
  // remove acentos no ILIKE e o filtro anterior deixava de encontrar o autor.
  { "data->>kind": "eq.megabrain", "data->>autor": "ilike.Ang*" },
);
const projectedCreatives = await readRows(
  "id,created_at,nome:data->>nome,sourceMediaKey:data->>sourceMediaKey,sourceOfferName:data->>sourceOfferName",
  { "data->>kind": "eq.criativo" },
);
const projectedOffers = await readRows(
  "id,created_at,nomeOferta:data->>nomeOferta,nomeMarca:data->>nomeMarca",
  { or: "(data->>nomeOferta.ilike.*honey*peak*,data->>nomeMarca.ilike.*honey*peak*)" },
);

const requestedAngelicaNames = new Set(MANIFEST.angelica.map(item => textKey(item.name)));
const angelicaCandidateIds = projectedMegaBrain
  .filter(row => requestedAngelicaNames.has(textKey(row.nome)))
  .map(row => row.id);
const honeyCreativeCandidateIds = projectedCreatives
  .filter(row => String(row.sourceMediaKey || "").startsWith("honeypeak:vsl:") || textKey(row.sourceOfferName).includes("honey peak gelatin"))
  .map(row => row.id);
const [megabrainRows, creativeCandidates, offerRows] = await Promise.all([
  fullRows(angelicaCandidateIds),
  fullRows(honeyCreativeCandidateIds),
  fullRows(projectedOffers.map(row => row.id)),
]);
const creativeById = new Map(creativeCandidates.map(row => [row.id, row]));
const creativeRows = projectedCreatives.map(row => creativeById.get(row.id) || {
  id: row.id,
  created_at: row.created_at,
  data: {
    nome: row.nome,
    sourceMediaKey: row.sourceMediaKey,
    sourceOfferName: row.sourceOfferName,
    kind: "criativo",
  },
});

const angelicaPlans = MANIFEST.angelica.map(media => {
  const matches = megabrainRows.filter(row =>
    textKey(row.data?.autor) === "angelica" && textKey(row.data?.nome) === textKey(media.name));
  return { media, keep: matches[0] || null, duplicates: matches.slice(1) };
});

const honeyAliases = new Set([
  "honey peak gelatin",
  "honey peak gelatin truque do mel",
  "honey peak gelatin truque do mel insider",
  "truque do mel honey peak gelatin",
].map(textKey));
const honeyMatches = offerRows.filter(row =>
  [row.data?.nomeOferta, row.data?.nomeMarca].map(textKey).some(name => honeyAliases.has(name)));
const honeyOffer = honeyMatches[0] || null;
const honeyDuplicates = honeyMatches.slice(1);
const honeyMediaKeys = new Set(HONEY_VSLS.map(item => item.key));
const honeyCreativeMatches = creativeRows.filter(row =>
  honeyMediaKeys.has(row.data?.sourceMediaKey) ||
  textKey(row.data?.sourceOfferName).includes("honey peak gelatin"));

const edNumbers = creativeRows
  .map(row => String(row.data?.nome || "").match(/^\[ADS ED\]\[(\d+)\]$/i)?.[1])
  .filter(Boolean)
  .map(Number)
  .filter(Number.isFinite);

if (AUDIT_ONLY) {
  console.log(JSON.stringify({
    source: {
      angelica: MANIFEST.angelica.length,
      honeyPeakVsls: HONEY_VSLS.length,
      duplicateVslFilesSkipped: MANIFEST.honeyPeak.length - HONEY_VSLS.length,
    },
    angelica: {
      insert: angelicaPlans.filter(plan => !plan.keep).length,
      update: angelicaPlans.filter(plan => plan.keep).length,
      duplicateRows: angelicaPlans.reduce((sum, plan) => sum + plan.duplicates.length, 0),
      pendingSales: angelicaPlans.filter(plan => plan.media.sales == null).map(plan => plan.media.name),
      niches: Object.fromEntries([...new Set(MANIFEST.angelica.map(item => item.niche))].map(niche => [niche, MANIFEST.angelica.filter(item => item.niche === niche).length])),
    },
    honeyPeak: {
      offerAction: honeyOffer ? "update" : "insert",
      duplicateOfferRows: honeyDuplicates.length,
      mirroredCreativesFound: honeyCreativeMatches.length,
      mirroredCreativesToCreate: HONEY_VSLS.filter(item => !honeyCreativeMatches.some(row => row.data?.sourceMediaKey === item.key)).length,
      nextEdSequence: Math.max(0, ...edNumbers) + 1,
    },
  }, null, 2));
  process.exit(0);
}

// Snapshot obrigatório antes de qualquer escrita: permite restaurar metadados sem
// depender do estado do deploy ou de uma segunda consulta ao banco.
const backupRows = await readRows("id,created_at,data");
const backupDirectory = path.resolve(".tmp/import-backups");
await fs.mkdir(backupDirectory, { recursive: true });
const backupPath = path.join(backupDirectory, `offers-before-angelica-honeypeak-${Date.now()}.json`);
await fs.writeFile(backupPath, JSON.stringify({ createdAt: new Date().toISOString(), rows: backupRows }));
await fs.chmod(backupPath, 0o600);
console.log(`[Backup] ${backupRows.length} registros preservados em ${backupPath}`);

const mediaCache = new Map();
async function storedMedia(media, collection) {
  const cacheKey = `${collection}:${media.hash}`;
  if (!mediaCache.has(cacheKey)) {
    mediaCache.set(cacheKey, (async () => {
      const base = `${collection}/${media.hash.slice(0, 24)}`;
      const videoFile = media.storageVideoFile || media.videoFile;
      const videoBytes = Number(media.storageBytes || media.bytes || 0);
      if (SKIP_UPLOAD) {
        const thumbnailBytes = (await fs.stat(path.join(PREPARED, media.thumbnailFile))).size;
        await Promise.all([
          assertStoredObject(`${base}.mp4`, videoBytes),
          assertStoredObject(`${base}.jpg`, thumbnailBytes),
        ]);
        return {
          video: publicObject(`${base}.mp4`),
          thumbnail: publicObject(`${base}.jpg`),
        };
      }
      const video = await uploadFile(videoFile, `${base}.mp4`, "video/mp4");
      const thumbnail = await uploadFile(media.thumbnailFile, `${base}.jpg`, "image/jpeg");
      return { video, thumbnail };
    })());
  }
  return mediaCache.get(cacheKey);
}

const now = new Date().toISOString();
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());

const angelicaResults = [];
for (let index = 0; index < angelicaPlans.length; index += 1) {
  const plan = angelicaPlans[index];
  const media = await storedMedia(plan.media, "megabrain/angelica");
  let previous = plan.keep?.data || {};
  for (const duplicate of plan.duplicates) {
    if (!hasTranscript(previous) && hasTranscript(duplicate.data)) previous = { ...previous, ...duplicate.data };
  }
  const transcriptReady = hasTranscript(previous);
  const data = {
    ...previous,
    kind: "megabrain",
    nome: plan.media.name,
    nicho: plan.media.niche,
    autor: "Angélica",
    metricaTipo: "vendas",
    metricaValor: plan.media.sales ?? 0,
    metricaPendente: plan.media.sales == null,
    video: media.video,
    print: media.thumbnail,
    sourceMediaKey: plan.media.key,
    sourceCollection: "Angélica",
    transcriptionRequired: true,
    transcriptionStatus: transcriptReady ? "done" : "pending",
    transcricaoStatus: transcriptReady ? "done" : "pending",
    transcriptionAttempts: transcriptReady ? Number(previous.transcriptionAttempts || 0) : 0,
    transcriptionProvider: previous.transcriptionProvider || "faster-whisper",
    transcriptionVersion: previous.transcriptionVersion || "1",
    transcriptionNextRetryAt: "",
    transcriptionLastError: "",
  };
  const saved = await saveRow(plan.keep, data);
  for (const duplicate of plan.duplicates) await removeRow(duplicate.id);
  angelicaResults.push({ name: data.nome, id: saved.id, action: plan.keep ? "updated" : "inserted", sales: plan.media.sales, niche: data.nicho });
  console.log(`[Angélica ${index + 1}/${angelicaPlans.length}] ${data.nome}`);
}

const storedVsls = [];
for (let index = 0; index < HONEY_VSLS.length; index += 1) {
  const source = HONEY_VSLS[index];
  const media = await storedMedia(source, "offers/honey-peak-gelatin");
  storedVsls.push({
    ...source,
    ...media,
    displayName: `VSL ${String(index + 1).padStart(2, "0")}`,
  });
  console.log(`[Honey Peak ${index + 1}/${HONEY_VSLS.length}] ${source.name}`);
}

let previousOffer = honeyOffer?.data || {};
for (const duplicate of honeyDuplicates) {
  previousOffer = {
    ...duplicate.data,
    ...previousOffer,
    dominios: mergeUnique(duplicate.data?.dominios, previousOffer.dominios || [], item => canonicalUrl(item?.linkDominio || item?.linkCheckout)),
    bibliotecas: mergeUnique(duplicate.data?.bibliotecas, previousOffer.bibliotecas || [], item => canonicalUrl(item?.link)),
    criativos: mergeUnique(duplicate.data?.criativos, previousOffer.criativos || [], item => item?.sourceMediaKey || canonicalUrl(item?.link)),
    adsHistory: mergeUnique(duplicate.data?.adsHistory, previousOffer.adsHistory || [], item => String(item?.d || "")),
  };
}

const libraryUrl = "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&is_targeted_country=false&media_type=all&q=OPENEDMAT.COM&search_type=keyword_unordered&sort_data%5Bdirection%5D=desc&sort_data%5Bmode%5D=total_impressions";
// O checkout é mantido em sua forma canônica: parâmetros de rastreamento e IP não são necessários para abri-lo.
const checkoutUrl = "https://pay.pagamerican.app/pICWHjcp?aff=aYlURn2S";
const newDomains = storedVsls.map((item, index) => ({
  nome: item.displayName,
  linkDominio: item.video,
  linkCheckout: checkoutUrl,
  backRedirect: "",
  views: "",
  viewsPeriod: "",
  printPV: item.thumbnail,
  printCheckout: "",
  sourceMediaKey: item.key,
}));
const newOfferCreatives = storedVsls.map((item, index) => ({
  nome: item.displayName,
  link: item.video,
  print: item.thumbnail,
  transcricao: "",
  sourceMediaKey: item.key,
  mediaType: "video",
}));

const offerData = {
  ...previousOffer,
  kind: "oferta",
  tipoTrafego: "meta",
  nomeOferta: "Honey Peak Gelatin — Truque do Mel (Insider)",
  nomeMarca: "Honey Peak Gelatin",
  nicho: "Disfunção Erétil",
  formato: "VSL longa",
  numAdsAtivos: "16000",
  imagemProduto: previousOffer.imagemProduto || storedVsls[0]?.thumbnail || "",
  bibliotecas: mergeUnique(previousOffer.bibliotecas, [{ nome: "OpenedMat", link: libraryUrl, providedCount: 16000 }], item => canonicalUrl(item?.link)),
  dominios: mergeUnique(previousOffer.dominios, newDomains, item => item?.sourceMediaKey || canonicalUrl(item?.linkDominio || item?.linkCheckout)),
  criativos: mergeUnique(previousOffer.criativos, newOfferCreatives, item => item?.sourceMediaKey || canonicalUrl(item?.link)),
  adsHistory: mergeHistory(previousOffer.adsHistory, { d: today, n: 16000 }),
  adsUpdatedAt: now,
  adsLibraryCheckedAt: today.split("-").reverse().join("/"),
  adsLibraryApprox: false,
  analysisStatus: "pending",
  analysisAttempts: 0,
  analysisStartedAt: "",
  analysisCompletedAt: "",
  analysisLastError: "",
  analysisNextRetryAt: "",
  analysisVersion: previousOffer.analysisVersion || "1",
};
const savedOffer = await saveRow(honeyOffer, offerData);
for (const duplicate of honeyDuplicates) await removeRow(duplicate.id);

let nextEdNumber = Math.max(0, ...edNumbers) + 1;
const creativeResults = [];
for (const item of storedVsls) {
  const matches = creativeRows.filter(row => row.data?.sourceMediaKey === item.key);
  const existing = matches[0] || null;
  const previous = existing?.data || {};
  const transcriptReady = hasTranscript(previous);
  const sequenceName = existing?.data?.nome || `[ADS ED][${String(nextEdNumber++).padStart(2, "0")}]`;
  const data = {
    ...previous,
    kind: "criativo",
    nome: sequenceName,
    nomeOriginal: `Honey Peak Gelatin — ${item.displayName}`,
    nicho: "Disfunção Erétil",
    marca: "Honey Peak Gelatin",
    plataforma: "meta",
    linkAnuncio: previous.linkAnuncio || "",
    video: item.video,
    print: item.thumbnail,
    sourceMediaKey: item.key,
    sourceOfferId: savedOffer.id,
    sourceOfferName: "Honey Peak Gelatin — Truque do Mel (Insider)",
    transcriptionRequired: true,
    transcriptionStatus: transcriptReady ? "done" : "pending",
    transcricaoStatus: transcriptReady ? "done" : "pending",
    transcriptionAttempts: transcriptReady ? Number(previous.transcriptionAttempts || 0) : 0,
    transcriptionProvider: previous.transcriptionProvider || "faster-whisper",
    transcriptionVersion: previous.transcriptionVersion || "1",
    transcriptionNextRetryAt: "",
    transcriptionLastError: "",
  };
  const saved = await saveRow(existing, data);
  for (const duplicate of matches.slice(1)) await removeRow(duplicate.id);
  creativeResults.push({ id: saved.id, name: data.nome, original: data.nomeOriginal, action: existing ? "updated" : "inserted" });
}

console.log(JSON.stringify({
  ok: true,
  angelica: {
    total: angelicaResults.length,
    inserted: angelicaResults.filter(item => item.action === "inserted").length,
    updated: angelicaResults.filter(item => item.action === "updated").length,
    pendingSales: angelicaResults.filter(item => item.sales == null).map(item => item.name),
  },
  honeyPeak: {
    offerId: savedOffer.id,
    offerAction: honeyOffer ? "updated" : "inserted",
    duplicateOffersRemoved: honeyDuplicates.length,
    vsls: storedVsls.length,
    creativeCardsInserted: creativeResults.filter(item => item.action === "inserted").length,
    creativeCardsUpdated: creativeResults.filter(item => item.action === "updated").length,
  },
}, null, 2));
