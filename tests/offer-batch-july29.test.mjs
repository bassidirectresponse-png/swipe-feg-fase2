import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { offers } from "../scripts/offer_batch_july29_catalog.mjs";

const root = new URL("../", import.meta.url);
const html = await readFile(new URL("index.html", root), "utf8");
const batch = await readFile(new URL("netlify/functions/admin-offer-batch.mjs", root), "utf8");

function canonical(value) {
  if (!value) return "";
  const url = new URL(value);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid$|subid|sid|rtk|twrclid|hcid|tid$|click_id$|ref_id$|tblci$)/i.test(key)) {
      url.searchParams.delete(key);
    }
  }
  return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/+$/, "")}${url.search}`;
}

test("lote consolida ofertas sem repetir VSL, biblioteca ou anúncio", () => {
  assert.equal(offers.length, 14);
  assert.equal(new Set(offers.map(item => item.slug)).size, offers.length);
  for (const offer of offers) {
    for (const [label, values] of [
      ["VSL", offer.domains.map(item => item.offer).filter(Boolean)],
      ["biblioteca", offer.libraries.map(item => item.link).filter(Boolean)],
      ["anúncio", offer.creatives.map(item => item.link).filter(Boolean)],
    ]) {
      const keys = values.map(canonical);
      assert.equal(new Set(keys).size, keys.length, `${offer.name} possui ${label} repetido`);
    }
  }
});

test("ofertas criam criativos normais e preservam Lucas Rego e Mega Brain", () => {
  assert.match(html, /async function syncOfferCreatives\(offerRow\)/);
  assert.match(html, /d\.taboolaAds/);
  assert.match(html, /sourceOfferId:offerRow\.id/);
  assert.match(batch, /sectionOf\(row\) === "criativo"/);
  assert.match(batch, /isLucas\(row\.data\)/);
  assert.doesNotMatch(batch, /sectionOf\(row\) === "megabrain"/);
});

test("interface de ofertas não mostra comentários nem SEMrush", () => {
  const offerCard = html.match(/function cardHtml\(o\)\{[\s\S]*?\n\}/)?.[0] || "";
  const brandCard = html.match(/function brandCard\(o\)\{[\s\S]*?\n\}/)?.[0] || "";
  const offerView = html.match(/function openView\(id\)\{[\s\S]*?wireLightboxLinks\(\$\("#viewBody"\)\);/)?.[0] || "";
  assert.doesNotMatch(offerCard, /comentario|semrush/i);
  assert.doesNotMatch(brandCard, /comentario|semrush/i);
  assert.doesNotMatch(offerView, /comentario|semrush/i);
});

test("Mounjamelt não recebe VSL inventada", () => {
  const offer = offers.find(item => item.slug === "mounjamelt");
  assert.ok(offer);
  assert.equal(offer.domains[0].offer, "");
  assert.match(offer.domains[0].checkout, /buygoods\.com/);
});
