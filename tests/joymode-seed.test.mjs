import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const source = html.match(/let joymodeSeedWorking=false;[\s\S]*?\n  finally\{joymodeSeedWorking=false;\}\n\}/)?.[0];

function run({ offers = [], isAdmin = true, fetchImpl, insert } = {}) {
  const calls = { fetch: 0, toast: [], warn: 0, error: 0, storage: {} };
  const context = {
    offers, isAdmin, joymodeSeedWorking: false,
    sectionOf: o => { const k = (o.data || {}).kind || "oferta"; return k === "brandsgeneral" ? "brandsvalidated" : k; },
    localStorage: { getItem: k => calls.storage[k] ?? null, setItem: (k, v) => { calls.storage[k] = v; }, removeItem: k => { delete calls.storage[k]; } },
    fetch: async (...args) => { calls.fetch++; if (fetchImpl) return fetchImpl(...args); throw new Error("rede indisponível"); },
    sb: { from: () => ({ insert: () => ({ select: async () => (insert ? insert() : { data: null, error: new Error("duplicate key") }) }) }) },
    toast: (msg, err) => calls.toast.push([msg, err]),
    renderGrid() {}, renderSubfilter() {}, writeCache() {},
    console: { warn: () => { calls.warn++; }, error: () => { calls.error++; } }, Promise, String, Object, Error
  };
  vm.runInNewContext(`${source}\nthis.ensure=ensureJoymodeInsider;`, context);
  return { calls, ensure: context.ensure };
}

test("seed Joymode: código extraído do index.html", () => assert.ok(source, "função encontrada"));

test("não tenta o seed quando a oferta existe por id, e marca como concluído", async () => {
  const { calls, ensure } = run({ offers: [{ id: "4b878728-fa39-4512-815a-762507835dc0", data: { kind: "brandsvalidated", nomeOferta: "Outro nome qualquer" } }] });
  await ensure();
  assert.equal(calls.fetch, 0);
  assert.equal(calls.storage.feg_joymode_seed_v1, "done");
  assert.deepEqual(calls.toast, []);
});

test("não tenta o seed quando existe oferta com nome parecido (Joymode · …) em seção de oferta", async () => {
  for (const kind of ["brandsvalidated", "brandsgeneral", "oferta"]) {
    const { calls, ensure } = run({ offers: [{ id: "x", data: { kind, nomeOferta: "JoyMode Gut Health" } }] });
    await ensure();
    assert.equal(calls.fetch, 0, kind);
  }
  const { calls, ensure } = run({ offers: [{ id: "y", data: { kind: "criativo", nomeMarca: "Joymode" } }], fetchImpl: async () => { throw new Error("x"); } });
  await ensure();
  assert.equal(calls.fetch, 1, "criativo com a marca não conta como oferta existente");
});

test("falha do seed opcional nunca mostra erro vermelho ao usuário: só console.warn e marca concluído", async () => {
  const { calls, ensure } = run({});
  await ensure();
  assert.equal(calls.fetch, 1);
  assert.deepEqual(calls.toast, []);
  assert.equal(calls.warn, 1);
  assert.equal(calls.error, 0);
  assert.equal(calls.storage.feg_joymode_seed_v1, "done");
  await ensure();
  assert.equal(calls.fetch, 1, "depois de concluído (inclusive por falha) não tenta de novo");
});

test("não-admin não executa o seed e o index.html não tem mais o toast vermelho", async () => {
  const { calls, ensure } = run({ isAdmin: false });
  await ensure();
  assert.equal(calls.fetch, 0);
  assert.doesNotMatch(html, /Não foi possível adicionar a Joymode automaticamente/);
  assert.doesNotMatch(html, /console\.error\("seed Joymode falhou"/);
});
