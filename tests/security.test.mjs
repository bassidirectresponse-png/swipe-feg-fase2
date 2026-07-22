import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import {
  assertSafeRemoteUrl,
  boundedBuffer,
  corsHeaders,
  rateLimit,
  readJson,
  trustedOrigin,
} from "../netlify/functions/_security.mjs";

const root = new URL("../", import.meta.url);
const html = await readFile(new URL("index.html", root), "utf8");
const netlify = await readFile(new URL("netlify.toml", root), "utf8");

test("CORS permite a aplicação e rejeita origem arbitrária sem wildcard", () => {
  const allowed = new Request("https://benchmarkinggrupofeg.site/.netlify/functions/feguinho", { headers: { Origin: "https://benchmarkinggrupofeg.site" } });
  const denied = new Request("https://benchmarkinggrupofeg.site/.netlify/functions/feguinho", { headers: { Origin: "https://evil.example" } });
  assert.equal(trustedOrigin(allowed), true);
  assert.equal(trustedOrigin(denied), false);
  assert.equal(corsHeaders(allowed)["Access-Control-Allow-Origin"], "https://benchmarkinggrupofeg.site");
  assert.equal(corsHeaders(denied)["Access-Control-Allow-Origin"], undefined);
  assert.doesNotMatch(JSON.stringify(corsHeaders(allowed)), /"\*"/);
});

test("parser JSON exige tipo correto e limita o corpo", async () => {
  await assert.rejects(() => readJson(new Request("https://local.test", { method: "POST", body: "{}", headers: { "Content-Type": "text/plain" } })), error => error.status === 415);
  await assert.rejects(() => readJson(new Request("https://local.test", { method: "POST", body: JSON.stringify({ value: "x".repeat(100) }), headers: { "Content-Type": "application/json" } }), { maxBytes: 20 }), error => error.status === 413);
  assert.deepEqual(await readJson(new Request("https://local.test", { method: "POST", body: "{\"ok\":true}", headers: { "Content-Type": "application/json" } })), { ok: true });
});

test("validação SSRF bloqueia esquemas, credenciais, hosts e endereços privados", async () => {
  await assert.rejects(() => assertSafeRemoteUrl("http://facebook.com/video.mp4", { allowedHostSuffixes: ["facebook.com"] }), /não permitida/);
  await assert.rejects(() => assertSafeRemoteUrl("https://user:pass@facebook.com/video.mp4", { allowedHostSuffixes: ["facebook.com"] }), /não permitida/);
  await assert.rejects(() => assertSafeRemoteUrl("https://facebook.com.evil.example/video.mp4", { allowedHostSuffixes: ["facebook.com"] }), /host remoto/);
  await assert.rejects(() => assertSafeRemoteUrl("https://127.0.0.1/video.mp4"), /destino remoto/);
});

test("download com limite interrompe resposta maior que o permitido", async () => {
  const response = new Response(new Uint8Array(64), { headers: { "Content-Length": "64" } });
  await assert.rejects(() => boundedBuffer(response, 16), /excede o limite/);
});

test("rate limit local bloqueia excesso e produção falha de forma fechada sem o store", async () => {
  const identity = `test-${Date.now()}-${Math.random()}`;
  assert.equal((await rateLimit("security-test", identity, { limit: 1, windowMs: 60_000 })).allowed, true);
  assert.equal((await rateLimit("security-test", identity, { limit: 1, windowMs: 60_000 })).allowed, false);
  const previous = process.env.NETLIFY;
  process.env.NETLIFY = "true";
  try {
    assert.equal((await rateLimit("security-production-test", identity, { limit: 10, windowMs: 60_000 })).allowed, false);
  } finally {
    if (previous === undefined) delete process.env.NETLIFY;
    else process.env.NETLIFY = previous;
  }
});

test("CSP remove script inline genérico e dependências externas usam SRI", () => {
  const policy = netlify.match(/Content-Security-Policy = "([^"]+)"/)?.[1] || "";
  assert.doesNotMatch(policy.match(/script-src[^;]+/)?.[0] || "", /unsafe-inline/);
  assert.match(policy, /sha256-/);
  assert.match(policy, /upgrade-insecure-requests/);
  const externalScripts = [...html.matchAll(/<script\s+[^>]*src="https?:\/\/[^"]+"[^>]*>/g)].map(match => match[0]);
  assert.ok(externalScripts.length >= 2);
  for (const script of externalScripts) {
    assert.match(script, /integrity="sha384-/);
    assert.match(script, /crossorigin="anonymous"/);
  }
});

test("workflows fixam actions por SHA e não colocam PAT na URL", async () => {
  const directory = new URL(".github/workflows/", root);
  const files = (await readdir(directory)).filter(file => file.endsWith(".yml"));
  const workflows = (await Promise.all(files.map(file => readFile(new URL(file, directory), "utf8")))).join("\n");
  assert.doesNotMatch(workflows, /uses:\s+(?:actions|github)\/[\w/-]+@v\d/);
  assert.doesNotMatch(workflows, /x-access-token:/);
  for (const reference of workflows.matchAll(/uses:\s+(?:actions|github)\/[\w/-]+@([^\s#]+)/g)) assert.match(reference[1], /^[0-9a-f]{40}$/);
});

test("política de upload restringe autorização, tamanho, extensão e MIME", async () => {
  for (const file of ["storage-upload-hardening.sql", "rls-controle-acesso.sql", "storage-bot-thumbnails.sql"]) {
    const sql = await readFile(new URL(`db/${file}`, root), "utf8");
    assert.match(sql, /file_size_limit = 167772160/);
    assert.match(sql, /storage\.extension\(name\)/);
    assert.match(sql, /metadata->>'mimetype'/);
    assert.match(sql, /auth\.uid\(\) in/);
  }
});

test("tokens de provedores não são enviados em query strings", async () => {
  const source = await readFile(new URL("netlify/functions/fb-ingest-background.mjs", root), "utf8");
  assert.doesNotMatch(source, /[?&]token=\$\{/);
  assert.match(source, /Authorization: `Bearer \$\{APIFY_TOKEN\}`/);
});
