import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { offers as july22 } from "./offer_batch_july22_catalog.mjs";
import { offers as july29 } from "./offer_batch_july29_catalog.mjs";

const ROOT = new URL("../", import.meta.url);
const html = await fs.readFile(new URL("index.html", ROOT), "utf8");
const SUPABASE_URL = html.match(/const DEFAULT_URL="([^"]+)"/)?.[1];
if (!SUPABASE_URL) throw new Error("URL do Supabase não encontrada");

function productionSecret(name) {
  return execFileSync("npx", ["netlify", "env:get", name, "--context", "production"], {
    cwd: new URL(".", ROOT),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || productionSecret("SUPABASE_SERVICE_ROLE_KEY");
if (!SERVICE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY não disponível");

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

const normalizeText = value => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

function canonicalUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    url.hash = "";
    const ignored = /^(utm_|fbclid$|subid|sid|rtk|twrclid|hcid|tid$|click_id$|ref_id$|tblci$)/i;
    for (const key of [...url.searchParams.keys()]) {
      if (ignored.test(key)) url.searchParams.delete(key);
    }
    return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/+$/, "")}${url.search}`;
  } catch {
    return String(value || "").trim().toLowerCase();
  }
}

const productCatalog = new Map();
for (const item of [...july22, ...july29]) {
  const slug = item.slug;
  if (!productCatalog.has(slug)) {
    productCatalog.set(slug, {
      slug,
      names: new Set(),
      items: [],
      domains: new Map(),
      libraries: new Map(),
      creatives: new Map(),
    });
  }
  const product = productCatalog.get(slug);
  product.items.push(item);
  for (const name of [item.name, item.brand, ...(item.aliases || [])]) {
    const key = normalizeText(name);
    if (key) product.names.add(key);
  }
  for (const domain of item.domains || []) {
    const key = canonicalUrl(domain.offer);
    if (key) product.domains.set(key, domain);
  }
  for (const library of item.libraries || []) {
    const key = canonicalUrl(library.link);
    if (key) product.libraries.set(key, library);
  }
  for (const creative of item.creatives || []) {
    const key = canonicalUrl(creative.link);
    if (key) product.creatives.set(key, creative);
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${text.slice(0, 240)}`);
  return text ? JSON.parse(text) : null;
}

async function requestAll(path, pageSize = 1000) {
  const result = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await request(path, {
      headers: {
        "Range-Unit": "items",
        Range: `${offset}-${offset + pageSize - 1}`,
      },
    });
    result.push(...page);
    if (page.length < pageSize) return result;
  }
}

const rows = await requestAll("offers?select=id,created_at,data&order=created_at.asc");
const offerRows = rows.filter(row => (row.data?.kind || "oferta") === "oferta");

function exactProductFor(row) {
  const names = [row.data?.nomeOferta, row.data?.nomeMarca].map(normalizeText).filter(Boolean);
  const matches = [...productCatalog.values()].filter(product => names.some(name => product.names.has(name)));
  return matches.length === 1 ? matches[0] : null;
}

function ownerMap(field) {
  const owners = new Map();
  for (const product of productCatalog.values()) {
    for (const key of product[field].keys()) {
      if (!owners.has(key)) owners.set(key, new Set());
      owners.get(key).add(product.slug);
    }
  }
  return owners;
}

const collectionConfig = {
  dominios: { linkField: "linkDominio", catalogField: "domains" },
  bibliotecas: { linkField: "link", catalogField: "libraries" },
  criativos: { linkField: "link", catalogField: "creatives" },
};
const owners = Object.fromEntries(
  Object.entries(collectionConfig).map(([field, config]) => [field, ownerMap(config.catalogField)]),
);

const findings = [];
for (const row of offerRows) {
  const product = exactProductFor(row);
  for (const [field, config] of Object.entries(collectionConfig)) {
    for (const entry of Array.isArray(row.data?.[field]) ? row.data[field] : []) {
      const link = entry?.[config.linkField];
      const key = canonicalUrl(link);
      const expectedOwners = owners[field].get(key);
      if (!key || !expectedOwners?.size || !product || expectedOwners.has(product.slug)) continue;
      findings.push({
        rowId: row.id,
        rowName: row.data?.nomeOferta || "",
        rowSlug: product.slug,
        field,
        linkField: config.linkField,
        link,
        label: entry.nome || entry.name || "",
        expectedOwners: [...expectedOwners],
      });
    }
  }
}

