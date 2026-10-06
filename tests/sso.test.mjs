import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import handler, { findLinkedUser, verifyHandoffToken } from "../netlify/functions/sso.mjs";

const secret = ["test", "signing", "fixture"].join("-");
const now = Math.floor(Date.now() / 1000);
const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
function handoff(overrides = {}, signingSecret = secret) {
  const data = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ iss: "fegsys", aud: "swipe", email: " Person@Example.com ", iat: now, exp: now + 60, ...overrides })}`;
  return `${data}.${createHmac("sha256", signingSecret).update(data).digest("base64url")}`;
}

test("valida o passe FEGSYS e normaliza o e-mail", () => {
  assert.equal(verifyHandoffToken(handoff(), secret, now), "person@example.com");
  assert.equal(verifyHandoffToken(handoff(), "another-secret", now), null);
  assert.equal(verifyHandoffToken(handoff({ exp: now - 31 }), secret, now), null);
  assert.equal(verifyHandoffToken(handoff({ exp: now + 91 }), secret, now), null);
  assert.equal(verifyHandoffToken(handoff({ iat: now + 31, exp: now + 60 }), secret, now), null);
  assert.equal(verifyHandoffToken(handoff({ aud: "other" }), secret, now), null);
  assert.equal(verifyHandoffToken(handoff({ email: "" }), secret, now), null);
  assert.equal(verifyHandoffToken(handoff().replace(/.$/, "!"), secret, now), null);
});

test("busca todas as páginas e rejeita vínculo duplicado", async () => {
  const first = Array.from({ length: 1000 }, (_, index) => ({ id: String(index) }));
  first[4] = { id: "linked", email: "swipe@swipefeg.app", app_metadata: { fegsys_email: "PERSON@example.com" } };
  const calls = [];
  const fetcher = async url => {
    calls.push(url);
    return Response.json({ users: calls.length === 1 ? first : [] });
  };
  assert.equal((await findLinkedUser("person@example.com", "https://example.invalid", "test-key", fetcher))?.id, "linked");
  assert.equal(calls.length, 2);
  const duplicate = async () => Response.json({ users: [first[4], { ...first[4], id: "other" }] });
  assert.equal(await findLinkedUser("person@example.com", "https://example.invalid", "test-key", duplicate), null);
});

test("endpoint só entrega token para vínculo único; falhas são indistintas", async () => {
  const originalFetch = globalThis.fetch;
  const originalSecret = process.env.ECOSYSTEM_SSO_SECRET_SWIPE;
  const originalService = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.ECOSYSTEM_SSO_SECRET_SWIPE = secret;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    if (url.includes("/admin/users")) return Response.json({ users: [{ email: "swipe@swipefeg.app", app_metadata: { fegsys_email: "person@example.com" } }] });
    return Response.json({ hashed_token: "one-time-test-hash" });
  };
  try {
    const endpoint = "https://benchmarkinggrupofeg.site/.netlify/functions/sso";
    const post = token => new Request(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://benchmarkinggrupofeg.site" }, body: JSON.stringify({ token }) });
    const success = await handler(post(handoff()));
    assert.deepEqual(await success.json(), { tokenHash: "one-time-test-hash" });
    assert.equal(success.headers.get("cache-control"), "no-store");
    assert.equal(requests.length, 2);
    assert.deepEqual(JSON.parse(requests[1].options.body), { type: "magiclink", email: "swipe@swipefeg.app" });
    assert.deepEqual(await (await handler(post(handoff({ aud: "wrong" })))).json(), { tokenHash: null });
    assert.equal(requests.length, 2);
    const forbidden = await handler(new Request(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://evil.invalid" }, body: JSON.stringify({ token: handoff() }) }));
    assert.equal(forbidden.status, 403);
    assert.deepEqual(await forbidden.json(), { tokenHash: null });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalSecret === undefined) delete process.env.ECOSYSTEM_SSO_SECRET_SWIPE;
    else process.env.ECOSYSTEM_SSO_SECRET_SWIPE = originalSecret;
    if (originalService === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalService;
  }
});

test("boot consome o fragmento antes de buscar a sessão e mantém login por senha", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const auth = html.slice(html.indexOf("async function startAuth()"), html.indexOf('$("#loginForm").addEventListener'));
  assert.ok(auth.indexOf("history.replaceState") < auth.indexOf("await fetch('/.netlify/functions/sso'"));
  assert.ok(auth.indexOf("verifyOtp") < auth.indexOf("sb.auth.getSession"));
  assert.match(html, /sb\.auth\.signInWithPassword/);
});
