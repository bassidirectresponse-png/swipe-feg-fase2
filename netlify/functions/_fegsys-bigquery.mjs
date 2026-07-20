import { createHash, createSign } from "node:crypto";
import { getStore } from "@netlify/blobs";

const PROJECT_ID = "grupofeg-lakehouse";
const VIEW = "grupofeg-lakehouse.gold_feg.vw_ads_criativo_diario";
const META_PERFORMANCE = "grupofeg-lakehouse.gold_feg.fct_meta_ads_performance";
const STORE_NAME = "fegsys-megabrain";
const STORE_KEY = "daily-v4";
const MAX_AGE_MS = 75 * 60 * 1000;
const QUERY_DAYS = 365;
let cachedToken = null;

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

export function readCredential() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64
    ? Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64, "base64").toString("utf8")
    : process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  let credential;
  try { credential = JSON.parse(raw); } catch { throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON inválido"); }
  if (credential.type !== "service_account" || !credential.client_email || !credential.private_key) {
    throw new Error("credencial de conta de serviço incompleta");
  }
  if (credential.project_id !== PROJECT_ID) throw new Error("projeto da credencial não corresponde ao FEG Lakehouse");
  return credential;
}

async function accessToken(credential) {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(JSON.stringify({
    iss: credential.client_email,
    scope: "https://www.googleapis.com/auth/bigquery.readonly",
    aud: credential.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  }));
  const unsigned = `${header}.${claims}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${signer.sign(credential.private_key, "base64url")}`;
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion
  });
  const response = await fetch(credential.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.access_token) throw new Error(`autenticação Google recusada (${response.status})`);
  cachedToken = { value: result.access_token, expiresAt: Date.now() + Math.max(300, +result.expires_in || 3600) * 1000 };
  return cachedToken.value;
}

const FIELD_ALIASES = {
  data: ["data", "ref_date", "date", "dt", "day"],
  criativo: ["criativo", "creative", "creative_name", "nome_criativo", "ad_name"],
  ad_platform: ["ad_platform", "platform", "plataforma"],
  ad_channel_type: ["ad_channel_type", "channel_type", "canal"],
  spend_usd: ["spend_usd", "valor_usado_usd", "investment_usd"],
  spend_brl: ["spend_brl", "valor_usado", "valor_usado_brl", "investment_brl", "spend"],
  impressions: ["impressions", "impressoes"],
  clicks: ["clicks", "cliques", "link_clicks"],
  video_3s: ["video_3s", "video_plays_3s"],
  video_p75: ["video_p75", "video_plays_75"],
  orders: ["purchases", "quantidade_pedidos", "qtd_pedidos", "total_pedidos", "pedidos", "vendas", "qtd_vendas", "total_vendas", "sales", "compras", "orders"],
  official_revenue_brl: ["revenue", "faturamento_liquido_front", "faturamento_liquido_front_brl", "faturamento_liquido", "faturamento", "faturamento_brl", "receita_liquida", "receita", "receita_brl", "revenue_brl", "purchase_value"],
  official_revenue_usd: ["faturamento_liquido_front_usd", "faturamento_liquido_usd", "faturamento_usd", "receita_usd", "revenue_usd"],
  google_conversions: ["conversions", "google_conversions", "conversions_google", "google_ads_conversions"],
  roas: ["roas", "purchase_roas", "return_on_ad_spend"],
  video_url: ["video_url", "creative_video_url", "media_url", "asset_url", "url_video"],
  thumbnail_url: ["thumbnail_url", "image_url", "creative_image_url", "thumb_url"],
  copy_text: ["copy", "copy_text", "creative_copy", "texto_copy", "ad_copy", "body"],
  copy_url: ["copy_url", "doc_url", "document_url", "link_copy"]
};

