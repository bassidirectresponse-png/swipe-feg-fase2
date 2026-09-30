import { readFile } from "node:fs/promises";
import { authHeaders, productionAdminAuth } from "./_supabase-auth.mjs";

const ROOT = new URL("../", import.meta.url);
const COVER = new URL("../assets/rosabella-beetroot/product-cover.png", import.meta.url);
const NAME = "Rosabella Beetroot";
const NICHE = "Saúde masculina";
const CAPTURED_AT = "2026-09-27";
const MONEY = value => value ? `US$ ${value}` : "";
const fields = ["name", "spend", "roas", "avgConversion", "costResult", "results", "ctr", "cpc", "cpm"];
const campaignRows = rows => rows.map(row => Object.fromEntries(fields.map((field, index) => {
  const value = row[index] || "";
  return [field, index === 0 || field === "roas" || field === "results" || field === "ctr" ? value : MONEY(value)];
})));
const totals = (spend, avgConversion, ctr, cpc, cpm) => ({
  spend: MONEY(spend), roas: "—", avgConversion: MONEY(avgConversion), costResult: "—", results: "—",
  ctr, cpc: MONEY(cpc), cpm: MONEY(cpm), cpcLink: "", costUnique: "",
});
const report = (key, label, range, total, campaigns) => ({
  key, label, range, level: "Campanhas", currency: "USD", capturedAt: CAPTURED_AT,
  totals: total, campaigns: campaignRows(campaigns),
});

// Todos os valores abaixo foram transcritos das telas da BM fornecidas no lote de 27/09/2026.
const reports = [
  report("2026-09-27-1d", "Setembro 2026 · Ontem", "27/09/2026", totals("289.273,17", "64,62", "1,41%", "0,44", "18,01"), [
    ["TOFU | Beets | US | MAIN CBO NEW I", "61.736,99", "0,77", "64,47", "83,88", "736 compras", "6,69%", "0,41", "87,55"],
    ["TOFU | Beets | US/CA | CBO | Video ads", "61.595,02", "0,93", "64,61", "69,76", "883 compras", "7,78%", "0,63", "80,13"],
    ["TOFU | Beets | US | Testing | Angle | High Cholesterol", "27.851,63", "0,65", "65,30", "100,19", "278 compras", "4,90%", "0,37", "90,59"],
    ["TOFU | Beets | US | MAIN CBO NEW | excl. 180d buyers + All buyers Klaviyo", "24.096,74", "0,89", "63,24", "79,01", "305 compras", "5,68%", "0,40", "82,98"],
    ["TOFU | Beets | US | CBO | Cholesterol", "16.935,90", "0,86", "64,82", "98,00", "173 compras", "5,56%", "0,51", "79,06"],
  ]),
  report("2026-09-27-7d", "Setembro 2026 · Últimos 7 dias", "21/09/2026 a 27/09/2026", totals("1.602.247,86", "64,74", "1,19%", "0,45", "17,07"), [
    ["TOFU | Beets | US | MAIN CBO NEW I", "363.682,53", "0,74", "64,57", "87,47", "4.158 compras", "5,35%", "0,39", "82,49"],
    ["TOFU | Beets | US/CA | CBO | Video ads", "292.397,65", "0,81", "64,66", "79,61", "3.673 compras", "5,62%", "0,78", "73,61"],
    ["TOFU | Beets | US | Testing | Angle | High Cholesterol", "139.498,46", "0,67", "65,20", "93,88", "1.486 compras", "4,65%", "0,39", "84,61"],
    ["TOFU | Beets | US | MAIN CBO NEW | excl. 180d buyers + All buyers Klaviyo", "121.644,57", "0,70", "64,30", "89,67", "1.358 compras", "4,77%", "0,38", "76,74"],
    ["TOFU | Beets | US | CBO | Cholesterol", "104.565,62", "0,85", "64,63", "90,85", "1.151 compras", "5,08%", "0,48", "86,25"],
  ]),
  report("2026-09-27-14d", "Setembro 2026 · Últimos 14 dias", "14/09/2026 a 27/09/2026", totals("3.197.730,04", "64,76", "1,16%", "0,44", "17,29"), [
    ["TOFU | Beets | US | MAIN CBO NEW I", "729.038,36", "0,75", "64,85", "86,74", "8.405 compras", "5,24%", "0,39", "84,53"],
    ["TOFU | Beets | US/CA | CBO | Video ads", "539.700,68", "0,79", "64,56", "81,23", "6.644 compras", "5,27%", "0,83", "75,10"],
    ["TOFU | Beets | US | CBO | Cholesterol", "247.063,35", "0,71", "64,86", "91,78", "2.692 compras", "4,98%", "0,45", "86,56"],
    ["TOFU | Beets | US | Testing | Angle | High Cholesterol", "221.937,98", "0,68", "65,22", "96,04", "2.311 compras", "4,45%", "0,39", "80,50"],
    ["TOFU | Beets | US | MAIN CBO NEW | excl. 180d buyers + All buyers Klaviyo", "187.771,22", "0,79", "64,16", "81,71", "2.298 compras", "4,94%", "0,45", "80,54"],
  ]),
  report("2026-09-27-30d", "Setembro 2026 · Últimos 30 dias", "29/08/2026 a 27/09/2026", totals("6.853.106,25", "64,83", "1,16%", "0,39", "17,05"), [
    ["TOFU | Beets | US | MAIN CBO NEW I", "1.194.118,28", "0,76", "64,92", "85,79", "13.919 compras", "4,85%", "0,33", "80,42"],
    ["TOFU | Beets | US/CA | CBO | Video ads", "1.157.538,42", "0,80", "64,38", "80,47", "14.394 compras", "5,22%", "0,85", "74,72"],
    ["TOFU | Beets | US | MAIN CBO I", "890.258,51", "0,76", "65,04", "85,87", "11.532 compras", "4,01%", "0,27", "63,15"],
    ["TOFU | Beets | US | CBO | Cholesterol", "514.728,52", "0,84", "65,08", "77,91", "5.866 compras", "4,79%", "0,34", "79,99"],
    ["TOFU | Beets | US | CBO | Video ads", "377.506,98", "0,67", "65,84", "99,21", "4.095 compras", "3,73%", "1,02", "57,91"],
  ]),
];

