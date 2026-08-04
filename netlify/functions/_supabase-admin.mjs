import { createHash } from "node:crypto";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./_security.mjs";

const SERVICE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const BOT_EMAIL = String(process.env.SUPABASE_BOT_EMAIL || "").trim();
const BOT_PASSWORD = String(process.env.SUPABASE_BOT_PASSWORD || "");

let cachedAuth = null;
let serviceKeyValid = null;

async function validateServiceKey() {
  if (!SERVICE_KEY) return false;
  if (serviceKeyValid !== null) return serviceKeyValid;
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/offers?select=id&limit=1`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      signal: AbortSignal.timeout(8_000),
    });
    serviceKeyValid = response.ok;
  } catch {
    serviceKeyValid = false;
  }
  return serviceKeyValid;
}

async function authenticateBot() {
  if (!BOT_EMAIL || !BOT_PASSWORD) {
    throw new Error("credencial interna do Supabase não configurada");
  }
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: BOT_EMAIL, password: BOT_PASSWORD }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`login interno do Supabase recusado (HTTP ${response.status})`);
  const result = await response.json();
  if (!result?.access_token) throw new Error("login interno do Supabase sem token");
  cachedAuth = {
    apikey: SUPABASE_ANON_KEY,
    token: result.access_token,
    expiresAt: Date.now() + Math.max(60, Number(result.expires_in) || 3600) * 1000,
    mode: "bot",
  };
  return cachedAuth;
}

export async function supabaseAdminAuth() {
  if (await validateServiceKey()) {
    return { apikey: SERVICE_KEY, token: SERVICE_KEY, expiresAt: Infinity, mode: "service_role" };
  }
  if (cachedAuth && cachedAuth.expiresAt - Date.now() > 60_000) return cachedAuth;
  return authenticateBot();
}

export async function supabaseAdminHeaders(extra = {}) {
  const auth = await supabaseAdminAuth();
  return { apikey: auth.apikey, Authorization: `Bearer ${auth.token}`, ...extra };
}

export function shallowDataPatch(before = {}, after = {}) {
  const patch = {};
  for (const key of new Set([...Object.keys(before || {}), ...Object.keys(after || {})])) {
    const previous = Object.prototype.hasOwnProperty.call(before || {}, key) ? before[key] : null;
    const next = Object.prototype.hasOwnProperty.call(after || {}, key) ? after[key] : null;
    if (JSON.stringify(previous) !== JSON.stringify(next)) patch[key] = next;
  }
  return patch;
}

export async function mergeSupabaseOfferData(id, patch, fallbackData) {
  const rpc = await fetch(`${SUPABASE_URL}/rest/v1/rpc/swipe_merge_offer_data`, {
    method: "POST",
    headers: await supabaseAdminHeaders({ "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify({ p_id: id, p_patch: patch || {} }),
    signal: AbortSignal.timeout(12_000),
  });
  if (rpc.ok) return;

  // Compatibilidade durante o deploy: o worker continua operando antes de a
  // função SQL ser aplicada, mas volta ao modo atômico assim que ela existir.
  if (![400, 404].includes(rpc.status) || !fallbackData) {
    throw new Error(`não foi possível atualizar o registro ${id} (HTTP ${rpc.status})`);
  }
  const response = await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: await supabaseAdminHeaders({ "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify({ data: fallbackData }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`não foi possível atualizar o registro ${id} (HTTP ${response.status})`);
}

export function automationSigningSecret() {
  const configured = String(process.env.AUTOMATION_SIGNING_SECRET || "").trim();
  if (configured) return configured;
  const fallback = BOT_PASSWORD || SERVICE_KEY;
  if (!fallback) return "";
  return createHash("sha256").update(`feg-automation-v2|${fallback}`).digest("hex");
}
