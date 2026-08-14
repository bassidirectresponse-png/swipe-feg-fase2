import test from "node:test";
import assert from "node:assert/strict";

process.env.ANTHROPIC_API_KEY = "test-key";
const { default: handler, VSL_STRUCTURE_CONTRACT, VSL_DISSECTION_OUTPUT_CONTRACT, analysisChunkPrompt, analysisSynthesisPrompt } = await import("../netlify/functions/vsl-dissector.mjs?functional-test=1");

function anthropicStream(text) {
  const event = JSON.stringify({ type: "content_block_delta", delta: { type: "text_delta", text } });
  return new Response(`data: ${event}\n\ndata: [DONE]\n\n`, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

async function runPhase(phase) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes("/auth/v1/user")) return Response.json({ id: "11111111-1111-4111-8111-111111111111", email: "adminswipefeg@swipefeg.app" });
    if (String(url).includes("api.anthropic.com")) return anthropicStream(`conteúdo de ${phase}`);
    throw new Error(`URL inesperada: ${url}`);
  };
  try {
    const request = new Request("https://local.test/.netlify/functions/vsl-dissector", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer session-test" },
      body: JSON.stringify({ phase, name: "VSL teste", transcript: "copy completa", organizedTranscript: "# Copy completa", duration: 300 }),
    });
    const response = await handler(request);
    assert.equal(response.status, 200);
    return (await response.text()).trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("cada metade da dissecação confirma a própria conclusão", async () => {
  for (const phase of ["analysis-core", "analysis-assets"]) {
    const events = await runPhase(phase);
    assert.ok(events.some(event => event.t === "text" && event.channel === "analysis"));
    assert.ok(events.some(event => event.t === "phase_done" && event.phase === phase));
    assert.ok(events.some(event => event.t === "done"));
    assert.ok(!events.some(event => event.t === "error"));
  }
});

test("dissecador segue integralmente a taxonomia estrutural FEG", () => {
  for (const label of [
    "Microlead", "Lead", "Background History", "Expert Presentation", "Emotional Story", "Discovery Story",
    "Tese de Marketing", "Mecanismo do Problema", "Mecanismo da Solução", "Product Build-Up", "Fórmula",
    "Personal Testimony", "Bloco de Oferta", "Pitch", "Pós-Pitch", "Bônus", "FAQ", "Depoimentos de Terceiros",
  ]) assert.match(VSL_STRUCTURE_CONTRACT, new RegExp(label));
  assert.match(VSL_STRUCTURE_CONTRACT, /função do trecho prevalece sobre sua posição/i);
  assert.match(VSL_STRUCTURE_CONTRACT, /Nunca absorver na história principal ou na oferta/i);
  const prompt = analysisChunkPrompt({ name: "Teste", niche: "", language: "pt", duration: 600 }, "copy integral", 0, 1);
  assert.match(prompt, /Evidência inicial/);
  assert.match(prompt, /Evidência final/);
  assert.match(prompt, /Justificativa da fronteira/);
  assert.match(prompt, /\[Bloco principal\] > \[Sub-bloco\]/);
  assert.match(prompt, /TAXONOMIA ESTRUTURAL FEG/);
  assert.match(VSL_DISSECTION_OUTPUT_CONTRACT, /DISSECAÇÃO NÃO É TRADUÇÃO/i);
  assert.match(VSL_DISSECTION_OUTPUT_CONTRACT, /Lead 1, Lead 2 e Lead 3/);
  assert.match(VSL_DISSECTION_OUTPUT_CONTRACT, /Quiz, comparadores de kits e personalização/);
  const synthesis = analysisSynthesisPrompt({ name: "Teste", niche: "", duration: 600 }, "partes");
  for (const heading of ["Mapa cronológico", "Estrutura consolidada", "Depoimentos de Terceiros", "Blocos ausentes", "Ambiguidades reais"]) assert.match(synthesis, new RegExp(heading));
});
