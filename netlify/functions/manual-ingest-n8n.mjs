import { createHash, timingSafeEqual } from "node:crypto";
import {
  authenticate,
  isAdmin,
  json,
  preflight,
  rateLimit,
  readJson,
  SUPABASE_URL,
  trustedOrigin,
} from "./_security.mjs";
import { supabaseAdminHeaders } from "./_supabase-admin.mjs";

const METHODS = "POST, OPTIONS";
const ALLOWED_KINDS = new Set(["oferta", "brandsgeneral", "brandsvalidated", "presell", "criativo"]);
const OFFER_KINDS = new Set(["oferta", "brandsgeneral", "brandsvalidated"]);
const WEBHOOK_SECRET = String(process.env.N8N_MANUAL_INGEST_SECRET || "").trim();

const clean = (value, limit = 240) => String(value || "").trim().slice(0, limit);
const textKey = value => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const hash = value => createHash("sha256").update(String(value)).digest("hex").slice(0, 24);

function secureEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

function bearer(req) {
  return String(req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
}

function canonicalUrl(value) {
  try {
    const url = new URL(clean(value, 1800));
    if (!/^https?:$/.test(url.protocol)) return "";
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|twrclid$|rtkcid$|rtkcmpid$|rtkupdclickid$)/i.test(key)) url.searchParams.delete(key);
    }
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    url.pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
    return url.toString();
  } catch { return ""; }
}

function list(value) { return Array.isArray(value) ? value : []; }
function linkObject(value, label, index) {
  if (typeof value === "string") return { name: `${label} ${index + 1}`, url: clean(value, 1800) };
  return { name: clean(value?.name || value?.nome || `${label} ${index + 1}`, 120), url: clean(value?.url || value?.link, 1800) };
}

function normalizeItem(raw, index) {
  const kind = clean(raw?.kind || raw?.type || "oferta", 32).toLowerCase();
  const name = clean(raw?.name || raw?.nome || raw?.nomeOferta, 180);
  const errors = [];
  if (!ALLOWED_KINDS.has(kind)) errors.push(`item ${index + 1}: tipo não permitido`);
  if (!name) errors.push(`item ${index + 1}: nome obrigatório`);
  const niche = clean(raw?.niche || raw?.nicho, 90);
  const sourceLibraries = list(raw?.libraries || raw?.bibliotecas);
  const libraries = sourceLibraries.map((entry, i) => linkObject(entry, "Biblioteca", i)).filter(entry => canonicalUrl(entry.url));
  if (libraries.length !== sourceLibraries.length) errors.push(`item ${index + 1}: há biblioteca com URL inválida`);
  const sourceAds = list(raw?.ads || raw?.criativos);
  const ads = sourceAds.map((entry, i) => ({
    ...linkObject(entry, "Anúncio", i),
    creativeName: clean(entry?.creativeName || entry?.cardName || entry?.nomeCard, 120),
    platform: clean(entry?.platform || raw?.platform || raw?.plataforma || "meta", 32).toLowerCase(),
  })).filter(entry => canonicalUrl(entry.url));
  if (ads.length !== sourceAds.length) errors.push(`item ${index + 1}: há anúncio com URL inválida`);
  if (OFFER_KINDS.has(kind) && ads.some(entry => !entry.creativeName)) errors.push(`item ${index + 1}: todo anúncio precisa de creativeName`);
  const sourceDomains = list(raw?.domains || raw?.salesPages || raw?.dominios);
  const domains = sourceDomains.map((entry, i) => ({
    name: clean(entry?.name || entry?.nome || `VSL ${i + 1}`, 120),
    offer: clean(entry?.offer || entry?.url || entry?.linkDominio, 1800),
    checkout: clean(entry?.checkout || entry?.checkoutUrl || entry?.linkCheckout, 1800),
    pageImage: clean(entry?.pageImage || entry?.printPV, 1800),
    checkoutImage: clean(entry?.checkoutImage || entry?.printCheckout, 1800),
  })).filter(entry => canonicalUrl(entry.offer) || canonicalUrl(entry.checkout));
  if (
    domains.length !== sourceDomains.length ||
    domains.some(entry => (entry.offer && !canonicalUrl(entry.offer)) || (entry.checkout && !canonicalUrl(entry.checkout)))
  ) errors.push(`item ${index + 1}: há VSL ou checkout com URL inválida`);
  if (OFFER_KINDS.has(kind) && !domains.length && !libraries.length && !ads.length) errors.push(`item ${index + 1}: informe ao menos uma VSL, biblioteca ou anúncio`);
  if (kind === "presell" && !domains.length) errors.push(`item ${index + 1}: link da presell obrigatório`);
  const adUrl = clean(raw?.adUrl || raw?.linkAnuncio || ads[0]?.url, 1800);
  if (kind === "criativo" && !canonicalUrl(adUrl)) errors.push(`item ${index + 1}: link do anúncio obrigatório`);
  if ((raw?.activeAds ?? raw?.numAdsAtivos) != null && !Number.isFinite(Number(raw?.activeAds ?? raw?.numAdsAtivos))) errors.push(`item ${index + 1}: activeAds precisa ser numérico`);
  return {
    kind, name, niche, brand: clean(raw?.brand || raw?.marca || raw?.nomeMarca, 140),
    activeAds: Number.isFinite(Number(raw?.activeAds ?? raw?.numAdsAtivos)) ? Math.max(0, Math.round(Number(raw.activeAds ?? raw.numAdsAtivos))) : null,
    format: clean(raw?.format || raw?.formato, 80), image: clean(raw?.image || raw?.imagemProduto, 1800),
    platform: clean(raw?.platform || raw?.plataforma || "meta", 32).toLowerCase(),
    domains, libraries, ads,
    adUrl,
    video: clean(raw?.video, 1800), copy: clean(raw?.copy || raw?.transcricao, 120000), copyLink: clean(raw?.copyLink, 1800),
    errors,
  };
}

