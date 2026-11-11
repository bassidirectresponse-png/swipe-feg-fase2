import { randomUUID } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { verifyGithubAutomationToken } from './_github-oidc.mjs';
import { readJson } from './_security.mjs';
import { weeklyRuntime } from './_offer-intel-weekly.mjs';
import { isReviewDate, selectProducts } from '../../lib/offer-intel-weekly.mjs';

const WORKFLOWS = new Set(['brands-cli-token.yml']);
const reply = (status, body) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

// Maintenance uses the existing short-lived, repository-bound administrator identity.
// No collection action or caller-supplied media URL is accepted here.
export function createMaintenanceHandler({ verify = verifyGithubAutomationToken, runtime = weeklyRuntime } = {}) {
  return async req => {
    if (req.method !== 'POST') return reply(405, { ok: false });
    try { await verify(String(req.headers.get('authorization') || '').replace(/^Bearer\s+/i, ''), WORKFLOWS); }
    catch { return reply(401, { ok: false, error: 'Automação não autorizada.' }); }
    try {
      const body = await readJson(req, { maxBytes: 1024 });
      if (!body || Array.isArray(body) || Object.keys(body).some(k => !['action', 'review_date'].includes(k)) ||
          !['inspect', 'cache_report', 'recover_media'].includes(body.action) || !isReviewDate(body.review_date))
        return reply(400, { ok: false, error: 'Ação inválida.' });
      const { storage, dispatch, apify } = runtime();
      const report = await storage.getReport({ date: body.review_date });
      if (!report) return reply(404, { ok: false, error: 'Pasta inexistente.' });
      const [products, ads, runs] = await Promise.all([storage.listProducts(report.id), storage.listAds(report.id), storage.listRuns(report.id)]);
      if (body.action === 'inspect') return reply(200, { ok: true,
        report: { id: report.id, review_date: report.review_date, status: report.status, phase: report.phase,
          cost: report.cost, summary: report.summary, error: report.error, updated_at: report.updated_at }, products, ads });
      if (body.action === 'cache_report') {
        const store = getStore({ name: 'creative-review-recovery', consistency: 'strong' });
        const catalog = await storage.loadSources();
        const manifest = { report_id: report.id, review_date: report.review_date, products: selectProducts(catalog), runs: [] };
        const queue = runs.filter(r => r.state === 'succeeded' && r.dataset_id);
        await Promise.all(Array.from({ length: 4 }, async () => {
          while (queue.length) {
            const run = queue.shift(), key = 'datasets/' + run.dataset_id + '.json';
            let items = await store.get(key, { type: 'json' });
            if (!items) { items = await apify.items(run.dataset_id, (run.page_ids?.length || 1) * 40); await store.setJSON(key, items); }
            manifest.runs.push({ ...run, cache_key: key, item_count: items.length });
          }
        }));
        await store.setJSON('datasets/report-' + report.review_date + '.json', manifest);
        return reply(200, { ok: true, datasets: manifest.runs.length, items: manifest.runs.reduce((n, r) => n + r.item_count, 0) });
      }
      const covered = new Set([...(report.cost?.reused_sources || []), ...runs.filter(r => r.state === 'succeeded').flatMap(r => r.page_ids || [])]);
      if (!ads.length || report.cost?.sources_skipped !== 0 || report.cost?.apify_unavailable ||
          runs.some(r => ['running', 'starting'].includes(r.state) || (r.page_ids || []).some(k => !covered.has(k))))
        return reply(409, { ok: false, error: 'A coleta precisa estar concluída antes da recuperação de mídia.' });
      // enqueue enforces the active-job lock atomically. Reuse the same folder and its saved evidence.
      const queued = await storage.enqueue({ review_date: report.review_date, trigger: 'manual' });
      const claimed = await storage.claim({ report_id: queued.report.id, nonce: queued.nonce });
      if (!claimed?.lease_token) return reply(409, { ok: false, error: 'Pasta em processamento.' });
      const fence = { report_id: claimed.id, lease_token: claimed.lease_token };
      await storage.checkpoint({ ...fence, patch: { phase: 'media', progress: 40,
        cost: { recovery_generation: randomUUID(), recovery_requested: false, recovery_scope: 'pending_media' } } });
      const next = await storage.continue(fence);
      await dispatch(claimed.id, next.nonce);
      return reply(202, { ok: true, report_id: claimed.id, review_date: report.review_date, scope: 'pending_media' });
    } catch (error) {
      return reply([400, 409, 413, 415].includes(error?.status) ? error.status : 503,
        { ok: false, error: 'Não foi possível concluir a manutenção.', code: error?.code || 'unavailable' });
    }
  };
}

export default createMaintenanceHandler();
