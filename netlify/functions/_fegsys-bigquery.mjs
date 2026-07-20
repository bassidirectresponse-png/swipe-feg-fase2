import { createHash, createSign } from "node:crypto";
import { getStore } from "@netlify/blobs";

const PROJECT_ID = "grupofeg-lakehouse";
const VIEW = "grupofeg-lakehouse.gold_feg.vw_ads_criativo_diario";
const STORE_NAME = "fegsys-megabrain";
const STORE_KEY = "daily-v2";
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
  data: ["data", "date", "dt", "day"],
  criativo: ["criativo", "creative", "creative_name", "nome_criativo", "ad_name"],
  ad_platform: ["ad_platform", "platform", "plataforma"],
  ad_channel_type: ["ad_channel_type", "channel_type", "canal"],
  spend_usd: ["spend_usd", "valor_usado_usd", "investment_usd"],
  spend_brl: ["spend_brl", "valor_usado", "valor_usado_brl", "investment_brl", "spend"],
  impressions: ["impressions", "impressoes"],
  clicks: ["clicks", "cliques", "link_clicks"],
  video_3s: ["video_3s", "video_plays_3s"],
  video_p75: ["video_p75", "video_plays_75"],
  conversions: ["vendas", "sales", "purchases", "compras", "conversions", "results"],
  revenue_brl: ["faturamento", "faturamento_brl", "receita", "receita_brl", "revenue", "revenue_brl", "purchase_value"],
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

function buildQuery(fields) {
  const f = fieldMap(fields);
  if (!f.data || !f.criativo) throw new Error("a view precisa conter as colunas de data e nome do criativo");
  const spendWeight = f.spend_brl || f.spend_usd;
  const sourceRoas = f.roas
    ? `SAFE_DIVIDE(SUM(${numberExpr(f.roas)} * ${numberExpr(spendWeight)}), NULLIF(SUM(${numberExpr(spendWeight)}), 0))`
    : "0";
  return `
SELECT
  DATE(${quoteField(f.data)}) AS data,
  CAST(${quoteField(f.criativo)} AS STRING) AS criativo,
  ${f.ad_platform ? `CAST(${quoteField(f.ad_platform)} AS STRING)` : "''"} AS ad_platform,
  ${f.ad_channel_type ? `CAST(${quoteField(f.ad_channel_type)} AS STRING)` : "''"} AS ad_channel_type,
  SUM(${numberExpr(f.spend_usd)}) AS spend_usd,
  SUM(${numberExpr(f.spend_brl)}) AS spend_brl,
  SUM(${numberExpr(f.impressions)}) AS impressions,
  SUM(${numberExpr(f.clicks)}) AS clicks,
  SUM(${numberExpr(f.video_3s)}) AS video_3s,
  SUM(${numberExpr(f.video_p75)}) AS video_p75,
  SUM(${numberExpr(f.conversions)}) AS conversions,
  SUM(${numberExpr(f.revenue_brl)}) AS revenue_brl,
  ${sourceRoas} AS source_roas,
  ${textExpr(f.video_url)} AS video_url,
  ${textExpr(f.thumbnail_url)} AS thumbnail_url,
  ${textExpr(f.copy_text)} AS copy_text,
  ${textExpr(f.copy_url)} AS copy_url
FROM \`${VIEW}\`
WHERE DATE(${quoteField(f.data)}) >= DATE_SUB(CURRENT_DATE('America/Sao_Paulo'), INTERVAL ${QUERY_DAYS} DAY)
  AND ${quoteField(f.criativo)} IS NOT NULL
  AND TRIM(CAST(${quoteField(f.criativo)} AS STRING)) != ''
GROUP BY 1, 2, 3, 4
ORDER BY data DESC, spend_brl DESC`;
}

function rowsFromResult(schema, rows) {
  const fields = (schema && schema.fields || []).map(field => field.name);
  return (rows || []).map(row => Object.fromEntries(fields.map((name, index) => [name, row.f && row.f[index] ? row.f[index].v : null])));
}

