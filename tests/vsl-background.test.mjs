import test from "node:test";
import assert from "node:assert/strict";

process.env.ANTHROPIC_API_KEY = "test-key";
const { splitCompleteText, synthesisSource } = await import("../netlify/functions/vsl-dissector-background.mjs?chunk-test=1");

test("divisão da VSL preserva todo o conteúdo independentemente do tamanho", () => {
  const lines = Array.from({ length: 500 }, (_, index) => `linha-${String(index).padStart(4, "0")}-${"x".repeat(80)}`);
  const original = lines.join("\n");
  const chunks = splitCompleteText(original, 3_000);
  assert.ok(chunks.length > 10);
  assert.equal(chunks.join("\n"), original);
  for (const line of lines) assert.equal(chunks.join("\n").includes(line), true);
});

test("consolidação amostra todas as partes, inclusive em jobs muito longos", () => {
  const parts = Array.from({ length: 80 }, (_, index) => `marcador-unico-${index}-${"y".repeat(4_000)}`);
  const source = synthesisSource(parts);
  for (let index = 0; index < parts.length; index++) assert.match(source, new RegExp(`marcador-unico-${index}(?:-|\\n)`));
  assert.ok(source.length <= 180_000);
});