const library = "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&is_targeted_country=false&media_type=all&q=tryrosabella&search_type=keyword_unordered&sort_data[direction]=desc&sort_data[mode]=total_impressions";
const salesPage = "https://track.tryrosabella.com/cdc16426-3e48-40a7-9fad-21098084f6cf";
const topAdLinks = [
  "https://fb.me/adspreview/facebook/2beVau3cfJAT24G",
  "https://fb.me/adspreview/facebook/1WZIprY74C2f2wx",
  "https://fb.me/adspreview/facebook/1UwzcEJkEAM2GXN",
];

const html = await readFile(new URL("index.html", ROOT), "utf8");
const supabaseUrl = html.match(/const DEFAULT_URL="([^"]+)"/)?.[1];
if (!supabaseUrl) throw new Error("URL do Supabase não encontrada");
const coverUrl = `${supabaseUrl}/storage/v1/object/public/criativos/brands/rosabella-beetroot/product-cover.png`;
const manifest = {
  batchDate: CAPTURED_AT,
  items: [{
    kind: "brandsvalidated", name: NAME, brand: "Rosabella", niche: NICHE, format: "Suplemento de beterraba",
    image: coverUrl,
    libraries: [{ name: "Rosabella Beetroot · Meta Ads Library · Setembro 2026", url: library }],
    domains: [{ name: "Página de vendas", offer: salesPage }],
    ads: topAdLinks.map((url, index) => ({ name: `Anúncio ${index + 1}`, url, creativeName: `Rosabella Beetroot — Anúncio ${index + 1} — Setembro 2026 — 21 a 27`, platform: "meta" })),
  }],
};

function makeData(previous = {}) {
  return {
    ...previous,
    kind: "brandsvalidated", tipoTrafego: "meta", nomeOferta: NAME, nomeMarca: "Rosabella", nicho: NICHE,
    formato: "Suplemento de beterraba", imagemProduto: coverUrl, numAdsAtivos: "", adsLibraryCheckedAt: "27/09/2026",
    bibliotecas: [{ nome: "Rosabella Beetroot · Meta Ads Library · Setembro 2026", link: library }],
    dominios: [{ nome: "Página de vendas", linkDominio: salesPage, linkCheckout: "", backRedirect: "", views: "", viewsPeriod: "", vslLink: "", vslVideo: "" }],
    bmSpend7d: MONEY("1.602.247,86"), bmSpend14d: MONEY("3.197.730,04"), bmSpend30d: MONEY("6.853.106,25"),
    bmAvgConversion: MONEY("64,74"), bmCpc: MONEY("0,45"), bmCpcLink: "", bmCpm: MONEY("17,07"), bmCtr: "1,19%", bmCostUnique: "", bmCostIc: "Não exibido nos prints", bmRoas: "— (múltiplas conversões)", bmUpdatedAt: "27/09/2026",
    bmNotes: "Leitura de setembro de 2026. Métricas de resultado e ROAS aparecem como múltiplas conversões nos prints; os recortes preservam os totais originais de campanhas.",
    bmReports: reports, bmPrints: [],
    brandTopAds: topAdLinks.map((link, index) => ({ nome: `Anúncio ${index + 1} — Setembro 2026 — 21 a 27`, link, period: "2026-09", sourceDate: "27/09/2026" })),
    funil: "Meta Ads → página de vendas Rosabella Beetroot → checkout", comentario: "",
  };
}

if (process.argv.includes("--sql")) {
  const payload = JSON.stringify(makeData()).replaceAll("'", "''");
  console.log(`DO $$ DECLARE payload jsonb := '${payload}'::jsonb; BEGIN UPDATE offers SET data = payload WHERE data->>'kind' = 'brandsvalidated' AND lower(data->>'nomeOferta') = 'rosabella beetroot'; IF NOT FOUND THEN INSERT INTO offers (data) VALUES (payload); END IF; END $$; SELECT id, data->>'nomeOferta' AS nome, data->>'nicho' AS nicho, jsonb_array_length(data->'bmReports') AS relatorios, jsonb_array_length(data->'brandTopAds') AS top_ads FROM offers WHERE data->>'kind' = 'brandsvalidated' AND lower(data->>'nomeOferta') = 'rosabella beetroot';`);
  process.exit(0);
}