function quoteField(name) { return `\`${String(name).replaceAll("`", "")}\``; }
function fieldMap(fields) {
  const names = new Map((fields || []).map(field => [String(field.name || "").toLowerCase(), field.name]));
  return Object.fromEntries(Object.entries(FIELD_ALIASES).map(([target, aliases]) => [target, aliases.map(alias => names.get(alias)).find(Boolean) || ""]));
}
function numberExpr(field) { return field ? `COALESCE(SAFE_CAST(${quoteField(field)} AS FLOAT64), 0)` : "0"; }
function textExpr(field) { return field ? `ANY_VALUE(NULLIF(TRIM(CAST(${quoteField(field)} AS STRING)), ''))` : "CAST(NULL AS STRING)"; }
function textSetExpr(field) { return field ? `STRING_AGG(DISTINCT NULLIF(TRIM(CAST(${quoteField(field)} AS STRING)), ''), ' + ')` : "CAST(NULL AS STRING)"; }

export function buildQuery(fields) {
  const f = fieldMap(fields);
  if (!f.data || !f.criativo) throw new Error("a view precisa conter as colunas de data e nome do criativo");
  const spendWeight = f.spend_brl || f.spend_usd;
  const sourceRoas = f.roas
    ? `SAFE_DIVIDE(SUM(${numberExpr(f.roas)} * ${numberExpr(spendWeight)}), NULLIF(SUM(${numberExpr(spendWeight)}), 0))`
    : "0";
  const salesAvailable = !!(f.orders && f.official_revenue_brl);
  const salesError = salesAvailable ? "" : `a vw_ads_criativo_diario não fornece ${[!f.orders ? "pedidos" : "", !f.official_revenue_brl ? "faturamento" : ""].filter(Boolean).join(" nem ")}`;
  return { salesAvailable, salesError, query: `
SELECT
  DATE(${quoteField(f.data)}) AS data,
  CAST(${quoteField(f.criativo)} AS STRING) AS criativo,
  ${textSetExpr(f.ad_platform)} AS ad_platform,
  ${textSetExpr(f.ad_channel_type)} AS ad_channel_type,
  SUM(${numberExpr(f.spend_usd)}) AS spend_usd,
  SUM(${numberExpr(f.spend_brl)}) AS spend_brl,
  SUM(${numberExpr(f.impressions)}) AS impressions,
  SUM(${numberExpr(f.clicks)}) AS clicks,
  SUM(${numberExpr(f.video_3s)}) AS video_3s,
  SUM(${numberExpr(f.video_p75)}) AS video_p75,
  SUM(${numberExpr(f.orders)}) AS orders,
  SUM(${numberExpr(f.official_revenue_brl)}) AS official_revenue_brl,
  SUM(${numberExpr(f.official_revenue_usd)}) AS official_revenue_usd,
  SUM(${numberExpr(f.google_conversions)}) AS google_conversions,
  ${salesAvailable ? "TRUE" : "FALSE"} AS official_sales_available,
  ${sourceRoas} AS source_roas,
  ${textExpr(f.video_url)} AS video_url,
  ${textExpr(f.thumbnail_url)} AS thumbnail_url,
  ${textExpr(f.copy_text)} AS copy_text,
  ${textExpr(f.copy_url)} AS copy_url
FROM \`${VIEW}\`
WHERE DATE(${quoteField(f.data)}) >= DATE_SUB(CURRENT_DATE('America/Sao_Paulo'), INTERVAL ${QUERY_DAYS} DAY)
  AND ${quoteField(f.criativo)} IS NOT NULL
  AND TRIM(CAST(${quoteField(f.criativo)} AS STRING)) != ''
GROUP BY 1, 2
ORDER BY data DESC, spend_brl DESC` };
}

function metaPerformanceQuery() {
  return `
WITH daily AS (
  SELECT
    DATE(ref_date) AS data,
    COALESCE(NULLIF(TRIM(campaign_name), ''), NULLIF(TRIM(creative_name), ''), NULLIF(TRIM(ad_name), '')) AS criativo,
    ANY_VALUE(NULLIF(TRIM(creative_id), '')) AS creative_id,
    ANY_VALUE(NULLIF(TRIM(ad_id), '')) AS ad_id,
    SUM(COALESCE(spend, 0)) AS meta_spend,
    SUM(COALESCE(impressions, 0)) AS meta_impressions,
    SUM(COALESCE(reach, 0)) AS meta_reach,
    SUM(COALESCE(unique_clicks, 0)) AS meta_unique_clicks,
    SUM(COALESCE(link_clicks, 0)) AS meta_link_clicks,
    SUM(COALESCE(outbound_clicks, 0)) AS meta_outbound_clicks,
    SUM(COALESCE(landing_page_views, 0)) AS meta_landing_page_views,
    SUM(COALESCE(video_plays, 0)) AS meta_video_plays,
    SUM(COALESCE(initiate_checkout, 0)) AS meta_initiate_checkout,
    SUM(COALESCE(purchases, 0)) AS meta_purchases,
    SUM(COALESCE(revenue, 0)) AS meta_revenue,
    SAFE_DIVIDE(SUM(COALESCE(hook_rate, 0) * COALESCE(video_plays, 0)), NULLIF(SUM(COALESCE(video_plays, 0)), 0)) AS meta_hook_rate,
    SAFE_DIVIDE(SUM(COALESCE(midpoint_rate, 0) * COALESCE(video_plays, 0)), NULLIF(SUM(COALESCE(video_plays, 0)), 0)) AS meta_midpoint_rate,
    SAFE_DIVIDE(SUM(COALESCE(hold_rate, 0) * COALESCE(video_plays, 0)), NULLIF(SUM(COALESCE(video_plays, 0)), 0)) AS meta_hold_rate,
    SAFE_DIVIDE(SUM(COALESCE(p95_rate, 0) * COALESCE(video_plays, 0)), NULLIF(SUM(COALESCE(video_plays, 0)), 0)) AS meta_p95_rate,
    SAFE_DIVIDE(SUM(COALESCE(completion_rate, 0) * COALESCE(video_plays, 0)), NULLIF(SUM(COALESCE(video_plays, 0)), 0)) AS meta_completion_rate,
    SAFE_DIVIDE(SUM(COALESCE(avg_watch_time_seconds, 0) * COALESCE(video_plays, 0)), NULLIF(SUM(COALESCE(video_plays, 0)), 0)) AS meta_avg_watch_time_seconds
  FROM \`${META_PERFORMANCE}\`
  WHERE DATE(ref_date) >= DATE_SUB(CURRENT_DATE('America/Sao_Paulo'), INTERVAL ${QUERY_DAYS} DAY)
    AND COALESCE(NULLIF(TRIM(campaign_name), ''), NULLIF(TRIM(creative_name), ''), NULLIF(TRIM(ad_name), '')) IS NOT NULL
  GROUP BY 1, 2
)
SELECT
  *,
  SAFE_DIVIDE(meta_impressions, NULLIF(meta_reach, 0)) AS meta_frequency,
  SAFE_DIVIDE(meta_link_clicks * 100, NULLIF(meta_impressions, 0)) AS meta_ctr,
  SAFE_DIVIDE(meta_spend, NULLIF(meta_link_clicks, 0)) AS meta_cpc,
  SAFE_DIVIDE(meta_spend * 1000, NULLIF(meta_impressions, 0)) AS meta_cpm,
  SAFE_DIVIDE(meta_spend, NULLIF(meta_landing_page_views, 0)) AS meta_cplpv,
  SAFE_DIVIDE(meta_spend, NULLIF(meta_initiate_checkout, 0)) AS meta_cpi,
  SAFE_DIVIDE(meta_spend, NULLIF(meta_purchases, 0)) AS meta_cpa,
  SAFE_DIVIDE(meta_revenue, NULLIF(meta_spend, 0)) AS meta_roas,
  SAFE_DIVIDE(meta_revenue, NULLIF(meta_purchases, 0)) AS meta_aov
FROM daily
ORDER BY data DESC, meta_spend DESC`;
}

function rowsFromResult(schema, rows) {
  const fields = (schema && schema.fields || []).map(field => field.name);
  return (rows || []).map(row => Object.fromEntries(fields.map((name, index) => [name, row.f && row.f[index] ? row.f[index].v : null])));
}

async function runBigQueryQuery(headers, query, label = "fonte") {
  const start = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/queries`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, useLegacySql: false, timeoutMs: 25_000, maxResults: 100_000 })
  });
  let result = await start.json().catch(() => ({}));
  if (!start.ok) throw new Error(`${label}: consulta BigQuery recusada (${start.status})`);
  const job = result.jobReference || {};
  for (let attempt = 0; result.jobComplete === false && attempt < 12; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 750));
    const url = new URL(`https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/queries/${job.jobId}`);
    if (job.location) url.searchParams.set("location", job.location);
    url.searchParams.set("timeoutMs", "5000");
    url.searchParams.set("maxResults", "100000");
    const poll = await fetch(url, { headers });
    result = await poll.json().catch(() => ({}));
    if (!poll.ok) throw new Error(`${label}: consulta BigQuery interrompida (${poll.status})`);
  }
  if (result.jobComplete === false) throw new Error(`${label}: consulta BigQuery excedeu o tempo seguro`);
  const schema = result.schema;
  let rows = rowsFromResult(schema, result.rows);
  let pageToken = result.pageToken;
  while (pageToken) {
    const url = new URL(`https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/queries/${job.jobId}`);
    if (job.location) url.searchParams.set("location", job.location);
    url.searchParams.set("pageToken", pageToken);
    url.searchParams.set("maxResults", "100000");
    const page = await fetch(url, { headers });
    const next = await page.json().catch(() => ({}));
    if (!page.ok) throw new Error(`${label}: paginação BigQuery interrompida (${page.status})`);
    rows = rows.concat(rowsFromResult(next.schema || schema, next.rows));
    pageToken = next.pageToken;
  }
  return rows;
}

function normalizedCreative(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function listValues(value) {
  return String(value || "").split("+").map(item => item.trim()).filter(Boolean);
}

function numericRows(rows, fields) {
  return rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, fields.includes(key) ? (+value || 0) : String(value || "").trim()])));
}

export function mergeFegsysSources(baseRows = [], salesRows = [], metaRows = []) {
  const merged = new Map();
  const ensure = (row, preferredName = "") => {
    const data = String(row.data || "");
    const criativo = String(preferredName || row.criativo || "").trim();
    const key = `${data}|${normalizedCreative(criativo)}`;
    if (!data || !normalizedCreative(criativo)) return null;
    if (!merged.has(key)) merged.set(key, {
      data, criativo, ad_platform: "", ad_channel_type: "", shops: "", sales_platforms: "",
      spend_usd: 0, spend_brl: 0, impressions: 0, clicks: 0, video_3s: 0, video_p75: 0,
      google_conversions: 0, orders: 0, official_revenue_brl: 0, official_revenue_usd: 0,
      meta_spend: 0, meta_impressions: 0, meta_reach: 0, meta_unique_clicks: 0, meta_link_clicks: 0,
      meta_outbound_clicks: 0, meta_landing_page_views: 0, meta_video_plays: 0, meta_initiate_checkout: 0,
      meta_purchases: 0, meta_revenue: 0, meta_hook_rate: 0, meta_midpoint_rate: 0, meta_hold_rate: 0,
      meta_p95_rate: 0, meta_completion_rate: 0, meta_avg_watch_time_seconds: 0, creative_id: "", ad_id: "",
      video_url: "", thumbnail_url: "", copy_text: "", copy_url: "", official_sales_available: false, meta_available: false
    });
    return merged.get(key);
  };

  for (const row of baseRows) {
    const item = ensure(row); if (!item) continue;
    Object.assign(item, row);
  }
  for (const row of salesRows) {
    const item = ensure(row); if (!item) continue;
    item.orders += +row.orders || 0;
    item.official_revenue_brl += +row.official_revenue_brl || 0;
    item.official_revenue_usd += +row.official_revenue_usd || 0;
    item.shops = [...new Set([...listValues(item.shops), ...listValues(row.shops)])].join(" + ");
    item.sales_platforms = [...new Set([...listValues(item.sales_platforms), ...listValues(row.sales_platforms)])].join(" + ");
    item.official_sales_available = true;
  }
  for (const row of metaRows) {
    const item = ensure(row); if (!item) continue;
    for (const field of ["meta_spend", "meta_impressions", "meta_reach", "meta_unique_clicks", "meta_link_clicks", "meta_outbound_clicks", "meta_landing_page_views", "meta_video_plays", "meta_initiate_checkout", "meta_purchases", "meta_revenue"]) item[field] += +row[field] || 0;
    const playsBefore = item.meta_video_plays - (+row.meta_video_plays || 0), plays = +row.meta_video_plays || 0, totalPlays = playsBefore + plays;
    for (const field of ["meta_hook_rate", "meta_midpoint_rate", "meta_hold_rate", "meta_p95_rate", "meta_completion_rate", "meta_avg_watch_time_seconds"]) {
      item[field] = totalPlays ? ((+item[field] || 0) * playsBefore + (+row[field] || 0) * plays) / totalPlays : 0;
    }
    if (!item.creative_id) item.creative_id = String(row.creative_id || "");
    if (!item.ad_id) item.ad_id = String(row.ad_id || "");
    item.meta_available = true;
  }
  return [...merged.values()].map(item => ({
    ...item,
    conversions: item.orders,
    revenue_brl: item.official_revenue_brl,
    ticket_brl: item.orders ? item.official_revenue_brl / item.orders : 0,
    ticket_usd: item.orders ? item.official_revenue_usd / item.orders : 0,
    source_roas: item.spend_brl ? item.official_revenue_brl / item.spend_brl : 0,
    meta_frequency: item.meta_reach ? item.meta_impressions / item.meta_reach : 0,
    meta_ctr: item.meta_impressions ? item.meta_link_clicks / item.meta_impressions * 100 : 0,
    meta_cpc: item.meta_link_clicks ? item.meta_spend / item.meta_link_clicks : 0,
    meta_cpm: item.meta_impressions ? item.meta_spend / item.meta_impressions * 1000 : 0,
    meta_cplpv: item.meta_landing_page_views ? item.meta_spend / item.meta_landing_page_views : 0,
    meta_cpi: item.meta_initiate_checkout ? item.meta_spend / item.meta_initiate_checkout : 0,
    meta_cpa: item.meta_purchases ? item.meta_spend / item.meta_purchases : 0,
    meta_roas: item.meta_spend ? item.meta_revenue / item.meta_spend : 0,
    meta_aov: item.meta_purchases ? item.meta_revenue / item.meta_purchases : 0
  }));
}

async function queryBigQuery(credential) {
  const token = await accessToken(credential);
  const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
  const table = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/datasets/gold_feg/tables/vw_ads_criativo_diario`, { headers });
  const metadata = await table.json().catch(() => ({}));
  if (!table.ok) throw new Error(`não foi possível ler a estrutura da view (${table.status})`);
  const viewPlan = buildQuery(metadata.schema && metadata.schema.fields);
  const baseRaw = await runBigQueryQuery(headers, viewPlan.query, "vw_ads_criativo_diario");
  const optional = async (query, label) => {
    try { return { rows: await runBigQueryQuery(headers, query, label), available: true, error: "" }; }
    catch (error) { return { rows: [], available: false, error: String(error && error.message || error) }; }
  };
  const metaResult = await optional(metaPerformanceQuery(), "performance Meta");
  const metaRaw = metaResult.rows;
  const baseRows = numericRows(baseRaw, ["spend_usd", "spend_brl", "impressions", "clicks", "video_3s", "video_p75", "orders", "official_revenue_brl", "official_revenue_usd", "google_conversions", "source_roas"]).map(row => ({
    data: String(row.data || ""),
    criativo: String(row.criativo || "").trim(),
    ad_platform: String(row.ad_platform || "").toUpperCase(),
    ad_channel_type: String(row.ad_channel_type || ""),
    spend_usd: +row.spend_usd || 0,
    spend_brl: +row.spend_brl || 0,
    impressions: +row.impressions || 0,
    clicks: +row.clicks || 0,
    video_3s: +row.video_3s || 0,
    video_p75: +row.video_p75 || 0,
    orders: +row.orders || 0,
    official_revenue_brl: +row.official_revenue_brl || 0,
    official_revenue_usd: +row.official_revenue_usd || 0,
    google_conversions: +row.google_conversions || 0,
    source_roas: +row.source_roas || 0,
    official_sales_available: String(row.official_sales_available).toLowerCase() === "true",
    video_url: String(row.video_url || "").trim(),
    thumbnail_url: String(row.thumbnail_url || "").trim(),
    copy_text: String(row.copy_text || "").trim(),
    copy_url: String(row.copy_url || "").trim()
  })).filter(row => row.data && row.criativo);
  const metaNumeric = ["meta_spend", "meta_impressions", "meta_reach", "meta_unique_clicks", "meta_link_clicks", "meta_outbound_clicks", "meta_landing_page_views", "meta_video_plays", "meta_initiate_checkout", "meta_purchases", "meta_revenue", "meta_hook_rate", "meta_midpoint_rate", "meta_hold_rate", "meta_p95_rate", "meta_completion_rate", "meta_avg_watch_time_seconds", "meta_frequency", "meta_ctr", "meta_cpc", "meta_cpm", "meta_cplpv", "meta_cpi", "meta_cpa", "meta_roas", "meta_aov"];
  return {
    rows: mergeFegsysSources(baseRows, [], numericRows(metaRaw, metaNumeric)).filter(row => row.data && row.criativo),
    sourceStatus: {
      media: { available: true, error: "" },
      sales: { available: viewPlan.salesAvailable, error: viewPlan.salesError },
      meta: { available: metaResult.available, error: metaResult.error }
    }
  };
}

