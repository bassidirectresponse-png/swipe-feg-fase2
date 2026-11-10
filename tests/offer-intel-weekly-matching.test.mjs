import test from 'node:test';
import assert from 'node:assert/strict';
import { selectProducts, planCollection, normalizeAd, buildProductRanking, publicAd, publicProduct } from '../lib/offer-intel-weekly.mjs';
const page = id => `https://www.facebook.com/ads/library/?view_all_page_id=${id}`;
const ids = ['10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002'];
const offer = (i, name, data = {}) => ({ id: ids[i], data: { kind: 'brandsvalidated', nomeOferta: name, nomeMarca: 'Acme', ...data } });
const ad = (id, fields = {}) => ({ ad_archive_id: id, page_id: '99', ad_text: '', caption: '', days_active: 20, collation_count: 1, started_at: '2026-10-01T00:00:00Z', ...fields });

test('catalog domains and product names seed discovery even without a registered library', () => {
  const products = selectProducts({ offers: [offer(0, 'Acme - Omega', { dominios: [{ linkDominio: 'https://shop.acme.example/omega' }] }), offer(1, 'Acme - Sleep')] });
  assert.equal(products.length, 2);
  assert.ok(products[0].sources.some(s => s.domain === 'shop.acme.example'));
  assert.ok(products.every(p => p.sources.some(s => s.kind === 'search')));
  assert.equal(publicProduct({ ...products[0], pages: products[0].sources }, []).no_library, true);
});

test('registered libraries for every product get budget before generated discovery searches', () => {
  const products = selectProducts({ offers: [offer(0, 'Acme - Omega', { bibliotecas: [{ link: page('1') }] }), offer(1, 'Acme - Sleep', { bibliotecas: [{ link: page('2') }] })] });
  const plan = planCollection(products, { usdCap: 0.12 });
  assert.deepEqual(plan.batches.flatMap(b => b.sources.map(s => s.key)), ['page:1', 'page:2']);
  assert.ok(plan.skipped.length >= 2);
});

test('shared pages and domains require product evidence, while cross-query domain matches remain usable', () => {
  const products = selectProducts({ offers: ['Omega', 'Sleep'].map((name, i) => offer(i, `Acme - ${name}`, { bibliotecas: [{ link: page('99') }], dominios: [{ linkDominio: `https://acme.example/${name.toLowerCase()}` }] })) });
  const { rows, collected } = buildProductRanking({ products, ads: [ad('1', { landing_url: 'https://acme.example/omega', input_source: 'different-query' }), ad('2', { headline: 'Acme Sleep helps you wind down tonight' }), ad('3', { landing_url: 'https://acme.example/', ad_text: 'Shop our whole collection' })] });
  assert.deepEqual(rows.map(r => [r.offer_id, r.ad_archive_id]), [[ids[0], '1'], [ids[1], '2']]);
  assert.deepEqual(collected, { [ids[0]]: 1, [ids[1]]: 1 });
});

test('known creative IDs and headlines link new pages to their offer without copying ambiguous creatives', () => {
  const headline = 'A better way to support your nightly sleep';
  const products = selectProducts({ offers: [offer(0, 'Acme - Omega', { brandTopAds: [{ link: 'https://www.facebook.com/ads/library/?id=12345' }] }), offer(1, 'Acme - Sleep', { brandTopAds: [{ headline }] })] });
  const { rows } = buildProductRanking({ products, ads: [ad('12345'), ad('2', { headline }), ad('3', { headline: 'Buy now' })] });
  assert.deepEqual(rows.map(r => [r.offer_id, r.ad_archive_id]), [[ids[0], '12345'], [ids[1], '2']]);
});

test('a creative reused by a new page links to one confidently matched offer', () => {
  const products = selectProducts({ offers: [offer(0, 'Acme - Omega'), offer(1, 'Acme - Sleep')] });
  const video_url = 'https://video.fbcdn.net/unique_creative_12345.mp4';
  const { rows } = buildProductRanking({ products, ads: [ad('1', { ad_text: 'Acme Omega', video_url }), ad('2', { page_id: '88', video_url })] });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].offer_id, ids[0]);
  assert.deepEqual(rows[0].ad_ids, ['1', '2']);
});

