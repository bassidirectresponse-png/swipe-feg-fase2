// Persistência das transcrições avulsas em Netlify Blobs.
// O áudio nunca é armazenado: somente texto, segmentos e timestamps por palavra.
import { getStore } from "@netlify/blobs";

const SUPABASE_URL = (process.env.SUPABASE_URL || "https://ppaajtzbhjixhyfidojd.supabase.co").replace(/\/+$/, "");
const ANON = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYXNlIiwicmVmIjoicHBhYWp0emJoaml4aHlmaWRvamQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc4MTIwOTM1NywiZXhwIjoyMDk2Nzg1MzUwfQ.uoC_3EHM_dfmkBHJYjPvlaC7DqkJziunz-tug0ItAJc";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const json = (status, body) => Response.json(body, { status, headers: CORS });

async function authenticated(req) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON, Authorization: `Bearer ${token}` } });
    return response.ok ? await response.json() : null;
  } catch { return null; }
}

export default async (req) => {
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: CORS });
  const user = await authenticated(req);
  if (!user) return json(401, { ok: false, error: "sessão inválida" });
  const store = getStore({ name: "transcricoes", consistency: "strong" });

  if (req.method === "GET") {
    const id = new URL(req.url).searchParams.get("id") || "";
    if (!/^[a-f0-9-]{20,50}$/i.test(id)) return json(400, { ok: false, error: "id inválido" });
    const entry = await store.get(id, { type: "json" });
    return entry ? json(200, { ok: true, transcript: entry }) : json(404, { ok: false, error: "transcrição não encontrada" });
  }
  if (req.method !== "POST") return json(405, { ok: false, error: "método inválido" });

  let input;
  try { input = await req.json(); } catch { return json(400, { ok: false, error: "JSON inválido" }); }
  const text = String(input.text || "").trim();
  const segments = Array.isArray(input.segments) ? input.segments.slice(0, 20_000) : [];
  const words = Array.isArray(input.words) ? input.words.slice(0, 100_000) : [];
  if (!text && !segments.length) return json(400, { ok: false, error: "transcrição vazia" });
  const id = crypto.randomUUID();
  const transcript = {
    id,
    text: text.slice(0, 2_000_000),
    segments,
    words,
    language: String(input.language || "").slice(0, 20),
    duration: Math.max(0, +input.duration || 0),
    fileName: String(input.fileName || "transcricao").slice(0, 240),
    createdAt: new Date().toISOString(),
    createdBy: String(user.id || "")
  };
  await store.setJSON(id, transcript);
  return json(201, { ok: true, id });
};
