import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { evidence, makeManifest, reports } from "../scripts/ingest_pomegranate.mjs";

test("Pomegranate preserva marca, nicho, duas páginas e três anúncios", () => {
  const item = makeManifest("https://example.com/cover.png").items[0];
  assert.equal(item.kind, "brandsvalidated");
  assert.equal(item.name, "Pomegranate");
  assert.equal(item.brand, "Auniva");
  assert.equal(item.niche, "Saúde Geral/Nutrição");
  assert.deepEqual(item.domains.map(d => d.offer), [
    "https://auniva.co/products/pomegranate-11",
    "https://auniva.co/products/pomegranate-89",
  ]);
  assert.equal(item.libraries[0].url, "https://www.facebook.com/profile.php?id=61586352600860#");
  assert.deepEqual(item.ads.map(a => a.url), [
    "https://fb.me/adspreview/facebook/2bS4LcAOWAojzqT",
    "https://fb.me/adspreview/facebook/1Wn3KsVl17DR7ps",
    "https://fb.me/adspreview/facebook/2uBpK1jhZqk6Oib",
  ]);
  assert.ok(item.ads.every(a => a.creativeName));
  assert.ok(!Object.hasOwn(item, "activeAds"));
});

test("BM mantém nove prints e três recortes sem ROAS inventado", () => {
  assert.equal(evidence.length, 10);
  assert.equal(new Set(evidence.map(e => e.file)).size, 10);
  assert.deepEqual(reports.map(r => r.totals.spend), [
    "US$ 1.034.166,98", "US$ 2.132.668,94", "US$ 3.192.872,17",
  ]);
  assert.ok(reports.every(r => r.totals.roas === "Não informado"));
  assert.ok(reports.every(r => r.totals.results.includes("amostra de 5 campanhas")));
});

test("rota permite Pomegranate com contagem exata de relatórios e prints", async () => {
  const source = await readFile(new URL("../netlify/functions/brands-cli-media.mjs", import.meta.url), "utf8");
  assert.match(source, /"pomegranate": \{ name: "Pomegranate", prints: 9, reports: 3 \}/);
  assert.match(source, /reports\.length !== brand\.reports/);
  assert.match(source, /prints\.length !== brand\.prints/);
});
