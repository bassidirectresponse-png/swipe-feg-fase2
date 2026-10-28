import { randomUUID } from "node:crypto";
import { IntelError, hash } from "./offer-intel-core.mjs";
import {
  AI_LIMITS, isMoney, selectProducts, planCollection, weeklyActorInput, normalizeAd, buildProductRanking, previousReview,
  analysisPrompt, productSummaryPrompt, executiveSummaryPrompt, extractJson, validateAnalysis, validateBullets, aiCost,
} from "./offer-intel-weekly.mjs";

export const WEEKLY_ACTOR = "apify~facebook-ads-scraper";
const fail = message => new IntelError(502, "provider_error", message, true);
const providerId = value => { if (typeof value !== "string" || !/^\w{1,100}$/.test(value)) throw fail("Identificador do provedor inválido."); return value; };
const capability = message => new IntelError(503, "capability_unavailable", message, true);
const topBasis = (rows, offerId) => hash(rows.filter(r => r.offer_id === offerId).sort((a, b) => a.rank - b.rank).map(r => r.ad_archive_id).join(","));

/** Real Apify adapter. Tests inject a FAKE fetch; the start POST is never retried automatically. */
export function createWeeklyApify({ token, fetcher = fetch }) {
  async function api(path, { method = "GET", body, userAgent } = {}) {
    const response = await fetcher("https://api.apify.com/v2/" + path, { method, redirect: "error",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", "User-Agent": userAgent || "SwipeFEG-OfferIntelWeekly/1" },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) });
    const reader = response.body.getReader(), chunks = []; let size = 0;
    for (;;) {
      const { value, done } = await reader.read(); if (done) break; size += value.byteLength;
      if (size > 24 * 1024 * 1024) { await reader.cancel(); throw fail("Resposta do provedor excede o limite."); }
      chunks.push(Buffer.from(value));
    }
    let data; try { data = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw fail("Resposta inválida do provedor."); }
    if (!response.ok) throw fail("Provedor de anúncios retornou erro HTTP " + response.status + ".");
    return data;
  }
  return {
    available: !!token,
    async start({ actorInput, runOptions }, marker, maxUsd) {
      // maxTotalChargeUsd caps the charge on the provider side too, never above the reserved amount.
      if (!isMoney(maxUsd) || maxUsd <= 0) throw capability("Custo da coleta desconhecido.");
      const run = (await api("acts/" + WEEKLY_ACTOR + "/runs?timeout=" + runOptions.timeoutSecs + "&memory=" + runOptions.memoryMbytes +
        "&maxItems=" + runOptions.maxItems + "&maxTotalChargeUsd=" + maxUsd.toFixed(2) + "&restartOnError=false", { method: "POST", body: actorInput, userAgent: marker })).data;
      return { id: providerId(run?.id), dataset_id: run?.defaultDatasetId ? providerId(run.defaultDatasetId) : null };
    },
    async status(runId) {
      const run = (await api("actor-runs/" + providerId(runId) + "?waitForFinish=20")).data;
      return { status: String(run?.status || ""), dataset_id: run?.defaultDatasetId ? providerId(run.defaultDatasetId) : null };
    },
    async items(datasetId, limit) {
      const items = await api("datasets/" + providerId(datasetId) + "/items?clean=true&limit=" + limit);
      if (!Array.isArray(items)) throw fail("Dataset inválido.");
      return items;
    },
  };
}

async function pool(items, size, task) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(size, queue.length) }, async () => { while (queue.length) await task(queue.shift()); }));
}

/**
 * One slice (≤ ~12 min) of the Creative Review pipeline. Every step persists its result, so the next
 * slice (self re-dispatched, signed) resumes where this one stopped. Returns {done}.
 * Phases: select → collect (Apify) → media → analysis (Claude) → summary → done.
 */
