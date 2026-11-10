import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeItem, offerData } from '../netlify/functions/manual-ingest-n8n.mjs';

const morning = { d: '2026-11-09', at: '2026-11-09T11:00:00Z', n: 10 };
const evening = { d: '2026-11-09', at: '2026-11-09T23:00:00Z', n: 12 };

for (const file of ['netlify/functions/admin-offer-batch.mjs', 'scripts/ingest_offer_batch_july22.mjs']) {
  test(`${file}: merging duplicate cards keeps both daily readings and legacy history`, () => {
    // Extract the pure merge to avoid running batch imports or accessing credentials.
    const source = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
    const body = source.match(/(?:function mergeAdsHistory\(first, second\)|const mergeAdsHistory = \(first, second\) =>) \{([\s\S]*?)\n\}/)?.[1];
    assert.ok(body);
    const merge = new Function('first', 'second', body);
    const result = merge([{ d: '2026-11-08', n: 8 }, evening], [morning, { ...evening, at: '2026-11-09T20:00:00-03:00' }]);
    assert.equal(result.length, 3);
    assert.deepEqual(result.map(point => point.n), [8, 10, 12]);
    assert.equal(Date.parse(result[1].at), Date.parse(morning.at));
    assert.equal(Date.parse(result[2].at), Date.parse(evening.at));
  });
}

test('manual readings append without deleting either scheduled reading on the same date', () => {
  const item = normalizeItem({ kind: 'brandsvalidated', name: 'Example - Product', activeAds: 15, activeAdsCheckedAt: '2026-11-09', libraries: [{ url: 'https://www.facebook.com/ads/library/?view_all_page_id=123' }] }, 0);
  const result = offerData(item, { adsHistory: [morning, evening] }, '2026-11-09');
  assert.equal(result.adsHistory.length, 3);
  assert.deepEqual(result.adsHistory.slice(0, 2), [morning, evening]);
  assert.equal(result.adsHistory[2].n, 15);
});
