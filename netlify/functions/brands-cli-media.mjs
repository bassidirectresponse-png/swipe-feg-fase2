import { createHash } from "node:crypto";
import { getStore } from "@netlify/blobs";
import { verifyGithubAutomationToken } from "./_github-oidc.mjs";
import { SUPABASE_URL } from "./_security.mjs";
import { mergeSupabaseOfferData, supabaseAdminAuth, supabaseAdminHeaders } from "./_supabase-admin.mjs";
import { changedFields, mergeBrandDraft } from "../../lib/brand-release.mjs";

const WORKFLOWS = new Set(["brands-cli-token.yml"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BRANDS = Object.freeze({
  "sp-nutrition": { name: "SP Nutrition", prints: 11, reports: 4 },
  "healthy-petz": { name: "Healthy Petz", prints: 10, reports: 4 },
  "pomegranate": { name: "Pomegranate", prints: 9, reports: 3 },
  "tryclover": { name: "Tryclover", prints: 13, reports: 4 },
});
const IMAGE = /^brands\/(sp-nutrition|healthy-petz|pomegranate|tryclover)\/cover-[a-f0-9]{20}\.png$/;
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
    const brandKey = String(req.headers.get("x-brand-key") || "sp-nutrition");
    const brand = BRANDS[brandKey];
    if (!brand) return reply(400, { ok: false, error: "marca inválida" });
    if (req.method === "POST") {
      const role = String(req.headers.get("x-media-role") || "");
      const offerId = String(req.headers.get("x-offer-id") || "");
      const bytes = Buffer.from(await req.arrayBuffer());
      if (!png(bytes) || !bytes.length || bytes.length > MAX_IMAGE) return reply(415, { ok: false, error: "PNG inválido ou acima de 4 MB" });
      const hash = createHash("sha256").update(bytes).digest("hex");
      if (role === "cover") {
        const path = `brands/${brandKey}/cover-${hash.slice(0, 20)}.png`;
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
      if (row?.data?.kind !== "brandsvalidated" || row.data?.nomeOferta !== brand.name) return reply(409, { ok: false, error: "oferta da marca não encontrada" });
      const ref = `blob:${offerId}:${hash}:png`;
      await getStore({ name: "admin-bm-evidence", consistency: "strong" }).set(`${offerId}/${hash}.png`, new Blob([bytes], { type: "image/png" }), { metadata: { mime: "image/png", offerId } });
      return reply(200, { ok: true, ref: `admin-bm:${ref}` });
    }
    const body = await req.json().catch(() => ({}));
    const id = String(body.offerId || "");
    if (!UUID.test(id) || !body.patch || typeof body.patch !== "object" || Array.isArray(body.patch)) return reply(400, { ok: false, error: "patch inválido" });
    if (Object.keys(body.patch).some(key => !ALLOWED_PATCH.has(key))) return reply(400, { ok: false, error: "campo não autorizado" });
    const row = await offerById(id);
    if (row?.data?.kind !== "brandsvalidated" || row.data?.nomeOferta !== brand.name) return reply(409, { ok: false, error: "oferta da marca não encontrada" });
    const reports = body.patch.bmReports, prints = body.patch.bmPrints;
    if (!Array.isArray(reports) || reports.length !== brand.reports || !Array.isArray(prints) || prints.length !== brand.prints ||
        prints.some(print => !String(print.img || "").startsWith(`admin-bm:blob:${id}:`))) return reply(400, { ok: false, error: "relatórios ou prints incompletos" });
    const merged = mergeBrandDraft(row.data, body.patch);
    const delta = changedFields(row.data, merged);
    if (Object.keys(delta).length) await mergeSupabaseOfferData(id, delta, merged);
    // Um lote Brands deve aparecer em Swipe de Criativos, não na seção DR.
    // Também corrige os anúncios criados antes desta classificação existir.
    const params = new URLSearchParams({ select: "id,data", "data->>sourceOfferId": `eq.${id}` });
    const creativeResponse = await fetch(`${SUPABASE_URL}/rest/v1/offers?${params}`, {
      headers: await supabaseAdminHeaders(), signal: AbortSignal.timeout(12_000),
    });
    if (!creativeResponse.ok) throw new Error(`consulta dos criativos falhou (HTTP ${creativeResponse.status})`);
    const creatives = (await creativeResponse.json()).filter(item => item?.data?.kind === "criativo" && item.data.sourceOfferId === id);
    if (creatives.length < 3) throw new Error("criativos vinculados incompletos");
    for (const creative of creatives) {
      const fields = { division: "fegbrands", marca: brand.name };
      if (creative.data.division !== fields.division || creative.data.marca !== fields.marca) {
        await mergeSupabaseOfferData(creative.id, fields, { ...creative.data, ...fields });
      }
    }
    const written = await offerById(id);
    if (!written || written.data?.bmReports?.length < brand.reports || written.data?.bmPrints?.filter(p => p.img).length < brand.prints) throw new Error("conferência pós-gravação incompleta");
    return reply(200, { ok: true, id, reports: written.data.bmReports.length, prints: written.data.bmPrints.filter(p => p.img).length, creatives: creatives.length, tags: written.data.offerTags });
  } catch (error) {
    console.error("brands-cli-media:", String(error?.message || error).slice(0, 180));
    const unauthorized = /OIDC|workflow|token|assinatura|repositório|origem/.test(String(error?.message || ""));
    return reply(unauthorized ? 401 : 500, { ok: false, error: unauthorized ? "automação não autorizada" : String(error?.message || "falha na importação").slice(0, 140) });
  }
};
