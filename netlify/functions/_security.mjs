import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import { getStore } from "@netlify/blobs";

const DEFAULT_SUPABASE_URL = "https://ppaajtzbhjixhyfidojd.supabase.co";
// A chave anon do Supabase identifica o projeto e foi criada para uso público no browser.
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwYWFqdHpiaGppeGh5Zmlkb2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMDkzNTcsImV4cCI6MjA5Njc4NTM1N30.uoC_3EHM_dfmkBHJYjPvlaC7DqkJziunz-tug0ItAJc";
const DEFAULT_ADMIN_EMAIL = "adminswipefeg@swipefeg.app";
const DEFAULT_ADMIN_ID = "ff9e002e-7ed1-4bc3-8571-18ffcb0c95c3";

export const SUPABASE_URL = (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, "");
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

const csvSet = (value) => new Set(String(value || "").split(",").map(item => item.trim().toLowerCase()).filter(Boolean));
const ADMIN_EMAILS = csvSet(process.env.ADMIN_EMAILS || DEFAULT_ADMIN_EMAIL);
const ADMIN_IDS = csvSet(process.env.ADMIN_IDS || DEFAULT_ADMIN_ID);
const AUTOMATION_EMAILS = csvSet(process.env.AUTOMATION_EMAILS || "noticias-bot@swipefeg.app");

function requestOrigin(req) {
  try { return new URL(req.url).origin; } catch { return ""; }
}

function allowedOrigins(req) {
  const allowed = csvSet(process.env.APP_ORIGINS || "https://benchmarkinggrupofeg.site");
  const own = requestOrigin(req).toLowerCase();
  if (own) allowed.add(own);
  for (const value of [process.env.URL, process.env.DEPLOY_PRIME_URL, process.env.DEPLOY_URL]) {
    try { if (value) allowed.add(new URL(value).origin.toLowerCase()); } catch {}
  }
  if (process.env.NODE_ENV !== "production") {
    allowed.add("http://localhost:8888");
    allowed.add("http://localhost:3000");
  }
  return allowed;
}

export function trustedOrigin(req) {
  const origin = String(req.headers.get("origin") || "").trim().toLowerCase();
  return !origin || allowedOrigins(req).has(origin);
}

