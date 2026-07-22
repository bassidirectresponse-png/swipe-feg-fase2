import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { offers as catalog } from "./offer_batch_july22_catalog.mjs";

const ROOT = new URL("../", import.meta.url);
const html = await fs.readFile(new URL("index.html", ROOT), "utf8");
const SUPABASE_URL = html.match(/const DEFAULT_URL="([^"]+)"/)?.[1];
const ANON = html.match(/const DEFAULT_KEY="([^"]+)"/)?.[1];
if (!SUPABASE_URL || !ANON) throw new Error("Configuração do Supabase não encontrada em index.html");

function netlifySecret(name) {
  try {
    return execFileSync("npx", ["netlify", "env:get", name, "--context", "production"], {
      encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return "";
  }
}

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || (process.env.CI ? "" : netlifySecret("SUPABASE_SERVICE_ROLE_KEY"));
let API_KEY = SERVICE_KEY || ANON;
let AUTH_TOKEN = SERVICE_KEY || "";
if (!AUTH_TOKEN && process.env.SUPABASE_BOT_EMAIL && process.env.SUPABASE_BOT_PASSWORD) {
  const login = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: process.env.SUPABASE_BOT_EMAIL, password: process.env.SUPABASE_BOT_PASSWORD }),
  });
  if (!login.ok) throw new Error(`Login do bot falhou: HTTP ${login.status}`);
  AUTH_TOKEN = (await login.json()).access_token;
  API_KEY = ANON;
}
if (!AUTH_TOKEN) throw new Error("Credencial de gravação não disponível (service role ou bot do Supabase)");

const headers = { apikey: API_KEY, Authorization: `Bearer ${AUTH_TOKEN}`, "Content-Type": "application/json" };
const selectUrl = new URL(`${SUPABASE_URL}/rest/v1/offers`);
selectUrl.searchParams.set("select", "id,created_at,data");
const existingRows = await fetch(selectUrl, { headers }).then(async response => {
  if (!response.ok) throw new Error(`Leitura do Supabase falhou: ${response.status} ${(await response.text()).slice(0, 220)}`);
  return response.json();
});

const textKey = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const cleanUrl = value => {
  try {
    const url = new URL(String(value || "").trim());
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|subid|subid2|subid3|subid5|sid|sid2|rtk|twrclid|hcid|tid$)/i.test(key)) url.searchParams.delete(key);
    }
    return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/+$/, "")}${url.search}`;
  } catch {
    return String(value || "").trim().toLowerCase();
  }
};
const sectionOf = row => row?.data?.kind || "oferta";
const namesOf = row => [row?.data?.nomeOferta, row?.data?.nomeMarca].map(textKey).filter(Boolean);
const domainKeysOf = row => (row?.data?.dominios || []).flatMap(item => [item.linkDominio, item.linkCheckout]).map(cleanUrl).filter(Boolean);

function matches(item, row) {
  const rowSection = sectionOf(row);
  if (item.section === "brandsgeneral" ? rowSection !== "brandsgeneral" : rowSection !== "oferta") return false;
  const wantedNames = [item.name, item.brand, ...(item.aliases || [])].map(textKey);
  if (namesOf(row).some(name => wantedNames.includes(name))) return true;
  const wantedDomains = item.domains.flatMap(entry => [entry.offer, entry.checkout]).map(cleanUrl).filter(Boolean);
  return domainKeysOf(row).some(key => wantedDomains.includes(key));
}

const uniqueBy = (current, added, field) => {
  const out = [], seen = new Set();
  for (const item of [...(Array.isArray(current) ? current : []), ...added]) {
    const key = cleanUrl(item?.[field] || "") || textKey(item?.nome || item?.name || "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
};

const manifest = JSON.parse(await fs.readFile(new URL("assets/offers-july22/manifest.json", ROOT), "utf8"));
const publicObject = path => `${SUPABASE_URL}/storage/v1/object/public/criativos/${path}`;

async function uploadFile(source, objectPath) {
  const body = await fs.readFile(new URL(`.${source}`, ROOT));
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/criativos/${objectPath}`, {
    method: "POST",
    headers: { apikey: API_KEY, Authorization: `Bearer ${AUTH_TOKEN}`, "Content-Type": "image/jpeg", "x-upsert": "true" },
    body,
  });
  if (!response.ok) throw new Error(`Upload ${objectPath}: ${response.status} ${(await response.text()).slice(0, 180)}`);
  return publicObject(objectPath);
}

