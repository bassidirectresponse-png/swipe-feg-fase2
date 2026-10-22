import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { normalizeItem, offerData } from "../netlify/functions/manual-ingest-n8n.mjs";
import { evidence, makeManifest, reports } from "../scripts/ingest_rootvana_pulse_flow.mjs";

const source = readFileSync(new URL("../netlify/functions/brands-cli-media.mjs", import.meta.url), "utf8");
const manifestFile = JSON.parse(readFileSync(new URL("../scripts/manifests/rootvana-pulse-flow-2026-10-21.json", import.meta.url), "utf8"));

test("Rootvana Pulse Flow preserva marca, SUPPLEMENTS, Funil Winner, página e três Top Ads", () => {
  const item = makeManifest("https://example.com/cover.png").items[0];
  assert.equal(item.kind, "brandsvalidated");
  assert.equal(item.name, "Pulse Flow");
  assert.equal(item.brand, "Rootvana");
  assert.equal(item.niche, "SUPPLEMENTS");
  assert.equal(item.createCreativeCards, false);
  assert.equal(item.libraries[0].name, "Funil Winner");
  assert.equal(item.domains[0].offer, "https://tryrootvana.com/pages/listicle-2");
  assert.deepEqual(item.ads.map(ad => ad.url), [
    "https://fb.me/adspreview/facebook/1UeM1RO1dqbK6ai",
    "https://fb.me/adspreview/facebook/24RB2z5S7LOwlyd",
    "https://fb.me/adspreview/facebook/1UkcmNa0tUQkJcQ",
  ]);
  assert.ok(item.ads.every(ad => ad.creativeName && ad.platform === "meta"));

  const normalized = normalizeItem(manifestFile.items[0], 0);
  assert.deepEqual(normalized.errors, []);
  const data = offerData(normalized, {}, manifestFile.batchDate);
  assert.equal(data.bibliotecas[0].nome, "Funil Winner");
  assert.equal(data.brandTopAds.length, 3);
  const cover = readFileSync(new URL("../assets/brands/rootvana-pulse-flow/cover.png", import.meta.url));
  assert.ok(cover.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])));
});

test("BM Rootvana registra os 10 prints e os 4 períodos (1d, 7d, 14d, 30d) auditáveis", () => {
  assert.equal(evidence.length, 11);
  assert.equal(new Set(evidence.map(e => e.file)).size, 11);
  assert.equal(reports.length, 4);
  assert.deepEqual(reports.map(r => r.totals.spend), [
    "US$ 451,87",
    "US$ 3.284,91",
    "US$ 7.106,86",
    "US$ 12.635,42",
  ]);
  assert.deepEqual(reports.map(r => r.totals.roas), ["1,14", "0,75", "0,62", "0,71"]);
  assert.deepEqual(reports.map(r => r.totals.results), [
    "8 compras",
    "38 compras",
    "66 compras",
    "118 compras",
  ]);
  assert.deepEqual(reports.map(r => r.totals.avgConversion), [
    "US$ 64,19",
    "US$ 65,21",
    "US$ 66,46",
    "US$ 76,18",
  ]);
  assert.match(source, /"rootvana-pulse-flow": \{ name: "Pulse Flow", prints: 10, reports: 4 \}/);
});
