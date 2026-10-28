import { createHash } from "node:crypto";

export const URL_VERSION = 1;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const LIMITS = Object.freeze({ max_pages: 20, max_depth: 2, max_redirects: 5, concurrency: 2, page_timeout_ms: 20_000, html_bytes: 2 * 1024 * 1024, links_per_page: 200, max_queries: 2, results_per_query: 15, cooldown_seconds: 21600, daily_runs: 15, requests_per_hour: 15, max_attempts: 3, screenshots_available: false });
export class IntelError extends Error {
  constructor(status, code, message, retryable = false, retryAfter) {
    super(message); Object.assign(this, { status, code, retryable, retryAfter });
  }
}
export const hash = value => createHash("sha256").update(String(value)).digest("hex");
export function stableJson(value) {
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  if (value && typeof value === "object") return "{" + Object.keys(value).sort().map(k => JSON.stringify(k) + ":" + stableJson(value[k])).join(",") + "}";
  return JSON.stringify(value);
}
export function normalizeUrl(value) {
  if (typeof value !== "string" || value.length > 4096) throw new IntelError(422, "invalid_url", "URL inválida.");
  let url;
  try { url = new URL(value); } catch { throw new IntelError(422, "invalid_url", "URL inválida."); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
      (url.port && !["80", "443"].includes(url.port))) throw new IntelError(422, "blocked_url", "URL ou porta não permitida.");
  url.hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  url.hash = "";
  // Preserve query order, repetition, tracking and path case: all can affect routing.
  return { original_url: value, url: url.href, hostname: url.hostname, version: URL_VERSION, key: hash("url:v1:" + url.href) };
}
export function identityKey(type, value) {
  if (type === "ad" || type === "page") {
    const id = String(value);
    if (!/^\d{1,40}$/.test(id)) throw new IntelError(422, "invalid_id", "Identificador Meta inválido.");
    return "meta:" + type + ":" + id;
  }
  if (type === "domain") return "domain:" + normalizeUrl(String(value).includes("://") ? value : "https://" + value).hostname;
  if (type === "url") return "url:" + normalizeUrl(value).key;
  if (["offer", "admin_draft"].includes(type) && UUID.test(String(value))) return type + ":" + value.toLowerCase();
  throw new IntelError(422, "invalid_id", "Referência inválida.");
}
export function normalizeOptions(input = {}) {
  if (!input || Array.isArray(input) || typeof input !== "object" ||
      Object.keys(input).some(k => !["collect_ads", "explore_domains", "capture_screenshots"].includes(k)) ||
      Object.values(input).some(v => typeof v !== "boolean")) throw new IntelError(400, "invalid_request", "Opções inválidas.");
  return { collect_ads: input.collect_ads ?? true, explore_domains: input.explore_domains ?? true, capture_screenshots: input.capture_screenshots ?? false };
}
export function actionKey(value) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9._:-]{8,128}$/.test(value)) throw new IntelError(400, "invalid_request", "idempotency_key inválida.");
  return value;
}
export function publicJob(job) {
  const keys = ["id", "offer_id", "offer_ref_kind", "seed_url", "status", "phase", "progress", "progress_detail", "counts", "sources", "error", "created_at", "started_at", "finished_at", "updated_at", "next_retry_at", "limits"];
  return Object.fromEntries(keys.map(k => [k, job[k] ?? null]));
}
export function pagination(params) {
  const raw = params.get("limit") || "25";
  if (!/^\d+$/.test(raw) || +raw < 1 || +raw > 100) throw new IntelError(400, "invalid_request", "Limite de página inválido.");
  let cursor = null;
  if (params.get("cursor")) {
    try {
      if (params.get("cursor").length > 512) throw new Error();
      cursor = JSON.parse(Buffer.from(params.get("cursor"), "base64url").toString());
      if (!UUID.test(cursor.id) || !/^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(cursor.created_at) || !Number.isFinite(Date.parse(cursor.created_at))) throw new Error();
    } catch { throw new IntelError(400, "invalid_request", "Cursor inválido."); }
  }
  return { limit: +raw, cursor };
}
export const encodeCursor = row => Buffer.from(JSON.stringify({ created_at: new Date(row.created_at).toISOString(), id: row.id })).toString("base64url");