export async function runCreativeReviewSlice({ report, storage, apify, archive, claude, model, now = () => new Date(), deadline = Date.now() + 12 * 60_000 }) {
  const fence = { report_id: report.id, lease_token: report.lease_token }, date = report.review_date;
  const left = margin => deadline - Date.now() > margin;
  const checkpoint = patch => storage.checkpoint({ ...fence, patch });
  let phase = report.phase === "queued" ? "select" : report.phase;

  if (phase === "select") {
    const previous = await storage.listProducts(report.id);
    const products = selectProducts(await storage.loadSources());
    await storage.saveProducts({ ...fence, products: products.map(p => ({ offer_id: p.offer_id, position: p.position, offer_name: p.offer_name,
      brand: p.brand, section: p.section, pages: p.sources, ads_collected: 0,
      summary: previous.find(x => x.offer_id === p.offer_id)?.summary || null })) });
    await checkpoint({ phase: phase = "collect", progress: 5, cost: { products: products.length, sources: 0, sources_skipped: 0 } });
  }

  if (phase === "collect") {
    if (!(await collect())) return { done: false };
    await checkpoint({ phase: phase = "media", progress: 40 });
  }

  if (phase === "media") {
    // Thumbnail + video (≤ 25 MB) of every Top 10 ad into criativos/creative-review/{date}/{offer_id}/.
    const rows = (await storage.listAds(report.id)).filter(r => !r.media?.archived && !r.media?.error);
    await pool(rows, 6, async row => {
      if (!left(2 * 60_000)) return;
      const media = { ...row.media };
      try {
        const thumb = media.source_thumb_url ? await archive({ date, offer_id: row.offer_id, ad_archive_id: row.ad_archive_id, kind: "thumb", url: media.source_thumb_url }) : null;
        let video = null, video_error = false;
        if (media.source_video_url) {
          try { video = await archive({ date, offer_id: row.offer_id, ad_archive_id: row.ad_archive_id, kind: "video", url: media.source_video_url }); }
          catch { video_error = true; }
        }
        await storage.saveAd({ ...fence, id: row.id, patch: { media: { archived: true, thumb_url: thumb?.url || null, video_url: video?.url || null,
          ...(video_error ? { video_error: true } : {}), archived_at: now().toISOString() } } });
      } catch (error) {
        if (error?.code === "conflict") throw error;
        await storage.saveAd({ ...fence, id: row.id, patch: { media: { ...media, error: true } } });
      }
    });
    const pending = (await storage.listAds(report.id)).filter(r => !r.media?.archived && !r.media?.error).length;
    if (pending) { await checkpoint({ progress: 40 + Math.round(20 * (1 - pending / Math.max(1, rows.length))) }); return { done: false }; }
    await checkpoint({ phase: phase = "analysis", progress: 60 });
  }

  // Upper bound reserved BEFORE every call (exact input count + max_tokens output), settled down to real usage after.
  // Unknown model, failed count or exhausted ceiling = no call (fail closed); ranking stays complete.
  let aiStop = !!report.cost?.ai_stopped;
  const stopAi = async reason => { aiStop = true; await checkpoint({ cost: { ai_stopped: reason } }); return null; };
  const ai = async ({ kind, id, prompt, image, maxTokens }) => {
    if (aiStop) return null;
    if (!aiCost(model, { inputTokens: 1, outputTokens: maxTokens })) return stopAi("unknown_price");
    const inputTokens = await claude.countTokens({ prompt, image });
    const usd = aiCost(model, { inputTokens, outputTokens: maxTokens });
    if (!isMoney(usd) || usd <= 0) throw new Error("contagem de tokens inválida");
    const reservation = "ai:" + kind + ":" + hash(id + ":" + randomUUID()).slice(0, 40);
    try { await storage.budgetReserve({ review_date: date, kind: "ai", reservation, usd }); }
    catch (error) { if (error?.code === "budget_exceeded") return stopAi("budget_exceeded"); throw error; }
    const result = await claude({ prompt, image, maxTokens });
    const actual = aiCost(model, { inputTokens: result.usage?.input_tokens, outputTokens: result.usage?.output_tokens });
    if (isMoney(actual) && actual > 0 && actual < usd)
      await storage.budgetSettle({ review_date: date, kind: "ai", reservation, usd: actual }).catch(() => {});
    return extractJson(result.text);
  };

  if (phase === "analysis") {
    const products = new Map((await storage.listProducts(report.id)).map(p => [p.offer_id, p]));
    const rows = (await storage.listAds(report.id)).filter(r => r.analysis == null);
    await pool(rows, 6, async row => {
      if (!left(90_000) || aiStop) return;
      let analysis = null;
      let failure = null;
      try {
        const raw = await ai({ kind: "ad", id: row.id, prompt: analysisPrompt(row, products.get(row.offer_id)),
          image: row.media?.archived ? row.media.thumb_url : null, maxTokens: AI_LIMITS.max_tokens_ad });
        if (raw === null && aiStop) return;
        analysis = validateAnalysis(raw);
      } catch (error) { if (error?.code === "conflict") throw error; failure = String(error?.message || error).slice(0, 300); }
      await storage.saveAd({ ...fence, id: row.id, patch: { analysis: analysis || { error: true, ...(failure ? { reason: failure } : {}) } } });
    });
    const pending = (await storage.listAds(report.id)).filter(r => r.analysis == null).length;
    if (pending && !aiStop) { await checkpoint({ progress: 60 + Math.round(30 * (1 - pending / Math.max(1, rows.length))) }); return { done: false }; }
    await checkpoint({ phase: phase = "summary", progress: 90 });
  }

  if (phase === "summary") {
    const ads = await storage.listAds(report.id);
    const products = await storage.listProducts(report.id);
    await pool(products.filter(p => ads.some(a => a.offer_id === p.offer_id) && !p.summary), 4, async product => {
      if (!left(60_000) || aiStop) return;
      let summary = null;
      try {
        const raw = await ai({ kind: "product", id: product.offer_id, maxTokens: AI_LIMITS.max_tokens_summary,
          prompt: productSummaryPrompt(product, ads.filter(a => a.offer_id === product.offer_id).sort((a, b) => a.rank - b.rank)) });
        if (raw === null && aiStop) return;
        summary = validateBullets(raw, 3);
      } catch (error) { if (error?.code === "conflict") throw error; }
      Object.assign(product, await storage.saveProduct({ ...fence, offer_id: product.offer_id,
        patch: { summary: summary ? { ...summary, basis: topBasis(ads, product.offer_id) } : { error: true } } }));
    });
    if (!left(60_000)) return { done: false };
    let summary = validateBullets(report.summary, 5);
    if (!summary && !aiStop && ads.length) {
      try { summary = validateBullets(await ai({ kind: "week", id: report.id, prompt: executiveSummaryPrompt(products, ads), maxTokens: AI_LIMITS.max_tokens_summary }), 5); }
      catch (error) { if (error?.code === "conflict") throw error; }
    }
    return { done: true, ...(await finish(summary)) };
  }
  if (phase === "done") return { done: true };
  throw capability("Fase do relatório inválida.");

  async function collect() {
    const products = (await storage.listProducts(report.id)).map(p => ({ ...p, sources: Array.isArray(p.pages) ? p.pages : [] }));
    const known = new Map((await storage.listRuns(report.id)).map(r => [r.batch_key, r]));
    if (apify.available) {
      // Unknown or malformed ledger balance fails closed BEFORE any coercion: no reservation and no provider call.
      const usage = await storage.budgetUsage({ review_date: date, kind: "apify" }), used = usage?.used_usd;
      if (!usage || typeof usage !== "object" || usage.review_date !== date || !isMoney(used)) throw capability("Saldo do orçamento semanal indisponível.");
      const reused = [...known.values()].reduce((sum, r) => sum + (Number(r.usd_est) || 0), 0);
      const plan = planCollection(products, { spentUsd: Math.max(0, used - reused) });
      let skipped = plan.skipped.length;
      for (const batch of plan.batches) {
        if (known.has(batch.key)) continue;
        const reservation = "apify:" + date + ":" + batch.key;
        try { await storage.budgetReserve({ review_date: date, kind: "apify", reservation, usd: batch.usd_est }); }
        catch (error) { if (error?.code === "budget_exceeded") { skipped += batch.sources.length; continue; } throw error; }
        let row = await storage.run({ ...fence, batch_key: batch.key, patch: { state: "starting", reservation, page_ids: batch.sources.map(s => s.key), usd_est: batch.usd_est } });
        try {
          const started = await apify.start(weeklyActorInput(batch.sources.map(s => s.url)), "SwipeFEG-CreativeReview/1 reservation/" + hash(reservation).slice(0, 32), batch.usd_est);
          row = await storage.run({ ...fence, batch_key: batch.key, expected_state: "starting", patch: { state: "running", provider_run_id: started.id, dataset_id: started.dataset_id } });
        } catch (error) {
          if (error?.code === "conflict") throw error;
          // No automatic second POST: an uncertain start stays unknown (already counted in the ledger).
          row = await storage.run({ ...fence, batch_key: batch.key, expected_state: "starting", patch: { state: "unknown" } }).catch(() => ({ ...row, state: "unknown" }));
        }
        known.set(batch.key, row);
      }
      await checkpoint({ progress: 15, cost: { sources: [...known.values()].reduce((n, r) => n + (r.page_ids?.length || 0), 0), sources_skipped: skipped,
        apify_usd_est: Math.round([...known.values()].reduce((s, r) => s + (Number(r.usd_est) || 0), 0) * 100) / 100 } });
    } else await checkpoint({ cost: { apify_unavailable: true } });

    // Poll every running batch until all are terminal, or hand over to the next slice.
    for (let row of known.values()) {
      if (row.state === "starting") row = await storage.run({ ...fence, batch_key: row.batch_key, expected_state: "starting", patch: { state: "unknown" } });
      while (row.state === "running") {
        if (!left(3 * 60_000)) return false;
        const status = await apify.status(row.provider_run_id).catch(() => ({ status: "" }));
        if (status.status === "SUCCEEDED") row = await storage.run({ ...fence, batch_key: row.batch_key, expected_state: "running", patch: { state: "succeeded", dataset_id: status.dataset_id || row.dataset_id } });
        else if (["FAILED", "ABORTED", "TIMED-OUT"].includes(status.status)) row = await storage.run({ ...fence, batch_key: row.batch_key, expected_state: "running", patch: { state: "failed" } });
        else await checkpoint({});
      }
      known.set(row.batch_key, row);
    }
    const ads = [], at = now();
    for (const row of known.values()) {
      if (row.state !== "succeeded" || !row.dataset_id) continue;
      const limit = (row.page_ids?.length || 1) * 40;
      try { for (const item of (await apify.items(row.dataset_id, limit)).slice(0, limit)) { const ad = normalizeAd(item, at); if (ad) ads.push(ad); } }
      catch { await storage.run({ ...fence, batch_key: row.batch_key, expected_state: "succeeded", patch: { state: "failed" } }).catch(() => {}); }
    }
    const previous = await storage.getReport({ date: previousReview(date) });
    const { rows, collected } = buildProductRanking({ ads, products, previousRows: previous ? await storage.listAds(previous.id) : [],
      existingRows: await storage.listAds(report.id) });
    await storage.saveAds({ ...fence, ads: rows });
    for (const product of products) {
      // A product summary stays valid only while its Top 10 is the same.
      const keep = validateBullets(product.summary, 3) && product.summary.basis === topBasis(rows, product.offer_id);
      await storage.saveProduct({ ...fence, offer_id: product.offer_id, patch: { ads_collected: collected[product.offer_id] || 0, summary: keep ? product.summary : null } });
    }
    await checkpoint({ cost: { ads_collected: new Set(ads.map(a => a.ad_archive_id)).size, ads_ranked: rows.length } });
    return true;
  }

  async function finish(summary) {
    const ads = await storage.listAds(report.id), products = await storage.listProducts(report.id), runs = await storage.listRuns(report.id);
    const fresh = await storage.getReport({ id: report.id });
    const issues = [];
    if (fresh?.cost?.apify_unavailable) issues.push("Coleta Apify não configurada.");
    if (runs.some(r => ["failed", "unknown"].includes(r.state))) issues.push("Parte das coletas falhou.");
    if (ads.some(a => a.media?.error || a.media?.video_error)) issues.push("Parte das mídias não foi arquivada.");
    if (ads.some(a => !validateAnalysis(a.analysis))) issues.push("Parte das análises de IA não foi concluída.");
    if (products.some(p => ads.some(a => a.offer_id === p.offer_id) && !validateBullets(p.summary, 3))) issues.push("Parte dos resumos de produto não foi gerada.");
    if (ads.length && !summary) issues.push("Resumo executivo indisponível.");
    if (fresh?.cost?.ai_stopped) issues.push(fresh.cost.ai_stopped === "budget_exceeded" ? "Teto semanal de IA (US$ 10) atingido." : "Custo da IA desconhecido; análises suspensas.");
    const aiUsage = await storage.budgetUsage({ review_date: date, kind: "ai" }).catch(() => null);
    const status = !ads.length ? "failed" : issues.length ? "partial" : "succeeded";
    await checkpoint({ status, phase: "done", progress: 100, cost: { ai_usd_est: isMoney(aiUsage?.used_usd) ? Math.round(aiUsage.used_usd * 100) / 100 : 0 },
      summary: summary ? { ...summary, generated_at: now().toISOString() } : null,
      error: status === "succeeded" ? null : { code: !ads.length ? "no_ads" : "partial", message: (issues.join(" ") || "Nenhum anúncio ativo coletado.").slice(0, 300), retryable: true } });
    return { status };
  }
}

