import { IntelError, UUID, hash, stableJson, normalizeUrl } from "./offer-intel-core.mjs";

const allowed = data => data && typeof data === "object" && !Array.isArray(data) &&
  ["oferta", "brandsvalidated", "brandsgeneral"].includes(data.kind || "oferta");
const absent = () => new IntelError(422, "offer_not_found", "Oferta ou rascunho não encontrado no servidor.");
/** reader has getOffer(id) and getDraft(id); production adapters perform read-only requests. */
export function validateReferenceInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw absent();
  const hasRef = Object.hasOwn(input, "offer_id") || Object.hasOwn(input, "offer_ref_kind");
  if (hasRef && (typeof input.offer_id !== "string" || !UUID.test(input.offer_id) ||
      typeof input.offer_ref_kind !== "string" || !["offer", "admin_draft"].includes(input.offer_ref_kind))) throw absent();
  return hasRef;
}
export async function resolveReference(input, reader) {
  const hasRef = validateReferenceInput(input);
  const seed = input.url == null ? null : normalizeUrl(input.url);
  let data = null, ref = null, id = null, draftHash = null;
  if (hasRef) {
    id = input.offer_id.toLowerCase(); ref = input.offer_ref_kind;
    if (ref === "offer") {
      const row = await reader.getOffer(id);
      if (typeof row?.id !== "string" || row.id.toLowerCase() !== id || !allowed(row.data)) throw absent();
      data = row.data;
    } else {
      const draft = await reader.getDraft(id);
      if (typeof draft?.target_offer_id !== "string" || draft.target_offer_id.toLowerCase() !== id || !draft.data_patch ||
          typeof draft.data_patch !== "object" || Array.isArray(draft.data_patch) ||
          typeof draft.new_offer !== "boolean") throw absent();
      if (draft.new_offer) {
        if (draft.data_patch.kind !== "brandsvalidated" || !String(draft.data_patch.nomeOferta || "").trim() || !String(draft.data_patch.nicho || "").trim()) throw absent();
        data = draft.data_patch;
      } else {
        const row = await reader.getOffer(id);
        if (typeof row?.id !== "string" || row.id.toLowerCase() !== id || !allowed(row.data)) throw absent();
        data = { ...row.data, ...draft.data_patch };
      }
      if (!allowed(data)) throw absent();
      draftHash = hash(stableJson(draft));
    }
  } else if (!seed) throw absent();
  return {
    offer_id: id, offer_ref_kind: ref, seed_url: seed?.url || null,
    seed_key: seed?.key || null,
    scope_key: ref ? ref + ":" + id : "url:" + seed.key,
    seed_snapshot: { data, draft_hash: draftHash, url: seed, normalization_version: 1 },
  };
}
export function createReferenceReader({ fetcher = fetch, supabaseUrl, serviceKey, readDraft }) {
  return {
    async getOffer(id) {
      if (typeof id !== "string" || !UUID.test(id)) throw absent();
      const url = new URL("/rest/v1/offers", supabaseUrl);
      url.search = new URLSearchParams({ select: "id,data", id: "eq." + id, limit: "1" });
      const res = await fetcher(url, { headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey }, signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new IntelError(503, "capability_unavailable", "Não foi possível validar a oferta.", true);
      return (await res.json())[0] || null;
    },
    async getDraft(id) {
      if (typeof id !== "string" || !UUID.test(id)) throw absent();
      return readDraft(id);
    },
  };
}
