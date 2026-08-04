import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

function productionSecret(name) {
  try {
    return execFileSync("npx", ["netlify", "env:get", name, "--context", "production"], {
      cwd: new URL(".", ROOT), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
      timeout: 15_000,
    }).trim();
  } catch {
    return "";
  }
}

export async function projectConfig() {
  const html = await fs.readFile(new URL("index.html", ROOT), "utf8");
  const url = html.match(/const DEFAULT_URL="([^"]+)"/)?.[1];
  const anonKey = html.match(/const DEFAULT_KEY="([^"]+)"/)?.[1]
    || html.match(/const DEFAULT_ANON_KEY="([^"]+)"/)?.[1]
    || html.match(/const DEFAULT_SUPABASE_ANON_KEY="([^"]+)"/)?.[1];
  if (!url || !anonKey) throw new Error("configuração pública do Supabase não encontrada");
  return { url: url.replace(/\/+$/, ""), anonKey };
}

async function serviceRoleAuth(url, key) {
  if (!key) return null;
  try {
    const response = await fetch(`${url}/rest/v1/offers?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok ? { apikey: key, token: key, mode: "service_role" } : null;
  } catch {
    return null;
  }
}

export async function productionAdminAuth() {
  const { url, anonKey } = await projectConfig();
  // Em automações normais, prefira o usuário interno de baixo privilégio.
  // Uma service role explícita continua disponível para recuperação controlada.
  const explicitServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const service = await serviceRoleAuth(url, explicitServiceKey);
  if (service) return { url, ...service };

  const email = process.env.SUPABASE_BOT_EMAIL || productionSecret("SUPABASE_BOT_EMAIL");
  const password = process.env.SUPABASE_BOT_PASSWORD || productionSecret("SUPABASE_BOT_PASSWORD");
  if (email && password) {
    const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(15_000),
    });
    if (response.ok) {
      const result = await response.json();
      if (result?.access_token) return { url, apikey: anonKey, token: result.access_token, mode: "bot" };
    }
  }

  const recoveredServiceKey = productionSecret("SUPABASE_SERVICE_ROLE_KEY");
  const recoveredService = await serviceRoleAuth(url, recoveredServiceKey);
  if (recoveredService) return { url, ...recoveredService };
  throw new Error("credencial administrativa do Supabase não disponível ou recusada");
}

export function authHeaders(auth, extra = {}) {
  return { apikey: auth.apikey, Authorization: `Bearer ${auth.token}`, ...extra };
}