function sectionOf(row) { return clean(row?.data?.kind || "oferta", 32); }
function identity(item) { return `${item.kind}:${textKey(item.name)}`; }
function uniqueLinks(current, added, field) {
  const seen = new Set();
  return [...list(current), ...list(added)].filter(entry => {
    const key = canonicalUrl(entry?.[field]);
    if (!key || seen.has(key)) return false;
    seen.add(key); return true;
  });
}

function mergeDomains(current, added) {
  const merged = new Map();
  for (const entry of [...list(current), ...list(added)]) {
    const key = canonicalUrl(entry?.linkDominio) || canonicalUrl(entry?.linkCheckout);
    if (!key) continue;
    const previous = merged.get(key) || {};
    const next = { ...previous };
    for (const [field, value] of Object.entries(entry || {})) {
      if (value !== "" && value != null) next[field] = value;
    }
    merged.set(key, next);
  }
  return [...merged.values()];
}

async function rest(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: { ...(await supabaseAdminHeaders()), ...(options.headers || {}) },
    signal: AbortSignal.timeout(25_000),
  });
  const raw = await response.text();
  let payload = null;
  if (raw) {
    try { payload = JSON.parse(raw); }
    catch { payload = raw; }
  }
  if (!response.ok) throw new Error(`Supabase HTTP ${response.status}: ${clean(payload?.message || payload?.error || raw, 220)}`);
  return payload;
}

