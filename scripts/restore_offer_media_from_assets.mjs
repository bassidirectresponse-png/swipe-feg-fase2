import fs from "node:fs/promises";
import path from "node:path";
import { productionAdminAuth, authHeaders } from "./_supabase-auth.mjs";

const ROOT = path.resolve(new URL("../", import.meta.url).pathname);
const APPLY = process.argv.includes("--apply");
const auth = await productionAdminAuth();
const SUPABASE_URL = auth.url;
const headers = authHeaders(auth, { "Content-Type": "application/json" });
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const isMissing = value => !String(value || "").trim() || ["·", "-", "—", "null", "undefined"].includes(String(value || "").trim().toLowerCase());

function canonical(value) {
  try {
    const url = new URL(String(value || ""));
    const base = `${url.hostname.toLowerCase().replace(/^www\./, "")}${url.pathname.replace(/\/+$/, "")}`;
    if (url.hostname.replace(/^www\./, "").toLowerCase() === "buygoods.com") {
      const account = url.searchParams.get("account_id") || "";
      const product = url.searchParams.get("product_codename") || "";
      return account && product ? `${base}?account_id=${account.toLowerCase()}&product_codename=${product.toLowerCase()}` : "";
    }
    return base;
  } catch { return String(value || "").trim().toLowerCase(); }
}

async function loadManifest(relativePath) {
  return JSON.parse(await fs.readFile(path.join(ROOT, relativePath), "utf8"));
}

const july22 = await loadManifest("assets/offers-july22/manifest.json");
const july29 = await loadManifest("assets/offers-july29/manifest.json");
const sources = new Map();
for (const [slug, item] of Object.entries(july22)) sources.set(slug, item);
for (const [slug, item] of Object.entries(july29)) sources.set(slug, item);

const aliases = new Map([
  ["alka slim", "alka-slim"], ["blood pril", "blood-pril"], ["brain mary", "brain-mary"],
  ["cogni honey", "cogni-honey"], ["glyco reset", "glyco-reset"], ["glpro", "glpro"],
  ["honeyfil male", "honeyfil-male"], ["iq honey", "iq-honey"], ["jellyfill", "jellyfill"],
  ["jelly fill", "jellyfill"], ["jubilance pms", "jubilance-pms"], ["memopryl", "memopryl"],
  ["mounjamelt", "mounjamelt"], ["neuro apex", "neuro-apex"], ["neuro naturals migraine md", "neuro-naturals"],
  ["optivell", "optivell"], ["power up", "power-up"], ["protaflo", "protaflo"], ["score blue", "score-blue"],
  ["soda slim", "soda-slim"], ["steel power", "steel-power"], ["steel power horse fil", "steel-power-horse-fil"],
  ["synaptigen", "synaptigen"], ["vital bp", "vital-bp"], ["zensulin", "zensulin"],
]);

const brandCovers = new Map([
  ["ancestral supplements", "/assets/ancestral-supplements/product.png"],
  ["mars men", "/assets/mars-men/product.png"],
  ["primal viking", "/assets/primal-viking/product.jpg"],
  ["ultima peak", "/assets/ultima-peak/product.png"],
]);

async function request(endpoint, options = {}) {
  const response = await fetch(`${SUPABASE_URL}${endpoint}`, { ...options, headers: { ...headers, ...(options.headers || {}) }, signal: AbortSignal.timeout(30_000) });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase HTTP ${response.status}: ${text.slice(0, 240)}`);
  return text ? JSON.parse(text) : null;
}

const rows = [];
for (let offset = 0; ; offset += 500) {
  const page = await request(`/rest/v1/offers?select=id,created_at,data&order=created_at.asc&offset=${offset}&limit=500`);
  rows.push(...page);
  if (page.length < 500) break;
}

function localAsset(value) {
  const relative = String(value || "").replace(/^\//, "");
  return relative && path.join(ROOT, relative);
}

const changes = [];
for (const row of rows) {
  const data = structuredClone(row.data || {});
  const name = data.nomeOferta || data.nomeMarca || data.nome || data.titulo || "";
  const key = normalize(name);
  let changed = false;
  const fields = [];

  const brandCover = brandCovers.get(key);
  if (brandCover && isMissing(data.imagemProduto)) {
    await fs.access(localAsset(brandCover));
    data.imagemProduto = brandCover;
    changed = true;
    fields.push("imagemProduto");
  }

  const slug = aliases.get(key);
  const source = slug ? sources.get(slug) : null;
  if (source) {
    for (const field of ["product", "pv", "checkout"]) await fs.access(localAsset(source[field]));
    if (isMissing(data.imagemProduto)) {
      data.imagemProduto = source.product;
      changed = true;
      fields.push("imagemProduto");
    }
    const targetPV = canonical(source.pvFinalUrl);
    const targetCheckout = canonical(source.checkoutFinalUrl);
    data.dominios = (Array.isArray(data.dominios) ? data.dominios : []).map((domain, index) => {
      const next = { ...domain };
      if (targetPV && canonical(domain?.linkDominio) === targetPV && isMissing(next.printPV)) {
        next.printPV = source.pv;
        changed = true;
        fields.push(`dominios[${index}].printPV`);
      }
      if (targetCheckout && canonical(domain?.linkCheckout) === targetCheckout && isMissing(next.printCheckout)) {
        next.printCheckout = source.checkout;
        changed = true;
        fields.push(`dominios[${index}].printCheckout`);
      }
      return next;
    });
  }

  if (changed) changes.push({ id: row.id, name, kind: data.kind || "oferta", fields, before: row.data, after: data });
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
await fs.mkdir(path.join(ROOT, ".tmp"), { recursive: true });
const backupPath = path.join(ROOT, ".tmp", `offer-media-restore-backup-${stamp}.json`);
await fs.writeFile(backupPath, JSON.stringify({ createdAt: new Date().toISOString(), apply: APPLY, rows: changes.map(({ id, name, kind, before }) => ({ id, name, kind, data: before })) }, null, 2));

if (APPLY) {
  for (const change of changes) {
    await request(`/rest/v1/offers?id=eq.${encodeURIComponent(change.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ data: change.after }),
    });
  }
}

console.log(JSON.stringify({ apply: APPLY, rowsChecked: rows.length, cardsChanged: changes.length, fieldsRestored: changes.reduce((sum, item) => sum + item.fields.length, 0), backupPath, changes: changes.map(({ id, name, kind, fields }) => ({ id, name, kind, fields })) }, null, 2));
