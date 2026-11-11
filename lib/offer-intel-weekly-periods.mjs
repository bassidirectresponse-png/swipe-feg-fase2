import { buildProductRanking } from './offer-intel-weekly.mjs';

const day = 86400000;
const key = row => row.offer_id + ':' + row.ad_archive_id;
/** Select from the complete collected pool, not the already truncated general Top 10.
 * Windows are cumulative and anchored to the folder date. Repetition is snapshot evidence.
 */
export function buildPeriodRanking({ ads, products, existingRows = [], reviewDate }) {
  const end = Date.parse(reviewDate + 'T23:59:59.999-03:00');
  const pool = buildProductRanking({ ads, products, existingRows, top: Number.MAX_SAFE_INTEGER }).rows;
  const selected = new Map();
  for (const product of products) {
    const own = pool.filter(r => r.offer_id === product.offer_id);
    for (const days of [7, 14, 30]) {
      const start = end + 1 - days * day;
      const observed = own.filter(r => Date.parse(r.media?.observed_at) >= start && Date.parse(r.media?.observed_at) <= end);
      for (const mode of ['new', 'lasting']) {
        const candidates = observed.filter(r => Number.isFinite(Date.parse(r.started_at)) && Date.parse(r.started_at) <= end &&
          (mode !== 'new' || Date.parse(r.started_at) >= start));
        candidates.sort((a, b) => mode === 'new'
          ? b.repetitions - a.repetitions || Date.parse(b.started_at) - Date.parse(a.started_at) || a.ad_archive_id.localeCompare(b.ad_archive_id)
          : Math.min(b.days_active, days) - Math.min(a.days_active, days) || b.repetitions - a.repetitions || b.days_active - a.days_active || a.ad_archive_id.localeCompare(b.ad_archive_id));
        candidates.slice(0, 10).forEach((row, i) => {
          const k = key(row), saved = selected.get(k) || { ...row, period_ranks: {} };
          saved.period_ranks[mode + '_' + days] = i + 1;
          selected.set(k, saved);
        });
      }
    }
  }
  return [...selected.values()];
}

/** Supplemental rankings live beside the paid dataset cache. The SQL general ranking
 * retains its ten-row constraint. All readers and the existing media/analysis worker see
 * the same merged rows. Writes are serialized and check the existing database lease.
 */
export function withPeriodStorage(base, store) {
  const snapshots = new Map();
  let writes = Promise.resolve();
  const read = id => {
    if (!snapshots.has(id)) snapshots.set(id, store.get('periods/' + id + '.json', { type: 'json' }).then(v => v || { rows: [], ranks: {} }));
    return snapshots.get(id);
  };
  const write = (fence, fn) => {
    const result = writes.then(async () => {
      await base.checkpoint({ report_id: fence.report_id, lease_token: fence.lease_token, patch: {} });
      const state = structuredClone(await read(fence.report_id));
      const out = fn(state);
      await store.setJSON('periods/' + fence.report_id + '.json', state);
      snapshots.set(fence.report_id, Promise.resolve(state));
      return out;
    });
    writes = result.catch(() => {});
    return result;
  };
  return { ...base,
    async listAds(id) {
      const [rows, extra] = await Promise.all([base.listAds(id), read(id)]);
      const keys = new Set(rows.map(key));
      return [...rows.map(r => ({ ...r, general_rank: r.rank, period_ranks: extra.ranks[key(r)] || {}, periods_indexed: !!extra.indexed })),
        ...extra.rows.filter(r => !keys.has(key(r))).map(r => ({ ...r, periods_indexed: !!extra.indexed }))];
    },
    async saveAd(input) {
      if (!String(input.id).startsWith('period:')) return base.saveAd(input);
      return write(input, state => {
        const row = state.rows.find(r => r.id === input.id);
        if (!row) throw new Error('Criativo complementar não encontrado.');
        Object.assign(row, input.patch);
        return row;
      });
    },
    async savePeriodRanking(input) {
      const general = await base.listAds(input.report_id), keys = new Set(general.map(key));
      return write(input, state => {
        state.indexed = true;
        state.ranks = Object.fromEntries(input.rows.map(r => [key(r), r.period_ranks || {}]));
        const historical = state.rows.filter(r => r.historical);
        state.rows = input.rows.filter(r => !keys.has(key(r))).map(r => ({ ...r, id: 'period:' + key(r), general_rank: null }));
        for (const row of [...historical, ...(input.historical || [])]) {
          if (!keys.has(key(row)) && !state.rows.some(r => key(r) === key(row))) state.rows.push({ ...row, id: 'period:' + key(row), general_rank: null, historical: true, period_ranks: {} });
        }
      });
    },
  };
}
