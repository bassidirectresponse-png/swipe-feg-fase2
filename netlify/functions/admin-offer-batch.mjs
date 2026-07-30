import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  authenticate,
  bearerToken,
  isAdmin,
  json,
  preflight,
  rateLimit,
  readJson,
  trustedOrigin,
} from "./_security.mjs";
import { offers as catalog } from "../../scripts/offer_batch_july29_catalog.mjs";

const METHODS = "POST, OPTIONS";
const textKey = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const sectionOf = row => row?.data?.kind || "oferta";

function canonicalUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|subid|sid|rtk|twrclid|hcid|tid$|click_id$|ref_id$|tblci$)/i.test(key)) url.searchParams.delete(key);
    }
    return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/+$/, "")}${url.search}`;
  } catch {
    return String(value || "").trim().toLowerCase();
  }
}

function uniqueBy(current, added, field) {
  const result = [], seen = new Set();
  for (const item of [...(Array.isArray(current) ? current : []), ...(Array.isArray(added) ? added : [])]) {
    const key = canonicalUrl(item?.[field] || "") || textKey(item?.nome || item?.name || "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function namesOf(row) {
  return [row?.data?.nomeOferta, row?.data?.nomeMarca].map(textKey).filter(Boolean);
}

function matches(item, row) {
  if (sectionOf(row) !== "oferta") return false;
  const wantedNames = [item.name, item.brand, ...(item.aliases || [])].map(textKey);
  return namesOf(row).some(name => wantedNames.includes(name));
}

function mergeRows(first, second) {
  return {
    ...(first || {}),
    ...(second || {}),
    dominios: uniqueBy(first?.dominios, second?.dominios, "linkDominio"),
    bibliotecas: uniqueBy(first?.bibliotecas, second?.bibliotecas, "link"),
    criativos: uniqueBy(first?.criativos, second?.criativos, "link"),
    advertorials: [...new Set([...(first?.advertorials || []), first?.advertorialLink, ...(second?.advertorials || []), second?.advertorialLink].filter(Boolean).map(String))],
  };
}

function nicheCode(niche) {
  const key = textKey(niche);
  if (key.includes("emagrec")) return "WL";
  if (key.includes("disfunc") || /\bed\b/.test(key)) return "ED";
  if (key.includes("memor")) return "MEMO";
  if (key.includes("diabet") || key.includes("glic")) return "DB";
  if (key.includes("press")) return "BP";
  if (key.includes("vis")) return "VIS";
  return (key.split(" ").map(part => part[0]).join("").slice(0, 4) || "OT").toUpperCase();
}

function isLucas(data) {
  const marker = [
    data?.collection, data?.collectionLabel, data?.label, data?.marca,
    data?.importBatch, data?.sourceFolder, data?.sourceFile,
  ].filter(Boolean).join(" ");
  return /lucas\s+rego/i.test(marker);
}

function restHeaders(accessToken) {
  return { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
}

async function rest(path, options = {}, accessToken) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: { ...restHeaders(accessToken), ...(options.headers || {}) },
    signal: AbortSignal.timeout(25_000),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`banco recusou a operação (${response.status}): ${text.slice(0, 160)}`);
  return text ? JSON.parse(text) : null;
}

function mediaUrls(origin, slug) {
  const base = `${origin}/assets/offers-july29/${slug}`;
  return { pv: `${base}/pv.jpg`, checkout: `${base}/checkout.jpg`, product: `${base}/product.jpg` };
}

function buildOffer(item, previous, media) {
  const domains = item.domains.map((entry, index) => ({
    nome: entry.name,
    linkDominio: entry.offer,
    linkCheckout: entry.checkout || "",
    backRedirect: "",
    views: "",
    viewsPeriod: "",
    printPV: index === 0 && entry.offer ? media.pv : "",
    printCheckout: index === 0 ? media.checkout : "",
  }));
  const libraries = item.libraries.map(entry => ({ nome: entry.name, link: entry.link, providedCount: entry.providedCount }));
  const creatives = item.creatives.map(entry => ({ nome: entry.name, link: entry.link, transcricao: "" }));
  const advertorials = [...new Set([...(previous?.advertorials || []), previous?.advertorialLink, ...(item.advertorials || [])].filter(Boolean).map(String))];
  const result = {
    ...(previous || {}),
    tipoTrafego: item.traffic === "native" ? "native" : "meta",
    nomeOferta: item.name,
    nomeMarca: item.brand,
    nicho: item.niche,
    formato: item.format,
    imagemProduto: media.product,
    dominios: uniqueBy(previous?.dominios, domains, "linkDominio"),
    bibliotecas: uniqueBy(previous?.bibliotecas, libraries, "link"),
    criativos: uniqueBy(previous?.criativos, creatives, "link"),
    advertorialLink: advertorials[0] || "",
    advertorials,
    funil: item.traffic === "native" ? "Taboola → advertorial → VSL → checkout" : "Meta Ads → VSL → checkout",
    analysisStatus: item.libraries.length ? "pending" : previous?.analysisStatus || "",
    analysisAttempts: item.libraries.length ? 0 : previous?.analysisAttempts || 0,
    analysisStartedAt: item.libraries.length ? "" : previous?.analysisStartedAt || "",
    analysisCompletedAt: item.libraries.length ? "" : previous?.analysisCompletedAt || "",
    analysisLastError: item.libraries.length ? "" : previous?.analysisLastError || "",
    analysisNextRetryAt: item.libraries.length ? "" : previous?.analysisNextRetryAt || "",
    analysisVersion: "1",
  };
  delete result.kind;
  if (!String(previous?.numAdsAtivos || "").trim() && item.ads != null) result.numAdsAtivos = String(item.ads);
  return result;
}

function nextName(niche, counters) {
  const code = nicheCode(niche);
  counters.set(code, (counters.get(code) || 0) + 1);
  return `[ADS ${code}][${String(counters.get(code)).padStart(2, "0")}]`;
}

async function applyRename(rows, dryRun, accessToken) {
  const normal = rows.filter(row => sectionOf(row) === "criativo" && !isLucas(row.data));
  const grouped = new Map();
  for (const row of normal) {
    const code = nicheCode(row.data?.nicho);
    if (!grouped.has(code)) grouped.set(code, []);
    grouped.get(code).push(row);
  }
  const changes = [];
  for (const [code, items] of grouped) {
    items.sort((a, b) => String(a.created_at || "").localeCompare(String(b.created_at || "")) || String(a.id).localeCompare(String(b.id)));
    for (let index = 0; index < items.length; index += 1) {
      const row = items[index], name = `[ADS ${code}][${String(index + 1).padStart(2, "0")}]`;
      if (row.data?.nome === name) continue;
      const data = { ...(row.data || {}), nomeOriginal: row.data?.nomeOriginal || row.data?.nome || "", nome: name };
      changes.push({ id: row.id, from: row.data?.nome || "", to: name });
      if (!dryRun) {
        await rest(`offers?id=eq.${encodeURIComponent(row.id)}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ data }),
        }, accessToken);
        row.data = data;
      }
    }
  }
  return changes;
}

