import { createHash } from "node:crypto";
import { getStore } from "@netlify/blobs";
import { verifyGithubAutomationToken } from "./_github-oidc.mjs";
import { SUPABASE_URL } from "./_security.mjs";
import { mergeSupabaseOfferData, supabaseAdminAuth, supabaseAdminHeaders } from "./_supabase-admin.mjs";
import { changedFields, mergeBrandDraft } from "../../lib/brand-release.mjs";

const WORKFLOWS = new Set(["brands-cli-token.yml"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IMAGE = /^brands\/sp-nutrition\/cover-[a-f0-9]{20}\.png$/;
const MAX_IMAGE = 4 * 1024 * 1024;
const ALLOWED_PATCH = new Set(["bmReports", "bmPrints", "bmSpend7d", "bmSpend14d", "bmSpend30d", "bmRoas", "bmUpdatedAt", "bmNotes", "brandTopAds", "offerTags"]);

const reply = (status, body) => Response.json(body, { status, headers: { "Cache-Control": "no-store", "Content-Security-Policy": "default-src 'none'" } });
const png = bytes => bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
async function auth(req) {
  const token = String(req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  return verifyGithubAutomationToken(token, WORKFLOWS);
}
async function offerById(id) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(id)}&select=id,data`, {
    headers: await supabaseAdminHeaders(), signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`consulta da oferta falhou (HTTP ${response.status})`);
  return (await response.json())[0] || null;
}

export default async req => {
  if (!["POST", "PATCH"].includes(req.method)) return reply(405, { ok: false, error: "método inválido" });
  try {
    await auth(req);
    const admin = await supabaseAdminAuth();
    if (admin.mode !== "service_role") throw new Error("chave de serviço indisponível");
    if (req.method === "POST") {
      const role = String(req.headers.get("x-media-role") || "");
      const offerId = String(req.headers.get("x-offer-id") || "");
      const bytes = Buffer.from(await req.arrayBuffer());
      if (!png(bytes) || !bytes.length || bytes.length > MAX_IMAGE) return reply(415, { ok: false, error: "PNG inválido ou acima de 4 MB" });
      const hash = createHash("sha256").update(bytes).digest("hex");
      if (role === "cover") {
        const path = `brands/sp-nutrition/cover-${hash.slice(0, 20)}.png`;
        if (!IMAGE.test(path)) return reply(400, { ok: false, error: "caminho inválido" });
        const upload = await fetch(`${SUPABASE_URL}/storage/v1/object/criativos/${path}`, {
          method: "POST", headers: { apikey: admin.apikey, Authorization: `Bearer ${admin.token}`, "Content-Type": "image/png", "x-upsert": "true" },
          body: bytes, signal: AbortSignal.timeout(25_000),
        });
        if (!upload.ok) throw new Error(`upload da capa falhou (HTTP ${upload.status})`);
        return reply(200, { ok: true, url: `${SUPABASE_URL}/storage/v1/object/public/criativos/${path}` });
      }
      if (role !== "bm" || !UUID.test(offerId)) return reply(400, { ok: false, error: "papel ou oferta inválida" });
      const row = await offerById(offerId);
      if (row?.data?.kind !== "brandsvalidated" || row.data?.nomeOferta !== "SP Nutrition") return reply(409, { ok: false, error: "oferta SP Nutrition não encontrada" });
      const ref = `blob:${offerId}:${hash}:png`;
      await getStore({ name: "admin-bm-evidence", consistency: "strong" }).set(`${offerId}/${hash}.png`, new Blob([bytes], { type: "image/png" }), { metadata: { mime: "image/png", offerId } });
      return reply(200, { ok: true, ref: `admin-bm:${ref}` });
    }
    const body = await req.json().catch(() => ({}));
    const id = String(body.offerId || "");
    if (!UUID.test(id) || !body.patch || typeof body.patch !== "object" || Array.isArray(body.patch)) return reply(400, { ok: false, error: "patch inválido" });
    if (Object.keys(body.patch).some(key => !ALLOWED_PATCH.has(key))) return reply(400, { ok: false, error: "campo não autorizado" });
    const row = await offerById(id);
    if (row?.data?.kind !== "brandsvalidated" || row.data?.nomeOferta !== "SP Nutrition") return reply(409, { ok: false, error: "oferta SP Nutrition não encontrada" });
    const reports = body.patch.bmReports, prints = body.patch.bmPrints;
    if (!Array.isArray(reports) || reports.length !== 4 || !Array.isArray(prints) || prints.length !== 11 ||
        prints.some(print => !String(print.img || "").startsWith(`admin-bm:blob:${id}:`))) return reply(400, { ok: false, error: "relatórios ou prints incompletos" });
    const merged = mergeBrandDraft(row.data, body.patch);
    const delta = changedFields(row.data, merged);
    if (Object.keys(delta).length) await mergeSupabaseOfferData(id, delta, merged);
    const written = await offerById(id);
    if (!written || written.data?.bmReports?.length < 4 || written.data?.bmPrints?.filter(p => p.img).length < 11) throw new Error("conferência pós-gravação incompleta");
    return reply(200, { ok: true, id, reports: written.data.bmReports.length, prints: written.data.bmPrints.filter(p => p.img).length, tags: written.data.offerTags });
  } catch (error) {
    console.error("brands-cli-media:", String(error?.message || error).slice(0, 180));
    const unauthorized = /OIDC|workflow|token|assinatura|repositório|origem/.test(String(error?.message || ""));
    return reply(unauthorized ? 401 : 500, { ok: false, error: unauthorized ? "automação não autorizada" : String(error?.message || "falha na importação").slice(0, 140) });
  }
};
