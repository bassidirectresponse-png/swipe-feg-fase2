import { IntelError, UUID, hash, stableJson, normalizeUrl } from "./offer-intel-core.mjs";

const allowed = data => data && typeof data === "object" && !Array.isArray(data) &&
  ["oferta", "brandsvalidated", "brandsgeneral"].includes(data.kind || "oferta");
const absent = () => new IntelError(422, "offer_not_found", "Oferta ou rascunho não encontrado no servidor.");
/** reader has getOffer(id) and getDraft(id); production adapters perform read-only requests. */
export async function resolveReference(input, reader) {
  const hasRef = input.offer_id != null || input.offer_ref_kind != null;
  const seed = input.url == null ? null : normalizeUrl(input.url);
  let data = null, ref = null, id = null, draftHash = null;
  if (hasRef) {
    if (!UUID.test(String(input.offer_id)) || !["offer", "admin_draft"].includes(input.offer_ref_kind)) throw absent();
    id = input.offer_id.toLowerCase(); ref = input.offer_ref_kind;
    if (ref === "offer") {
      const row = await reader.getOffer(id);
      if (row?.id?.toLowerCase() !== id || !allowed(row.data)) throw absent();
      data = row.data;
    } else {
      const draft = await reader.getDraft(id);
      if (draft?.target_offer_id?.toLowerCase() !== id || !draft.data_patch ||
          typeof draft.data_patch !== "object" || Array.isArray(draft.data_patch) ||
          typeof draft.new_offer !== "boolean") throw absent();
      if (draft.new_offer) {
        if (draft.data_patch.kind !== "brandsvalidated" || !String(draft.data_patch.nomeOferta || "").trim() || !String(draft.data_patch.nicho || "").trim()) throw absent();
        data = draft.data_patch;
      } else {
        const row = await reader.getOffer(id);
        if (row?.id?.toLowerCase() !== id || !allowed(row.data)) throw absent();
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
      if (!UUID.test(id)) throw absent();
      const url = new URL("/rest/v1/offers", supabaseUrl);
      url.search = new URLSearchParams({ select: "id,data", id: "eq." + id, limit: "1" });
      const res = await fetcher(url, { headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey }, signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new IntelError(503, "capability_unavailable", "Não foi possível validar a oferta.", true);
      return (await res.json())[0] || null;
    },
    getDraft: readDraft,
  };
}