const MEDIA = { thumb: 8 * 1024 * 1024, video: 25 * 1024 * 1024 };
export function detectWeeklyMedia(buffer) {
  if (buffer.length > 12 && buffer.subarray(4, 8).toString("latin1") === "ftyp") return { type: "video", contentType: "video/mp4", ext: "mp4" };
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { type: "image", contentType: "image/jpeg", ext: "jpg" };
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { type: "image", contentType: "image/png", ext: "png" };
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return { type: "image", contentType: "image/webp", ext: "webp" };
  return null;
}
/** Fixed, server-built path: date, offer and Library id are validated, nothing comes from the remote file name. */
export function weeklyMediaPath(date, offerId, adId, kind, ext) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(offerId) || !/^\d{1,40}$/.test(adId) ||
    !["thumb", "video"].includes(kind) || !["jpg", "png", "webp", "mp4"].includes(ext))
    throw new IntelError(400, "invalid_request", "Caminho de mídia inválido.");
  return "creative-review/" + date + "/" + offerId + "/" + adId + "-" + kind + "." + ext;
}
/** Archive adapter. download = SSRF-safe fetch limited to Meta CDN hosts (byte cap); upload = Storage `criativos`. */
export function createWeeklyArchive({ download, upload, publicUrl }) {
  return async ({ date, offer_id, ad_archive_id, kind, url }) => {
    const buffer = await download(url, MEDIA[kind]);
    if (!buffer?.length || buffer.length > MEDIA[kind]) throw new Error("mídia vazia ou acima do limite");
    const media = detectWeeklyMedia(buffer);
    if (!media || (kind === "video") !== (media.type === "video")) throw new Error("mídia em formato inválido");
    const path = weeklyMediaPath(date, offer_id, ad_archive_id, kind, media.ext);
    await upload(path, buffer, media.contentType);
    return { url: publicUrl(path) };
  };
}
/** Claude adapter (same endpoint/headers/model env as _ad-video-analysis.mjs). Image goes by archived public URL.
 * countTokens uses the free /v1/messages/count_tokens endpoint with the exact same request content. */
