import { aggregateSnapshot, getSnapshot, resolveRange } from "./_fegsys-bigquery.mjs";

const DEFAULT_SUPABASE_URL = "https://ppaajtzbhjixhyfidojd.supabase.co";
const DEFAULT_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYXNlIiwicmVmIjoicHBhYWp0emJoaml4aHlmaWRvamQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc4MTIwOTM1NywiZXhwIjoyMDk2Nzg1MzUwfQ.uoC_3EHM_dfmkBHJYjPvlaC7DqkJziunz-tug0ItAJc";
const SUPABASE_URL = (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/+$/, "");
const ANON = process.env.SUPABASE_ANON_KEY || DEFAULT_ANON;
const ADMIN_EMAILS = new Set(["adminswipefeg@swipefeg.app"]);
const ADMIN_IDS = new Set(["ff9e002e-7ed1-4bc3-8571-18ffcb0c95c3"]);
const configured = () => !!(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64);
const json = (status, body) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

function tokenClaims(token) {
  try { return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")); }
  catch { return {}; }
}

function isAllowedAdmin(user) {
  const id = String(user && (user.id || user.sub) || "").toLowerCase();
  const email = String(user && user.email || "").trim().toLowerCase();
  return ADMIN_IDS.has(id) || ADMIN_EMAILS.has(email);
}

async function adminUser(req) {
  // Alguns proxies/CDNs tratam `Authorization` como cabeçalho reservado. O
  // painel envia também uma cópia no cabeçalho privado abaixo; em ambos os
  // casos o JWT continua sendo validado pelo próprio Supabase antes do acesso.
  const token = (req.headers.get("x-feg-auth") || req.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  if (!token) return null;
  // A configuração da Netlify pode manter uma URL antiga. Valida primeiro nela e,
  // se necessário, repete no projeto que efetivamente atende o painel.
  const targets = [[SUPABASE_URL, ANON], [DEFAULT_SUPABASE_URL, DEFAULT_ANON]]
    .filter(([url, key], index, all) => all.findIndex(([u, k]) => u === url && k === key) === index);
  for (const [baseUrl, anonKey] of targets) {
    const response = await fetch(`${baseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` }
    }).catch(() => null);
    if (response && response.ok) {
      const user = await response.json();
      if (isAllowedAdmin(user)) return user;
    }

    // Alguns projetos Supabase recusam /auth/v1/user durante a rotação das
    // chaves públicas, embora o mesmo JWT continue válido no PostgREST. O
    // PostgREST valida a assinatura antes de responder; só então usamos as
    // claims assinadas para conferir o admin permitido.
    const rest = await fetch(`${baseUrl}/rest/v1/offers?select=id&limit=1`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` }
    }).catch(() => null);
    if (rest && rest.ok) {
      const claims = tokenClaims(token);
      if (isAllowedAdmin(claims)) return claims;
    }
  }
  return null;
}

export default async req => {
  if (req.method !== "GET") return json(405, { ok: false, error: "método inválido" });
  if (!await adminUser(req)) return json(401, { ok: false, error: "sessão do administrador não reconhecida; saia e entre novamente" });
  const url = new URL(req.url);
  const range = resolveRange(url.searchParams);
  let snapshot;
  try { snapshot = await getSnapshot({ refresh: url.searchParams.get("refresh") === "1" }); }
  catch (error) { return json(502, { ok: false, error: String(error && error.message || "falha na leitura do FEGSYS"), configured: configured() }); }
  if (!snapshot) return json(503, { ok: false, error: "integração aguardando a nova credencial segura", configured: configured() });
  const result = aggregateSnapshot(snapshot, range);
  return json(200, {
    ok: true,
    configured: configured(),
    range,
    syncedAt: snapshot.syncedAt,
    coverage: { from: snapshot.oldestDate, to: snapshot.newestDate },
    ...result
  });
};
