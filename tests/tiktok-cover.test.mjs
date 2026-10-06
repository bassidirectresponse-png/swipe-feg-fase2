import test from "node:test";
import assert from "node:assert/strict";

process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
const { default: cover } = await import("../netlify/functions/tiktok-cover.mjs");

test("repara uma capa expirada por oEmbed e guarda cópia persistente", async () => {
  const oldFetch = globalThis.fetch, calls = [];
  const id = "6718335390845095173";
  globalThis.fetch = async (input, options = {}) => {
    const url = String(input); calls.push({ url, options });
    if (url.includes("/rest/v1/offers?select=id&limit=1")) return Response.json([{ id: "offer-1" }]);
    if (url.includes("/rest/v1/offers?")) return Response.json([{ id: "offer-1", data: { url: `https://www.tiktok.com/@scout2015/video/${id}` } }]);
    if (url.includes("/storage/v1/object/public/")) return new Response(null, { status: 404 });
    if (url.includes("www.tiktok.com/oembed")) return Response.json({ thumbnail_url: "https://p16-common-sign.tiktokcdn.com/test.jpg" });
    if (url.includes("p16-common-sign.tiktokcdn.com")) return new Response(new Uint8Array([255, 216, 255]), { headers: { "content-type": "image/jpeg" } });
    if (url.includes("/storage/v1/object/criativos/")) return Response.json({ Key: "tiktok/test.jpg" });
    if (url.includes("/rest/v1/rpc/swipe_merge_offer_data")) return new Response(null, { status: 204 });
    throw new Error(`URL não esperada: ${url}`);
  };
  try {
    const response = await cover(new Request(`https://swipe.fegsys.com/.netlify/functions/tiktok-cover?id=${id}`));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/jpeg");
    assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [255, 216, 255]);
    assert.ok(calls.some(call => call.url.includes("/storage/v1/object/criativos/tiktok/")));
    assert.ok(calls.some(call => call.url.includes("/rpc/swipe_merge_offer_data")));
  } finally { globalThis.fetch = oldFetch; }
});

test("rejeita IDs inválidos antes de consultar serviços", async () => {
  const response = await cover(new Request("https://swipe.fegsys.com/.netlify/functions/tiktok-cover?id=../../secret"));
  assert.equal(response.status, 400);
});
