import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import handler, { findAdminUser, verifyHandoffToken } from "../netlify/functions/sso.mjs";

const secret = ["test", "signing", "fixture"].join("-");
const now = Math.floor(Date.now() / 1000);
const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
function handoff(overrides = {}, signingSecret = secret) {
  const data = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ iss: "fegsys", aud: "swipe", email: " Person@grupofeg.com ", iat: now, exp: now + 60, ...overrides })}`;
  return `${data}.${createHmac("sha256", signingSecret).update(data).digest("base64url")}`;
}

test("valida o passe FEGSYS e normaliza o e-mail", () => {
  assert.equal(verifyHandoffToken(handoff(), secret, now), "person@grupofeg.com");
  assert.equal(verifyHandoffToken(handoff(), "another-secret", now), null);
  assert.equal(verifyHandoffToken(handoff({ exp: now - 31 }), secret, now), null);
  assert.equal(verifyHandoffToken(handoff({ exp: now + 91 }), secret, now), null);
  assert.equal(verifyHandoffToken(handoff({ iat: now + 31, exp: now + 60 }), secret, now), null);
  assert.equal(verifyHandoffToken(handoff({ aud: "other" }), secret, now), null);
  assert.equal(verifyHandoffToken(handoff({ email: "" }), secret, now), null);
  assert.equal(verifyHandoffToken(handoff({ email: "person@gmail.com" }), secret, now), null);
  assert.equal(verifyHandoffToken(handoff({ email: "person@grupofeg.com.attacker.test" }), secret, now), null);
  assert.equal(verifyHandoffToken(handoff({ email: "person@grupofeg.com@attacker.test" }), secret, now), null);
  assert.equal(verifyHandoffToken(handoff().replace(/.$/, "!"), secret, now), null);
});

test("localiza somente a conta administrativa exata", async () => {
  const id = "58ae8365-0247-49c8-aa1d-0b38fcc92dca";
  const fetcher = async url => {
    assert.equal(url, `https://example.invalid/auth/v1/admin/users/${id}`);
    return Response.json({ id, email: "adminswipefeg@swipefeg.app" });
  };
  assert.equal((await findAdminUser("https://example.invalid", "test-key", fetcher))?.id, id);
  const wrongUser = async () => Response.json({ id: "another-id", email: "adminswipefeg@swipefeg.app" });
  assert.equal(await findAdminUser("https://example.invalid", "test-key", wrongUser), null);
});

test("endpoint provisiona leitor corporativo e reserva o admin para a identidade explícita", async () => {
  const originalFetch = globalThis.fetch;
  const originalSecret = process.env.ECOSYSTEM_SSO_SECRET_SWIPE;
  const originalService = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.ECOSYSTEM_SSO_SECRET_SWIPE = secret;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    if (url.includes("/admin/users/")) return Response.json({ id: "58ae8365-0247-49c8-aa1d-0b38fcc92dca", email: "adminswipefeg@swipefeg.app" });
    return Response.json({ hashed_token: "one-time-test-hash" });
  };
  try {
    const endpoint = "https://benchmarkinggrupofeg.site/.netlify/functions/sso";
    const post = token => new Request(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://benchmarkinggrupofeg.site" }, body: JSON.stringify({ token }) });
    const success = await handler(post(handoff()));
    assert.deepEqual(await success.json(), { tokenHash: "one-time-test-hash" });
    assert.equal(success.headers.get("cache-control"), "no-store");
    assert.equal(requests.length, 1);
    assert.deepEqual(JSON.parse(requests[0].options.body), { type: "magiclink", email: "person@grupofeg.com" });
    const admin = await handler(post(handoff({ email: "guilherme.bassi@grupofeg.com" })));
    assert.deepEqual(await admin.json(), { tokenHash: "one-time-test-hash" });
    assert.equal(requests.length, 3);
    assert.deepEqual(JSON.parse(requests[2].options.body), { type: "magiclink", email: "adminswipefeg@swipefeg.app" });
    assert.deepEqual(await (await handler(post(handoff({ aud: "wrong" })))).json(), { tokenHash: null });
    assert.deepEqual(await (await handler(post(handoff({ email: "adminswipefeg@swipefeg.app" })))).json(), { tokenHash: null });
    assert.equal(requests.length, 3);
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

test("boot consome o fragmento antes de buscar a sessão e oferece somente Google", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const auth = html.slice(html.indexOf("async function startAuth()"), html.indexOf('async function logout()'));
  assert.ok(auth.indexOf("history.replaceState") < auth.indexOf("await fetch('/.netlify/functions/sso'"));
  assert.ok(auth.indexOf("sb.auth.signOut({scope:'local'})") < auth.indexOf("await fetch('/.netlify/functions/sso'"));
  assert.ok(auth.indexOf("verifyOtp") < auth.indexOf("sb.auth.getSession"));
  assert.doesNotMatch(html, /sb\.auth\.signInWithPassword|id="loginUser"|id="loginPass"/);
  assert.match(html, /href="https:\/\/fegsys\.com\/sso\/swipe"[^>]*>Entrar com o Google da FEG<\/a>/);
});
