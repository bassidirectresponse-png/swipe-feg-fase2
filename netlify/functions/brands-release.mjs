import { getStore } from "@netlify/blobs";
import { SUPABASE_URL } from "./_security.mjs";
import { verifyGithubAutomationToken } from "./_github-oidc.mjs";
import { mergeSupabaseOfferData, supabaseAdminAuth } from "./_supabase-admin.mjs";
import { changedFields, draftIsPublished, mergeBrandDraft } from "../../lib/brand-release.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WORKFLOWS = new Set(["brands-release.yml"]);
const WRONG_ULTIMA_ID = "23681d5a-89f6-4f41-8afb-ba3c8ab9bed9";

function reply(status, body) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", "Content-Security-Policy": "default-src 'none'" } });
}

async function credentials() {
  const admin = await supabaseAdminAuth();
  if (admin.mode !== "service_role") throw new Error("chave de serviço indisponível");
  return { apikey: admin.apikey, Authorization: `Bearer ${admin.token}`, "Content-Type": "application/json" };
}

async function offerById(id, headers) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(id)}&select=id,data`, {
    headers, signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`consulta da oferta falhou (HTTP ${response.status})`);
  return (await response.json())[0] || null;
}

function safePatch(id, source) {
  const patch = { ...source };
  const wrongBrand = id === WRONG_ULTIMA_ID && (patch.bmReports || []).some(report =>
    (report.campaigns || []).some(row => /\|\s*BnB\s*\|/i.test(String(row.name || ""))));
  if (wrongBrand) {
    for (const key of ["bmReports", "bmReportsReplace", "bmReportsRemoveKeys", "bmSpend7d", "bmSpend14d", "bmSpend30d", "bmAvgConversion", "bmCpc", "bmCpcLink", "bmCpm", "bmCtr", "bmCostUnique", "bmCostIc", "bmRoas", "bmUpdatedAt", "bmNotes", "bmNotesReplace"]) delete patch[key];
  }
  return { patch, wrongBrand };
}

async function listDrafts(store) {
  const drafts = [];
  for await (const page of store.list({ prefix: "offers/", paginate: true })) {
    for (const blob of page.blobs) {
      if (!/^offers\/[0-9a-f-]{36}\.json$/i.test(blob.key)) continue;
      const draft = await store.get(blob.key, { type: "json" });
      if (draft && UUID.test(String(draft.target_offer_id || ""))) drafts.push(draft);
    }
  }
  return drafts.sort((a, b) => a.target_offer_id.localeCompare(b.target_offer_id));
}

export default async request => {
  if (!["GET", "POST"].includes(request.method)) return reply(405, { ok: false, error: "método inválido" });
  try {
    const token = String(request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    const claims = await verifyGithubAutomationToken(token, WORKFLOWS);
    const store = getStore({ name: "admin-offer-drafts", consistency: "strong" });
    if (request.method === "GET") {
      const drafts = await listDrafts(store);
      return reply(200, { ok: true, total: drafts.length, pending: drafts.filter(d => !draftIsPublished(d)).length,
        drafts: drafts.map(d => ({ id: d.target_offer_id, name: String(d.data_patch?.nomeOferta || d.label || "Oferta Brands").slice(0, 100), newOffer: d.new_offer === true,
          pending: !draftIsPublished(d), patchKeys: Object.keys(d.data_patch || {}).sort(), reports: Array.isArray(d.data_patch?.bmReports) ? d.data_patch.bmReports.length : 0,
          prints: Array.isArray(d.data_patch?.bmPrints) ? d.data_patch.bmPrints.length : 0, wrongBrand: safePatch(d.target_offer_id, d.data_patch || {}).wrongBrand })) });
    }
    const body = await request.json().catch(() => ({}));
    const id = String(body?.offer_id || "");
    if (!UUID.test(id)) return reply(400, { ok: false, error: "oferta inválida" });
    const key = `offers/${id}.json`, draft = await store.get(key, { type: "json" });
    if (!draft || draft.target_offer_id !== id) return reply(404, { ok: false, error: "rascunho não encontrado" });
    if (draftIsPublished(draft)) return reply(200, { ok: true, id, skipped: true });
    const headers = await credentials(), row = await offerById(id, headers);
    if (row && row.data?.kind !== "brandsvalidated") return reply(409, { ok: false, error: "tipo da oferta diverge do acervo Brands" });
    if (!row && (draft.new_offer !== true || draft.data_patch?.kind !== "brandsvalidated" || !draft.data_patch?.nomeOferta || !draft.data_patch?.nicho)) {
      return reply(409, { ok: false, error: "novo card Brands incompleto ou não autorizado" });
    }
    const { patch, wrongBrand } = safePatch(id, draft.data_patch || {});
    const merged = mergeBrandDraft(row?.data || {}, patch, { newOffer: !row });
    const delta = changedFields(row?.data || {}, merged);
    const backupKey = `run/${claims.run_id || "unknown"}/${id}.json`;
    await getStore({ name: "brands-release-backups", consistency: "strong" }).setJSON(backupKey, {
      before: row?.data || null, draft, prepared_at: new Date().toISOString(),
    });
    if (row) {
      if (Object.keys(delta).length) await mergeSupabaseOfferData(id, delta);
    } else {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/offers`, { method: "POST", headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({ id, data: merged }), signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error(`inserção da oferta falhou (HTTP ${response.status})`);
    }
    const written = await offerById(id, headers);
    if (!written || Object.entries(delta).some(([field, value]) => JSON.stringify(written.data?.[field]) !== JSON.stringify(value))) {
      throw new Error("conferência pós-publicação falhou");
    }
    const updated = { ...draft, published_at: new Date().toISOString(), published_update_at: draft.updated_at,
      published_run_id: String(claims.run_id || "") };
    await store.setJSON(key, updated);
    return reply(200, { ok: true, id, newOffer: !row, changedFields: Object.keys(delta), reports: Array.isArray(merged.bmReports) ? merged.bmReports.length : 0,
      prints: Array.isArray(merged.bmPrints) ? merged.bmPrints.length : 0, tags: merged.offerTags, excludedMisattributedBm: wrongBrand, backupKey });
  } catch (error) {
    console.error("brands-release:", String(error?.message || error).slice(0, 220));
    const unauthorized = /OIDC|workflow|token|assinatura|repositório|origem/.test(String(error?.message || ""));
    return reply(unauthorized ? 401 : 500, { ok: false, error: unauthorized ? "automação não autorizada" : String(error?.message || "publicação indisponível").slice(0, 140) });
  }
};
