import { LIMITS } from "./offer-intel-core.mjs";

// Public contract v1.2. Unknown usage is omitted, never represented as zero.
export function publicLimits(capabilities = {}, createdAt) {
  const apify = {
    available: capabilities.apify === true,
    daily_max_runs: LIMITS.daily_runs,
    cooldown_hours: LIMITS.cooldown_seconds / 3600,
    max_queries: LIMITS.max_queries,
    results_per_query: LIMITS.results_per_query,
  };
  if(Number.isSafeInteger(capabilities.apify_daily_used)&&capabilities.apify_daily_used>=0)
    apify.daily_used=capabilities.apify_daily_used;
  if (createdAt && Number.isFinite(Date.parse(createdAt))) {
    apify.cooldown_until = new Date(Date.parse(createdAt) + LIMITS.cooldown_seconds * 1000).toISOString();
  }
  return {
    apify,
    domain_explorer: {
      available: capabilities.domain_explorer === true,
      max_pages: LIMITS.max_pages, max_depth: LIMITS.max_depth,
      max_redirects: LIMITS.max_redirects,
      page_timeout_s: LIMITS.page_timeout_ms / 1000,
      max_html_bytes: LIMITS.html_bytes,
    },
    screenshot: { available: false, reason: "Captura indisponível nesta versão" },
  };
}

/** One authoritative read per HTTP request, not per item. A failed read never invents zero.
 * Budget reservation itself still fails closed; a usage-read outage must not block cancel/reuse.
 */
export async function refreshBudgetUsage(services) {
  delete services.capabilities.apify_daily_used;
  if(typeof services.storage.budgetUsage!=="function")return; // Explicit test doubles may omit usage.
  try {
    const usage=await services.storage.budgetUsage();
    if(Number.isSafeInteger(usage?.daily_used)&&usage.daily_used>=0)
      services.capabilities.apify_daily_used=usage.daily_used;
  }catch{/* Unknown usage stays omitted, independent of reservation admission. */}
}