test('normalization retains headline evidence and exposes bounded snapshot windows, never historical counts', () => {
  const normalized = normalizeAd({ adArchiveId: '12', snapshot: { title: 'A better way to support your nightly sleep' } });
  assert.equal(normalized.headline, 'A better way to support your nightly sleep');
  const projected = publicAd({ ...ad('12', { days_active: 20 }), score: 1, media: {} });
  assert.deepEqual(projected.window_metrics, {
    '7d': { active_days: 7, started_within: false, basis: 'current_active_snapshot' },
    '14d': { active_days: 14, started_within: false, basis: 'current_active_snapshot' },
    '30d': { active_days: 20, started_within: true, basis: 'current_active_snapshot' },
  });
  assert.equal(publicAd({ ...ad('13'), started_at: null, score: 1, media: {} }).window_metrics['7d'].active_days, null);
});

test('a generic product word on an unrelated brand never supplies identity by itself', () => {
  const products = selectProducts({ offers: [offer(0, 'Acme - Sleep')] });
  const { rows } = buildProductRanking({ products, ads: [ad('1', { ad_text: 'Get better sleep tonight with a different brand', landing_url: 'https://unrelated.example' })] });
  assert.equal(rows.length, 0);
});

test('new libraries retain only pages with resolved product evidence, without altering collection sources', async () => {
  const { discoveredProductPages } = await import('../lib/offer-intel-weekly.mjs');
  const products = selectProducts({ offers: [offer(0, 'Acme - Omega', { bibliotecas: [{ link: page('99') }] }), offer(1, 'Acme - Sleep', { bibliotecas: [{ link: page('99') }] })] });
  const original = JSON.stringify(products);
  const pages = discoveredProductPages({ products, ads: [ad('1', { page_id: '123', ad_text: 'Acme Omega' }), ad('2', { page_id: '456', ad_text: 'Try something unrelated' }), ad('3', { page_id: '99', ad_text: 'Acme Sleep' })], observedAt: '2026-11-11T01:00:00Z' });
  assert.deepEqual(pages[ids[0]].map(p => [p.key, p.confirmed, p.observed_at]), [['page:123', true, '2026-11-11T01:00:00Z']]);
  assert.equal(pages[ids[1]].length, 0);
  assert.equal(JSON.stringify(products), original);
});

test('ambiguous catalog creative IDs do not inherit a different ad copy assignment', () => {
  const video_url = 'https://video.fbcdn.net/unique_creative_12345.mp4';
  const products = selectProducts({ offers: [0, 1].map(i => offer(i, i ? 'Acme - Sleep' : 'Acme - Omega', { brandTopAds: [{ link: 'https://www.facebook.com/ads/library/?id=2' }] })) });
  const { rows } = buildProductRanking({ products, ads: [ad('1', { ad_text: 'Acme Omega', video_url }), ad('2', { video_url })] });
  assert.deepEqual(rows.flatMap(r => r.ad_ids), ['1']);
});

test('products without a saved library receive first-pass coverage before another product consumes many pages', () => {
  const products = selectProducts({ offers: [offer(0, 'Acme - Omega', { bibliotecas: [{ link: page('1') }, { link: page('2') }, { link: page('3') }] }), offer(1, 'Acme - Sleep')] });
  const chosen = planCollection(products, { usdCap: 0.12 }).batches.flatMap(b => b.sources);
  assert.ok(chosen.some(s => s.key === 'page:1'));
  assert.ok(chosen.some(s => s.query === 'acme sleep'));
  assert.equal(chosen.length, 2);
});

test('collection reduces sample size to cover 120 sources while preserving the absolute budget', () => {
  const sources = Array.from({ length: 120 }, (_, n) => ({ key: `page:${n + 1}`, kind: 'page', url: page(n + 1) }));
  const plan = planCollection([{ offer_id: ids[0], sources }]);
  assert.equal(plan.skipped.length, 0);
  assert.equal(plan.batches.flatMap(b => b.sources).length, 120);
  assert.ok(plan.batches.every(b => b.ads_per_source === 20 && b.max_items === b.sources.length * 20));
  assert.ok(plan.usd_planned <= 15);
  const capped = planCollection([{ offer_id: ids[0], sources: Array.from({ length: 300 }, (_, n) => ({ key: `page:${n + 1}`, url: page(n + 1) })) }]);
  assert.equal(capped.skipped.length, 50);
  assert.ok(capped.batches.every(b => b.ads_per_source === 10));
  assert.ok(capped.usd_planned <= 15);
});

