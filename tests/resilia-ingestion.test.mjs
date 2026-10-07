import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

process.env.N8N_MANUAL_INGEST_SECRET = "resilia-unit-test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only-service-key";
const { default: ingest, normalizeItem, offerData } = await import("../netlify/functions/manual-ingest-n8n.mjs");
const manifest = JSON.parse(readFileSync(new URL("../scripts/manifests/resilia-2026-10-07.json", import.meta.url), "utf8"));
const raw = manifest.items[0];

test("Resilia guarda a capa e os três Top ads, sem métricas ou vídeos inventados", () => {
  const item = normalizeItem(raw, 0);
  assert.deepEqual(item.errors, []);
  assert.equal(item.createCreativeCards, false);
  const data = offerData(item, {}, manifest.batchDate);
  assert.equal(data.bmAccess, false);
  assert.equal(data.nicho, "SUPPLEMENTS");
  assert.deepEqual(data.offerTags, ["insider"]);
  assert.equal(data.bmReports, undefined);
  assert.equal(data.numAdsAtivos, "");
  assert.equal(data.adsHistory, undefined);
  assert.equal(data.bibliotecas[0].link, raw.libraries[0].url);
  assert.equal(data.dominios[0].linkDominio, raw.domains[0].offer);
  assert.deepEqual(data.brandTopAds.map(ad => ad.link), raw.ads.map(ad => ad.url));
  assert.equal(data.criativos.length, 3);
  assert.ok(data.criativos.every(ad => !ad.video));
  const again = offerData(item, data, manifest.batchDate);
  assert.equal(again.brandTopAds.length, 3);
  assert.equal(again.criativos.length, 3);
  const cover = readFileSync(new URL("../assets/brands/resilia/cover.png", import.meta.url));
  assert.ok(cover.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])));
});

test("aplicação anexa anúncios sem criar cards criativos e reexecução não duplica links", async () => {
  const originalFetch = globalThis.fetch;
  const rows = [];
  let writes = 0;
  globalThis.fetch = async (url, options = {}) => {
    if (options.method === "POST" && String(url).includes("/offers?")) {
      writes++;
      const row = { id: "resilia-created", ...JSON.parse(options.body) };
      rows.push(row);
      return Response.json([row]);
    }
    if (options.method === "PATCH") {
      writes++;
      rows[0].data = JSON.parse(options.body).data;
      return Response.json([rows[0]]);
    }
    if (String(url).includes("swipe_updates")) return Response.json([]);
    return Response.json(rows);
  };
  const request = mode => new Request("https://swipe.fegsys.com/.netlify/functions/manual-ingest-n8n", {
    method: "POST", headers: { Authorization: "Bearer resilia-unit-test", "Content-Type": "application/json" },
    body: JSON.stringify({ ...manifest, mode }),
  });
  try {
    const validation = await (await ingest(request("validate"))).json();
    assert.equal(validation.ok, true);
    assert.equal(validation.totals.newCards, 1);
    assert.equal(validation.totals.newAds, 0);
    assert.equal(validation.plan[0].linkedAds, 3);
    assert.equal(writes, 0);
    const applied = await (await ingest(request("apply"))).json();
    assert.equal(applied.ok, true);
    assert.equal(applied.applied.length, 1);
    assert.equal(writes, 1);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].data.kind, "brandsvalidated");
    const repeated = await (await ingest(request("validate"))).json();
    assert.equal(repeated.totals.newCards, 0);
    assert.equal(repeated.totals.newAds, 0);
    assert.equal(repeated.plan[0].linkedAds, 0);
    assert.equal(repeated.plan[0].duplicatesSkipped, 3);
    await ingest(request("apply"));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].data.criativos.length, 3);
    assert.equal(rows[0].data.brandTopAds.length, 3);
  } finally { globalThis.fetch = originalFetch; }
});

test("importação padrão continua criando criativos e modo somente links exige booleano e oferta", () => {
  const { createCreativeCards, ...defaultRaw } = raw;
  assert.equal(normalizeItem(defaultRaw, 0).createCreativeCards, true);
  assert.ok(normalizeItem({ ...raw, createCreativeCards: "false" }, 0).errors.some(error => error.includes("booleano")));
  assert.ok(normalizeItem({ ...raw, kind: "criativo" }, 0).errors.some(error => error.includes("exige uma oferta")));
});
