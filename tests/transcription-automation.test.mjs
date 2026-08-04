import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const script = await readFile(new URL("../scripts/transcrever.py", import.meta.url), "utf8");
const workflow = await readFile(new URL("../.github/workflows/transcrever-videos.yml", import.meta.url), "utf8");

test("automação cobre o acervo normal de Criativos e retoma a fila", () => {
  assert.match(workflow, /cron: "17 \* \* \* \*"/);
  assert.match(workflow, /TRANSCRIBE_KINDS: "criativo,megabrain"/);
  assert.match(workflow, /MAX_VIDEOS: "200"/);
  assert.match(workflow, /MAX_RUN_MINUTES: "300"/);
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
});

test("falha individual não bloqueia para sempre os demais criativos", () => {
  assert.match(script, /MAX_RETRIES/);
  assert.match(script, /"failed" if final else "retry_scheduled"/);
  assert.match(script, /2 \*\* max\(0, attempts - 1\)/);
  assert.match(script, /limite seguro alcançado/);
});