// Variante prática para colar pelo painel SQL: conserva um exemplo de campanha
// por período; a transcrição completa permanece acima como registro auditável.
if (process.argv.includes("--sql-dashboard")) {
  const dashboardData = makeData();
  dashboardData.bmReports = dashboardData.bmReports.map(item => ({ ...item, campaigns: item.campaigns.slice(0, 1) }));
  const payload = JSON.stringify(dashboardData).replaceAll("'", "''");
  console.log(`DO $$ DECLARE payload jsonb := '${payload}'::jsonb; BEGIN UPDATE offers SET data = payload WHERE data->>'kind' = 'brandsvalidated' AND lower(data->>'nomeOferta') = 'rosabella beetroot'; IF NOT FOUND THEN INSERT INTO offers (data) VALUES (payload); END IF; END $$; SELECT id, data->>'nomeOferta' AS nome, data->>'nicho' AS nicho, jsonb_array_length(data->'bmReports') AS relatorios, jsonb_array_length(data->'brandTopAds') AS top_ads FROM offers WHERE data->>'kind' = 'brandsvalidated' AND lower(data->>'nomeOferta') = 'rosabella beetroot';`);
  process.exit(0);
}

if (process.argv.includes("--sql-dashboard-min")) {
  const dashboardData = makeData();
  dashboardData.bmReports = dashboardData.bmReports.map(item => ({ ...item, campaigns: [] }));
  const payload = JSON.stringify(dashboardData).replaceAll("'", "''");
  console.log(`DO $$ DECLARE payload jsonb := '${payload}'::jsonb; BEGIN UPDATE offers SET data = payload WHERE data->>'kind' = 'brandsvalidated' AND lower(data->>'nomeOferta') = 'rosabella beetroot'; IF NOT FOUND THEN INSERT INTO offers (data) VALUES (payload); END IF; END $$; SELECT id, data->>'nomeOferta' AS nome, data->>'nicho' AS nicho, jsonb_array_length(data->'bmReports') AS relatorios, jsonb_array_length(data->'brandTopAds') AS top_ads FROM offers WHERE data->>'kind' = 'brandsvalidated' AND lower(data->>'nomeOferta') = 'rosabella beetroot';`);
  process.exit(0);
}

const admin = await productionAdminAuth();
if (admin.url !== supabaseUrl) throw new Error("A credencial administrativa aponta para outro projeto Supabase");
const headers = { ...authHeaders(admin), "Content-Type": "application/json" };
const query = new URL(`${supabaseUrl}/rest/v1/offers`);
query.searchParams.set("select", "id,data");
query.searchParams.set("data->>kind", "eq.brandsvalidated");
const catalog = await fetch(query, { headers }).then(async response => response.ok ? response.json() : Promise.reject(new Error(await response.text())));
const previous = catalog.find(row => String(row.data?.nomeOferta || "").trim().toLowerCase() === NAME.toLowerCase());
const validation = { ok: true, mode: "validate", manifest, plan: [{ kind: "brandsvalidated", name: NAME, action: previous ? "update" : "create", newAds: topAdLinks.length, duplicatesSkipped: 0 }], totals: { items: 1, newCards: previous ? 0 : 1, updates: previous ? 1 : 0, newAds: topAdLinks.length } };

if (!process.argv.includes("--apply")) {
  console.log(JSON.stringify(validation, null, 2));
  process.exit(0);
}

const cover = await readFile(COVER);
const upload = await fetch(`${supabaseUrl}/storage/v1/object/criativos/brands/rosabella-beetroot/product-cover.png`, { method: "POST", headers: { ...headers, "Content-Type": "image/png", "x-upsert": "true" }, body: cover });
if (!upload.ok) throw new Error(`Upload da capa: ${upload.status} ${(await upload.text()).slice(0, 180)}`);
const seed = { data: makeData(previous?.data || {}) };
const saved = await fetch(previous ? `${supabaseUrl}/rest/v1/offers?id=eq.${encodeURIComponent(previous.id)}` : `${supabaseUrl}/rest/v1/offers`, { method: previous ? "PATCH" : "POST", headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify(seed) });
if (!saved.ok) throw new Error(`Persistência do produto: ${saved.status} ${(await saved.text()).slice(0, 220)}`);
const rows = await saved.json();
const row = rows[0];
if (!row?.id || !Array.isArray(row.data?.bmReports) || row.data.bmReports.length !== 4 || row.data.brandTopAds?.length !== 3) throw new Error("Conferência pós-escrita incompleta");
console.log(JSON.stringify({ ok: true, mode: "apply", action: previous ? "updated" : "inserted", offerId: row.id, reports: row.data.bmReports.length, topAds: row.data.brandTopAds.length, cover: row.data.imagemProduto }));