const dryRun = !process.argv.includes("--apply");
const dumpHistory = process.argv.includes("--dump-history");
const dumpAllHistory = process.argv.includes("--dump-all-history");
const listTables = process.argv.includes("--list-tables");
const applyHistoryRepair = process.argv.includes("--apply-history-repair");
const inspectHistoryRepair = process.argv.includes("--repair-history") || applyHistoryRepair;
if (listTables) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: { ...headers, Accept: "application/openapi+json" },
    signal: AbortSignal.timeout(30_000),
  });
  const schema = await response.json();
  const tables = Object.keys(schema?.paths || {})
    .map(path => path.replace(/^\//, ""))
    .filter(Boolean)
    .filter(name => /(offer|audit|histor|backup|version|event|log)/i.test(name))
    .sort();
  console.log(JSON.stringify({ tables }, null, 2));
  process.exit(0);
}
const missingTargets = [...new Set(
  findings
    .flatMap(finding => finding.expectedOwners)
    .filter(slug => !offerRows.some(row => exactProductFor(row)?.slug === slug)),
)];
console.log(JSON.stringify({
  dryRun,
  offersChecked: offerRows.length,
  catalogRows: offerRows
    .map(row => ({
      id: row.id,
      kind: row.data?.kind || "oferta",
      name: row.data?.nomeOferta || row.data?.nomeMarca || row.data?.nome || "",
      domains: row.data?.dominios?.length || 0,
    })),
  missingTargets,
  findings,
  ...(dumpHistory ? {
    historySnapshot: offerRows
      .filter(row => ["glyco-reset", "jellyfill", "glpro"].includes(exactProductFor(row)?.slug))
      .map(row => ({
        id: row.id,
        slug: exactProductFor(row)?.slug,
        name: row.data?.nomeOferta || "",
        numAdsAtivos: row.data?.numAdsAtivos ?? null,
        adsHistory: Array.isArray(row.data?.adsHistory) ? row.data.adsHistory : [],
        libraries: Array.isArray(row.data?.bibliotecas)
          ? row.data.bibliotecas.map(entry => ({ nome: entry?.nome || "", link: entry?.link || "" }))
          : [],
        createdAt: row.created_at,
        updatedAt: row.data?.adsUpdatedAt || row.data?.analysisCompletedAt || "",
      })),
  } : {}),
  ...(dumpAllHistory ? {
    allHistorySnapshot: offerRows.map(row => ({
      id: row.id,
      name: row.data?.nomeOferta || "",
      numAdsAtivos: row.data?.numAdsAtivos ?? null,
      adsHistory: Array.isArray(row.data?.adsHistory) ? row.data.adsHistory : [],
    })),
  } : {}),
}, null, 2));

const publicObject = path => `${SUPABASE_URL}/storage/v1/object/public/criativos/${path}`;
const uniqueCatalogEntries = (product, field, linkField) => {
  const seen = new Set();
  const entries = [];
  for (const item of product.items) {
    for (const entry of item[field] || []) {
      const key = canonicalUrl(entry[linkField]);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      entries.push(entry);
    }
  }
  return entries;
};

function restoredData(product) {
  const item = product.items.at(-1);
  const base = `offers/2026-07-22/${product.slug}`;
  const domains = uniqueCatalogEntries(product, "domains", "offer").map((entry, index) => ({
    nome: entry.name,
    linkDominio: entry.offer,
    linkCheckout: entry.checkout || "",
    backRedirect: "",
    views: "",
    viewsPeriod: "",
    printPV: index === 0 ? publicObject(`${base}/pv.jpg`) : "",
    printCheckout: index === 0 ? publicObject(`${base}/checkout.jpg`) : "",
  }));
  const libraries = uniqueCatalogEntries(product, "libraries", "link")
    .map(entry => ({ nome: entry.name, link: entry.link, providedCount: entry.providedCount }));
  const creatives = uniqueCatalogEntries(product, "creatives", "link")
    .map(entry => ({ nome: entry.name, link: entry.link, transcricao: "" }));
  return {
    kind: "oferta",
    tipoTrafego: "meta",
    nomeOferta: item.name,
    nomeMarca: item.brand,
    nicho: item.niche,
    formato: item.format,
    imagemProduto: publicObject(`${base}/product.jpg`),
    dominios: domains,
    bibliotecas: libraries,
    criativos: creatives,
    funil: item.funnel || "",
    advertorialLink: item.advertorial || "",
    trafego28d: item.traffic28d || "",
    numAdsAtivos: String(item.ads || 0),
    analysisStatus: libraries.length ? "pending" : "",
    analysisAttempts: 0,
    analysisStartedAt: "",
    analysisCompletedAt: "",
    analysisLastError: "",
    analysisNextRetryAt: "",
    analysisVersion: "1",
    adsHistory: [],
  };
}

function splitHistorySeries(history) {
  const series = [];
  for (const point of Array.isArray(history) ? history : []) {
    const date = String(point?.d || "");
    const value = Number(point?.n);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(value) || value < 0) continue;
    const current = series.at(-1);
    const scaleRestart = current
      && Math.max(...current.map(entry => entry.n)) <= 1_000
      && value >= 90_000;
    if (!current || date <= current.at(-1).d || scaleRestart) series.push([]);
    series.at(-1).push({ d: date, n: Math.round(value) });
  }
  return series.filter(Boolean);
}

