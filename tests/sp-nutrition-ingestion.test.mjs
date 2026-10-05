import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { evidence, makeManifest, reports } from "../scripts/ingest_sp_nutrition.mjs";

test("SP Nutrition preserva o nicho, a página e os três anúncios informados", () => {
  const item = makeManifest("https://example.com/cover.png").items[0];
  assert.equal(item.kind, "brandsvalidated");
  assert.equal(item.name, "SP Nutrition");
  assert.equal(item.niche, "Saúde e Suplemento");
  assert.equal(item.format, "Magnesium Bisglycinate Gummies");
  assert.equal(item.domains[0].offer, "https://spnutrition-us.com/pages/advertorial-magnesium");
  assert.match(item.libraries[0].url, /view_all_page_id=100168256385357/);
  assert.deepEqual(item.ads.map(ad => ad.url), [
    "https://fb.me/adspreview/facebook/269owN9fu7Ncpt7",
    "https://fb.me/adspreview/facebook/22SvRAthkpa2nJh",
    "https://fb.me/adspreview/facebook/2bvx0qzp5D3VmOJ",
  ]);
  assert.ok(item.ads.every(ad => ad.creativeName));
  assert.ok(!Object.hasOwn(item, "activeAds"));
});

test("BM separa os quatro recortes e rotula métricas incompletas", () => {
  assert.equal(evidence.length, 12);
  assert.equal(new Set(evidence.map(item => item.file)).size, 12);
  assert.deepEqual(evidence.filter(item => !item.cover).map(item => item.periodKey),
    ["7d", "1d", "14d", "7d", "30d", "7d", "settings", "settings", "settings", "settings", "settings"]);
  assert.deepEqual(reports.map(r => r.totals.spend),
    ["US$ 172.980,30", "US$ 1.199.382,55", "US$ 2.384.551,80", "US$ 4.718.302,21"]);
  assert.deepEqual(reports.map(r => r.totals.results),
    ["≥ 2.269 compras · parcial", "≥ 15.058 compras · parcial", "≥ 30.115 compras · parcial", "≥ 60.455 compras · parcial"]);
  assert.ok(reports.every(r => r.totals.roas.includes("amostra parcial")));
  assert.ok(reports.every(r => r.totals.otherResults.includes("não atribuir")));
});

test("rota CLI mantém sessão cifrada e prints privados", async () => {
  const root = new URL("../", import.meta.url);
  const workflow = await readFile(new URL(".github/workflows/brands-cli-token.yml", root), "utf8");
  const ingest = await readFile(new URL("netlify/functions/manual-ingest-n8n.mjs", root), "utf8");
  const media = await readFile(new URL("netlify/functions/brands-cli-media.mjs", root), "utf8");
  assert.match(workflow, /createCipheriv\('aes-256-gcm'/);
  assert.match(workflow, /publicEncrypt/);
  assert.match(ingest, /verifyGithubAutomationToken\(credential, new Set\(\["brands-cli-token\.yml"\]\)\)/);
  assert.match(ingest, /division: "fegbrands"/);
  assert.match(media, /name: "admin-bm-evidence"/);
  assert.match(media, /row\.data\?\.nomeOferta !== "SP Nutrition"/);
  assert.match(media, /"data->>sourceOfferId"/);
  assert.doesNotMatch(media, /SUPABASE_SERVICE_ROLE_KEY\s*=/);
});
