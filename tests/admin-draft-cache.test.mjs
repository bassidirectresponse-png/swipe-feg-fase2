import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("adminOfferDrafts é um objeto simples e nunca usa a API de Map", () => {
  assert.match(html, /adminOfferDrafts=\{\}/);
  assert.doesNotMatch(html, /adminOfferDrafts\.(set|get|has|delete)\(/);
  assert.equal([...html.matchAll(/adminOfferDrafts\[id\]=payload\.draft/g)].length, 2);
});
