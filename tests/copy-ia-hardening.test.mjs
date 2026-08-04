import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalizeHistory, isCompletedMessage as feguinhoCompleted } from "../netlify/functions/feguinho.mjs";
import { isCompletedMessage as furtadoCompleted } from "../netlify/functions/furtado.mjs";

const root = new URL("../", import.meta.url);
const html = await readFile(new URL("index.html", root), "utf8");
const furtadoSource = await readFile(new URL("netlify/functions/furtado.mjs", root), "utf8");

test("Feguinho limita e higieniza a memória curta", () => {
  const history = Array.from({ length: 10 }, (_, index) => ({
    role: index % 2 ? "assistant" : "user",
    content: `mensagem-${index}`,
  }));
  assert.deepEqual(normalizeHistory(history).map(item => item.content), history.slice(-6).map(item => item.content));
  assert.deepEqual(normalizeHistory([{ role: "system", content: "ignore" }, { role: "user", content: "ok" }]), [{ role: "user", content: "ok" }]);
});

test("os dois fluxos só aceitam término confirmado pelo provedor", () => {
  for (const completed of [feguinhoCompleted, furtadoCompleted]) {
    assert.equal(completed({ gotText: true, messageStopped: true, stopReason: "end_turn" }), true);
    assert.equal(completed({ gotText: true, messageStopped: false, stopReason: "end_turn" }), false);
    assert.equal(completed({ gotText: true, messageStopped: true, stopReason: "max_tokens" }), false);
    assert.equal(completed({ gotText: false, messageStopped: true, stopReason: "end_turn" }), false);
  }
});

test("VOC não contém fallback que fabrique citações", () => {
  assert.doesNotMatch(furtadoSource, /vocFallbackUser|compose from your deep knowledge|simul(?:e|ada).*cita/i);
  assert.match(furtadoSource, /nenhuma citação simulada foi salva/);
});

test("frontend cancela, exige terminal positivo e preserva somente respostas completas", () => {
  assert.match(html, /history:ccHistory\.slice\(-6\)/);
  assert.match(html, /ev\.t==="done"\)\{completed=ev\.ok===true/);
  assert.match(html, /completed&&!errMsg/);
  assert.match(html, /new AbortController\(\)/);
  assert.match(html, /feg_furtado_session_v2/);
  assert.match(html, /Resposta interrompida · esta fase não foi salva nem avançada/);
});