export async function refreshSnapshot() {
  const credential = readCredential();
  if (!credential) throw new Error("credencial do BigQuery ainda não configurada");
  const result = await queryBigQuery(credential), rows = result.rows;
  const dates = rows.map(row => row.data).sort();
  const snapshot = {
    version: 3,
    syncedAt: new Date().toISOString(),
    oldestDate: dates[0] || "",
    newestDate: dates[dates.length - 1] || "",
    sourceStatus: result.sourceStatus,
    rows
  };
  await getStore({ name: STORE_NAME, consistency: "strong" }).setJSON(STORE_KEY, snapshot);
  return snapshot;
}

export async function getSnapshot({ refresh = false } = {}) {
  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  const snapshot = await store.get(STORE_KEY, { type: "json" }).catch(() => null);
  const stale = !snapshot || !snapshot.syncedAt || Date.now() - Date.parse(snapshot.syncedAt) > MAX_AGE_MS;
  if ((refresh || stale) && readCredential()) return refreshSnapshot();
  return snapshot;
}

function dateInSaoPaulo(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function shiftDate(iso, days) {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function resolveRange(params) {
  const today = dateInSaoPaulo();
  const preset = ["today", "yesterday", "7d", "14d", "30d", "90d", "custom"].includes(params.get("period")) ? params.get("period") : "7d";
  if (preset === "today") return { preset, from: today, to: today };
  if (preset === "yesterday") { const day = shiftDate(today, -1); return { preset, from: day, to: day }; }
  if (preset === "custom") {
    const from = /^\d{4}-\d{2}-\d{2}$/.test(params.get("from") || "") ? params.get("from") : shiftDate(today, -6);
    const to = /^\d{4}-\d{2}-\d{2}$/.test(params.get("to") || "") ? params.get("to") : today;
    return from <= to ? { preset, from, to } : { preset, from: to, to: from };
  }
  const days = +preset.replace("d", "") || 7;
  return { preset, from: shiftDate(today, -(days - 1)), to: today };
}

function stableId(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 24);
}

export function aggregateSnapshot(snapshot, range) {
  const source = (snapshot && snapshot.rows || []).filter(row => row.data >= range.from && row.data <= range.to);
  const map = new Map();
  const additive = [
    "spend_usd", "spend_brl", "impressions", "clicks", "video_3s", "video_p75", "google_conversions",
    "orders", "official_revenue_brl", "official_revenue_usd", "meta_spend", "meta_impressions", "meta_reach", "meta_unique_clicks",
    "meta_link_clicks", "meta_outbound_clicks", "meta_landing_page_views", "meta_video_plays", "meta_initiate_checkout", "meta_purchases", "meta_revenue"
  ];
  const weightedMeta = ["meta_hook_rate", "meta_midpoint_rate", "meta_hold_rate", "meta_p95_rate", "meta_completion_rate", "meta_avg_watch_time_seconds"];
  for (const row of source) {
    const key = normalizedCreative(row.criativo);
    if (!map.has(key)) map.set(key, {
      id: `fegsys-${stableId(key)}`,
      nome: row.criativo,
      platforms: new Set(), channels: new Set(), shops: new Set(), sales_platforms: new Set(), dates: new Set(),
      ...Object.fromEntries(additive.map(metric => [metric, 0])),
      ...Object.fromEntries(weightedMeta.map(metric => [`${metric}_numerator`, 0])),
      meta_rate_weight: 0, creative_id: "", ad_id: "", video_url: "", thumbnail_url: "", copy_text: "", copy_url: "",
      official_sales_available: false, meta_available: false
    });
    const item = map.get(key);
    for (const value of listValues(row.ad_platform)) item.platforms.add(value.toUpperCase());
    for (const value of listValues(row.ad_channel_type)) item.channels.add(value);
    for (const value of listValues(row.shops)) item.shops.add(value);
    for (const value of listValues(row.sales_platforms)) item.sales_platforms.add(value);
    item.dates.add(row.data);
    for (const metric of additive) item[metric] += +row[metric] || 0;
    const rateWeight = +row.meta_video_plays || 0;
    item.meta_rate_weight += rateWeight;
    for (const metric of weightedMeta) item[`${metric}_numerator`] += (+row[metric] || 0) * rateWeight;
    item.official_sales_available ||= !!row.official_sales_available;
    item.meta_available ||= !!row.meta_available;
    for (const field of ["creative_id", "ad_id", "video_url", "thumbnail_url", "copy_text", "copy_url"]) if (!item[field] && row[field]) item[field] = row[field];
  }
  const cards = [...map.values()].map(item => {
    const ctr = item.impressions ? item.clicks / item.impressions * 100 : 0;
    const cpc_brl = item.clicks ? item.spend_brl / item.clicks : 0;
    const cpm_brl = item.impressions ? item.spend_brl / item.impressions * 1000 : 0;
    const roas = item.spend_brl ? item.official_revenue_brl / item.spend_brl : 0;
    const conversions = item.orders;
    const revenue_brl = item.official_revenue_brl;
    const ticket_brl = item.orders ? item.official_revenue_brl / item.orders : 0;
    const ticket_usd = item.orders ? item.official_revenue_usd / item.orders : 0;
    const meta_frequency = item.meta_reach ? item.meta_impressions / item.meta_reach : 0;
    const meta_ctr = item.meta_impressions ? item.meta_link_clicks / item.meta_impressions * 100 : 0;
    const meta_cpc = item.meta_link_clicks ? item.meta_spend / item.meta_link_clicks : 0;
    const meta_cpm = item.meta_impressions ? item.meta_spend / item.meta_impressions * 1000 : 0;
    const meta_cplpv = item.meta_landing_page_views ? item.meta_spend / item.meta_landing_page_views : 0;
    const meta_cpi = item.meta_initiate_checkout ? item.meta_spend / item.meta_initiate_checkout : 0;
    const meta_cpa = item.meta_purchases ? item.meta_spend / item.meta_purchases : 0;
    const meta_roas = item.meta_spend ? item.meta_revenue / item.meta_spend : 0;
    const meta_aov = item.meta_purchases ? item.meta_revenue / item.meta_purchases : 0;
    const weighted = Object.fromEntries(weightedMeta.map(metric => [metric, item.meta_rate_weight ? item[`${metric}_numerator`] / item.meta_rate_weight : 0]));
    const { meta_rate_weight, ...clean } = item;
    for (const metric of weightedMeta) delete clean[`${metric}_numerator`];
    return {
      ...clean,
      platforms: [...item.platforms], channels: [...item.channels], shops: [...item.shops], sales_platforms: [...item.sales_platforms], dates: [...item.dates].sort(),
      conversions, revenue_brl, ticket_brl, ticket_usd, ctr, cpc_brl, cpm_brl, roas,
      meta_frequency, meta_ctr, meta_cpc, meta_cpm, meta_cplpv, meta_cpi, meta_cpa, meta_roas, meta_aov, ...weighted,
      mediaAvailable: !!item.video_url, copyAvailable: !!(item.copy_text || item.copy_url)
    };
  }).sort((a, b) => b.spend_brl - a.spend_brl || b.clicks - a.clicks || a.nome.localeCompare(b.nome, "pt-BR"));
  const totals = cards.reduce((total, card) => {
    for (const metric of additive) total[metric] += card[metric];
    for (const metric of weightedMeta) total[`${metric}_numerator`] += card[metric] * card.meta_video_plays;
    return total;
  }, { ...Object.fromEntries(additive.map(metric => [metric, 0])), ...Object.fromEntries(weightedMeta.map(metric => [`${metric}_numerator`, 0])) });
  totals.conversions = totals.orders;
  totals.revenue_brl = totals.official_revenue_brl;
  totals.ticket_brl = totals.orders ? totals.official_revenue_brl / totals.orders : 0;
  totals.ticket_usd = totals.orders ? totals.official_revenue_usd / totals.orders : 0;
  totals.ctr = totals.impressions ? totals.clicks / totals.impressions * 100 : 0;
  totals.cpc_brl = totals.clicks ? totals.spend_brl / totals.clicks : 0;
  totals.cpm_brl = totals.impressions ? totals.spend_brl / totals.impressions * 1000 : 0;
  totals.roas = totals.spend_brl ? totals.official_revenue_brl / totals.spend_brl : 0;
  totals.meta_frequency = totals.meta_reach ? totals.meta_impressions / totals.meta_reach : 0;
  totals.meta_ctr = totals.meta_impressions ? totals.meta_link_clicks / totals.meta_impressions * 100 : 0;
  totals.meta_cpc = totals.meta_link_clicks ? totals.meta_spend / totals.meta_link_clicks : 0;
  totals.meta_cpm = totals.meta_impressions ? totals.meta_spend / totals.meta_impressions * 1000 : 0;
  totals.meta_cplpv = totals.meta_landing_page_views ? totals.meta_spend / totals.meta_landing_page_views : 0;
  totals.meta_cpi = totals.meta_initiate_checkout ? totals.meta_spend / totals.meta_initiate_checkout : 0;
  totals.meta_cpa = totals.meta_purchases ? totals.meta_spend / totals.meta_purchases : 0;
  totals.meta_roas = totals.meta_spend ? totals.meta_revenue / totals.meta_spend : 0;
  totals.meta_aov = totals.meta_purchases ? totals.meta_revenue / totals.meta_purchases : 0;
  for (const metric of weightedMeta) {
    totals[metric] = totals.meta_video_plays ? totals[`${metric}_numerator`] / totals.meta_video_plays : 0;
    delete totals[`${metric}_numerator`];
  }
  return { cards, totals };
}