async function queryBigQuery(credential) {
  const token = await accessToken(credential);
  const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
  const table = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/datasets/gold_feg/tables/vw_ads_criativo_diario`, { headers });
  const metadata = await table.json().catch(() => ({}));
  if (!table.ok) throw new Error(`não foi possível ler a estrutura da view (${table.status})`);
  const query = buildQuery(metadata.schema && metadata.schema.fields);
  const start = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/queries`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, useLegacySql: false, timeoutMs: 25_000, maxResults: 100_000 })
  });
  let result = await start.json().catch(() => ({}));
  if (!start.ok) throw new Error(`consulta BigQuery recusada (${start.status})`);
  const job = result.jobReference || {};
  for (let attempt = 0; result.jobComplete === false && attempt < 12; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 750));
    const url = new URL(`https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/queries/${job.jobId}`);
    if (job.location) url.searchParams.set("location", job.location);
    url.searchParams.set("timeoutMs", "5000");
    url.searchParams.set("maxResults", "100000");
    const poll = await fetch(url, { headers });
    result = await poll.json().catch(() => ({}));
    if (!poll.ok) throw new Error(`consulta BigQuery interrompida (${poll.status})`);
  }
  if (result.jobComplete === false) throw new Error("consulta BigQuery excedeu o tempo seguro");
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
    if (!page.ok) throw new Error(`paginação BigQuery interrompida (${page.status})`);
    rows = rows.concat(rowsFromResult(next.schema || schema, next.rows));
    pageToken = next.pageToken;
  }
  return rows.map(row => ({
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
    conversions: +row.conversions || 0,
    revenue_brl: +row.revenue_brl || 0,
    source_roas: +row.source_roas || 0,
    video_url: String(row.video_url || "").trim(),
    thumbnail_url: String(row.thumbnail_url || "").trim(),
    copy_text: String(row.copy_text || "").trim(),
    copy_url: String(row.copy_url || "").trim()
  })).filter(row => row.data && row.criativo);
}

export async function refreshSnapshot() {
  const credential = readCredential();
  if (!credential) throw new Error("credencial do BigQuery ainda não configurada");
  const rows = await queryBigQuery(credential);
  const dates = rows.map(row => row.data).sort();
  const snapshot = {
    version: 1,
    syncedAt: new Date().toISOString(),
    oldestDate: dates[0] || "",
    newestDate: dates[dates.length - 1] || "",
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
  for (const row of source) {
    const key = row.criativo.trim().toLocaleLowerCase("pt-BR");
    if (!map.has(key)) map.set(key, {
      id: `fegsys-${stableId(key)}`,
      nome: row.criativo,
      platforms: new Set(), channels: new Set(), dates: new Set(),
      spend_usd: 0, spend_brl: 0, impressions: 0, clicks: 0, video_3s: 0, video_p75: 0, conversions: 0, revenue_brl: 0,
      source_roas_numerator: 0, source_roas_weight: 0, video_url: "", thumbnail_url: "", copy_text: "", copy_url: ""
    });
    const item = map.get(key);
    if (row.ad_platform) item.platforms.add(row.ad_platform);
    if (row.ad_channel_type) item.channels.add(row.ad_channel_type);
    item.dates.add(row.data);
    for (const metric of ["spend_usd", "spend_brl", "impressions", "clicks", "video_3s", "video_p75", "conversions", "revenue_brl"]) item[metric] += +row[metric] || 0;
    const weight = +row.spend_brl || +row.spend_usd || 0;
    item.source_roas_numerator += (+row.source_roas || 0) * weight;
    item.source_roas_weight += weight;
    for (const field of ["video_url", "thumbnail_url", "copy_text", "copy_url"]) if (!item[field] && row[field]) item[field] = row[field];
  }
  const cards = [...map.values()].map(item => {
    const ctr = item.impressions ? item.clicks / item.impressions * 100 : 0;
    const cpc_brl = item.clicks ? item.spend_brl / item.clicks : 0;
    const cpm_brl = item.impressions ? item.spend_brl / item.impressions * 1000 : 0;
    const roas = item.spend_brl && item.revenue_brl ? item.revenue_brl / item.spend_brl : (item.source_roas_weight ? item.source_roas_numerator / item.source_roas_weight : 0);
    return {
      ...item,
      platforms: [...item.platforms], channels: [...item.channels], dates: [...item.dates].sort(),
      ctr, cpc_brl, cpm_brl, roas,
      mediaAvailable: !!item.video_url, copyAvailable: !!(item.copy_text || item.copy_url)
    };
  }).sort((a, b) => b.spend_brl - a.spend_brl || b.clicks - a.clicks || a.nome.localeCompare(b.nome, "pt-BR"));
  const totals = cards.reduce((total, card) => {
    for (const metric of ["spend_usd", "spend_brl", "impressions", "clicks", "video_3s", "video_p75", "conversions", "revenue_brl"]) total[metric] += card[metric];
    return total;
  }, { spend_usd: 0, spend_brl: 0, impressions: 0, clicks: 0, video_3s: 0, video_p75: 0, conversions: 0, revenue_brl: 0 });
  totals.ctr = totals.impressions ? totals.clicks / totals.impressions * 100 : 0;
  totals.cpc_brl = totals.clicks ? totals.spend_brl / totals.clicks : 0;
  totals.roas = totals.spend_brl && totals.revenue_brl
    ? totals.revenue_brl / totals.spend_brl
    : (totals.spend_brl ? cards.reduce((sum, card) => sum + card.roas * card.spend_brl, 0) / totals.spend_brl : 0);
  return { cards, totals };
}
