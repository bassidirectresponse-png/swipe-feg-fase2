import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { normalizeItem, offerData } from "../netlify/functions/manual-ingest-n8n.mjs";

const manifest = JSON.parse(readFileSync(new URL("../scripts/manifests/noverly-2026-10-07.json", import.meta.url), "utf8"));

test("Noverly entra em SUPPLEMENTS com Insider, sem BM e sem fabricar anúncios ativos", () => {
  assert.equal(manifest.items.length, 1);
  const item = normalizeItem(manifest.items[0], 0);
  assert.deepEqual(item.errors, []);
  const data = offerData(item, {}, manifest.batchDate);
  assert.equal(data.kind, "brandsvalidated");
  assert.equal(data.nomeOferta, "Noverly");
  assert.equal(data.nicho, "SUPPLEMENTS");
  assert.equal(data.bmAccess, false);
  assert.deepEqual(data.offerTags, ["insider"]);
  assert.equal(item.activeAds, null);
  assert.equal(data.numAdsAtivos, "");
  assert.equal(data.adsHistory, undefined);
  assert.equal(data.bmReports, undefined);
  assert.equal(data.bmSpend7d, undefined);
  assert.equal(data.bmRoas, undefined);
  assert.equal(data.bibliotecas.length, 3);
  for (const library of data.bibliotecas) {
    assert.equal(new URL(library.link).searchParams.get("active_status"), "all");
    assert.match(library.nome, /todos os status \(informados\)/);
  }
  assert.equal(data.dominios.length, 4);
  assert.deepEqual(data.dominios.map(page => page.linkDominio), manifest.items[0].domains.map(page => page.offer));
  assert.equal(data.criativos.length, 0);
  assert.equal(data.imagemProduto, "https://swipe.fegsys.com/assets/brands/noverly/cover.png");
  const cover = readFileSync(new URL("../assets/brands/noverly/cover.png", import.meta.url));
  assert.ok(cover.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])));
});

test("Insider continua restrita a cards de marcas e não aceita tags arbitrárias", () => {
  assert.ok(normalizeItem({ ...manifest.items[0], kind: "oferta" }, 0).errors.includes("item 1: offerTags inválidas"));
  assert.ok(normalizeItem({ ...manifest.items[0], offerTags: ["admin"] }, 0).errors.includes("item 1: offerTags inválidas"));
});