async function mediaFor(item) {
  const found = manifest[item.slug];
  if (!found?.pv || !found?.checkout || !found?.product) throw new Error(`${item.name}: faltam imagens obrigatórias no manifest`);
  const base = `offers/2026-07-22/${item.slug}`;
  const [pv, checkout, product] = await Promise.all([
    uploadFile(found.pv, `${base}/pv.jpg`),
    uploadFile(found.checkout, `${base}/checkout.jpg`),
    uploadFile(found.product, `${base}/product.jpg`),
  ]);
  return { pv, checkout, product };
}

function buildData(item, previous, media) {
  const freshDomains = item.domains.map((entry, index) => ({
    nome: entry.name,
    linkDominio: entry.offer,
    linkCheckout: entry.checkout || (index === 0 ? manifest[item.slug]?.discoveredCheckout || "" : ""),
    backRedirect: "", views: "", viewsPeriod: "",
    printPV: index === 0 ? media.pv : "",
    printCheckout: index === 0 ? media.checkout : "",
  }));
  const freshLibraries = item.libraries.map(entry => ({ nome: entry.name, link: entry.link, providedCount: entry.providedCount }));
  const freshCreatives = (item.creatives || []).map(entry => ({ nome: entry.name, link: entry.link, transcricao: "" }));
  const merged = {
    ...(previous || {}),
    kind: item.section,
    tipoTrafego: "meta",
    nomeOferta: item.name,
    nomeMarca: item.brand,
    nicho: item.niche,
    formato: item.format,
    imagemProduto: media.product,
    dominios: uniqueBy(previous?.dominios, freshDomains, "linkDominio"),
    bibliotecas: uniqueBy(previous?.bibliotecas, freshLibraries, "link"),
    criativos: uniqueBy(previous?.criativos, freshCreatives, "link"),
    funil: item.funnel || previous?.funil || "",
    advertorialLink: item.advertorial || previous?.advertorialLink || "",
    trafego28d: item.traffic28d || previous?.trafego28d || "",
    adsLibraryCheckedAt: "22/07/2026",
    adsLibraryApprox: false,
  };
  if (item.ads != null) merged.numAdsAtivos = String(item.ads);
  return merged;
}

const plans = catalog.map(item => {
  const matchesFound = existingRows.filter(row => matches(item, row));
  return { item, matches: matchesFound, keep: matchesFound[0] || null, duplicates: matchesFound.slice(1) };
});

if (process.argv.includes("--audit")) {
  console.log(JSON.stringify(plans.map(plan => ({
    name: plan.item.name,
    section: plan.item.section,
    action: plan.keep ? "update" : "insert",
    existingName: plan.keep?.data?.nomeOferta || "",
    duplicates: plan.duplicates.map(row => ({ id: row.id, name: row.data?.nomeOferta || "" })),
    domainsToAdd: plan.item.domains.length,
    librariesToAdd: plan.item.libraries.length,
    creativesToAdd: (plan.item.creatives || []).length,
  })), null, 2));
  process.exit(0);
}

const results = [];
for (const plan of plans) {
  const { item, keep, duplicates } = plan;
  const media = await mediaFor(item);
  let previous = keep?.data || {};
  for (const duplicate of duplicates) {
    previous = {
      ...duplicate.data,
      ...previous,
      dominios: uniqueBy(duplicate.data?.dominios, previous.dominios || [], "linkDominio"),
      bibliotecas: uniqueBy(duplicate.data?.bibliotecas, previous.bibliotecas || [], "link"),
      criativos: uniqueBy(duplicate.data?.criativos, previous.criativos || [], "link"),
    };
  }
  const data = buildData(item, previous, media);
  const endpoint = keep ? `${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(keep.id)}` : `${SUPABASE_URL}/rest/v1/offers`;
  const response = await fetch(endpoint, {
    method: keep ? "PATCH" : "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({ data }),
  });
  if (!response.ok) throw new Error(`${item.name}: Supabase ${response.status} ${(await response.text()).slice(0, 260)}`);
  const saved = await response.json();
  for (const duplicate of duplicates) {
    const deleted = await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(duplicate.id)}`, { method: "DELETE", headers });
    if (!deleted.ok) throw new Error(`${item.name}: não foi possível remover duplicado ${duplicate.id}`);
  }
  results.push({ name: item.name, action: keep ? "updated" : "inserted", id: saved[0]?.id || keep?.id, duplicatesRemoved: duplicates.length, domains: data.dominios.length, libraries: data.bibliotecas.length, creatives: data.criativos.length });
  console.log(JSON.stringify(results.at(-1)));
}

console.log(JSON.stringify({ ok: true, total: results.length, inserted: results.filter(x => x.action === "inserted").length, updated: results.filter(x => x.action === "updated").length, duplicatesRemoved: results.reduce((sum, x) => sum + x.duplicatesRemoved, 0) }));

