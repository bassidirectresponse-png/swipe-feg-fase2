import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { evidence, makeManifest, reports } from "../scripts/ingest_auniva_amla.mjs";

const source = readFileSync(new URL("../netlify/functions/brands-cli-media.mjs", import.meta.url), "utf8");

test("AMLA preserva marca, nicho, página e três anúncios de origem", () => {
  const item = makeManifest("https://example.com/cover.png").items[0];
  assert.equal(item.kind, "brandsvalidated");
  assert.equal(item.name, "AMLA");
  assert.equal(item.brand, "Auniva");
  assert.equal(item.niche, "Saúde Cardiovascular");
  assert.equal(item.domains[0].offer, "https://auniva.co/products/amla-74");
  assert.equal(item.ads.length, 3);
  assert.ok(item.ads.every(ad => ad.creativeName && ad.platform === "meta"));
  assert.equal(new Set(item.ads.map(ad => ad.url)).size, 3);
});

test("AMLA guarda os dez prints BM sem inventar ROAS ou anúncios ativos", () => {
  assert.equal(evidence.length, 11);
  assert.equal(reports.length, 4);
  assert.deepEqual(reports.map(report => report.totals.spend), ["US$ 11.809,10", "US$ 244.470,57", "US$ 629.357,27", "US$ 1.589.837,19"]);
  assert.ok(reports.every(report => report.totals.roas === "Não informado"));
  assert.equal(makeManifest("https://example.com/cover.png").items[0].activeAds, undefined);
  assert.match(source, /"auniva-amla": \{ name: "AMLA", prints: 10, reports: 4 \}/);
});
