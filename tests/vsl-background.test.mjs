import test from "node:test";
import assert from "node:assert/strict";

process.env.ANTHROPIC_API_KEY = "test-key";
const { analysisGaps, splitCompleteText, synthesisSource } = await import("../netlify/functions/vsl-dissector-background.mjs?chunk-test=1");

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

test("job só conclui quando contém todo o contrato estratégico da skill", () => {
  const complete = `# Dissecação\n## Veredito estratégico\n## Big Idea\n## Pergunta paradoxal\n## Gimmick\n## Avatar\n## Belief Ladder\n## MUP\n## MSOL\n## Provas e evidências\n## Objeções\n## Oferta completa e fechamento\n## Banco de ativos reutilizáveis\n## Blueprint de modelagem\n${"análise ".repeat(900)}`;
  assert.deepEqual(analysisGaps({ coreParts: [complete], totalChunks: 1 }), []);
  const gaps = analysisGaps({ coreParts: ["# Resumo curto"], totalChunks: 3 });
  assert.ok(gaps.includes("Dissecação cronológica completa"));
  assert.ok(gaps.includes("Big Idea"));
  assert.ok(gaps.includes("Blueprint de modelagem"));
});
