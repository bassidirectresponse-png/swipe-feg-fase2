import test from "node:test";
import assert from "node:assert/strict";

process.env.ANTHROPIC_API_KEY = "test-key";
const { analysisGaps, collectAnthropic, splitCompleteText, synthesisSource } = await import("../netlify/functions/vsl-dissector-background.mjs?chunk-test=1");

function anthropicStream(text, stopReason) {
  const events = [
    `data: ${JSON.stringify({ type: "content_block_delta", delta: { type: "text_delta", text } })}\n`,
    `data: ${JSON.stringify({ type: "message_delta", delta: { stop_reason: stopReason } })}\n`,
    "data: [DONE]\n",
  ];
  return new Response(new ReadableStream({ start(controller) { for (const event of events) controller.enqueue(new TextEncoder().encode(event)); controller.close(); } }), { status: 200 });
}

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

test("resposta cortada pelo limite continua do ponto salvo em vez de falhar", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    return requests.length === 1
      ? anthropicStream("primeira metade", "max_tokens")
      : anthropicStream(" e conclusão", "end_turn");
  };
  try {
    assert.equal(await collectAnthropic("analise tudo", [], 16_000), "primeira metade\ne conclusão");
    assert.equal(requests.length, 2);
    assert.equal(requests[1].messages[1].role, "assistant");
    assert.equal(requests[1].messages[1].content[0].text, "primeira metade");
    assert.match(requests[1].messages[2].content[0].text, /Continue exatamente/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
