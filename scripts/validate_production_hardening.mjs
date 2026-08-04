import { authHeaders, productionAdminAuth, projectConfig } from "./_supabase-auth.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function jsonResponse(response) {
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { response, body };
}

const { url, anonKey } = await projectConfig();
const auth = await productionAdminAuth();

const canWrite = await jsonResponse(await fetch(`${url}/rest/v1/rpc/swipe_can_write`, {
  method: "POST",
  headers: authHeaders(auth, { "Content-Type": "application/json" }),
  body: "{}",
  signal: AbortSignal.timeout(15_000),
}));
assert(canWrite.response.ok && canWrite.body === true, `swipe_can_write falhou (${canWrite.response.status})`);

const missingId = crypto.randomUUID();
const merge = await jsonResponse(await fetch(`${url}/rest/v1/rpc/swipe_merge_offer_data`, {
  method: "POST",
  headers: authHeaders(auth, { "Content-Type": "application/json" }),
  body: JSON.stringify({ p_id: missingId, p_patch: {} }),
  signal: AbortSignal.timeout(15_000),
}));
assert(merge.response.ok && merge.body === null, `merge atômico falhou (${merge.response.status})`);

const unauthorized = await fetch(`${url}/rest/v1/offers`, {
  method: "POST",
  headers: { apikey: anonKey, "Content-Type": "application/json", Prefer: "return=minimal" },
  body: JSON.stringify({ id: crypto.randomUUID(), data: { kind: "security-probe" } }),
  signal: AbortSignal.timeout(15_000),
});
assert(!unauthorized.ok, "escrita anônima foi aceita indevidamente");

const objectPath = `hardening-probe/${Date.now()}-${crypto.randomUUID()}.png`;
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
const upload = await jsonResponse(await fetch(`${url}/storage/v1/object/criativos/${objectPath}`, {
  method: "POST",
  headers: authHeaders(auth, { "Content-Type": "image/png", "x-upsert": "false" }),
  body: png,
  signal: AbortSignal.timeout(20_000),
}));
assert(upload.response.ok, `upload protegido falhou (${upload.response.status})`);

const publicRead = await fetch(`${url}/storage/v1/object/public/criativos/${objectPath}`, {
  signal: AbortSignal.timeout(15_000),
});
assert(publicRead.ok && Number(publicRead.headers.get("content-length") || png.length) === png.length,
  `leitura do objeto de teste falhou (${publicRead.status})`);

const cleanup = await fetch(`${url}/storage/v1/object/criativos/${objectPath}`, {
  method: "DELETE",
  headers: authHeaders(auth),
  signal: AbortSignal.timeout(15_000),
});
assert(cleanup.ok, `limpeza do objeto de teste falhou (${cleanup.status})`);

console.log(JSON.stringify({
  ok: true,
  authMode: auth.mode,
  checks: {
    technicalWriter: true,
    atomicMerge: true,
    anonymousWriteDenied: true,
    protectedStorageUpload: true,
    protectedStorageDelete: true,
  },
}, null, 2));