export function corsHeaders(req, methods = "GET, POST, OPTIONS") {
  const origin = String(req.headers.get("origin") || "").trim();
  const headers = {
    "Access-Control-Allow-Headers": "authorization, content-type, x-feg-auth",
    "Access-Control-Allow-Methods": methods,
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Cross-Origin-Resource-Policy": "same-site",
    "Referrer-Policy": "no-referrer",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };
  if (origin && allowedOrigins(req).has(origin.toLowerCase())) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

export function preflight(req, methods) {
  if (req.method !== "OPTIONS") return null;
  if (!trustedOrigin(req)) return json(req, 403, { ok: false, error: "origem não autorizada" }, methods);
  return new Response(null, { status: 204, headers: corsHeaders(req, methods) });
}

export function json(req, status, body, methods) {
  return Response.json(body, {
    status,
    headers: { ...corsHeaders(req, methods), "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function readJson(req, { maxBytes = 256 * 1024 } = {}) {
  const contentType = String(req.headers.get("content-type") || "").toLowerCase();
  if (!contentType.startsWith("application/json")) {
    const error = new Error("content-type deve ser application/json");
    error.status = 415;
    throw error;
  }
  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > maxBytes) {
    const error = new Error("corpo da requisição excede o limite");
    error.status = 413;
    throw error;
  }
  const raw = await req.text();
  if (Buffer.byteLength(raw, "utf8") > maxBytes) {
    const error = new Error("corpo da requisição excede o limite");
    error.status = 413;
    throw error;
  }
  try { return JSON.parse(raw || "{}"); }
  catch {
    const error = new Error("JSON inválido");
    error.status = 400;
    throw error;
  }
}

export function bearerToken(req) {
  return String(req.headers.get("x-feg-auth") || req.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
}

export async function authenticateToken(token) {
  if (!token || token.length > 8192) return null;
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    const user = await response.json();
    return user && user.id ? user : null;
  } catch { return null; }
}

export async function authenticate(req) {
  return authenticateToken(bearerToken(req));
}

export function isAdmin(user) {
  const id = String(user && user.id || "").trim().toLowerCase();
  const email = String(user && user.email || "").trim().toLowerCase();
  return ADMIN_IDS.has(id) || ADMIN_EMAILS.has(email);
}

export function canAutomate(user) {
  return isAdmin(user) || AUTOMATION_EMAILS.has(String(user && user.email || "").trim().toLowerCase());
}

function digest(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

const localRateLimits = globalThis.__fegLocalRateLimits || new Map();
if (!globalThis.__fegLocalRateLimits) globalThis.__fegLocalRateLimits = localRateLimits;

export async function rateLimit(scope, identity, { limit = 30, windowMs = 60_000 } = {}) {
  if (!identity) return { allowed: false, retryAfter: Math.ceil(windowMs / 1000), remaining: 0 };
  const bucket = Math.floor(Date.now() / windowMs);
  const key = `${scope}/${digest(`${process.env.RATE_LIMIT_SALT || "feg-rate-v1"}|${identity}|${bucket}`)}`;
  let count;
  try {
    const store = getStore({ name: "security-rate-limits", consistency: "strong" });
    let written = false;
    for (let attempt = 0; attempt < 5 && !written; attempt += 1) {
      const current = await store.getWithMetadata(key, { type: "json", consistency: "strong" });
      count = Math.max(0, Number(current && current.data && current.data.count) || 0) + 1;
      const options = current && current.etag ? { onlyIfMatch: current.etag } : { onlyIfNew: true };
      const result = await store.setJSON(key, { count, expiresAt: (bucket + 1) * windowMs }, options);
      written = result.modified;
    }
    if (!written) return { allowed: false, retryAfter: Math.ceil(windowMs / 1000), remaining: 0 };
  } catch {
    if (process.env.NETLIFY === "true" || process.env.NODE_ENV === "production") {
      return { allowed: false, retryAfter: Math.ceil(windowMs / 1000), remaining: 0 };
    }
    count = (localRateLimits.get(key) || 0) + 1;
    localRateLimits.set(key, count);
    if (localRateLimits.size > 2_000) {
      for (const storedKey of localRateLimits.keys()) {
        if (!storedKey.includes(`/${bucket}`)) localRateLimits.delete(storedKey);
      }
    }
  }
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfter: Math.max(1, Math.ceil(((bucket + 1) * windowMs - Date.now()) / 1000)),
  };
}

function isPrivateAddress(address) {
  if (!address) return true;
  if (address === "::1" || address === "0.0.0.0") return true;
  if (address.startsWith("fe80:") || address.startsWith("fc") || address.startsWith("fd")) return true;
  if (address.startsWith("::ffff:")) return isPrivateAddress(address.slice(7));
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  return false;
}

export async function assertSafeRemoteUrl(value, { allowedHostSuffixes = [] } = {}) {
  let url;
  try { url = new URL(String(value || "")); } catch { throw new Error("URL remota inválida"); }
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("URL remota não permitida");
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (allowedHostSuffixes.length && !allowedHostSuffixes.some(suffix => hostname === suffix || hostname.endsWith(`.${suffix}`))) {
    throw new Error("host remoto não permitido");
  }
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(item => isPrivateAddress(item.address))) throw new Error("destino remoto não permitido");
  return url;
}

export async function safeRemoteFetch(value, { allowedHostSuffixes = [], maxRedirects = 3, timeoutMs = 20_000, ...options } = {}) {
  let url = await assertSafeRemoteUrl(value, { allowedHostSuffixes });
  for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
    const response = await fetch(url, { ...options, redirect: "manual", signal: AbortSignal.timeout(timeoutMs) });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    if (redirect === maxRedirects) throw new Error("redirecionamentos demais");
    const location = response.headers.get("location");
    if (!location) throw new Error("redirecionamento remoto inválido");
    url = await assertSafeRemoteUrl(new URL(location, url), { allowedHostSuffixes });
  }
  throw new Error("download remoto interrompido");
}

export async function boundedBuffer(response, maxBytes) {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > maxBytes) throw new Error("arquivo remoto excede o limite");
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new Error("arquivo remoto excede o limite");
      chunks.push(Buffer.from(value));
    }
  } finally {
    if (total > maxBytes) await reader.cancel().catch(() => {});
  }
  return Buffer.concat(chunks, total);
}

export function safeError(error, fallback = "falha interna") {
  const status = Number(error && error.status);
  return { status: status >= 400 && status <= 499 ? status : 400, message: String(error && error.message || fallback).slice(0, 180) };
}