function normalizedHistory(history) {
  const byDate = new Map();
  for (const point of Array.isArray(history) ? history : []) {
    const date = String(point?.d || "");
    const value = Number(point?.n);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(value) || value < 0) continue;
    byDate.set(date, { d: date, n: Math.round(value) });
  }
  return [...byDate.values()].sort((a, b) => a.d.localeCompare(b.d));
}

function historyStats(series) {
  const values = series.map(point => point.n);
  return {
    from: series[0]?.d || "",
    to: series.at(-1)?.d || "",
    points: series.length,
    min: values.length ? Math.min(...values) : 0,
    max: values.length ? Math.max(...values) : 0,
  };
}

async function repairMixedOfferHistory(apply) {
  const glyco = offerRows.find(row => exactProductFor(row)?.slug === "glyco-reset");
  const jelly = offerRows.find(row => exactProductFor(row)?.slug === "jellyfill");
  if (!glyco || !jelly) throw new Error("Cards Glyco Reset e JellyFill são obrigatórios para restaurar o histórico");

  const sourceHistory = Array.isArray(glyco.data?.adsHistory) ? glyco.data.adsHistory : [];
  const series = splitHistorySeries(sourceHistory);
  const jellySeries = series.filter(points => historyStats(points).max >= 90_000);
  const archivedSeries = series
    .filter(points => historyStats(points).max < 90_000)
    .map(points => {
      const stats = historyStats(points);
      const owner = stats.max >= 10_000
        ? "[GELATIN TRICK] [MELT DROPS]"
        : stats.max <= 1_000
          ? "[MEMOPENZIL]"
          : "origem a confirmar";
      return { owner, points, ...stats };
    });
  const recovered = normalizedHistory(jellySeries.flat());
  const alreadyApplied = series.length <= 1 && normalizedHistory(jelly.data?.adsHistory).length >= 20;
  const plan = {
    alreadyApplied,
    source: { id: glyco.id, name: glyco.data?.nomeOferta || "", series: series.map(historyStats) },
    target: { id: jelly.id, name: jelly.data?.nomeOferta || "" },
    jellyHistory: historyStats(recovered),
    archivedSeries: archivedSeries.map(({ points, ...entry }) => entry),
  };
  if (!apply || alreadyApplied) return plan;
  if (series.length !== 4 || jellySeries.length !== 2 || recovered.length !== 24) {
    throw new Error(`Pré-condição recusada: esperado 4 séries, 2 do Jelly e 24 pontos; recebido ${series.length}/${jellySeries.length}/${recovered.length}`);
  }
  if (recovered[0]?.d !== "2026-07-06" || recovered.at(-1)?.d !== "2026-07-30") {
    throw new Error("Pré-condição recusada: intervalo histórico do JellyFill não confere");
  }

  const repairedAt = new Date().toISOString();
  const recovery = {
    repairedAt,
    reason: "históricos de cards distintos foram concatenados durante uma consolidação incorreta",
    evidence: "GitHub Actions ads-ativos: JellyFill/Horse Boost/Horse Wood, Gelatin Trick/Melt Drops e Memopenzil",
    sourceRowId: glyco.id,
    archivedSeries,
  };
  const jellyData = {
    ...jelly.data,
    numAdsAtivos: String(recovered.at(-1).n),
    adsHistory: recovered,
    adsUpdatedAt: glyco.data?.adsUpdatedAt || jelly.data?.adsUpdatedAt || repairedAt,
    analysisZeroReads: 0,
    adsHistoryRecovery: recovery,
  };
  const latestGlycoCount = [...(productCatalog.get("glyco-reset")?.items || [])]
    .reverse()
    .find(item => item.ads != null)?.ads;
  const glycoData = {
    ...glyco.data,
    numAdsAtivos: String(latestGlycoCount ?? ""),
    adsHistory: [],
    adsUpdatedAt: "",
    analysisStatus: "pending",
    analysisAttempts: 0,
    analysisStartedAt: "",
    analysisCompletedAt: "",
    analysisLastError: "",
    analysisNextRetryAt: "",
    analysisZeroReads: 0,
    adsHistoryRecovery: recovery,
  };

  const backupPath = `/tmp/offer-history-before-repair-${Date.now()}.json`;
  await fs.writeFile(backupPath, JSON.stringify({
    createdAt: repairedAt,
    rows: [
      { id: glyco.id, data: glyco.data },
      { id: jelly.id, data: jelly.data },
    ],
  }, null, 2));

  for (const row of [{ id: glyco.id, data: glycoData }, { id: jelly.id, data: jellyData }]) {
    await request(`offers?id=eq.${encodeURIComponent(row.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ data: row.data }),
    });
  }
  return { ...plan, applied: true, backupPath };
}

if (inspectHistoryRepair) {
  console.log(JSON.stringify({
    ok: true,
    dryRun: !applyHistoryRepair,
    historyRepair: await repairMixedOfferHistory(applyHistoryRepair),
  }, null, 2));
  process.exit(0);
}

if (dryRun || findings.length === 0) process.exit(0);

for (const slug of missingTargets) {
  const product = productCatalog.get(slug);
  if (!product) throw new Error(`Produto de destino desconhecido: ${slug}`);
  const inserted = await request("offers", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ data: restoredData(product) }),
  });
  if (!inserted?.[0]) throw new Error(`Não foi possível restaurar o card ${slug}`);
  offerRows.push(inserted[0]);
}

const changedRows = new Map();
for (const finding of findings) {
  const source = offerRows.find(row => row.id === finding.rowId);
  const sourceEntries = Array.isArray(source.data?.[finding.field]) ? source.data[finding.field] : [];
  const movedEntry = sourceEntries.find(entry => canonicalUrl(entry[finding.linkField]) === canonicalUrl(finding.link));
  if (!movedEntry) continue;

  source.data = {
    ...source.data,
    [finding.field]: sourceEntries.filter(
      entry => canonicalUrl(entry[finding.linkField]) !== canonicalUrl(finding.link),
    ),
  };
  changedRows.set(source.id, source);

  const ownerSlug = finding.expectedOwners[0];
  const target = offerRows.find(row => exactProductFor(row)?.slug === ownerSlug);
  if (!target) throw new Error(`Card de destino não encontrado para ${ownerSlug}`);
  const targetEntries = Array.isArray(target.data?.[finding.field]) ? target.data[finding.field] : [];
  if (!targetEntries.some(entry => canonicalUrl(entry[finding.linkField]) === canonicalUrl(finding.link))) {
    target.data = { ...target.data, [finding.field]: [...targetEntries, movedEntry] };
    changedRows.set(target.id, target);
  }
}

for (const row of changedRows.values()) {
  await request(`offers?id=eq.${encodeURIComponent(row.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ data: row.data }),
  });
}

console.log(JSON.stringify({
  ok: true,
  repairedLinks: findings.length,
  updatedCards: [...changedRows.values()].map(row => ({
    id: row.id,
    name: row.data?.nomeOferta || "",
    domains: row.data?.dominios?.length || 0,
  })),
}, null, 2));
