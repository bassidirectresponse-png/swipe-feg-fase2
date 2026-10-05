import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { evidence, makeManifest, reports } from "../scripts/ingest_tryclover.mjs";

test("Tryclover preserva Pet, página e três anúncios sem inventar ativos", () => {
  const item = makeManifest("https://example.com/cover.png").items[0];
  assert.equal(item.kind, "brandsvalidated");
  assert.equal(item.name, "Tryclover");
  assert.equal(item.niche, "Pet");
  assert.equal(item.domains[0].offer, "https://tryclover.co/products/collagen");
  assert.deepEqual(item.ads.map(a => a.url), [
    "https://fb.me/adspreview/facebook/1VGrOpQHPHWhE2y",
    "https://fb.me/adspreview/facebook/1T9CmplQb8fVa56",
    "https://fb.me/adspreview/facebook/1RNdCWWfXAfEGxu",
  ]);
  assert.ok(item.ads.every(a => a.creativeName));
  assert.ok(!Object.hasOwn(item, "activeAds"));
});

test("BM exclui outra conta e duplicata; quatro períodos são auditáveis", () => {
  assert.equal(evidence.length, 14);
  assert.equal(new Set(evidence.map(e => e.file)).size, 14);
  assert.ok(evidence.every(e => !e.file.includes("ed8cb1e6") && !e.file.includes("dd2cd7e4") && !e.file.includes("47d35d2b")));
  assert.deepEqual(reports.map(r => r.totals.spend), [
    "US$ 6.373,99", "US$ 45.419,50", "US$ 83.271,79", "US$ 145.577,51",
  ]);
  assert.deepEqual(reports.map(r => r.totals.results), [
    "176 compras · conta BM", "1.302 compras · conta BM", "1.952 compras · conta BM", "3.153 compras · conta BM",
  ]);
  assert.ok(reports.every(r => r.totals.roas.includes("calculado")));
});

test("rota permite Tryclover com treze prints e quatro relatórios", async () => {
  const source = await readFile(new URL("../netlify/functions/brands-cli-media.mjs", import.meta.url), "utf8");
  assert.match(source, /"tryclover": \{ name: "Tryclover", prints: 13, reports: 4 \}/);
  assert.match(source, /row\.data\?\.nomeOferta !== brand\.name/);
});
