// Sessão OIDC de curta duração, mantida somente em memória.
// A validação é obrigatória antes da aplicação do mesmo manifesto.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { temporaryToken, responseJson } from "./ingest_sp_nutrition.mjs";

const base = "https://swipe.fegsys.com";
const manifest = JSON.parse(await readFile(new URL("./manifests/noverly-2026-10-07.json", import.meta.url), "utf8"));
const token = await temporaryToken();
async function post(mode) {
  return responseJson(await fetch(`${base}/.netlify/functions/manual-ingest-n8n`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...manifest, mode }),
    signal: AbortSignal.timeout(60_000),
  }), `Noverly ${mode}`);
}
const validation = await post("validate");
assert.equal(validation.plan.length, 1);
assert.equal(validation.plan[0].kind, "brandsvalidated");
assert.equal(validation.plan[0].name, "Noverly");
assert.equal(validation.plan[0].newAds, 0);
assert.equal(validation.plan[0].duplicatesSkipped, 0);
assert.equal(validation.totals.items, 1);
assert.equal(validation.totals.newAds, 0);
console.log(JSON.stringify(validation, null, 2));
if (process.argv.includes("--apply")) {
  const cover = await fetch(manifest.items[0].image, { signal: AbortSignal.timeout(20_000) });
  assert.ok(cover.ok, "capa precisa estar publicada antes do cadastro");
  assert.match(cover.headers.get("content-type") || "", /^image\/png/);
  const bytes = Buffer.from(await cover.arrayBuffer());
  const original = await readFile(new URL("../assets/brands/noverly/cover.png", import.meta.url));
  assert.ok(bytes.equals(original), "capa publicada precisa ser o original enviado");
  const applied = await post("apply");
  assert.equal(applied.applied.length, 1);
  assert.equal(applied.applied[0].name, "Noverly");
  assert.equal(applied.applied[0].kind, "brandsvalidated");
  console.log(JSON.stringify(applied, null, 2));
}