async function runBatch({ dryRun, origin, accessToken }) {
  const rows = await rest("offers?select=id,created_at,data&order=created_at.asc", {}, accessToken);
  const renameChanges = await applyRename(rows, dryRun, accessToken);
  const plans = catalog.map(item => {
    const found = rows.filter(row => matches(item, row));
    return { item, keep: found[0] || null, duplicates: found.slice(1) };
  });
  if (dryRun) {
    return {
      dryRun: true,
      rows: rows.length,
      renames: renameChanges.length,
      offers: plans.map(plan => ({
        name: plan.item.name,
        action: plan.keep ? "update" : "insert",
        existing: plan.keep?.data?.nomeOferta || "",
        duplicates: plan.duplicates.length,
        domains: plan.item.domains.length,
        libraries: plan.item.libraries.length,
        creatives: plan.item.creatives.length,
      })),
    };
  }

  const counters = new Map();
  for (const row of rows) {
    if (sectionOf(row) !== "criativo" || isLucas(row.data)) continue;
    const code = nicheCode(row.data?.nicho);
    const match = String(row.data?.nome || "").match(new RegExp(`^\\[ADS ${code}\\]\\[(\\d+)\\]$`, "i"));
    if (match) counters.set(code, Math.max(counters.get(code) || 0, Number(match[1])));
  }
  const creativeKeys = new Set(rows.filter(row => sectionOf(row) === "criativo").map(row => canonicalUrl(row.data?.linkAnuncio || row.data?.video)).filter(Boolean));
  const results = [], createdCreatives = [];

  for (const plan of plans) {
    let previous = plan.keep?.data || {};
    for (const duplicate of plan.duplicates) previous = mergeRows(duplicate.data || {}, previous);
    const data = buildOffer(plan.item, previous, mediaUrls(origin, plan.item.slug));
    let saved;
    if (plan.keep) {
      saved = await rest(`offers?id=eq.${encodeURIComponent(plan.keep.id)}&select=id,data`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ data }),
      }, accessToken);
    } else {
      saved = await rest("offers?select=id,data", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ data }),
      }, accessToken);
    }
    const offerId = saved?.[0]?.id || plan.keep?.id;
    for (const duplicate of plan.duplicates) {
      await rest(`offers?id=eq.${encodeURIComponent(duplicate.id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } }, accessToken);
    }
    for (const creative of plan.item.creatives) {
      const key = canonicalUrl(creative.link);
      if (!key || creativeKeys.has(key)) continue;
      const creativeData = {
        kind: "criativo",
        nome: nextName(plan.item.niche, counters),
        nomeOriginal: creative.name,
        nicho: plan.item.niche,
        marca: plan.item.name,
        plataforma: plan.item.traffic === "native" ? "taboola" : "meta",
        linkAnuncio: creative.link,
        video: "",
        print: "",
        transcricao: "",
        transcricaoPt: "",
        transcriptionRequired: true,
        transcriptionStatus: "waiting_for_media",
        transcricaoStatus: "waiting_for_media",
        transcriptionAttempts: 0,
        transcriptionProvider: "groq",
        transcriptionVersion: "1",
        fbIngestStatus: "pending",
        mediaArchiveRequired: true,
        mediaArchiveStatus: "pending",
        sourceOfferId: offerId,
        sourceOfferName: plan.item.name,
      };
      const inserted = await rest("offers?select=id,data", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ data: creativeData }),
      }, accessToken);
      creativeKeys.add(key);
      createdCreatives.push({ id: inserted?.[0]?.id, name: creativeData.nome, link: creative.link });
    }
    results.push({ name: plan.item.name, action: plan.keep ? "updated" : "inserted", duplicatesRemoved: plan.duplicates.length, id: offerId });
  }
  return {
    dryRun: false,
    renames: renameChanges.length,
    offers: results,
    createdCreatives,
    summary: {
      offersCreated: results.filter(item => item.action === "inserted").length,
      offersUpdated: results.filter(item => item.action === "updated").length,
      duplicateOffersRemoved: results.reduce((total, item) => total + item.duplicatesRemoved, 0),
      creativesCreated: createdCreatives.length,
    },
  };
}

export default async req => {
  const pre = preflight(req, METHODS);
  if (pre) return pre;
  if (req.method !== "POST") return json(req, 405, { ok: false, error: "método não permitido" }, METHODS);
  if (!trustedOrigin(req)) return json(req, 403, { ok: false, error: "origem não autorizada" }, METHODS);
  try {
    const user = await authenticate(req);
    if (!isAdmin(user)) return json(req, 403, { ok: false, error: "somente o administrador pode executar este lote" }, METHODS);
    const accessToken = bearerToken(req);
    const quota = await rateLimit("admin-offer-batch", user.id, { limit: 4, windowMs: 60 * 60_000 });
    if (!quota.allowed) return json(req, 429, { ok: false, error: "limite temporário atingido" }, METHODS);
    const body = await readJson(req, { maxBytes: 8 * 1024 });
    const dryRun = body.mode !== "apply";
    const origin = String(process.env.URL || new URL(req.url).origin).replace(/\/+$/, "");
    const result = await runBatch({ dryRun, origin, accessToken });
    return json(req, 200, { ok: true, ...result }, METHODS);
  } catch (error) {
    console.error("admin-offer-batch:", String(error?.message || error).slice(0, 220));
    return json(req, 400, { ok: false, error: String(error?.message || "falha no lote").slice(0, 180) }, METHODS);
  }
};
