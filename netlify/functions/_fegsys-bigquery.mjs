import { createHash, createSign } from "node:crypto";
import { getStore } from "@netlify/blobs";

const PROJECT_ID = "grupofeg-lakehouse";
const VIEW = "grupofeg-lakehouse.gold_feg.vw_ads_criativo_diario";
const STORE_NAME = "fegsys-megabrain";
const STORE_KEY = "daily-v1";
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

const QUERY = `
SELECT
  data,
  criativo,
  ad_platform,
  ad_channel_type,
  SUM(COALESCE(spend_usd, 0)) AS spend_usd,
  SUM(COALESCE(spend_brl, 0)) AS spend_brl,
  SUM(COALESCE(impressions, 0)) AS impressions,
  SUM(COALESCE(clicks, 0)) AS clicks,
  SUM(COALESCE(video_3s, 0)) AS video_3s,
  SUM(COALESCE(video_p75, 0)) AS video_p75,
  SUM(COALESCE(conversions, 0)) AS conversions
FROM \`${VIEW}\`
WHERE data >= DATE_SUB(CURRENT_DATE('America/Sao_Paulo'), INTERVAL ${QUERY_DAYS} DAY)
  AND criativo IS NOT NULL
  AND TRIM(criativo) != ''
GROUP BY data, criativo, ad_platform, ad_channel_type
ORDER BY data DESC, spend_brl DESC`;

function rowsFromResult(schema, rows) {
  const fields = (schema && schema.fields || []).map(field => field.name);
  return (rows || []).map(row => Object.fromEntries(fields.map((name, index) => [name, row.f && row.f[index] ? row.f[index].v : null])));
}

async function queryBigQuery(credential) {
  const token = await accessToken(credential);
  const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
  const start = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/queries`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: QUERY, useLegacySql: false, timeoutMs: 25_000, maxResults: 100_000 })
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
    conversions: +row.conversions || 0
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
      spend_usd: 0, spend_brl: 0, impressions: 0, clicks: 0, video_3s: 0, video_p75: 0, conversions: 0
    });
    const item = map.get(key);
    if (row.ad_platform) item.platforms.add(row.ad_platform);
    if (row.ad_channel_type) item.channels.add(row.ad_channel_type);
    item.dates.add(row.data);
    for (const metric of ["spend_usd", "spend_brl", "impressions", "clicks", "video_3s", "video_p75", "conversions"]) item[metric] += +row[metric] || 0;
  }
  const cards = [...map.values()].map(item => {
    const ctr = item.impressions ? item.clicks / item.impressions * 100 : 0;
    const cpc_brl = item.clicks ? item.spend_brl / item.clicks : 0;
    const cpm_brl = item.impressions ? item.spend_brl / item.impressions * 1000 : 0;
    return {
      ...item,
      platforms: [...item.platforms], channels: [...item.channels], dates: [...item.dates].sort(),
      ctr, cpc_brl, cpm_brl,
      mediaAvailable: false, copyAvailable: false
    };
  }).sort((a, b) => b.spend_brl - a.spend_brl || b.clicks - a.clicks || a.nome.localeCompare(b.nome, "pt-BR"));
  const totals = cards.reduce((total, card) => {
    for (const metric of ["spend_usd", "spend_brl", "impressions", "clicks", "video_3s", "video_p75", "conversions"]) total[metric] += card[metric];
    return total;
  }, { spend_usd: 0, spend_brl: 0, impressions: 0, clicks: 0, video_3s: 0, video_p75: 0, conversions: 0 });
  totals.ctr = totals.impressions ? totals.clicks / totals.impressions * 100 : 0;
  return { cards, totals };
}

