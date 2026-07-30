import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("a automação de mídia das ofertas roda no servidor a cada dez minutos", async () => {
  const source = await readFile(new URL("netlify/functions/offer-creative-archive-scheduled.mjs", root), "utf8");
  assert.match(source, /schedule:\s*"\*\/10 \* \* \* \*"/);
  assert.match(source, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(source, /sourceOfferId/);
  assert.match(source, /mediaArchiveRequired === true/);
  assert.match(source, /isFacebookUrl\(data\.linkAnuncio\)/);
  assert.match(source, /hasStoredMedia\(data\)/);
  assert.match(source, /offer-creative-archive-background/);
  assert.match(source, /createHmac\("sha256"/);
});

test("o worker baixa e preserva vídeo ou imagem no card de criativo", async () => {
  const source = await readFile(new URL("netlify/functions/offer-creative-archive-background.mjs", root), "utf8");
  assert.match(source, /timingSafeEqual/);
  assert.match(source, /safeRemoteFetch/);
  assert.match(source, /storage\/v1\/object\/criativos/);
  assert.match(source, /latest\.video = media\.url/);
  assert.match(source, /latest\.print = media\.url/);
  assert.match(source, /latest\.mediaArchiveStatus = "done"/);
  assert.match(source, /mediaArchiveNextRetryAt = retryAt/);
  assert.match(source, /current\.sourceOfferId/);
});
