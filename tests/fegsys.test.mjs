import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { aggregateSnapshot, resolveRange } from "../netlify/functions/_fegsys-bigquery.mjs";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const syncFn = await readFile(new URL("../netlify/functions/fegsys-sync.mjs", import.meta.url), "utf8");
const apiFn = await readFile(new URL("../netlify/functions/fegsys-megabrain.mjs", import.meta.url), "utf8");
const coreFn = await readFile(new URL("../netlify/functions/_fegsys-bigquery.mjs", import.meta.url), "utf8");

test("integração FEGSYS é horária, somente admin e não contém chave privada", () => {
  assert.match(syncFn, /schedule: "13 \* \* \* \*"/);
  assert.match(syncFn, /error: message/);
  assert.match(apiFn, /ADMIN_EMAILS/);
  assert.match(apiFn, /ADMIN_IDS/);
  assert.match(apiFn, /ff9e002e-7ed1-4bc3-8571-18ffcb0c95c3/);
  assert.match(apiFn, /sessão do administrador não reconhecida/);
  assert.match(coreFn, /GOOGLE_SERVICE_ACCOUNT_JSON_B64/);
  assert.doesNotMatch([html, syncFn, apiFn, coreFn].join("\n"), /BEGIN PRIVATE KEY/);
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
  assert.match(html, /<span>Vendas<\/span>/);
  assert.match(html, /<span>ROAS<\/span>/);
  assert.match(html, /<span>CPC<\/span>/);
});

test("agregação diária soma métricas e separa o período escolhido", () => {
  const snapshot = { rows: [
    { data: "2026-07-19", criativo: "BB 238.3 GB7", ad_platform: "META", ad_channel_type: "", spend_usd: 10, spend_brl: 55, impressions: 1000, clicks: 20, video_3s: 300, video_p75: 80, conversions: 0 },
    { data: "2026-07-20", criativo: "BB 238.3 GB7", ad_platform: "META", ad_channel_type: "", spend_usd: 12, spend_brl: 66, impressions: 1200, clicks: 30, video_3s: 400, video_p75: 100, conversions: 8, revenue_brl: 198, video_url: "https://cdn.example/video.mp4", copy_text: "Copy original" },
    { data: "2026-07-20", criativo: "Google A", ad_platform: "GOOGLE", ad_channel_type: "VIDEO", spend_usd: 5, spend_brl: 27, impressions: 500, clicks: 10, video_3s: 0, video_p75: 0, conversions: 2 }
  ] };
  const result = aggregateSnapshot(snapshot, { from: "2026-07-20", to: "2026-07-20" });
  assert.equal(result.cards.length, 2);
  assert.equal(result.totals.spend_brl, 93);
  assert.equal(result.totals.impressions, 1700);
  assert.equal(result.totals.clicks, 40);
  assert.equal(result.totals.conversions, 10);
  assert.equal(result.cards.find(card => card.nome === "BB 238.3 GB7").roas, 3);
  assert.equal(result.cards.find(card => card.nome === "BB 238.3 GB7").mediaAvailable, true);
  assert.equal(result.cards.find(card => card.nome === "BB 238.3 GB7").copyAvailable, true);
});

test("período personalizado é normalizado mesmo com datas invertidas", () => {
  const range = resolveRange(new URLSearchParams({ period: "custom", from: "2026-07-20", to: "2026-07-10" }));
  assert.deepEqual(range, { preset: "custom", from: "2026-07-10", to: "2026-07-20" });
});
