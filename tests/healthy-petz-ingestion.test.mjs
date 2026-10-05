import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { evidence, makeManifest, reports } from "../scripts/ingest_healthy_petz.mjs";

test("Healthy Petz preserva produto, páginas e anúncios sem inventar activeAds", () => {
  const item = makeManifest("https://example.com/cover.png").items[0];
  assert.equal(item.kind, "brandsvalidated");
  assert.equal(item.name, "Healthy Petz");
  assert.equal(item.niche, "Pet");
  assert.equal(item.format, "Premium Liquid Collagen");
  assert.deepEqual(item.domains.map(d => d.offer), [
    "http://shophealthypetz.com/pages/6-reasons",
    "https://www.shophealthypetz.com/products/liquidcollagen",
  ]);
  assert.match(item.libraries[0].url, /q=Healthy%2520Petz/);
  assert.deepEqual(item.ads.map(a => a.url), [
    "https://fb.me/adspreview/facebook/1W61FFNpL4BEhrH",
    "https://fb.me/adspreview/facebook/1WGi8XLnUdfd6rp",
    "https://fb.me/adspreview/facebook/1WvVOiejV5TBRaM",
  ]);
  assert.ok(item.ads.every(a => a.creativeName));
  assert.ok(!Object.hasOwn(item, "activeAds"));
});

test("BM guarda 10 prints e quatro recortes sem misturar produtos", () => {
  assert.equal(evidence.length, 11);
  assert.equal(new Set(evidence.map(e => e.file)).size, 11);
  assert.deepEqual(reports.map(r => r.totals.spend), [
    "US$ 50.722,24", "US$ 318.845,13", "US$ 644.172,56", "US$ 1.417.250,00",
  ]);
  assert.deepEqual(reports.map(r => r.totals.results), [
    "765 compras · conta BM", "4.668 compras · conta BM", "9.270 compras · conta BM", "23.119 compras · conta BM",
  ]);
  assert.ok(reports.every(r => r.totals.otherResults.includes("não exclusivos")));
  assert.ok(reports.every(r => r.totals.otherResults.includes("TAURINE")));
});

test("endpoint restringe a publicação às marcas explicitamente autorizadas", async () => {
  const source = await readFile(new URL("../netlify/functions/brands-cli-media.mjs", import.meta.url), "utf8");
  assert.match(source, /"healthy-petz": \{ name: "Healthy Petz", prints: 10, reports: 4 \}/);
  assert.match(source, /row\.data\?\.nomeOferta !== brand\.name/);
  assert.match(source, /reports\.length !== brand\.reports/);
  assert.match(source, /prints\.length !== brand\.prints/);
});
