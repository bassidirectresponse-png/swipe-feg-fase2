import { SUPABASE_URL } from "./_security.mjs";
import { supabaseAdminAuth } from "./_supabase-admin.mjs";
import { verifyGithubAutomationToken } from "./_github-oidc.mjs";

const TOPICS = {
  "Saúde masculina": ["Testosterona", "Libido", "Próstata", "Geral"],
  "Saúde feminina": ["Menopausa", "Hormônios", "Geral"],
  "Saúde Cardiovascular": ["Coração", "Pressão arterial", "Colesterol", "Geral"],
  "Saúde íntima / libido": ["Libido", "Saúde sexual", "Saúde íntima", "Geral"],
  "Sono/ Beleza": ["Sono", "Pele", "Beleza", "Geral"],
  "Saúde Geral/Nutrição": ["Nutrição", "Intestino", "Imunidade", "Articulações", "Geral"],
  "Pet": ["Articulações", "Pele e pelagem", "Nutrição", "Colágeno", "Geral"],
};
const SOURCES = new Set(["ScienceDaily", "CNN Health", "NBC News"]);
const HOSTS = new Set(["sciencedaily.com", "www.sciencedaily.com", "cnn.com", "www.cnn.com", "nbcnews.com", "www.nbcnews.com", "today.com", "www.today.com"]);

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store, max-age=0" },
  });
}

function validRow(row) {
  const data = row?.data;
  if (!data || data.kind !== "noticia" || !TOPICS[data.nicho]?.includes(data.subnicho)) return false;
  if (!SOURCES.has(data.fonte) || data.categoria !== "portal" || data.topic !== "portais-rss") return false;
  if (typeof data.nome !== "string" || !data.nome.trim() || data.nome.length > 300) return false;
  if (typeof data.link !== "string" || data.link.length > 2000) return false;
  let url;
  try { url = new URL(data.link); } catch { return false; }
  return url.protocol === "https:" && HOSTS.has(url.hostname);
}

export default async function handler(request) {
  if (request.method !== "POST") return json(405, { error: "método não permitido" });
  try {
    const token = String(request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    await verifyGithubAutomationToken(token, new Set(["noticias-24h.yml"]));
  } catch { return json(401, { error: "automação não autorizada" }); }

  let rows;
  try { rows = (await request.json()).rows; } catch { return json(400, { error: "JSON inválido" }); }
  if (!Array.isArray(rows) || !rows.length || rows.length > 25 || !rows.every(validRow)) return json(400, { error: "lote de notícias inválido" });
  try {
    const admin = await supabaseAdminAuth();
    if (admin.mode !== "service_role") return json(503, { error: "serviço indisponível" });
    const result = await fetch(`${SUPABASE_URL}/rest/v1/offers`, {
      method: "POST",
      headers: { apikey: admin.apikey, Authorization: `Bearer ${admin.token}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(rows),
      signal: AbortSignal.timeout(20_000),
    });
    if (!result.ok) throw new Error(`Supabase HTTP ${result.status}`);
    return json(201, { inserted: rows.length });
  } catch (error) {
    console.error("github-news-ingest:", String(error?.message || error).slice(0, 200));
    return json(502, { error: "não foi possível inserir as notícias" });
  }
}
