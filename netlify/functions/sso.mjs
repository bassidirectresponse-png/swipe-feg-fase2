import { createHmac, timingSafeEqual } from "node:crypto";
import { SUPABASE_URL, json, readJson, trustedOrigin } from "./_security.mjs";

const METHODS = "POST";
const MAX_TTL_SECONDS = 90;
const CLOCK_SKEW_SECONDS = 30;
const DENIED = { tokenHash: null };

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
    return email.trim().toLowerCase();
  } catch {
    return null;
  }
}

export async function findLinkedUser(email, url, serviceKey, fetcher = fetch) {
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  let match = null;
  // Read every page so a duplicate link cannot be hidden after the first page.
  for (let page = 1; page <= 100; page += 1) {
    const response = await fetcher(`${url}/auth/v1/admin/users?page=${page}&per_page=1000`, {
      headers,
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    const users = (await response.json())?.users;
    if (!Array.isArray(users)) return null;
    for (const user of users) {
      if (String(user?.app_metadata?.fegsys_email || "").trim().toLowerCase() !== email) continue;
      if (match || !user?.email) return null;
      match = user;
    }
    if (users.length < 1000) return match;
  }
  return null;
}

export default async function handler(request) {
  if (request.method !== "POST") return json(request, 405, DENIED, METHODS);
  if (!trustedOrigin(request)) return json(request, 403, DENIED, METHODS);
  try {
    const body = await readJson(request, { maxBytes: 5_000 });
    const email = verifyHandoffToken(body?.token, process.env.ECOSYSTEM_SSO_SECRET_SWIPE);
    const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    if (!email || !serviceKey) return json(request, 200, DENIED, METHODS);
    const user = await findLinkedUser(email, SUPABASE_URL, serviceKey);
    if (!user) return json(request, 200, DENIED, METHODS);

    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ type: "magiclink", email: user.email }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return json(request, 200, DENIED, METHODS);
    const tokenHash = (await response.json())?.hashed_token;
    return json(request, 200, { tokenHash: typeof tokenHash === "string" ? tokenHash : null }, METHODS);
  } catch {
    return json(request, 200, DENIED, METHODS);
  }
}