export function createWeeklyClaude({ key, model, url, fetcher = fetch }) {
  const messages = (prompt, image) => [{ role: "user", content: [{ type: "text", text: prompt },
    ...(typeof image === "string" && image.startsWith("https://") ? [{ type: "image", source: { type: "url", url: image } }] : [])] }];
  const post = async (endpoint, body, timeout) => {
    if (!key) throw capability("Análise de IA não configurada.");
    const response = await fetcher(endpoint, { method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify(body), signal: AbortSignal.timeout(timeout) });
    if (!response.ok) {
      // Keep the provider error type/message (never request headers) so a failed run explains itself.
      let detail = "";
      try { const body = await response.json(); detail = [body?.error?.type, body?.error?.message].filter(Boolean).join(": "); } catch {}
      throw new Error(("Claude HTTP " + response.status + (detail ? " " + detail : "")).slice(0, 300));
    }
    return response.json();
  };
  const complete = async ({ prompt, image, maxTokens }) => {
    const result = await post(url, { model, max_tokens: maxTokens, messages: messages(prompt, image) }, 90_000);
    return { text: (result.content || []).filter(part => part.type === "text").map(part => part.text).join("").trim(), usage: result.usage || null };
  };
  complete.countTokens = async ({ prompt, image }) => {
    const result = await post(url.replace(/\/messages$/, "/messages/count_tokens"), { model, messages: messages(prompt, image) }, 20_000);
    if (!Number.isSafeInteger(result?.input_tokens) || result.input_tokens <= 0) throw new Error("contagem de tokens inválida");
    return result.input_tokens;
  };
  return complete;
}
