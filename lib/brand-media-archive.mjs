import { createHash } from 'node:crypto';
import { BRAND_CREATIVE_GENERATION } from './brand-creative-policy.mjs';

export const STORAGE_ORIGIN = 'https://pkvzwtstidtobpdngxnd.supabase.co';
export function ownedMedia(value) {
  try { const u = new URL(value); return u.origin === STORAGE_ORIGIN && u.pathname.startsWith('/storage/v1/object/public/criativos/') && !u.username && !u.password; }
  catch { return false; }
}
export function hasInsiderData(d = {}) {
  return d.bmAccess === true || (d.bmReports || []).some(r => r && Object.keys(r).length > 0)
    || (d.bmPrints || []).some(r => r?.img)
    || ['bmSpend7d', 'bmSpend14d', 'bmSpend30d'].some(k => String(d[k] || '').trim());
}
export function adKey(value) {
  try {
    const u = new URL(String(value || '').trim());
    if (u.protocol !== 'https:' || u.username || u.password) return '';
    const host = u.hostname.toLowerCase();
    if (host === 'fb.me' && /^\/adspreview\/facebook\/[a-z0-9]+\/?$/i.test(u.pathname)) return 'preview:' + u.pathname.split('/').filter(Boolean).at(-1);
    if (host === 'facebook.com' || host.endsWith('.facebook.com')) {
      if (u.pathname.startsWith('/ads/library') && /^\d+$/.test(u.searchParams.get('id') || '')) return 'ad:' + u.searchParams.get('id');
      if (u.pathname.startsWith('/ads/experience/') && u.searchParams.get('encrypted_experience_id')) return 'experience:' + u.searchParams.get('encrypted_experience_id');
      return 'facebook:' + u.pathname.replace(/\/$/, '') + (u.searchParams.get('v') ? '?v=' + u.searchParams.get('v') : '');
    }
    return ownedMedia(value) ? 'media:' + u.href : '';
  } catch { return ''; }
}
export function stableCreativeId(offerId, key) {
  const hash = createHash('sha256').update(`brand-media-v1:${offerId}:${key}`).digest('hex');
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-5${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
}
export function mediaOf(d = {}) {
  const items = [...(Array.isArray(d.archivedMedia) ? d.archivedMedia : []), ...(Array.isArray(d.media) ? d.media : []),
    ...(d.video ? [{ type: 'video', url: d.video }] : []), ...(d.print || d.img ? [{ type: 'image', url: d.print || d.img }] : [])];
  const seen = new Set();
  return items.filter(x => x && ['video','image'].includes(x.type) && ownedMedia(x.url) && !seen.has(x.url) && seen.add(x.url));
}
export function references(d = {}) {
  const map = new Map();
  for (const item of [...(d.brandTopAds || []), ...(d.criativos || []), ...(d.brandArchivedAds || [])]) {
    const key = adKey(item?.link) || (mediaOf(item)[0] ? 'media:' + mediaOf(item)[0].url : '');
    if (!key) continue;
    const old = map.get(key) || {};
    map.set(key, {...old, ...item, media: mediaOf({media:[...mediaOf(old), ...mediaOf(item)]})});
  }
  return [...map].map(([key,item]) => ({...item,key}));
}
export function brandCreativeFields(offer) {
  const d = offer.data;
  return {kind:'criativo',division:'fegbrands',brandCreativeGeneration:BRAND_CREATIVE_GENERATION,
    sourceOfferId:offer.id,sourceOfferName:d.nomeOferta || d.nomeMarca || '',
    marca:d.nomeMarca || d.nomeOferta || '',collectionLabel:d.nomeMarca || d.nomeOferta || '',
    nicho:d.nicho || '',subnicho:d.subnicho || '',brandCategory:d.brandCategory || '',offerTags:d.offerTags || [],plataforma:'meta'};
}
// Only an exact source reference or an identical stored asset can join two records.
// Names, list positions and merely belonging to the same brand are not ad identity.
export function matchCreative(rows, offerId, reference) {
  const media = new Set(mediaOf(reference).map(x => x.url));
  return rows.filter(r => r.data?.sourceOfferId === offerId).sort((a,b) =>
    Number(b.data.brandCreativeGeneration === BRAND_CREATIVE_GENERATION) - Number(a.data.brandCreativeGeneration === BRAND_CREATIVE_GENERATION))
    .find(r => (adKey(r.data.linkAnuncio) && adKey(r.data.linkAnuncio) === reference.key) || mediaOf(r.data).some(x => media.has(x.url)));
}
