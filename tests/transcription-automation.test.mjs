import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { suspiciousTranscript, wavSignalStats } from "../netlify/functions/transcribe-file.mjs";

const script = await readFile(new URL("../scripts/transcrever.py", import.meta.url), "utf8");
const workflow = await readFile(new URL("../.github/workflows/transcrever-videos.yml", import.meta.url), "utf8");

test("automação cobre o acervo normal de Criativos e retoma a fila", () => {
  assert.match(workflow, /cron: "17 \* \* \* \*"/);
  assert.match(workflow, /TRANSCRIBE_KINDS: "criativo,megabrain"/);
  assert.match(workflow, /MAX_VIDEOS: "200"/);
  assert.match(workflow, /MAX_RUN_MINUTES: "45"/);
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /github-automation-token/);
  assert.match(workflow, /SUPABASE_BOT_ACCESS_TOKEN/);
  assert.match(workflow, /MAX_RETRIES: "8"/);
  assert.match(workflow, /TRANSCRIPTION_LOCK_MINUTES: "45"/);
  assert.match(script, /transcricaoTentativas/);
  assert.match(script, /transcricaoUltimaTentativa/);
  assert.match(script, /transcriptionStatus/);
  assert.match(script, /retry_scheduled/);
  assert.match(script, /transcriptionInvalid/);
  assert.match(script, /transcription_contract_complete\(d\)/);
  assert.match(script, /transcriptionContractComplete/);
  assert.doesNotMatch(script, /if \(text_ready or canonical in \("completed", "done"\)\)/);
  assert.match(script, /out\.sort\(key=lambda item: \(item\[0\], item\[1\], item\[2\]\)\)/);
});

test("transcrição automática salva texto e sincronização palavra por palavra", () => {
  assert.match(script, /word_timestamps=True/);
  assert.match(script, /data\["transcricaoSegments"\] = segments/);
  assert.match(script, /data\["transcricaoWords"\] = words/);
  assert.match(script, /\[Sem fala detectada no vídeo\]/);
  assert.match(script, /transcriptionStatus"\] = "completed"/);
  assert.match(script, /transcriptionDurationSeconds/);
  assert.match(script, /transcriptionLastSegmentEndSeconds/);
  assert.match(script, /transcriptionCoverageRatio/);
  assert.match(script, /coverage_validation_failed/);
});

test("agendamento concorrente da Netlify foi removido", async () => {
  const scheduled = await readFile(new URL("../netlify/functions/creative-transcription-scheduled.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(scheduled, /export const config\s*=\s*\{\s*schedule/);
  assert.match(scheduled, /Invocação manual/);
});

test("endpoint de partes usa janela segura para picos do provedor", async () => {
  const endpoint = await readFile(new URL("../netlify/functions/transcribe-file.mjs", import.meta.url), "utf8");
  assert.match(endpoint, /GROQ_BUDGET_MS = 24_000/);
  assert.match(endpoint, /GROQ_ATTEMPT_MS = 11_500/);
  assert.match(endpoint, /a fala não foi reconhecida com confiança/);
  assert.match(endpoint, /temperature", "0"/);
});

test("transcritor preserva a frase inicial e as bordas entre todas as partes", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /TR_CHUNK_OVERLAP_SEC=2/);
  assert.match(html, /TR_WHISPER_LEAD_SEC=\.8/);
  assert.match(html, /TR_RECORDER_WARMUP_MS=250/);
  assert.match(html, /const streamRate=1/);
  assert.match(html, /captureStart=Math\.max\(0,expectedStart-TR_CHUNK_OVERLAP_SEC\)/);
  assert.match(html, /retainStart:expectedStart,retainEnd:expectedEnd/);
  assert.match(html, /function trCropChunkPart\(part,chunk\)/);
  assert.match(html, /part=trCropChunkPart\(rawPart,chunk\)/);
  assert.match(html, /feg_transcricao_em_andamento_v2/);
  assert.match(html, /feg-vsl-transcricao-v3/);
  assert.doesNotMatch(html, /TR_STREAM_(?:PLAYBACK|FAST|VERY_LONG)_RATE/);

  const helpers = html.match(/function trWordsText\(words\)\{[\s\S]*?\n\}/)?.[0] + "\n"
    + html.match(/function trCropChunkPart\(part,chunk\)\{[\s\S]*?\n\}/)?.[0];
  const context = {}; vm.createContext(context); vm.runInContext(`${helpers};globalThis.crop=trCropChunkPart`, context);
  const cropped = context.crop({
    text: "frase duplicada continuação limpa",
    words: [
      { word: "frase", start: 118.8, end: 119.2 },
      { word: "duplicada", start: 119.3, end: 119.8 },
      { word: "continuação", start: 120.1, end: 120.6 },
      { word: "limpa", start: 120.7, end: 121.1 },
    ],
    segments: [], language: "pt",
  }, { retainStart: 120, retainEnd: 240, index: 1, totalChunks: 2, offset: 118 });
  assert.equal(cropped.text, "continuação limpa");
  assert.deepEqual(cropped.words.map(item => item.word), ["continuação", "limpa"]);
});

test("automação local protege o começo da fala no VAD", () => {
  assert.match(script, /beam_size=5/);
  assert.match(script, /"speech_pad_ms": 1000/);
  assert.match(script, /"min_silence_duration_ms": 500/);
});

test("transcritor rejeita alucinações repetitivas e reconhece silêncio", () => {
  assert.equal(suspiciousTranscript("Thank you. Thank you. Thank you. Thank you. Thank you. Thank you."), true);
  assert.equal(suspiciousTranscript("This is a complete sentence with useful and varied spoken content."), false);
  const wav = Buffer.alloc(44 + 3200 * 2);
  wav.write("RIFF", 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVE", 8);
  wav.write("fmt ", 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(16000, 24); wav.writeUInt32LE(32000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write("data", 36); wav.writeUInt32LE(3200 * 2, 40);
  assert.equal(wavSignalStats(wav).peak, 0);
});

test("falha individual não bloqueia para sempre os demais criativos", () => {
  assert.match(script, /MAX_RETRIES/);
  assert.match(script, /"failed" if final else "retry_scheduled"/);
  assert.match(script, /2 \*\* max\(0, attempts - 1\)/);
  assert.match(script, /limite seguro alcançado/);
});
