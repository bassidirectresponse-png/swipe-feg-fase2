import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const script = await readFile(new URL("../scripts/transcrever.py", import.meta.url), "utf8");
const workflow = await readFile(new URL("../.github/workflows/transcrever-videos.yml", import.meta.url), "utf8");

test("automação cobre o acervo normal de Criativos e retoma a fila", () => {
  assert.match(workflow, /cron: "0 9 \* \* \*"/);
  assert.match(workflow, /cron: "0 21 \* \* \*"/);
  assert.match(workflow, /TRANSCRIBE_KINDS: "criativo,megabrain"/);
  assert.match(workflow, /MAX_VIDEOS: "200"/);
  assert.match(workflow, /MAX_RUN_MINUTES: "300"/);
  assert.match(workflow, /MAX_RETRIES: "8"/);
  assert.match(script, /transcricaoTentativas/);
  assert.match(script, /transcricaoUltimaTentativa/);
  assert.match(script, /transcriptionStatus/);
  assert.match(script, /retry_scheduled/);
  assert.match(script, /transcriptionInvalid/);
  assert.match(script, /stored_version != JOB_VERSION/);
  assert.match(script, /out\.sort\(key=lambda item: \(item\[0\], item\[1\], item\[2\]\)\)/);
});

test("transcrição automática salva texto e sincronização palavra por palavra", () => {
  assert.match(script, /word_timestamps=True/);
  assert.match(script, /data\["transcricaoSegments"\] = segments/);
  assert.match(script, /data\["transcricaoWords"\] = words/);
  assert.match(script, /\[Sem fala detectada no vídeo\]/);
  assert.match(script, /canonical in \("completed", "done"\)/);
});

test("falha individual não bloqueia para sempre os demais criativos", () => {
  assert.match(script, /MAX_RETRIES/);
  assert.match(script, /"failed" if final else "retry_scheduled"/);
  assert.match(script, /2 \*\* max\(0, attempts - 1\)/);
  assert.match(script, /limite seguro alcançado/);
});