async function listRows() {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await rest(`offers?select=id,created_at,data&limit=1000&offset=${offset}`);
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

function offerData(item, previous, batchDate) {
  const incomingDomains = item.domains.map(entry => ({ nome: entry.name, linkDominio: entry.offer, linkCheckout: entry.checkout, printPV: entry.pageImage, printCheckout: entry.checkoutImage, backRedirect: "", views: "", viewsPeriod: "" }));
  const incomingLibraries = item.libraries.map(entry => ({ nome: entry.name, link: entry.url }));
  const incomingAds = item.ads.map(entry => ({ nome: entry.name, link: entry.url, transcricao: "" }));
  return {
    ...(previous || {}), kind: item.kind, nomeOferta: item.name, nomeMarca: item.brand || previous?.nomeMarca || "", nicho: item.niche || previous?.nicho || "",
    formato: item.format || previous?.formato || "", imagemProduto: item.image || previous?.imagemProduto || "",
    numAdsAtivos: item.activeAds == null ? previous?.numAdsAtivos || "" : String(item.activeAds),
    dominios: mergeDomains(previous?.dominios, incomingDomains),
    bibliotecas: uniqueLinks(previous?.bibliotecas, incomingLibraries, "link"),
    criativos: uniqueLinks(previous?.criativos, incomingAds, "link"),
    ingestionSource: "n8n-manual", ingestionDate: batchDate,
    analysisStatus: item.libraries.length ? "pending" : previous?.analysisStatus || "",
    analysisAttempts: item.libraries.length ? 0 : previous?.analysisAttempts || 0,
  };
}

function standaloneData(item, batchDate, ad) {
  const isCreative = item.kind === "criativo";
  const url = ad?.url || item.adUrl;
  return isCreative ? {
    kind: "criativo", nome: item.name, nicho: item.niche, plataforma: item.platform, linkAnuncio: url,
    video: item.video, copy: item.copy, transcricao: item.copy, copyLink: item.copyLink,
    transcriptionStatus: item.copy ? "completed" : "pending", transcricaoStatus: item.copy ? "completed" : "pending",
    mediaArchiveStatus: item.video ? "completed" : "pending", fbIngestStatus: item.video ? "completed" : "pending",
    ingestionSource: "n8n-manual", ingestionDate: batchDate,
  } : {
    kind: item.kind, nome: item.name, nicho: item.niche, link: item.domains[0]?.offer || item.adUrl || "",
    imagem: item.image, ingestionSource: "n8n-manual", ingestionDate: batchDate,
  };
}

async function createRow(data) {
  const result = await rest("offers?select=*", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ data }) });
  return result[0];
}
async function patchRow(id, data) {
  const result = await rest(`offers?id=eq.${encodeURIComponent(id)}&select=*`, { method: "PATCH", headers: { "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ data }) });
  return result[0];
}
async function logUpdated(row, batchDate, additions) {
  const eventKey = `manual:${batchDate}:${row.id}:${hash(JSON.stringify(additions))}`;
  await rest("swipe_updates?on_conflict=event_key", { method: "POST", headers: { "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify({
    event_key: eventKey, entity_id: row.id, entity_kind: sectionOf(row), entity_name: row.data?.nomeOferta || row.data?.nome || "Material atualizado",
    niche: row.data?.nicho || "", action: "updated", summary: "Novos materiais adicionados ao card", metadata: { additions, source: "n8n-manual" },
  }) }).catch(error => { if (!/404|42P01/.test(String(error))) throw error; });
}

export default async req => {
  const pre = preflight(req, METHODS); if (pre) return pre;
  if (req.method !== "POST") return json(req, 405, { ok: false, error: "método não permitido" }, METHODS);
  const webhook = WEBHOOK_SECRET && secureEqual(bearer(req), WEBHOOK_SECRET);
  let user = null;
  if (!webhook) {
    if (!trustedOrigin(req)) return json(req, 403, { ok: false, error: "origem não autorizada" }, METHODS);
    user = await authenticate(req);
    if (!isAdmin(user)) return json(req, 403, { ok: false, error: "somente o administrador pode importar materiais" }, METHODS);
    const quota = await rateLimit("manual-ingest", user.id, { limit: 20, windowMs: 60 * 60_000 });
    if (!quota.allowed) return json(req, 429, { ok: false, error: "limite temporário atingido" }, METHODS);
  }
  try {
    const body = await readJson(req, { maxBytes: 512 * 1024 });
    const mode = body.mode === "apply" ? "apply" : "validate";
    const batchDate = /^\d{4}-\d{2}-\d{2}$/.test(body.batchDate) ? body.batchDate : new Date().toISOString().slice(0, 10);
    const incomingItems = list(body.items);
    if (incomingItems.length > 100) return json(req, 400, { ok: false, mode, errors: ["o lote excede o limite de 100 itens"] }, METHODS);
    const items = incomingItems.map(normalizeItem);
    const errors = items.flatMap(item => item.errors);
    if (!items.length) errors.push("envie ao menos um material");
    const batchIdentities = new Set();
    for (const item of items) {
      const key = identity(item);
      if (batchIdentities.has(key)) errors.push(`material repetido no mesmo lote: ${item.name}`);
      batchIdentities.add(key);
    }
    if (errors.length) return json(req, 400, { ok: false, mode, errors }, METHODS);

    const rows = await listRows();
    const byIdentity = new Map(rows.map(row => [`${sectionOf(row)}:${textKey(row.data?.nomeOferta || row.data?.nome)}`, row]));
    const adUrls = new Set(rows.filter(row => sectionOf(row) === "criativo").map(row => canonicalUrl(row.data?.linkAnuncio)).filter(Boolean));
    const plannedAdUrls = new Set(adUrls);
    const plan = [];
    for (const item of items) {
      const existing = byIdentity.get(identity(item));
      const freshAds = item.ads.filter(ad => {
        const key = canonicalUrl(ad.url);
        if (!key || plannedAdUrls.has(key)) return false;
        plannedAdUrls.add(key);
        return true;
      });
      plan.push({ kind: item.kind, name: item.name, action: existing ? "update" : "create", newAds: freshAds.length, duplicatesSkipped: item.ads.length - freshAds.length });
    }
    if (mode === "validate") return json(req, 200, { ok: true, mode, batchDate, plan, totals: { items: items.length, newCards: plan.filter(x => x.action === "create").length, updates: plan.filter(x => x.action === "update").length, newAds: plan.reduce((sum, x) => sum + x.newAds, 0) } }, METHODS);

    const applied = [];
    for (const item of items) {
      let row = byIdentity.get(identity(item));
      if (OFFER_KINDS.has(item.kind)) {
        const before = row?.data || {};
        const data = offerData(item, before, batchDate);
        row = row ? await patchRow(row.id, data) : await createRow(data);
        if (before && Object.keys(before).length) {
          const additions = {
            domains: Math.max(0, list(data.dominios).length - list(before.dominios).length),
            libraries: Math.max(0, list(data.bibliotecas).length - list(before.bibliotecas).length),
            ads: Math.max(0, list(data.criativos).length - list(before.criativos).length),
          };
          if (Object.values(additions).some(Number)) await logUpdated(row, batchDate, additions);
        }
        byIdentity.set(identity(item), row);
        for (const [index, ad] of item.ads.entries()) {
          const key = canonicalUrl(ad.url); if (!key || adUrls.has(key)) continue;
          const creative = await createRow({ ...standaloneData({ ...item, kind: "criativo", name: ad.creativeName || `${item.name} · anúncio ${index + 1}` }, batchDate, ad), sourceOfferId: row.id, sourceOfferName: item.name });
          adUrls.add(key); applied.push({ id: creative.id, kind: "criativo", name: creative.data.nome });
        }
      } else {
        const data = standaloneData(item, batchDate);
        row = row ? await patchRow(row.id, { ...row.data, ...data }) : await createRow(data);
        byIdentity.set(identity(item), row);
      }
      applied.push({ id: row.id, kind: item.kind, name: item.name });
    }
    return json(req, 200, { ok: true, mode, batchDate, applied, plan }, METHODS);
  } catch (error) {
    console.error("manual-ingest-n8n:", clean(error?.message || error, 260));
    return json(req, Number(error?.status) || 500, { ok: false, error: clean(error?.message || "falha na importação", 220) }, METHODS);
  }
};
