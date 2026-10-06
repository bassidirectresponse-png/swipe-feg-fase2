import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { normalizeItem, offerData } from "../netlify/functions/manual-ingest-n8n.mjs";

const manifest = JSON.parse(readFileSync(new URL("../scripts/manifests/kittysupps-everwell-2026-10-06.json", import.meta.url), "utf8"));
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("KittySupps e Everwell entram em FEG Brands, com tags e sem métricas BM", () => {
  assert.equal(manifest.items.length, 2);
  for (const [index, raw] of manifest.items.entries()) {
    const item = normalizeItem(raw, index);
    assert.deepEqual(item.errors, []);
    assert.equal(item.kind, "brandsvalidated");
    assert.deepEqual(item.offerTags, ["new", "potential"]);
    assert.equal(item.activeAdsApprox, true);
    assert.equal(item.activeAdsCheckedAt, "2026-10-06");
    const data = offerData(item, {}, manifest.batchDate);
    assert.deepEqual(data.offerTags, ["new", "potential"]);
    assert.equal(data.bmAccess, false);
    assert.equal(data.adsHistory.length, 1);
    assert.equal(data.adsHistory[0].n, raw.activeAds);
    assert.equal(data.adsLibraryApprox, true);
    assert.equal(data.bmReports, undefined);
    assert.equal(data.bmSpend7d, undefined);
    assert.equal(data.bmRoas, undefined);
  }
  assert.equal(manifest.items[0].niche, "Pet");
  assert.equal(manifest.items[1].niche, "Saúde Cardiovascular");
  assert.equal(manifest.items[1].libraries.length, 2);
});

test("card sem BM mostra anúncios ativos, sem fabricar pontos de histórico", () => {
  assert.match(html, /extra:validated\?\(brandDraftCardSnapshot\(d\)\|\|brandAdsCardSnapshot\(d\)\):brandAdsCardSnapshot\(d\)/);
  assert.match(html, /hist\.length>=2\?sparkSvg\(hist\)/);
  assert.match(html, /1 leitura em/);
  assert.match(html, /offerTagsHtml\(d\)/);
});

test("importações antigas de Ofertas no Geral passam a usar FEG Brands", () => {
  const item = normalizeItem({ kind: "brandsgeneral", name: "Produto legado", niche: "Pet", libraries: [{ url: "https://www.facebook.com/ads/library/?q=produto" }] }, 0);
  assert.deepEqual(item.errors, []);
  assert.equal(item.kind, "brandsvalidated");
  assert.match(html, /if\(k==="brandsgeneral"\)return"brandsvalidated"/);
  assert.match(html, /location\.pathname\.replace\(\/\^\\\/feg-brands-geral/);
});
