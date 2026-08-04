import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  applyArchivedMedia,
  mediaArchiveDue,
  queueTranscription,
  transcriptionComplete,
  transcriptionDue,
} from "../netlify/functions/_creative-integrity.mjs";

const storedVideo = "https://ppaajtzbhjixhyfidojd.supabase.co/storage/v1/object/public/criativos/ofertas/offer/card/video.mp4";

test("vídeo anexado nunca conclui o card sem enfileirar a transcrição", () => {
  const data = applyArchivedMedia({
    kind: "criativo",
    sourceOfferId: "offer-id",
    linkAnuncio: "https://www.facebook.com/example/posts/123",
    transcricao: "",
  }, { type: "video", url: storedVideo }, {
    source: "facebook-player",
    now: "2026-07-30T12:00:00.000Z",
  });
  assert.equal(data.video, storedVideo);
  assert.equal(data.mediaAttached, true);
  assert.equal(data.mediaArchiveStatus, "done");
  assert.equal(data.transcriptionRequired, true);
  assert.equal(data.transcriptionStatus, "pending");
  assert.equal(data.transcricaoStatus, "pending");
  assert.equal(data.transcriptionProvider, "groq");
});

test("imagem é anexada, mas não cria uma transcrição impossível", () => {
  const data = applyArchivedMedia({
    kind: "criativo",
    sourceOfferId: "offer-id",
  }, { type: "image", url: "https://cdn.example/ad.jpg" });
  assert.equal(data.print, "https://cdn.example/ad.jpg");
  assert.equal(data.mediaAttached, true);
  assert.equal(data.transcriptionRequired, false);
  assert.equal(data.transcriptionStatus, "not_applicable");
});

test("status completed sem texto volta para a fila", () => {
  assert.equal(transcriptionDue({
    kind: "criativo",
    video: storedVideo,
    transcricao: "",
    transcriptionStatus: "completed",
    transcriptionProvider: "groq",
  }, Date.parse("2026-07-30T12:00:00.000Z")), true);
});

test("texto legado sem contrato versionado volta para a fila", () => {
  const legacy = {
    kind: "criativo",
    video: storedVideo,
    transcricao: "texto parcial antigo",
    transcriptionStatus: "completed",
    transcriptionVersion: "1",
  };
  assert.equal(transcriptionComplete(legacy), false);
  assert.equal(transcriptionDue(legacy), true);
});

test("somente cobertura versionada e validada conclui a transcrição", () => {
  const complete = {
    kind: "megabrain",
    video: storedVideo,
    transcricao: "fala completa",
    transcriptionStatus: "completed",
    transcriptionVersion: "1",
    transcriptionContractComplete: true,
    transcriptionDurationSeconds: 120,
    transcriptionLastSegmentEndSeconds: 118,
    transcriptionCoverageRatio: 0.983333,
  };
  assert.equal(transcriptionComplete(complete), true);
  assert.equal(transcriptionDue(complete), false);
  assert.equal(transcriptionComplete({ ...complete, transcriptionCoverageRatio: 0.5, transcriptionLastSegmentEndSeconds: 60 }), false);
});

test("faster-whisper incompleto não é excluído da recuperação", () => {
  assert.equal(transcriptionDue({
    kind: "criativo",
    video: storedVideo,
    transcricao: "parcial",
    transcriptionStatus: "pending",
    transcriptionProvider: "faster-whisper",
  }), true);
});

test("trabalho recente não duplica e trabalho travado é retomado", () => {
  const base = {
    kind: "criativo",
    sourceOfferId: "offer-id",
    linkAnuncio: "https://www.facebook.com/example/posts/123",
    mediaArchiveStatus: "working",
  };
  const now = Date.parse("2026-07-30T12:30:00.000Z");
  assert.equal(mediaArchiveDue({ ...base, mediaArchiveStartedAt: "2026-07-30T12:20:00.000Z" }, now), false);
  assert.equal(mediaArchiveDue({ ...base, mediaArchiveStartedAt: "2026-07-30T11:30:00.000Z" }, now), true);
});

test("reserva de transcrição mantém contrato canônico completo", () => {
  const queued = queueTranscription({
    kind: "criativo",
    video: storedVideo,
    transcriptionAttempts: 2,
  }, "2026-07-30T12:00:00.000Z");
  assert.equal(queued.transcriptionStatus, "queued");
  assert.equal(queued.transcricaoStatus, "processing");
  assert.equal(queued.transcriptionAttempts, 3);
  assert.equal(queued.transcriptionProvider, "groq");
  assert.equal(queued.transcriptionRequired, true);
  assert.equal(queued.transcriptionContractComplete, false);
});

test("migration recupera mídia ausente e transcrição ausente do acervo", async () => {
  const migration = await readFile(new URL("../db/swipe-creative-integrity.sql", import.meta.url), "utf8");
  assert.match(migration, /mediaArchiveStatus', 'pending'/);
  assert.match(migration, /transcriptionStatus', 'waiting_for_media'/);
  assert.match(migration, /Corrige inclusive o caso legado "done\/completed" sem texto/);
  assert.match(migration, /transcriptionStatus', 'completed'/);
});

test("assinatura interna inválida não ganha acesso de serviço no tratamento de erro", async () => {
  const previousGroq = process.env.GROQ_API_KEY;
  const previousService = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const previousFetch = globalThis.fetch;
  process.env.GROQ_API_KEY = "test-groq-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error("fetch não deveria ser chamado");
  };
  try {
    const { handler } = await import(`../netlify/functions/transcribe-background.mjs?invalid-signature=${Date.now()}`);
    const response = await handler({
      httpMethod: "POST",
      headers: { "x-feg-transcription-signature": "0".repeat(64) },
      body: JSON.stringify({
        id: "00000000-0000-0000-0000-000000000000",
        videoUrl: storedVideo,
      }),
    });
    assert.equal(response.statusCode, 202);
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousGroq === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previousGroq;
    if (previousService === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousService;
  }
});
