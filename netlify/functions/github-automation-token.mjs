import { randomBytes } from "node:crypto";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./_security.mjs";
import { supabaseAdminAuth } from "./_supabase-admin.mjs";
import { verifyGithubAutomationToken } from "./_github-oidc.mjs";

const BOT_EMAIL = "noticias-bot@swipefeg.app";

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

async function serviceRequest(path, options = {}) {
  const admin = await supabaseAdminAuth();
  if (admin.mode !== "service_role") throw new Error("service role indisponível");
  return fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: admin.apikey,
      Authorization: `Bearer ${admin.token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(12_000),
  });
}

async function ensureAutomationBot(password) {
  const list = await serviceRequest("/auth/v1/admin/users?page=1&per_page=1000");
  if (!list.ok) throw new Error(`não foi possível localizar o robô (HTTP ${list.status})`);
  const payload = await list.json();
  const users = Array.isArray(payload?.users) ? payload.users : Array.isArray(payload) ? payload : [];
  const existing = users.find(user => String(user?.email || "").toLowerCase() === BOT_EMAIL);
  const body = JSON.stringify({
    email: BOT_EMAIL,
    password,
    email_confirm: true,
    user_metadata: { role: "automation", managed_by: "github-oidc" },
  });
  const response = existing
    ? await serviceRequest(`/auth/v1/admin/users/${encodeURIComponent(existing.id)}`, { method: "PUT", body })
    : await serviceRequest("/auth/v1/admin/users", { method: "POST", body });
  if (!response.ok) throw new Error(`não foi possível preparar o robô (HTTP ${response.status})`);
}

async function signIn(password) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: BOT_EMAIL, password }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`sessão temporária recusada (HTTP ${response.status})`);
  const result = await response.json();
  if (!result?.access_token) throw new Error("sessão temporária sem token");
  return result;
}

export default async function handler(request) {
  if (request.method !== "POST") return json(405, { error: "método não permitido" });
  try {
    const authorization = String(request.headers.get("authorization") || "");
    const oidcToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    const claims = await verifyGithubAutomationToken(oidcToken);
    const password = randomBytes(36).toString("base64url");
    await ensureAutomationBot(password);
    const session = await signIn(password);
    return json(200, {
      access_token: session.access_token,
      expires_in: Number(session.expires_in) || 3600,
      run_id: claims.run_id || "",
    });
  } catch (error) {
    console.error("github-automation-token:", String(error?.message || error).slice(0, 240));
    return json(401, { error: "automação não autorizada" });
  }
}
