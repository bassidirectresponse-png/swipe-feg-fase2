import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("a automação de mídia tem n8n e agendamento idempotente de segurança", async () => {
  const source = await readFile(new URL("netlify/functions/_offer-creative-archive-dispatch.mjs", root), "utf8");
  const scheduled = await readFile(new URL("netlify/functions/offer-creative-archive-scheduled.mjs", root), "utf8");
  assert.match(source, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(source, /sourceOfferId/);
  assert.match(source, /mediaArchiveDue/);
  assert.match(source, /queueMediaArchive/);
  assert.match(source, /PAGE_SIZE = 1000/);
  assert.match(source, /markDispatchFailure/);
  assert.match(source, /offer-creative-archive-background/);
  assert.match(source, /createHmac\("sha256"/);
  assert.match(scheduled, /schedule:\s*"\*\/10 \* \* \* \*"/);
  assert.match(scheduled, /runArchiveDispatch/);
});

test("o worker baixa e preserva vídeo ou imagem no card de criativo", async () => {
  const source = await readFile(new URL("netlify/functions/offer-creative-archive-background.mjs", root), "utf8");
  const extractor = await readFile(new URL("netlify/functions/_facebook-public-media.mjs", root), "utf8");
  const resolver = await readFile(new URL("netlify/functions/_facebook-media-resolver.mjs", root), "utf8");
  assert.match(source, /timingSafeEqual/);
  assert.match(source, /safeRemoteFetch/);
  assert.match(source, /resolveFacebookMedia/);
  assert.match(source, /storage\/v1\/object\/criativos/);
  assert.match(source, /facebook\.\$\{media\.ext\}/);
  assert.match(source, /"x-upsert": "true"/);
  assert.match(source, /applyArchivedMedia/);
  assert.match(source, /: retryAt\(attempt\)/);
  assert.match(source, /Mídia ainda não disponibilizada publicamente pelo Facebook/);
  assert.match(source, /12 \* 60 \* 60_000/);
  assert.match(source, /current\.sourceOfferId/);
  assert.doesNotMatch(source, /APIFY_TOKEN|api\.apify\.com|FB_ADS_ACTOR/);
  assert.match(extractor, /plugins\/video\.php/);
  assert.match(extractor, /plugins\/post\.php/);
  assert.match(extractor, /safeRemoteFetch/);
  assert.doesNotMatch(extractor, /APIFY_TOKEN|api\.apify\.com/);
  assert.match(resolver, /extractFacebookPublicMedia/);
  assert.match(resolver, /FACEBOOK_MEDIA_UNAVAILABLE/);
  assert.doesNotMatch(resolver, /APIFY_TOKEN|api\.apify\.com|apify~/i);
});

test("cada vídeo anexado entra automaticamente na fila de transcrição", async () => {
  const dispatch = await readFile(new URL("netlify/functions/_creative-transcription-dispatch.mjs", root), "utf8");
  const scheduled = await readFile(new URL("netlify/functions/creative-transcription-scheduled.mjs", root), "utf8");
  const worker = await readFile(new URL("netlify/functions/transcribe-background.mjs", root), "utf8");
  assert.match(dispatch, /transcriptionDue/);
  assert.match(dispatch, /queueTranscription/);
  assert.match(dispatch, /PAGE_SIZE = 1000/);
  assert.match(dispatch, /x-feg-transcription-signature/);
  assert.match(scheduled, /schedule:\s*"\*\/10 \* \* \* \*"/);
  assert.match(worker, /validInternalSignature/);
  assert.match(worker, /transcriptionStatus = "completed"/);
  assert.match(worker, /\[Sem fala detectada no vídeo\]/);
  assert.match(worker, /TRANSCRIPTION_FILE_TOO_LARGE/);
  assert.match(worker, /routeToFasterWhisper/);
  assert.match(worker, /new Blob|boundedBuffer/);
  assert.match(worker, /transcriptionProvider = "faster-whisper"/);
});

test("o n8n dispara a fila sem receber as credenciais do Swipe", async () => {
  const source = await readFile(new URL("netlify/functions/offer-creative-archive-n8n.mjs", root), "utf8");
  assert.match(source, /N8N_ARCHIVE_TRIGGER_SECRET/);
  assert.match(source, /timingSafeEqual/);
  assert.match(source, /Bearer /);
  assert.match(source, /runArchiveDispatch/);
  assert.match(source, /runCreativeTranscriptionDispatch/);
  assert.match(source, /Promise\.all/);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|APIFY_TOKEN/);
});
