import { createHmac, timingSafeEqual } from "node:crypto";
import { SUPABASE_URL, json, readJson, trustedOrigin } from "./_security.mjs";

const METHODS = "POST";
const MAX_TTL_SECONDS = 90;
const CLOCK_SKEW_SECONDS = 30;
const DENIED = { tokenHash: null };
const FEGSYS_DOMAIN = "grupofeg.com";
const FEGSYS_ADMIN_EMAIL = "guilherme.bassi@grupofeg.com";
const SWIPE_ADMIN_ID = "58ae8365-0247-49c8-aa1d-0b38fcc92dca";
const SWIPE_ADMIN_EMAIL = "adminswipefeg@swipefeg.app";

function deny(request, stage, status) {
  console.warn("Swipe SSO denied", { stage, ...(status ? { status } : {}) });
  return json(request, 200, DENIED, METHODS);
}

export function verifyHandoffToken(token, secret, now = Math.floor(Date.now() / 1000)) {
  if (typeof token !== "string" || token.length > 4096 || typeof secret !== "string" || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) return null;
  const [rawHeader, rawPayload, rawSignature] = parts;
  if (rawSignature.length !== 43) return null;
  const received = Buffer.from(rawSignature, "base64url");
  const expected = createHmac("sha256", secret).update(`${rawHeader}.${rawPayload}`).digest();
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

  try {
    const header = JSON.parse(Buffer.from(rawHeader, "base64url").toString("utf8"));
    const payload = JSON.parse(Buffer.from(rawPayload, "base64url").toString("utf8"));
    if (header?.alg !== "HS256" || header?.typ !== "JWT") return null;
    if (payload?.iss !== "fegsys" || payload?.aud !== "swipe") return null;
    const { email, iat, exp } = payload;
    if (typeof email !== "string" || !email.trim()) return null;
    if (!Number.isInteger(iat) || !Number.isInteger(exp)) return null;
    if (exp <= iat || exp - iat > MAX_TTL_SECONDS) return null;
    if (iat > now + CLOCK_SKEW_SECONDS || exp < now - CLOCK_SKEW_SECONDS) return null;
    const normalizedEmail = email.trim().toLowerCase();
    const [localPart, domain, extra] = normalizedEmail.split("@");
    if (!localPart || domain !== FEGSYS_DOMAIN || extra || /\s/.test(normalizedEmail)) return null;
    return normalizedEmail;
  } catch {
    return null;
  }
}

export async function findAdminUser(url, serviceKey, fetcher = fetch) {
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const response = await fetcher(`${url}/auth/v1/admin/users/${SWIPE_ADMIN_ID}`, {
    headers,
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return null;
  const user = await response.json();
  return user?.id === SWIPE_ADMIN_ID && String(user?.email || "").trim().toLowerCase() === SWIPE_ADMIN_EMAIL ? user : null;
}

export default async function handler(request) {
  if (request.method !== "POST") return json(request, 405, DENIED, METHODS);
  if (!trustedOrigin(request)) return json(request, 403, DENIED, METHODS);
  try {
    const body = await readJson(request, { maxBytes: 5_000 });
    const email = verifyHandoffToken(body?.token, process.env.ECOSYSTEM_SSO_SECRET_SWIPE);
    const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    if (!email) return deny(request, "handoff-verification");
    if (!serviceKey) return deny(request, "service-key-missing");
    // The corporate IdP authenticates every reader. Only the one explicit
    // corporate admin identity is mapped to the pre-existing admin account.
    const targetEmail = email === FEGSYS_ADMIN_EMAIL
      ? (await findAdminUser(SUPABASE_URL, serviceKey))?.email
      : email;
    if (!targetEmail) return deny(request, "admin-user-lookup");

    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ type: "magiclink", email: targetEmail }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return deny(request, "generate-link", response.status);
    const tokenHash = (await response.json())?.hashed_token;
    if (typeof tokenHash !== "string" || !tokenHash) return deny(request, "generate-link-hash-missing");
    return json(request, 200, { tokenHash: typeof tokenHash === "string" ? tokenHash : null }, METHODS);
  } catch {
    return deny(request, "unexpected-error");
  }
}
