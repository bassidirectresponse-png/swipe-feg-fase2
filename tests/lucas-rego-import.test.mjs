import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const html = await readFile(new URL("index.html", root), "utf8");
const importer = await readFile(new URL("scripts/prepare_lucas_rego.mjs", root), "utf8");

test("cards de Lucas Rego exibem a coleção no Swipe Criativos", () => {
  assert.match(html, /class="collection-flag"/);
  assert.match(html, /function criativoCard\(o\)[\s\S]{0,1800}d\.collectionLabel/);
  assert.match(html, /d\.collectionLabel/);
  assert.match(importer, /collection:\s*"Lucas Rego"/);
  assert.match(importer, /label:\s*"CRIATIVOS LUCAS REGO"/);
});

test("importador separa os três nichos e ignora arquivos AppleDouble", () => {
  assert.match(importer, /\["WL",\s*"Emagrecimento"\]/);
  assert.match(importer, /\["ED",\s*"Disfunção Erétil"\]/);
  assert.match(importer, /\["MEMO",\s*"Memória"\]/);
  assert.match(importer, /entry\.name\.startsWith\("\._"\)/);
  assert.match(importer, /unique = new Map\(\)/);
});

test("preparação limita os vídeos e mantém formato compatível", () => {
  assert.match(importer, /MAX_BYTES = 48 \* 1024 \* 1024/);
  assert.match(importer, /codec === "h264"/);
  assert.match(importer, /duplicatesRemoved/);
});
