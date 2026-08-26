import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const html = await readFile(new URL("index.html", root), "utf8");
const endpoint = await readFile(new URL("netlify/functions/admin-creative-import.mjs", root), "utf8");
const preparer = await readFile(new URL("scripts/prepare_spy_creatives_aug26.mjs", root), "utf8");

test("spy folder importer validates a manifest and assigns standard sequential names", () => {
  assert.match(html, /SPY_BATCH_MANIFEST="swipe-import\.json"/);
  assert.match(html, /buildSpyCreativeManifest\(files,existingSources,existingHashes,existingLinks\)/);
  assert.match(html, /nextCreativeNamesFor\(prepared\)/);
  assert.match(html, /webkitdirectory directory/);
  assert.match(html, /sourceHash:record\?\.sourceHash/);
});

test("spy importer preserves niche, traffic platform and source ad URL", () => {
  assert.match(endpoint, /plataforma = \["meta", "taboola"\]/);
  assert.match(endpoint, /linkAnuncio = clean\(body\.linkAnuncio/);
  assert.match(endpoint, /importBatch: importBatch \|\| "WL FEG"/);
  assert.match(endpoint, /sourceHash,/);
  assert.match(preparer, /plataforma: "taboola"/);
  assert.match(preparer, /facebookLinks/);
});

test("preparer removes byte-identical duplicates and limits uploads to 48 MB", () => {
  assert.match(preparer, /unique\.has\(sourceHash\)/);
  assert.match(preparer, /duplicatesRemoved/);
  assert.match(preparer, /MAX_BYTES = 48 \* 1024 \* 1024/);
  assert.match(preparer, /unique\.set\(sourceHash, \{ \.\.\.record, sourceHash \}\)/);
});
