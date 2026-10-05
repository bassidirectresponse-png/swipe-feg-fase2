import assert from "node:assert/strict";
import test from "node:test";
import {evidence,makeManifest,reports} from "../scripts/ingest_get_jacked.mjs";

test("Get Jacked preserva o nicho, os três anúncios e a biblioteca exatos do lote",()=>{
  const item=makeManifest("https://example.com/product-cover.png").items[0];
  assert.equal(item.kind,"brandsvalidated");
  assert.equal(item.name,"Get Jacked");
  assert.equal(item.niche,"Saúde Masculina");
  assert.equal(item.image,"https://example.com/product-cover.png");
  assert.equal(item.domains[0].offer,"https://get-jacked.co/products/cayenne-pepper-softgels");
  assert.match(item.libraries[0].url,/q=get-jacked\.co/);
  assert.deepEqual(item.ads.map(ad=>ad.url),[
    "https://fb.me/adspreview/facebook/2iNpovrrxGba72l",
    "https://fb.me/adspreview/facebook/23KFo5r0l4dmfqa",
    "https://fb.me/adspreview/facebook/21BLNBEOQe7Hr6B",
  ]);
  assert.ok(item.ads.every(ad=>ad.creativeName&&ad.platform==="meta"));
  assert.equal(Object.hasOwn(item,"activeAds"),false);
});

test("recortes de BM mantêm gasto, vendas e ROAS separados, sem somar telas repetidas",()=>{
  assert.deepEqual(reports.map(r=>r.key),["2026-10-05-7d","2026-10-05-14d","2026-10-05-30d"]);
  assert.deepEqual(reports.map(r=>r.totals.spend),["US$ 25.940,55","US$ 43.475,58","US$ 100.697,86"]);
  assert.deepEqual(reports.map(r=>r.totals.results),["249 compras · BM","427 compras · BM","922 compras · BM"]);
  assert.deepEqual(reports.map(r=>r.totals.roas),["≈ 0,64 · BM","≈ 0,65 · BM","≈ 0,60 · BM"]);
  assert.deepEqual(reports.map(r=>r.campaigns.length),[6,7,7]);
  assert.ok(reports.every(r=>r.totals.otherResults.includes("não comprova atribuição exclusiva")));
});

test("capa e prints têm correspondência única e períodos auditáveis",()=>{
  assert.equal(evidence.length,11);
  assert.equal(new Set(evidence.map(item=>item.file)).size,11);
  assert.equal(evidence.filter(item=>item.cover).length,1);
  assert.deepEqual(evidence.filter(item=>!item.cover).map(item=>item.periodKey),["30d","7d","7d","7d","14d","settings","settings","settings","settings","settings"]);
});
