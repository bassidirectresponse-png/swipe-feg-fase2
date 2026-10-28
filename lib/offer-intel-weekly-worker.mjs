import { IntelError, hash } from "./offer-intel-core.mjs";
import {
  selectPages, planCollection, weeklyActorInput, normalizeAd, buildWeeklyRanking, previousWeek,
  analysisPrompt, summaryPrompt, extractJson, validateAnalysis, validateSummary,
} from "./offer-intel-weekly.mjs";

export const WEEKLY_ACTOR = "apify~facebook-ads-scraper";
const fail = message => new IntelError(502, "provider_error", message, true);
const providerId = value => { if (typeof value !== "string" || !/^\w{1,100}$/.test(value)) throw fail("Identificador do provedor inválido."); return value; };

/** Real Apify adapter. Tests inject a FAKE fetch; the start POST is never retried automatically. */
export function createWeeklyApify({ token, fetcher = fetch }) {
  async function api(path, { method = "GET", body, userAgent } = {}) {
    const response = await fetcher("https://api.apify.com/v2/" + path, { method, redirect: "error",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", "User-Agent": userAgent || "SwipeFEG-OfferIntelWeekly/1" },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) });
    const reader = response.body.getReader(), chunks = []; let size = 0;
    for (;;) {
      const { value, done } = await reader.read(); if (done) break; size += value.byteLength;
      if (size > 16 * 1024 * 1024) { await reader.cancel(); throw fail("Resposta do provedor excede o limite."); }
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
      if (!(Number.isFinite(maxUsd) && maxUsd > 0)) throw new IntelError(503, "capability_unavailable", "Custo da coleta desconhecido.");
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
  const queue = [...items]; const workers = Array.from({ length: Math.min(size, queue.length) }, async () => {
    while (queue.length) await task(queue.shift());
  });
  await Promise.all(workers);
}

/**
 * Weekly pipeline for one claimed report. Idempotent per week: batch runs, the USD ledger,
 * archived media and analyses are keyed and reused when the same week runs again.
 * Partial: ranking saved but some batch, media, analysis or the summary failed.
 */
export async function runWeeklyReport({ report, storage, apify, archive, claude, now = () => new Date(), deadline = Date.now() + 13 * 60_000 }) {
  const fence = { report_id: report.id, lease_token: report.lease_token }, week = report.week_start;
  const left = margin => deadline - Date.now() > margin;
  const checkpoint = patch => storage.checkpoint({ ...fence, patch });
  const issues = [];
  const cost = { apify_usd_est: 0, ads_collected: 0, pages: 0, pages_skipped: 0, batches: 0, batches_failed: 0, media_failed: 0, analysis_failed: 0 };

  // 1. Pages
  const pages = selectPages(await storage.loadSources());
  const total = pages.registered.length + pages.discovered.length;
  if (!total) {
    await checkpoint({ status: "failed", phase: "done", progress: 100, cost,
      error: { code: "no_pages", message: "Nenhuma Página cadastrada ou encontrada para coletar.", retryable: false } });
    return { status: "failed" };
  }

  // 2. Collect: reserve BEFORE each run; the SQL ceiling is absolute and refuses anything above it.
  await checkpoint({ phase: "collect", progress: 10 });
  const usage = await storage.budgetUsage({ week_start: week }), used = usage?.used_usd;
  // Unknown or malformed ledger balance fails closed BEFORE any coercion: no reservation and no provider call.
  if (!usage || typeof usage !== "object" || usage.week_start !== week || typeof used !== "number" || !Number.isFinite(used) || used < 0) throw new IntelError(503, "capability_unavailable", "Saldo do orçamento semanal indisponível.", true);
  const known = new Map();
  for (const row of await storage.listRuns(report.id)) known.set(row.batch_key, row);
  const reusedUsd = [...known.values()].reduce((sum, r) => sum + (Number(r.usd_est) || 0), 0);
  // Batches already reserved for this week cost nothing new; the plan only spends what is left.
  const plan = planCollection(pages, { spentUsd: Math.max(0, used - reusedUsd) });
  cost.pages_skipped = plan.skipped.length;
  const runs = [];
  if (!apify.available) issues.push({ code: "credentials_missing", message: "Coleta Apify não configurada." });
  else for (const batch of plan.batches) {
    let row = known.get(batch.key);
    if (!row) {
      const reservation = "weekly:" + week + ":" + batch.key;
      try { await storage.budgetReserve({ week_start: week, reservation, usd: batch.usd_est }); }
      catch (error) {
        if (error?.code === "budget_exceeded") { cost.pages_skipped += batch.page_ids.length; continue; }
        throw error;
      }
      row = await storage.run({ ...fence, batch_key: batch.key, patch: { state: "starting", reservation, page_ids: batch.page_ids, usd_est: batch.usd_est } });
      try {
        const started = await apify.start(weeklyActorInput(batch.page_ids), "SwipeFEG-OfferIntelWeekly/1 reservation/" + hash(reservation).slice(0, 32), batch.usd_est);
        row = await storage.run({ ...fence, batch_key: batch.key, expected_state: "starting", patch: { state: "running", provider_run_id: started.id, dataset_id: started.dataset_id } });
      } catch (error) {
        if (error?.code === "conflict") throw error;
        // No automatic second POST: an uncertain start stays unknown (already paid for in the ledger).
        row = await storage.run({ ...fence, batch_key: batch.key, expected_state: "starting", patch: { state: "unknown" } }).catch(() => ({ ...row, state: "unknown" }));
      }
    } else if (row.state === "starting") {
      row = await storage.run({ ...fence, batch_key: batch.key, expected_state: "starting", patch: { state: "unknown" } });
    }
    runs.push({ batch, row });
  }
  cost.batches = runs.length;
  cost.apify_usd_est = Math.round(runs.reduce((sum, r) => sum + (Number(r.row.usd_est) || r.batch.usd_est), 0) * 100) / 100;
  const ads = [];
  for (const entry of runs) {
    let { row } = entry;
    try {
      if (!["running", "succeeded"].includes(row.state) || !row.provider_run_id) throw fail("Execução sem identificador recuperável.");
      for (let poll = 0; row.state === "running"; poll++) {
        if (!left(4 * 60_000) || poll > 20) throw fail("Coleta ainda em andamento.");
        const status = await apify.status(row.provider_run_id);
        if (status.status === "SUCCEEDED") row = await storage.run({ ...fence, batch_key: row.batch_key, expected_state: "running", patch: { state: "succeeded", dataset_id: status.dataset_id || row.dataset_id } });
        else if (["FAILED", "ABORTED", "TIMED-OUT"].includes(status.status)) {
          row = await storage.run({ ...fence, batch_key: row.batch_key, expected_state: "running", patch: { state: "failed" } });
          throw fail("A execução do provedor terminou sem sucesso.");
        } else await checkpoint({});
      }
      if (row.state !== "succeeded" || !row.dataset_id) throw fail("Execução anterior terminou sem sucesso.");
      const items = await apify.items(row.dataset_id, entry.batch.max_items);
      const at = now();
      for (const item of items.slice(0, entry.batch.max_items)) { const ad = normalizeAd(item, at); if (ad) ads.push(ad); }
      cost.pages += entry.batch.page_ids.length;
    } catch (error) {
      if (error?.code === "conflict") throw error;
      cost.batches_failed++;
      issues.push({ code: "provider_error", message: "Uma coleta de Páginas falhou." });
    }
  }
  cost.ads_collected = ads.length;
  if (!ads.length) {
    await checkpoint({ status: "failed", phase: "done", progress: 100, cost,
      error: issues[0] ? { ...issues[0], retryable: true } : { code: "no_ads", message: "Nenhum anúncio ativo coletado nesta semana.", retryable: false } });
    return { status: "failed" };
  }

  // 3. Rank
  await checkpoint({ phase: "rank", progress: 50, cost });
  const previous = await storage.getReport({ week: previousWeek(week) });
  const previousRows = previous ? await storage.listAds(previous.id) : [];
  const existingRows = await storage.listAds(report.id);
  await storage.saveAds({ ...fence, ads: buildWeeklyRanking({ ads, pages, previousRows, existingRows }) });
  const rows = await storage.listAds(report.id);

  // 4. Media: thumbnail + video of the 20 into criativos/intel-weekly/{week}/ (fbcdn links expire).
  await checkpoint({ phase: "media", progress: 60 });
  const images = new Map();
  await pool(rows.filter(r => !r.media?.archived), 4, async row => {
    if (!left(3 * 60_000)) { cost.media_failed++; return; }
    try {
      const thumb = row.media?.source_thumb_url ? await archive({ week, ad_archive_id: row.ad_archive_id, kind: "thumb", url: row.media.source_thumb_url }) : null;
      const video = row.media?.source_video_url ? await archive({ week, ad_archive_id: row.ad_archive_id, kind: "video", url: row.media.source_video_url }) : null;
      if (thumb?.image) images.set(row.id, thumb.image);
      const media = { archived: true, thumb_url: thumb?.url || null, video_url: video?.url || null, archived_at: now().toISOString() };
      Object.assign(row, await storage.saveAd({ ...fence, id: row.id, patch: { media } }));
    } catch (error) {
      if (error?.code === "conflict") throw error;
      cost.media_failed++;
    }
  });
  if (cost.media_failed) issues.push({ code: "media_error", message: "Parte das mídias não pôde ser arquivada." });

  // 5. AI per ad (validated JSON) + executive summary.
  await checkpoint({ phase: "analysis", progress: 75, cost });
  await pool(rows.filter(r => !validateAnalysis(r.analysis)), 4, async row => {
    if (!left(2 * 60_000)) { cost.analysis_failed++; return; }
    try {
      const analysis = validateAnalysis(extractJson(await claude({ prompt: analysisPrompt(row), image: images.get(row.id) || null })));
      if (!analysis) throw new Error("análise inválida");
      Object.assign(row, await storage.saveAd({ ...fence, id: row.id, patch: { analysis } }));
    } catch (error) {
      if (error?.code === "conflict") throw error;
      cost.analysis_failed++;
    }
  });
  if (cost.analysis_failed) issues.push({ code: "analysis_error", message: "Parte das análises de IA falhou." });
  await checkpoint({ phase: "summary", progress: 92, cost });
  let summary = null;
  try {
    if (left(60_000)) summary = validateSummary(extractJson(await claude({ prompt: summaryPrompt(rows) })));
  } catch (error) { if (error?.code === "conflict") throw error; }
  if (!summary) issues.push({ code: "summary_error", message: "Resumo executivo indisponível." });
  if (cost.pages_skipped) issues.push({ code: "budget_ceiling", message: "Teto semanal atingido; " + cost.pages_skipped + " Página(s) ficaram fora da coleta." });

  const failed = issues.filter(i => i.code !== "budget_ceiling");
  const status = failed.length ? "partial" : "succeeded";
  await checkpoint({ status, phase: "done", progress: 100, cost,
    summary: summary ? { ...summary, generated_at: now().toISOString() } : null,
    error: failed.length ? { code: failed[0].code, message: failed.map(i => i.message).join(" "), retryable: true } : null });
  return { status };
}



const MEDIA = { thumb: 8 * 1024 * 1024, video: 60 * 1024 * 1024 };
export function detectWeeklyMedia(buffer) {
  if (buffer.length > 12 && buffer.subarray(4, 8).toString("latin1") === "ftyp") return { type: "video", contentType: "video/mp4", ext: "mp4" };
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { type: "image", contentType: "image/jpeg", ext: "jpg" };
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { type: "image", contentType: "image/png", ext: "png" };
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return { type: "image", contentType: "image/webp", ext: "webp" };
  return null;
}
/** Fixed, server-built path: week and Library id are validated, nothing comes from the remote file name. */
export function weeklyMediaPath(week, adId, kind, ext) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week) || !/^\d{1,40}$/.test(adId) || !["thumb", "video"].includes(kind) || !["jpg", "png", "webp", "mp4"].includes(ext))
    throw new IntelError(400, "invalid_request", "Caminho de mídia inválido.");
  return "intel-weekly/" + week + "/" + adId + "-" + kind + "." + ext;
}
/** Archive adapter. download = SSRF-safe fetch limited to Meta CDN hosts; upload = Storage `criativos`. */
export function createWeeklyArchive({ download, upload, publicUrl }) {
  return async ({ week, ad_archive_id, kind, url }) => {
    const buffer = await download(url, MEDIA[kind]);
    const media = buffer?.length ? detectWeeklyMedia(buffer) : null;
    if (!media || (kind === "video") !== (media.type === "video")) throw new Error("mídia em formato inválido");
    const path = weeklyMediaPath(week, ad_archive_id, kind, media.ext);
    await upload(path, buffer, media.contentType);
    // Claude accepts images up to ~5 MB in base64; larger thumbs are archived but not sent.
    const image = media.type === "image" && buffer.length <= 3_500_000 ? { mediaType: media.contentType, data: buffer.toString("base64") } : null;
    return { url: publicUrl(path), image };
  };
}
/** Claude adapter (same endpoint/headers/model env as _ad-video-analysis.mjs). Returns the text. */
export function createWeeklyClaude({ key, model, url, fetcher = fetch }) {
  return async ({ prompt, image }) => {
    if (!key) throw new IntelError(503, "credentials_missing", "Análise de IA não configurada.");
    const content = [{ type: "text", text: prompt },
      ...(image ? [{ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } }] : [])];
    const response = await fetcher(url, { method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 1500, messages: [{ role: "user", content }] }), signal: AbortSignal.timeout(120_000) });
    if (!response.ok) throw new Error("Claude HTTP " + response.status);
    const result = await response.json();
    return (result.content || []).filter(part => part.type === "text").map(part => part.text).join("").trim();
  };
}