test('recovery with US$ 9.60 already reserved covers all 41 offers before extra sources without reusing spent budget', () => {
  const products = Array.from({ length: 41 }, (_, n) => ({ offer_id: `offer-${n}`, sources: Array.from({ length: 4 }, (_, j) => ({ key: `page:${n * 4 + j + 1}`, kind: 'page', url: page(n * 4 + j + 1) })) }));
  const plan = planCollection(products, { spentUsd: 9.60 });
  const chosen = new Set(plan.batches.flatMap(b => b.sources.map(s => s.key)));
  assert.ok(products.every(p => p.sources.some(s => chosen.has(s.key))));
  assert.equal(chosen.size, 90);
  assert.equal(plan.skipped.length, 74);
  assert.ok(plan.usd_planned + 9.60 <= 15);
  assert.ok(plan.batches.every(b => b.ads_per_source === 10));
});

test('one distinctive known headline seeds discovery without inventing a generic ad title', () => {
  const products = selectProducts({ offers: [offer(0, 'Acme - Omega', { brandTopAds: [
    { headline: 'A better way to support your nightly sleep' },
    { headline: 'Another distinctive headline that should remain matching evidence' },
    { nome: 'Anúncio 1' },
  ] }), offer(1, 'Acme - Sleep', { brandTopAds: [{ headline: 'Buy now' }, { nome: 'Anúncio 2' }] })] });
  const queries = products[0].sources.filter(s => s.generated).map(s => s.query);
  assert.ok(queries.includes('a better way to support your nightly sleep'));
  assert.ok(!queries.includes('another distinctive headline that should remain matching evidence'));
  assert.ok(products[1].sources.every(s => !['buy now', 'anuncio 2'].includes(s.query)));
});

test('old shared-page duplicate assignments cannot override unambiguous current product evidence', () => {
  const products = selectProducts({ offers: ['Omega', 'Sleep'].map((name, i) => offer(i, `Acme - ${name}`, { bibliotecas: [{ link: page('99') }], dominios: [{ linkDominio: `https://acme.example/${name.toLowerCase()}` }] })) });
  const current = ad('123', { ad_text: 'Acme Omega', landing_url: 'https://acme.example/omega' });
  const duplicateHistory = ids.map(offer_id => ({ offer_id, ad_archive_id: '123', ad_ids: ['123'], match_keys: [], rank: 1 }));
  for (const input of [{previousRows: duplicateHistory}, {existingRows: duplicateHistory}]) {
    const { rows } = buildProductRanking({ products, ads: [current], ...input });
    assert.deepEqual(rows.map(r => [r.offer_id, r.ad_archive_id]), [[ids[0], '123']]);
  }
});

test('new catalog domain, product path and known headline override an exclusive legacy page assignment', () => {
  const headline = 'A better way to support your nightly sleep';
  const cases = [
    { names:['Omega','Sleep'], domains:['omega.example','sleep.example'], landing:'https://sleep.example/', headline:'' },
    { names:['Omega','Sleep'], domains:['acme.example/omega','acme.example/sleep'], landing:'https://acme.example/sleep', headline:'' },
    { names:['Omega','Sleep'], domains:['acme.example/','acme.example/'], landing:'https://other.example/', headline },
  ];
  for (const c of cases) {
    const products = selectProducts({ offers:c.names.map((name,i)=>offer(i,`Acme - ${name}`,{
      bibliotecas:[{link:page('99')}],dominios:[{linkDominio:'https://'+c.domains[i]}],...(i?{brandTopAds:[{headline}]}:{})
    })) });
    const legacy = [{offer_id:ids[0],ad_archive_id:'123',ad_ids:['123'],match_keys:[],rank:1}];
    for (const input of [{existingRows:legacy},{previousRows:legacy}]) {
      const {rows}=buildProductRanking({products,ads:[ad('123',{landing_url:c.landing,headline:c.headline})],...input});
      assert.deepEqual(rows.map(r=>r.offer_id),[ids[1]],c.landing+' '+c.headline);
    }
  }
});

test('exclusive history remains a fallback for shared pages, while explicit ambiguous catalog IDs remain rejected', () => {
  const legacy=[{offer_id:ids[0],ad_archive_id:'123',ad_ids:['123'],match_keys:[],rank:1}];
  const offers=['Omega','Sleep'].map((name,i)=>offer(i,`Acme - ${name}`,{bibliotecas:[{link:page('99')}]}));
  assert.deepEqual(buildProductRanking({products:selectProducts({offers}),ads:[ad('123')],existingRows:legacy}).rows.map(r=>r.offer_id),[ids[0]]);
  for(const offer of offers) offer.data.brandTopAds=[{link:'https://www.facebook.com/ads/library/?id=123'}];
  assert.deepEqual(buildProductRanking({products:selectProducts({offers}),ads:[ad('123',{ad_text:'Acme Sleep',landing_url:'https://sleep.example/'})],existingRows:legacy}).rows,[]);
});
