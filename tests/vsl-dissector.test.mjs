import test from "node:test";
import assert from "node:assert/strict";

process.env.ANTHROPIC_API_KEY = "test-key";
const { default: handler } = await import("../netlify/functions/vsl-dissector.mjs?functional-test=1");

function anthropicStream(text) {
  const event = JSON.stringify({ type: "content_block_delta", delta: { type: "text_delta", text } });
  return new Response(`data: ${event}\n\ndata: [DONE]\n\n`, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

async function runPhase(phase) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (String(url).includes("/auth/v1/user")) return new Response("{}", { status: 200 });
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
