import { aggregateSnapshot, getSnapshot, resolveRange } from "./_fegsys-bigquery.mjs";

const SUPABASE_URL = (process.env.SUPABASE_URL || "https://ppaajtzbhjixhyfidojd.supabase.co").replace(/\/+$/, "");
const ANON = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYXNlIiwicmVmIjoicHBhYWp0emJoaml4aHlmaWRvamQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc4MTIwOTM1NywiZXhwIjoyMDk2Nzg1MzUwfQ.uoC_3EHM_dfmkBHJYjPvlaC7DqkJziunz-tug0ItAJc";
const ADMIN_EMAILS = new Set(["adminswipefeg@swipefeg.app"]);
const configured = () => !!(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64);
const json = (status, body) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

async function adminUser(req) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON, authorization: `Bearer ${token}` } }).catch(() => null);
  if (!response || !response.ok) return null;
  const user = await response.json();
  return ADMIN_EMAILS.has(String(user.email || "").toLowerCase()) ? user : null;
}

export default async req => {
  if (req.method !== "GET") return json(405, { ok: false, error: "método inválido" });
  if (!await adminUser(req)) return json(403, { ok: false, error: "recurso disponível apenas no painel admin" });
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
