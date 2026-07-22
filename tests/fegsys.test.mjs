import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { aggregateSnapshot, buildQuery, mergeFegsysSources, resolveRange } from "../netlify/functions/_fegsys-bigquery.mjs";
import { matchDriveFiles, normalizeDriveName } from "../netlify/functions/_fegsys-drive.mjs";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const syncFn = await readFile(new URL("../netlify/functions/fegsys-sync.mjs", import.meta.url), "utf8");
const apiFn = await readFile(new URL("../netlify/functions/fegsys-megabrain.mjs", import.meta.url), "utf8");
const coreFn = await readFile(new URL("../netlify/functions/_fegsys-bigquery.mjs", import.meta.url), "utf8");
const driveFn = await readFile(new URL("../netlify/functions/_fegsys-drive.mjs", import.meta.url), "utf8");
const driveMediaFn = await readFile(new URL("../netlify/functions/fegsys-drive-media.mjs", import.meta.url), "utf8");
const securityFn = await readFile(new URL("../netlify/functions/_security.mjs", import.meta.url), "utf8");

test("JavaScript embutido do painel permanece sintaticamente válido", () => {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1]).filter(Boolean);
  for (const script of scripts) assert.doesNotThrow(() => new Function(script));
});

test("integração FEGSYS é horária, somente admin e não contém chave privada", () => {
  assert.match(syncFn, /schedule: "13 \* \* \* \*"/);
  assert.match(syncFn, /safeSyncError/);
  assert.match(syncFn, /sales: snapshot\.sourceStatus/);
  assert.match(apiFn, /authenticate/);
  assert.match(apiFn, /isAdmin/);
  assert.match(securityFn, /ADMIN_EMAILS/);
  assert.match(securityFn, /ADMIN_IDS/);
  assert.match(securityFn, /ff9e002e-7ed1-4bc3-8571-18ffcb0c95c3/);
  assert.match(securityFn, /x-feg-auth/);
  assert.match(html, /"X-Feg-Auth":"Bearer "\+accessToken/);
  assert.match(securityFn, /\/auth\/v1\/user/);
  assert.match(apiFn, /sessão não reconhecida/);
  assert.match(coreFn, /GOOGLE_SERVICE_ACCOUNT_JSON_B64/);
  assert.match(coreFn, /GOOGLE_SERVICE_ACCOUNT_EXPECTED_KEY_ID/);
  assert.match(coreFn, /não foi aprovada após rotação/);
  assert.doesNotMatch([html, syncFn, apiFn, coreFn, securityFn].join("\n"), /BEGIN PRIVATE KEY/);
  assert.match(driveFn, /drive\.readonly/);
  assert.match(driveMediaFn, /verifyDriveMedia/);
  assert.doesNotMatch([html, driveFn, driveMediaFn].join("\n"), /GOOGLE_SERVICE_ACCOUNT_JSON[^_]/);
});

test("Drive cruza somente a nomenclatura exata e mantém variações separadas", () => {
  const files = [
    { id: "video_exact_123", name: "BB 238.3 GB7.mp4", mimeType: "video/mp4", modifiedTime: "2026-07-20T10:00:00Z", webViewLink: "https://drive.google.com/file/d/video_exact_123/view" },
    { id: "video_variant_45", name: "BB 238.3 GB7 V2.mp4", mimeType: "video/mp4", modifiedTime: "2026-07-21T10:00:00Z" },
    { id: "copy_exact_1234", name: "COPY - BB 238.3 GB7", mimeType: "application/vnd.google-apps.document", modifiedTime: "2026-07-22T10:00:00Z", webViewLink: "https://docs.google.com/document/d/copy_exact_1234/edit" }
  ];
  assert.equal(normalizeDriveName("BB 238.3 GB7.mp4"), "bb 238 3 gb7");
  const match = matchDriveFiles("BB 238.3 GB7", files);
  assert.equal(match.status, "complete");
  assert.equal(match.video.id, "video_exact_123");
  assert.equal(match.copy.id, "copy_exact_1234");
  assert.equal(match.videoCandidates, 1);
});

