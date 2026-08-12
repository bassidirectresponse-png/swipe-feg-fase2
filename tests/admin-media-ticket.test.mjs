import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const html = await readFile(new URL("index.html", root), "utf8");
const endpoint = await readFile(new URL("netlify/functions/admin-media-ticket.mjs", root), "utf8");

test("ticket de mídia exige administrador e restringe o destino do lote", () => {
  assert.match(endpoint, /authenticate\(req\)/);
  assert.match(endpoint, /isAdmin\(user\)/);
  assert.match(endpoint, /trustedOrigin\(req\)/);
  assert.match(endpoint, /rateLimit\("admin-media-ticket"/);
  assert.match(endpoint, /brands\\\/balls-n-brains\\\/creatives/);
  assert.match(endpoint, /object\/upload\/sign\/criativos/);
  assert.match(endpoint, /x-upsert/);
});

test("importação em lote usa URL temporária assinada e mantém de-duplicação", () => {
  assert.match(html, /async function storageSignedUploadWithProgress/);
  assert.match(html, /\/\.netlify\/functions\/admin-media-ticket/);
  assert.match(html, /await storageSignedUploadWithProgress\(file,storagePath/);
  assert.match(html, /dedupeKey=`\$\{batchName\.toLowerCase\(\)\}\|\$\{sourceFile\.toLowerCase\(\)\}`/);
  assert.match(html, /brandSlug:"balls-n-brains"/);
});
