const ARRAY_KEYS = ["bmReports", "brandTopAds", "bmPrints", "bibliotecas", "dominios"];
const RUNTIME_KEYS = new Set([
  "adsHistory", "numAdsAtivos", "adsUpdatedAt", "adsLibraryCheckedAt",
  "analysisStatus", "analysisCursorAt", "analysisAttempts", "analysisStartedAt",
  "analysisCompletedAt", "analysisLastError", "analysisNextRetryAt",
  "analysisVersion", "analysisZeroReads",
]);
const RELEASE_METADATA = new Set([
  "bmReportsReplace", "bmReportsRemoveKeys", "brandTopAdsReplace",
  "bmPrintsReplace", "bibliotecasReplace", "dominiosReplace", "bmNotesReplace",
]);

function identity(key, item) {
  if (key === "bmReports") return String(item?.key || "");
  if (key === "brandTopAds") return String(item?.link || item?.nome || "");
  if (key === "bibliotecas") return String(item?.link || "");
  if (key === "dominios") return String(item?.linkDominio || item?.nome || "");
  return String(item?.img || item?.nome || "");
}

function mergeArray(key, before, patch) {
  const oldItems = Array.isArray(before?.[key]) ? before[key] : [];
  const newItems = Array.isArray(patch?.[key]) ? patch[key] : [];
  const removals = new Set(key === "bmReports" && Array.isArray(patch?.bmReportsRemoveKeys) ? patch.bmReportsRemoveKeys.map(String) : []);
  const kept = oldItems.filter(item => !removals.has(identity(key, item)));
  if (key === "bmPrints" && Array.isArray(patch?.[key]) && !newItems.length) return [];
  if (patch?.[`${key}Replace`] === true) return [...newItems];
  if (!newItems.length) return kept;
  const updatedIds = new Set(newItems.map(item => identity(key, item)).filter(Boolean));
  const updatedFirst = key === "bmReports" || key === "brandTopAds";
  const sequence = updatedFirst
    ? [...newItems, ...kept.filter(item => !updatedIds.has(identity(key, item)))]
    : [...kept, ...newItems];
  const merged = new Map();
  for (const item of sequence) merged.set(identity(key, item) || `${key}-${merged.size}`, item);
  return [...merged.values()];
}

function parseMoney(value) {
  const text = String(value || "").replace(/[^\d.,-]/g, "");
  if (!text) return null;
  const comma = text.lastIndexOf(","), dot = text.lastIndexOf(".");
  const normalized = comma > dot ? text.replace(/\./g, "").replace(",", ".") : text.replace(/,/g, "");
  const result = Number(normalized);
  return Number.isFinite(result) ? result : null;
}

function latestWeeklySpend(data) {
  const reports = Array.isArray(data?.bmReports) ? data.bmReports : [];
  const weekly = reports.filter(report => /(?:^|[-_])7d$/.test(String(report?.key || "")));
  weekly.sort((a, b) => String(b.capturedAt || b.key || "").localeCompare(String(a.capturedAt || a.key || "")));
  return parseMoney(weekly[0]?.totals?.spend ?? data?.bmSpend7d);
}

function deriveTags(data, newOffer) {
  const selected = Array.isArray(data?.offerTags) ? data.offerTags.map(value => String(value).toLowerCase()) : [];
  const tags = new Set(["insider", ...selected]);
  if (!Array.isArray(data?.offerTags)) {
    const spend = latestWeeklySpend(data);
    const activeAds = Number(String(data?.numAdsAtivos || "").replace(/\D/g, "")) || 0;
    if (spend !== null && spend > 100_000) tags.add("scale");
    else if (activeAds >= 200) tags.add("potential");
    if (newOffer) tags.add("new");
  }
  if (tags.has("scale")) tags.delete("potential");
  return [...tags].filter(tag => ["insider", "new", "potential", "scale"].includes(tag));
}

export function mergeBrandDraft(base, draft, { newOffer = false } = {}) {
  if (!draft || typeof draft !== "object" || Array.isArray(draft)) throw new Error("rascunho inválido");
  const source = base && typeof base === "object" ? base : {};
  const patch = Object.fromEntries(Object.entries(draft).filter(([key]) => !RUNTIME_KEYS.has(key) && !RELEASE_METADATA.has(key)));
  const merged = { ...source, ...patch };
  if (draft.bmNotesReplace === true) merged.bmNotes = String(draft.bmNotes || "");
  else if (draft.bmNotes) merged.bmNotes = [source.bmNotes, draft.bmNotes].filter(Boolean).join("\n\n");
  for (const key of ARRAY_KEYS) {
    if (key in draft || key === "bmReports" && Array.isArray(draft.bmReportsRemoveKeys)) {
      merged[key] = mergeArray(key, source, draft);
    }
  }
  merged.offerTags = deriveTags(merged, newOffer);
  return merged;
}

export function changedFields(before, after) {
  const patch = {};
  for (const key of new Set([...Object.keys(before || {}), ...Object.keys(after || {})])) {
    if (JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key])) patch[key] = after?.[key] ?? null;
  }
  return patch;
}

export function draftIsPublished(draft) {
  return !!draft?.published_at && draft.published_update_at === draft.updated_at;
}