test("Mega Brain manual e Mega Brain FEGSYS ficam em seções independentes", () => {
  assert.match(html, /key:"megabrainfegsys"/);
  assert.match(html, /mega-brain-fegsys/);
  assert.match(html, /Mega Brain - Fegsys/);
  assert.match(html, /activeSection==="megabrainfegsys"\?\[\.\.\.fegsysCards\]/);
  assert.doesNotMatch(html, /brainSource/);
  assert.match(html, /data-fegsys-period/);
  assert.match(html, /manual\.has\(brainNameKey\(card\.nome\)\)/);
  assert.match(html, /Mídia não vinculada/);
  assert.match(html, /Vídeo e copy não estão disponíveis na fonte/);
  assert.match(html, /salesReady\?"Pedidos":"Conversões Google"/);
  assert.match(html, /<span>Faturamento<\/span>/);
  assert.match(html, /<span>ROAS<\/span>/);
  assert.match(html, /<span>CPC<\/span>/);
  assert.match(html, /Reportado pela Meta/);
  assert.match(html, /function itemById\(id\)\{return fegsysCards\.find/);
  assert.match(html, /const o=itemById\(c\.dataset\.id\)/);
  assert.match(html, /const o=itemById\(id\);if\(!o\)return;/);
  assert.match(html, /Ver e copiar a copy/);
  assert.doesNotMatch(coreFn, /marts_feg\.mart_criativos_diario/);
  assert.match(coreFn, /quantidade_pedidos/);
  assert.match(coreFn, /faturamento_liquido_front/);
  assert.match(coreFn, /gold_feg\.fct_meta_ads_performance/);
});

test("pedidos e faturamento vêm da vw_ads_criativo_diario e a Meta complementa o card", () => {
  const base = [
    { data: "2026-07-20", criativo: "BB 238.3 GB7", ad_platform: "META", spend_brl: 66, impressions: 1200, clicks: 30, orders: 8, official_revenue_brl: 198, official_revenue_usd: 36, official_sales_available: true, video_url: "https://cdn.example/video.mp4", copy_text: "Copy original" },
    { data: "2026-07-20", criativo: "Google A", ad_platform: "GOOGLE", spend_brl: 27, impressions: 500, clicks: 10, orders: 2, official_revenue_brl: 54, official_sales_available: true }
  ];
  const meta = [
    { data: "2026-07-20", criativo: "BB 238.3 GB7", meta_spend: 60, meta_impressions: 1000, meta_reach: 800, meta_link_clicks: 25, meta_video_plays: 500, meta_initiate_checkout: 10, meta_purchases: 7, meta_revenue: 180, meta_hook_rate: .42, meta_hold_rate: .24 }
  ];
  const rows = mergeFegsysSources(base, [], meta);
  assert.equal(rows.find(row => row.criativo === "BB 238.3 GB7").conversions, 8);
  assert.equal(rows.find(row => row.criativo === "BB 238.3 GB7").meta_roas, 3);
  const snapshot = { rows };
  const result = aggregateSnapshot(snapshot, { from: "2026-07-20", to: "2026-07-20" });
  assert.equal(result.cards.length, 2);
  assert.equal(result.totals.spend_brl, 93);
  assert.equal(result.totals.impressions, 1700);
  assert.equal(result.totals.clicks, 40);
  assert.equal(result.totals.conversions, 10);
  assert.equal(result.totals.revenue_brl, 252);
  assert.equal(result.cards.find(card => card.nome === "BB 238.3 GB7").roas, 3);
  assert.equal(result.cards.find(card => card.nome === "BB 238.3 GB7").ticket_brl, 24.75);
  assert.equal(result.cards.find(card => card.nome === "BB 238.3 GB7").meta_cpi, 6);
  assert.equal(result.cards.find(card => card.nome === "BB 238.3 GB7").meta_hook_rate, .42);
  assert.equal(result.cards.find(card => card.nome === "BB 238.3 GB7").mediaAvailable, true);
  assert.equal(result.cards.find(card => card.nome === "BB 238.3 GB7").copyAvailable, true);
});

test("esquema atual da view não confunde conversões Google com pedidos oficiais", () => {
  const fields = ["data", "criativo", "ad_platform", "ad_channel_type", "spend_usd", "spend_brl", "impressions", "clicks", "video_3s", "video_p75", "conversions"].map(name => ({ name }));
  const plan = buildQuery(fields);
  assert.equal(plan.salesAvailable, false);
  assert.match(plan.salesError, /não fornece pedidos nem faturamento/);
  assert.match(plan.query, /SUM\(COALESCE\(SAFE_CAST\(`conversions` AS FLOAT64\), 0\)\) AS google_conversions/);
  assert.match(plan.query, /SUM\(0\) AS orders/);
});

test("view passa a fornecer resultados oficiais automaticamente quando purchases e revenue existirem", () => {
  const fields = ["data", "criativo", "spend_brl", "purchases", "revenue", "roas"].map(name => ({ name }));
  const plan = buildQuery(fields);
  assert.equal(plan.salesAvailable, true);
  assert.equal(plan.salesError, "");
  assert.match(plan.query, /SAFE_CAST\(`purchases` AS FLOAT64\)/);
  assert.match(plan.query, /SAFE_CAST\(`revenue` AS FLOAT64\)/);
});

test("período personalizado é normalizado mesmo com datas invertidas", () => {
  const range = resolveRange(new URLSearchParams({ period: "custom", from: "2026-07-20", to: "2026-07-10" }));
  assert.deepEqual(range, { preset: "custom", from: "2026-07-10", to: "2026-07-20" });
});

test("Drive indexa pastas compartilhadas e fornece thumbnail leve", () => {
  assert.match(driveFn, /corpora", "allDrives"/);
  assert.match(driveFn, /includeItemsFromAllDrives", "true"/);
  assert.match(driveFn, /supportsAllDrives", "true"/);
  assert.match(driveFn, /thumbnailLink,hasThumbnail/);
  assert.match(driveFn, /thumbnail_url: thumbnailUrl/);
  assert.match(driveFn, /1O1HoupHFxPPqHLLuAthkZzY6pb-6q2YO/);
  assert.match(driveFn, /1BVtaUOgSdpWFgU3TFZArlVuSB6FI-DF_/);
  assert.match(driveFn, /while \(queue\.length\)/);
  assert.match(driveFn, /pasta não acessível/);
});
