import { randomUUID } from "node:crypto";
import { IntelError, hash } from "./offer-intel-core.mjs";
import { RECOVERY_CACHE_DAYS, WEEKLY_MEDIA_LIMITS, mediaComplete, repairMedia } from './offer-intel-weekly-recovery.mjs';
import {
  AI_LIMITS, WEEKLY_LIMITS, discoveredProductPages, isMoney, selectProducts, planCollection, weeklyActorInput, normalizeAd, buildProductRanking, previousReview,
  analysisPrompt, productSummaryPrompt, executiveSummaryPrompt, extractJson, validateAnalysis, validateBullets, aiCost,
} from "./offer-intel-weekly.mjs";

export const WEEKLY_ACTOR = "apify~facebook-ads-scraper";
const fail = message => new IntelError(502, "provider_error", message, true);
const providerId = value => { if (typeof value !== "string" || !/^\w{1,100}$/.test(value)) throw fail("Identificador do provedor inválido."); return value; };
const capability = message => new IntelError(503, "capability_unavailable", message, true);
const topBasis = (rows, offerId) => hash(rows.filter(r => r.offer_id === offerId).sort((a, b) => a.rank - b.rank).map(r => JSON.stringify([r.ad_archive_id, r.days_active, r.repetitions, r.media?.observed_from, r.media?.observed_at])).join(","));

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
    async receipt(runId) {
      const run = (await api("actor-runs/" + providerId(runId))).data;
      return { status: String(run?.status || ''), finished_at: run?.finishedAt || null,
        usd: run?.usageTotalUsd, dataset_id: run?.defaultDatasetId ? providerId(run.defaultDatasetId) : null };
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
  const checkpoint = async patch => {
    const current = await storage.checkpoint({ ...fence, patch });
    Object.assign(report, current); // Later phases in this slice must see cleared summaries and stop flags.
    return current;
  };
  let phase = report.phase === "queued" ? "select" : report.phase;
  const cacheSince = () => new Date(now().getTime() - RECOVERY_CACHE_DAYS * 86400_000).toISOString();

  if (phase === "select") {
    const previous = await storage.listProducts(report.id);
    const products = selectProducts(await storage.loadSources());
    const existing = report.cost?.recovery_requested ? await storage.listAds(report.id) : [];
    const runs = report.cost?.recovery_requested ? await storage.listRuns(report.id) : [];
    const covered = new Set([...(report.cost?.reused_sources || []), ...runs.filter(r => r.state === 'succeeded').flatMap(r => r.page_ids || [])]);
    const resumeMedia = !!report.cost?.recovery_requested && existing.some(a => !mediaComplete(a)) &&
      report.cost?.sources_skipped === 0 && !report.cost?.apify_unavailable &&
      products.length === previous.length && products.every(p => previous.some(old => old.offer_id === p.offer_id) && p.sources.every(s => covered.has(s.key))) &&
      !runs.some(r => ['running', 'starting'].includes(r.state) || (r.page_ids || []).some(key => !covered.has(key)));
    if (resumeMedia) {
      // A media failure must not expand discovery or re-read/re-rank already complete paid collection.
      for (const ad of existing) if (ad.analysis?.error) await storage.saveAd({ ...fence, id: ad.id, patch: { analysis: null } });
      await checkpoint({ phase: phase = 'media', progress: 40, cost: { recovery_generation: randomUUID().slice(0, 8),
        recovery_requested: false, recovery_scope: 'pending_media', ai_stopped: false } });
    } else {
      const previousWeek = await storage.getReport({date: previousReview(date)});
      const inherited = previousWeek ? await storage.listProducts(previousWeek.id) : [];
      for (const p of products) {
        const pages = [...(inherited.find(x => x.offer_id === p.offer_id)?.pages || []), ...(previous.find(x => x.offer_id === p.offer_id)?.pages || [])];
        for (const page of pages) if ((!previous.length || report.cost?.recovery_requested) && page.discovered && page.confirmed && !p.sources.some(x => x.key === page.key)) p.sources.push({...page, identity:p.identity});
      }
      if (report.cost?.recovery_requested) {
        for (const ad of await storage.listAds(report.id)) if (ad.analysis?.error)
          await storage.saveAd({...fence,id:ad.id,patch:{analysis:null}});
      }
      await storage.saveProducts({ ...fence, products: products.map(p => ({ offer_id: p.offer_id, position: p.position, offer_name: p.offer_name,
        brand: p.brand, section: p.section, pages: p.sources, ads_collected: previous.find(x => x.offer_id === p.offer_id)?.ads_collected || 0,
        summary: previous.find(x => x.offer_id === p.offer_id)?.summary || null })) });
      await checkpoint({ phase: phase = "collect", progress: 5, cost: { products: products.length, sources: 0, sources_skipped: 0,
        recovery_generation: report.cost?.recovery_requested ? randomUUID().slice(0,8) : "", recovery_requested:false, ai_stopped:false, apify_unavailable:false } });
    }
  }

  if (phase === "collect") {
    if (!(await collect())) return { done: false };
    await checkpoint({ phase: phase = "media", progress: 40 });
  }

  if (phase === "media") {
    // Retry missing parts once per recovery, preserving and verifying successful archived files.
    const generation = report.cost?.recovery_generation || report.id;
    const rows = (await storage.listAds(report.id)).filter(r => r.media?.archive_attempt !== generation);
    const reusable = storage.listReusableMedia ? await storage.listReusableMedia({ since: cacheSince(), excludeReportId: report.id }) : [];
    await pool(rows, 2, async row => {
      if (!left(2 * 60_000)) return;
      const recovered = archive.recovered ? await archive.recovered(row.ad_archive_id).catch(() => null) : null;
      const media = await repairMedia({ row, reusable: recovered ? [recovered, ...reusable] : reusable, archive, date, generation, now: now().toISOString() });
      await storage.saveAd({ ...fence, id: row.id, patch: { media } });
    });
    const current = await storage.listAds(report.id);
    const pending = current.filter(r => r.media?.archive_attempt !== generation).length;
    await auditMedia(current, { phase: 'media', unattempted: pending });
    if (pending) { await checkpoint({ progress: 40 + Math.round(20 * (1 - pending / Math.max(1, rows.length))) }); return { done: false }; }
    await checkpoint({ phase: phase = "analysis", progress: 60 });
  }

  // Upper bound reserved BEFORE every call (exact input count + max_tokens output), settled down to real usage after.
  // Unknown model, failed count or exhausted ceiling = no call (fail closed); ranking stays complete.
  let aiStop = phase === "analysis" && !report.cost?.recovery_requested ? !!report.cost?.ai_stopped : false;
  const stopAi = async reason => { aiStop = true; await checkpoint({ cost: { ai_stopped: reason } }); return null; };
  // Never-spent headroom reserved once per folder: the only uncertain part of a call (input tokens beyond the
  // pessimistic estimate) is cents, so booking the overshoot afterwards can never take real spend above the cap.
  let headroom = false;
  const ai = async ({ kind, id, prompt, image, maxTokens }) => {
    if (aiStop) return null;
    // Adapters may route analyses and summaries to different models (OpenRouter); each one must be allowlisted.
    const callModel = claude.modelFor?.(kind) || model;
    if (!aiCost(callModel, { inputTokens: 1, outputTokens: maxTokens })) return stopAi("unknown_price");
    if (!headroom) {
      try { await storage.budgetReserve({ review_date: date, kind: "ai", reservation: "ai:headroom:" + date, usd: AI_LIMITS.headroom_usd }); headroom = true; }
      catch (error) { if (error?.code === "budget_exceeded") return stopAi("budget_exceeded"); throw error; }
    }
    const inputTokens = await claude.countTokens({ prompt, image, kind });
    const usd = aiCost(callModel, { inputTokens, outputTokens: maxTokens });
    if (!isMoney(usd) || usd <= 0) throw new Error("contagem de tokens inválida");
    const reservation = "ai:" + kind + ":" + hash(id + ":" + randomUUID()).slice(0, 40);
    try { await storage.budgetReserve({ review_date: date, kind: "ai", reservation, usd }); }
    catch (error) { if (error?.code === "budget_exceeded") return stopAi("budget_exceeded"); throw error; }
    const result = await claude({ prompt, image, maxTokens, kind });
    const actual = aiCost(callModel, { inputTokens: result.usage?.input_tokens, outputTokens: result.usage?.output_tokens });
    if (isMoney(actual) && actual > 0 && actual < usd)
      await storage.budgetSettle({ review_date: date, kind: "ai", reservation, usd: actual }).catch(() => {});
    // Real usage above the reservation (estimated input) is booked too; if the ceiling cannot hold it, AI stops here.
    if (isMoney(actual) && actual > usd) {
      try { await storage.budgetReserve({ review_date: date, kind: "ai", reservation: reservation + ":extra", usd: Math.ceil((actual - usd) * 1e4) / 1e4 }); }
      catch (error) { if (error?.code === "budget_exceeded") await stopAi("budget_exceeded"); else throw error; }
    }
    return extractJson(result.text);
  };

  if (phase === "analysis") {
    const products = new Map((await storage.listProducts(report.id)).map(p => [p.offer_id, p]));
    // A failure from a previous run (e.g. provider out of credit) is retried once by the next run; a second failure sticks.
    const retryable = value => value == null || (value.error === true && !value.retried);
    const rows = (await storage.listAds(report.id)).filter(r => retryable(r.analysis));
    await pool(rows, 6, async row => {
      if (!left(90_000) || aiStop) return;
      let analysis = null;
      let failure = null;
      try {
        const raw = await ai({ kind: "ad", id: row.id, prompt: analysisPrompt(row, products.get(row.offer_id)),
          image: analysisImage(row.media), maxTokens: AI_LIMITS.max_tokens_ad });
        if (raw === null && aiStop) return;
        analysis = validateAnalysis(raw);
      } catch (error) { if (error?.code === "conflict") throw error; failure = String(error?.message || error).slice(0, 300); }
      await storage.saveAd({ ...fence, id: row.id, patch: { analysis: analysis || { error: true, ...(row.analysis?.error ? { retried: true } : {}), ...(failure ? { reason: failure } : {}) } } });
    });
    const pending = (await storage.listAds(report.id)).filter(r => r.analysis == null).length;
    if (pending && !aiStop) { await checkpoint({ progress: 60 + Math.round(30 * (1 - pending / Math.max(1, rows.length))) }); return { done: false }; }
    await checkpoint({ phase: phase = "summary", progress: 90 });
  }

  if (phase === "summary") {
    const ads = await storage.listAds(report.id);
    const products = await storage.listProducts(report.id);
    await pool(products.filter(p => ads.some(a => a.offer_id === p.offer_id) && (!p.summary || (p.summary.error === true && !p.summary.retried))), 4, async product => {
      if (!left(60_000) || aiStop) return;
      let summary = null;
      try {
        const raw = await ai({ kind: "product", id: product.offer_id, maxTokens: AI_LIMITS.max_tokens_summary,
          prompt: productSummaryPrompt(product, ads.filter(a => a.offer_id === product.offer_id).sort((a, b) => a.rank - b.rank)) });
        if (raw === null && aiStop) return;
        summary = validateBullets(raw, 3);
      } catch (error) { if (error?.code === "conflict") throw error; }
      Object.assign(product, await storage.saveProduct({ ...fence, offer_id: product.offer_id,
        patch: { summary: summary ? { ...summary, basis: topBasis(ads, product.offer_id) } : { error: true, ...(product.summary?.error ? { retried: true } : {}) } } }));
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
    const createdThisSlice = new Map();
    const generation = report.cost?.recovery_generation || '';
    const targets = new Set(products.flatMap(p => p.sources.map(s => s.key)));
    const shared = generation && storage.listReusableRuns
      ? (await storage.listReusableRuns({ since: cacheSince(), excludeReportId: report.id }))
        .filter(r => r.state === 'succeeded' && r.dataset_id && Date.parse(r.created_at) >= Date.parse(cacheSince()) &&
          Date.parse(r.created_at) <= now().getTime() && (r.page_ids || []).some(key => targets.has(key))) : [];
    const sharedSources = new Set(shared.flatMap(r => r.page_ids || []));
    const receipts = { ...report.cost?.apify_receipts };
    async function settleKnownRuns() {
      if (!apify.receipt) return;
      await pool([...known.values()].filter(r => r.provider_run_id && ['succeeded', 'failed'].includes(r.state)), 4, async row => {
        if (Object.hasOwn(receipts, row.provider_run_id)) return;
        const receipt = await apify.receipt(row.provider_run_id).catch(() => null);
        if (!receipt || !['SUCCEEDED','FAILED','ABORTED','TIMED-OUT'].includes(receipt.status) ||
          !receipt.finished_at || !Number.isFinite(Date.parse(receipt.finished_at)) || !isMoney(receipt.usd)) return;
        // Unknown starts are never refunded. Only a terminal provider receipt can release over-reserved funds.
        if (receipt.usd < row.usd_est) {
          const conservative = Math.max(0.0001, Math.ceil(receipt.usd * 10000) / 10000);
          await storage.budgetSettle({ review_date: date, kind: 'apify', reservation: row.reservation, usd: conservative });
        }
        if (receipt.usd > row.usd_est) await storage.budgetReserve({ review_date: date, kind: 'apify',
          reservation: row.reservation + ':extra', usd: Math.ceil((receipt.usd - row.usd_est) * 10000) / 10000 });
        receipts[row.provider_run_id] = receipt.usd;
      });
      await checkpoint({ cost: { apify_receipts: receipts } });
    }
    const coveredSources = () => new Set([...sharedSources, ...[...known.values()]
      .filter(r => ['succeeded','running','starting'].includes(r.state) || !generation || r.batch_key.length === 40 && r.batch_key.startsWith(generation))
      .flatMap(r => r.page_ids || [])]);
    const pendingProducts = () => { const covered = coveredSources(); return products.map(p => ({ ...p, sources: p.sources.filter(s => !covered.has(s.key)) })); };
    // Read paid shared datasets before starting anything new. A cache outage must not trigger duplicate spending.
    const sharedAds = [];
    for (const row of shared) {
      if (!row.created_at || !Number.isFinite(Date.parse(row.created_at))) throw capability('Data da coleta compartilhada indisponível.');
      const limit = (row.page_ids?.length || 1) * 40;
      for (const item of await apify.items(row.dataset_id, limit)) { const ad = normalizeAd(item, row.created_at); if (ad) sharedAds.push(ad); }
      await checkpoint({}); // Reading many paid datasets must not let the five-minute lease expire.
    }
    if (apify.available) {
      await settleKnownRuns();
      // Unknown or malformed ledger balance fails closed BEFORE any coercion: no reservation and no provider call.
      const usage = await storage.budgetUsage({ review_date: date, kind: "apify" }), used = usage?.used_usd;
      if (!usage || typeof usage !== "object" || usage.review_date !== date || !isMoney(used)) throw capability("Saldo do orçamento semanal indisponível.");
      const plan = planCollection(pendingProducts(), { spentUsd: used });
      let skipped = plan.skipped.length;
      for (const batch of plan.batches) {
        // SQL accepts hexadecimal batch keys only; 8-char generation + 32-char plan hash.
        if (generation) batch.key = generation + batch.key;
        if (known.has(batch.key)) continue;
        const reservation = "apify:" + date + ":" + batch.key;
        try { await storage.budgetReserve({ review_date: date, kind: "apify", reservation, usd: batch.usd_est }); }
        catch (error) { if (error?.code === "budget_exceeded") { skipped += batch.sources.length; continue; } throw error; }
        const requestedAt = now().toISOString();
        let row = await storage.run({ ...fence, batch_key: batch.key, patch: { state: "starting", reservation, page_ids: batch.sources.map(s => s.key), usd_est: batch.usd_est } });
        createdThisSlice.set(batch.key, requestedAt);
        try {
          const started = await apify.start(weeklyActorInput(batch.sources.map(s => s.url), {...WEEKLY_LIMITS, ads_per_source:batch.ads_per_source || 40}), "SwipeFEG-CreativeReview/1 reservation/" + hash(reservation).slice(0, 32), batch.usd_est);
          row = await storage.run({ ...fence, batch_key: batch.key, expected_state: "starting", patch: { state: "running", provider_run_id: started.id, dataset_id: started.dataset_id } });
        } catch (error) {
          if (error?.code === "conflict") throw error;
          // No automatic second POST: an uncertain start stays unknown (already counted in the ledger).
          row = await storage.run({ ...fence, batch_key: batch.key, expected_state: "starting", patch: { state: "unknown" } }).catch(() => ({ ...row, state: "unknown" }));
        }
        known.set(batch.key, row);
      }
      await checkpoint({ progress: 15, cost: { sources: [...known.values()].reduce((n, r) => n + (r.page_ids?.length || 0), 0), sources_skipped: skipped,
        reused_runs: shared.length, reused_sources: [...sharedSources] } });
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
    if (apify.available) {
      await settleKnownRuns();
      const usage = await storage.budgetUsage({ review_date: date, kind: 'apify' });
      if (!isMoney(usage?.used_usd) || usage.review_date !== date) throw capability('Saldo do orçamento semanal indisponível.');
      const remaining = planCollection(pendingProducts(), { spentUsd: usage.used_usd });
      await checkpoint({ cost: { sources_skipped: remaining.skipped.length, pending_sources: remaining.skipped,
        apify_usd_est: Math.ceil(usage.used_usd * 100) / 100 } });
      // A cheaper terminal charge can fund the next small wave without raising the original ceiling.
      if (remaining.batches.length) return false;
    }
    const ads = [...sharedAds], at = now();
    for (const row of known.values()) {
      if (row.state !== "succeeded" || !row.dataset_id) continue;
      const limit = (row.page_ids?.length || 1) * 40;
      const observedAt = typeof row.created_at === "string" && Number.isFinite(Date.parse(row.created_at)) ? row.created_at : createdThisSlice.get(row.batch_key);
      if (!observedAt) throw capability("Data da coleta original indisponível; o relatório anterior foi preservado.");
      try { for (const item of (await apify.items(row.dataset_id, limit)).slice(0, limit)) { const ad = normalizeAd(item, observedAt); if (ad) ads.push(ad); } }
      catch {
        // A read outage does not invalidate a paid, successful run. Keep existing report rows; retry its dataset, never its POST.
        throw capability("Não foi possível ler o dataset da coleta. O relatório anterior foi preservado.");
      }
      await checkpoint({});
    }
    const previous = await storage.getReport({ date: previousReview(date) });
    const existingRows = await storage.listAds(report.id);
    const foundPages = discoveredProductPages({ads, products, existingRows, observedAt:at.toISOString()});
    const { rows, collected } = buildProductRanking({ ads, products, previousRows: previous ? await storage.listAds(previous.id) : null,
      existingRows });
    await storage.saveAds({ ...fence, ads: rows });
    for (const product of products) {
      // A product summary stays valid only while its Top 10 is the same.
      const keep = validateBullets(product.summary, 3) && product.summary.basis === topBasis(rows, product.offer_id);
      product.ads_collected = collected[product.offer_id] || 0;
      product.summary = keep ? product.summary : null;
      product.pages = [...product.sources, ...(foundPages[product.offer_id] || [])];
    }
    await storage.saveProducts({...fence, products});
    const oldAds = existingRows.map(r => [r.offer_id, r.rank, topBasis(existingRows, r.offer_id)]).sort();
    const newAds = rows.map(r => [r.offer_id, r.rank, topBasis(rows, r.offer_id)]).sort();
    await checkpoint({ ...(JSON.stringify(oldAds) === JSON.stringify(newAds) ? {} : { summary: null }),
      cost: { ads_collected: new Set(ads.map(a => a.ad_archive_id)).size, ads_ranked: rows.length } });
    return true;
  }

  async function finish(summary) {
    const ads = await storage.listAds(report.id), products = await storage.listProducts(report.id), runs = await storage.listRuns(report.id);
    const fresh = await storage.getReport({ id: report.id });
    const issues = [];
    if (fresh?.cost?.sources_skipped) issues.push("Parte das fontes não foi coletada por limite de orçamento.");
    if (fresh?.cost?.apify_unavailable) issues.push("Coleta Apify não configurada.");
    const coveredPages = new Set([...(fresh?.cost?.reused_sources || []), ...runs.filter(r => r.state === "succeeded").flatMap(r => r.page_ids || [])]);
    if (runs.some(r => ["failed", "unknown"].includes(r.state) && (r.page_ids || []).some(p => !coveredPages.has(p)))) issues.push("Parte das coletas falhou.");
    if (ads.some(a => !mediaComplete(a))) issues.push("Parte das mídias não foi arquivada.");
    if (ads.some(a => !validateAnalysis(a.analysis))) issues.push("Parte das análises de IA não foi concluída.");
    if (products.some(p => ads.some(a => a.offer_id === p.offer_id) && !validateBullets(p.summary, 3))) issues.push("Parte dos resumos de produto não foi gerada.");
    if (ads.length && !summary) issues.push("Resumo executivo indisponível.");
    if (fresh?.cost?.ai_stopped) issues.push(fresh.cost.ai_stopped === "budget_exceeded" ? "Teto semanal de IA (US$ 10) atingido." : "Custo da IA desconhecido; análises suspensas.");
    const aiUsage = await storage.budgetUsage({ review_date: date, kind: "ai" }).catch(() => null);
    const status = !ads.length ? "failed" : issues.length ? "partial" : "succeeded";
    await checkpoint({ status, phase: "done", progress: 100, cost: { ai_usd_est: isMoney(aiUsage?.used_usd) ? Math.round(aiUsage.used_usd * 100) / 100 : 0,
      media_total: ads.length, media_complete: ads.filter(mediaComplete).length,
      media_pending: ads.filter(a => !mediaComplete(a)).map(a => ({ offer_id: a.offer_id, ad_archive_id: a.ad_archive_id,
        thumb_missing: !a.media?.thumb_url, video_missing: !!a.media?.video_error })) },
      summary: summary ? { ...summary, generated_at: now().toISOString() } : null,
      error: status === "succeeded" ? null : { code: !ads.length ? "no_ads" : "partial", message: (issues.join(" ") || "Nenhum anúncio ativo coletado.").slice(0, 300), retryable: true } });
    await auditMedia(ads, { phase: 'done', status, unattempted: 0, sources_skipped: fresh?.cost?.sources_skipped || 0 });
    return { status };
  }
  async function auditMedia(ads, extra) {
    if (!archive.audit) return;
    await archive.audit({ review_date: date, updated_at: now().toISOString(), ...extra,
      media_total: ads.length, media_complete: ads.filter(mediaComplete).length,
      media_pending: ads.filter(row => row.media?.archive_attempt === (report.cost?.recovery_generation || report.id) && !mediaComplete(row))
        .map(row => ({ offer_id: row.offer_id, ad_archive_id: row.ad_archive_id, page_id: row.page_id,
          thumb_missing: !row.media?.thumb_url, video_missing: !!row.media?.video_error, verification_error: !!row.media?.verification_error }))
    }).catch(() => {}); // Diagnostics cannot erase or fail the report itself.
  }
}

const MEDIA = WEEKLY_MEDIA_LIMITS;
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
    return { url: publicUrl(path), ...(kind === "thumb" ? imageDimensions(buffer) || {} : {}) };
  };
}
/** Claude adapter (same endpoint/headers/model env as _ad-video-analysis.mjs). Image goes by archived public URL.
 * countTokens uses the free /v1/messages/count_tokens endpoint with the exact same request content. */
export function createWeeklyClaude({ key, model, url, fetcher = fetch }) {
  const messages = (prompt, image) => [{ role: "user", content: [{ type: "text", text: prompt },
    ...(imageUrl(image) ? [{ type: "image", source: { type: "url", url: imageUrl(image) } }] : [])] }];
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

/** OpenRouter adapter (OpenAI-compatible chat API), same interface as createWeeklyClaude.
 * Ad analyses and summaries may use different models. There is no free exact token count, so countTokens is a
 * provable upper bound (UTF-8 bytes + envelope + per-image maximum), provider.max_price pins the per-token price to
 * the allowlist, and the worker still books any usage above the reservation as defence in depth. */
export const OPENROUTER_ENVELOPE_TOKENS = 64;
export function createWeeklyOpenRouter({ key, adsModel, summaryModel, url = "https://openrouter.ai/api/v1/chat/completions", fetcher = fetch }) {
  const modelFor = kind => kind === "ad" ? adsModel : summaryModel;
  const complete = async ({ prompt, image, maxTokens, kind }) => {
    if (!key) throw capability("Análise de IA não configurada.");
    const model = modelFor(kind), price = AI_LIMITS.models[model];
    if (!price) throw capability("Modelo de IA sem preço conhecido.");
    const response = await fetcher(url, { method: "POST",
      headers: { authorization: "Bearer " + key, "content-type": "application/json", "x-title": "Swipe FEG Creative Review" },
      body: JSON.stringify({ model, max_tokens: maxTokens, usage: { include: true }, reasoning: { effort: "low", exclude: true },
        provider: { max_price: { prompt: price[0], completion: price[1] } },
        messages: [{ role: "user", content: [{ type: "text", text: prompt },
          // Only an image whose token cost is bounded (known dimensions) is ever sent.
        ...(imageTokenBound(image) ? [{ type: "image_url", image_url: { url: imageUrl(image) } }] : [])] }] }),
      signal: AbortSignal.timeout(90_000) });
    if (!response.ok) {
      let detail = "";
      try { const body = await response.json(); detail = [body?.error?.code, body?.error?.message].filter(Boolean).join(": "); } catch {}
      throw new Error(("OpenRouter HTTP " + response.status + (detail ? " " + detail : "")).slice(0, 300));
    }
    const result = await response.json(), message = result.choices?.[0]?.message;
    const text = typeof message?.content === "string" ? message.content
      : (Array.isArray(message?.content) ? message.content.filter(p => p?.type === "text").map(p => p.text).join("") : "");
    const usage = result.usage ? { input_tokens: result.usage.prompt_tokens, output_tokens: result.usage.completion_tokens } : null;
    return { text: text.trim(), usage };
  };
  complete.modelFor = modelFor;
  // Provable upper bound BEFORE the call (QA-CR-B01): byte-level BPE tokenizers emit ≤1 token per UTF-8 byte, plus a
  // fixed chat-envelope allowance and the per-image maximum after provider resizing. Output is capped by max_tokens
  // and price by provider.max_price, so each reservation covers the worst real charge even with parallel calls.
  complete.countTokens = async ({ prompt, image }) => Buffer.byteLength(String(prompt || ""), "utf8") + OPENROUTER_ENVELOPE_TOKENS +
    imageTokenBound(image);
  return complete;
}

/** Width/height read from the archived bytes (PNG IHDR, JPEG SOFn, WebP VP8/VP8L/VP8X); null when unknown. */
export function imageDimensions(buf) {
  const ok = (width, height) => Number.isSafeInteger(width) && Number.isSafeInteger(height) && width > 0 && height > 0 ? { width, height } : null;
  if (buf.length >= 24 && buf.readUInt32BE(0) === 0x89504e47) return ok(buf.readUInt32BE(16), buf.readUInt32BE(20));
  if (buf.length >= 30 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const chunk = buf.toString("ascii", 12, 16);
    if (chunk === "VP8X") return ok(1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3));
    if (chunk === "VP8L") { const b = buf.readUInt32LE(21); return ok(1 + (b & 0x3fff), 1 + ((b >> 14) & 0x3fff)); }
    if (chunk === "VP8 ") return ok(buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff);
    return null;
  }
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    for (let i = 2; i + 9 < buf.length;) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
      const length = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return ok(buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5));
      i += 2 + length;
    }
  }
  return null;
}
export const ANALYSIS_IMAGE_MAX_SIDE = 2048;
/** The image goes to the model only when archived with known dimensions ≤ 2048 px, so its token cost is bounded. */
export function analysisImage(media) {
  const width = media?.thumb_width, height = media?.thumb_height;
  if (!media?.archived || typeof media.thumb_url !== "string" || !media.thumb_url.startsWith("https://")) return null;
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || Math.max(width, height) > ANALYSIS_IMAGE_MAX_SIDE) return null;
  return { url: media.thumb_url, width, height };
}
const imageUrl = image => typeof image === "string" ? (image.startsWith("https://") ? image : null) : (image?.url?.startsWith?.("https://") ? image.url : null);
/** Upper bound of image input tokens from the documented formulas, before any provider downscaling (which only lowers it):
 * Claude ceil(w·h/750) (docs cap 4784 for newer models), Gemini 258 per 768-px tile, OpenAI high detail
 * ≤ 85 + 170 per 512-px tile. An image without known dimensions is never sent, so it costs 0 here. */
export function imageTokenBound(image) {
  if (!imageUrl(image) || typeof image === "string") return 0;
  const { width: w, height: h } = image;
  if (!Number.isSafeInteger(w) || !Number.isSafeInteger(h) || Math.max(w, h) > ANALYSIS_IMAGE_MAX_SIDE) return 0;
  return Math.max(Math.ceil(w * h / 750), Math.ceil(w / 768) * Math.ceil(h / 768) * 258, 85 + 170 * Math.ceil(w / 512) * Math.ceil(h / 512), 4784) + 64;
}
