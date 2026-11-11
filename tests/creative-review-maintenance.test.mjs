import test from 'node:test';
import assert from 'node:assert/strict';
import { createMaintenanceHandler } from '../netlify/functions/creative-review-maintenance.mjs';

function setup({ report = { id: 'saved-folder', review_date: '2026-11-11', cost: { sources_skipped: 0 } }, runs = [], verify = async () => {}, enqueueError } = {}) {
  const calls = [], ads = [{ id: 'saved-ad', analysis: { existing: true } }], products = [{ offer_id: 'saved-offer' }];
  const storage = {
    getReport: async () => report, listProducts: async () => products, listAds: async () => ads, listRuns: async () => runs,
    enqueue: async p => { calls.push(['enqueue', p]); if (enqueueError) throw enqueueError; return { report, nonce: 'first' }; },
    claim: async p => { calls.push(['claim', p]); return { ...report, lease_token: 'lease' }; },
    checkpoint: async p => calls.push(['checkpoint', p]), continue: async p => { calls.push(['continue', p]); return { nonce: 'next' }; },
  };
  const handler = createMaintenanceHandler({ verify, runtime: () => { calls.push(['runtime']); return { storage, dispatch: async (...p) => calls.push(['dispatch', ...p]) }; } });
  const request = (action = 'recover_media', extra = {}) => handler(new Request('https://swipe.test/maintenance', { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, review_date: '2026-11-11', ...extra }) }));
  return { request, calls, ads, products };
}

test('rejects unauthorized calls before accessing storage', async () => {
  const s = setup({ verify: async () => { throw new Error('OIDC'); } });
  assert.equal((await s.request()).status, 401); assert.deepEqual(s.calls, []);
});
test('inspect is read-only and returns existing evidence', async () => {
  const s = setup(), res = await s.request('inspect'), body = await res.json();
  assert.equal(res.status, 200); assert.deepEqual(body.ads, s.ads); assert.deepEqual(s.calls, [['runtime']]);
});
test('does not create folders or accept arbitrary URLs, dates or actions', async () => {
  assert.equal((await setup({ report: null }).request()).status, 404);
  for (const extra of [{ url: 'https://example.com' }, { review_date: '2026-11-12' }, { action: 'collect' }]) {
    const s = setup(); assert.equal((await s.request('recover_media', extra)).status, 400); assert.deepEqual(s.calls, []);
  }
});
test('incomplete collection cannot enter media-only recovery', async () => {
  for (const options of [{ report: { id: 'x', cost: { sources_skipped: 1 } } }, { runs: [{ state: 'running' }] },
    { runs: [{ state: 'failed', page_ids: ['missing'] }] }]) {
    const s = setup(options); assert.equal((await s.request()).status, 409); assert.deepEqual(s.calls, [['runtime']]);
  }
});
test('active-job conflict is retained and no worker is dispatched', async () => {
  const s = setup({ enqueueError: Object.assign(new Error('busy'), { status: 409 }) });
  assert.equal((await s.request()).status, 409); assert.equal(s.calls.some(c => c[0] === 'dispatch'), false);
});
test('recovery starts directly at media with a fenced lease, retaining folder and evidence', async () => {
  const s = setup(); assert.equal((await s.request()).status, 202);
  assert.deepEqual(s.calls.map(c => c[0]), ['runtime', 'enqueue', 'claim', 'checkpoint', 'continue', 'dispatch']);
  const patch = s.calls[3][1]; assert.equal(patch.report_id, 'saved-folder'); assert.equal(patch.lease_token, 'lease');
  assert.equal(patch.patch.phase, 'media'); assert.equal(patch.patch.cost.recovery_scope, 'missing_media');
  assert.equal(patch.patch.cost.recovery_requested, false); assert.deepEqual(s.calls.at(-1), ['dispatch', 'saved-folder', 'next']);
  assert.deepEqual(s.ads, [{ id: 'saved-ad', analysis: { existing: true } }]);
});
