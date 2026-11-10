import { mediaKey, mediaUrl } from './offer-intel-weekly.mjs';

export const WEEKLY_MEDIA_LIMITS = Object.freeze({ thumb: 8 * 1024 * 1024, video: 150 * 1024 * 1024 });
export const RECOVERY_CACHE_DAYS = 30;
const unique = values => [...new Set(values.filter(Boolean))];
export function recoveryBlobKey(value) {
  const match = typeof value === 'string' && /^swipe-recovery:\/\/media\/(\d{1,40})\/([a-f0-9]{64})\.mp4$/.exec(value);
  return match ? 'media/' + match[1] + '/' + match[2] + '.mp4' : null;
}
export function recoveredMediaUrl(value) {
  if (recoveryBlobKey(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'medias.trendtrack.io' && !url.username && !url.password &&
      /^\/facebook\/(?:video\/[a-f0-9]{64}\.mp4|(?:image|thumbnails)\/[a-f0-9]{64}\.(?:jpg|png|webp))$/.test(url.pathname) ? url.href : null;
  } catch { return null; }
}
export function recoveredMediaRow(record, adId) {
  if (!['trendtrack', 'meta-archive'].includes(record?.provider) || record.ad_archive_id !== adId || !/^\d{1,40}$/.test(adId)) return null;
  const thumb = recoveredMediaUrl(record.thumb_url), video = recoveredMediaUrl(record.video_url);
  if (recoveryBlobKey(video) && !recoveryBlobKey(video).startsWith('media/' + adId + '/')) return null;
  return thumb || video ? { ad_archive_id: adId, media: { source_thumb_urls: thumb ? [thumb] : [], source_video_urls: video ? [video] : [] } } : null;
}
export function mediaCandidates(media, kind) {
  return unique([...(media?.['source_' + kind + '_urls'] || []), media?.['source_' + kind + '_url']].map(value => mediaUrl(value) || recoveredMediaUrl(value)).filter(Boolean));
}
export function needsVideo(row) {
  if (row.display_format === 'image') return false;
  return row.display_format === 'video' || !!row.media?.video_error || !!row.media?.video_url || mediaCandidates(row.media, 'video').length > 0;
}
export function mediaComplete(row) {
  return !!row.media?.thumb_url && (!needsVideo(row) || !!row.media?.video_url) && !row.media?.error && !row.media?.thumb_error && !row.media?.video_error;
}

/** Reuse exact ad IDs or a matching media asset, never copy text alone. */
export function sameMedia(row, other, kind) {
  if (row.ad_archive_id === other.ad_archive_id) return true;
  const keys = new Set(mediaCandidates(row.media, kind).map(mediaKey).filter(Boolean));
  return mediaCandidates(other.media, kind).some(url => keys.has(mediaKey(url)));
}

/** Keep successful parts, verify stored objects, and retry only missing assets. No provider scrape here. */
export async function repairMedia({ row, reusable = [], archive, date, generation, now }) {
  const media = { ...row.media, archive_attempt: generation, verification_error: false };
  const requiredVideo = row.display_format !== 'image' && (needsVideo(row) || reusable.some(other => other.ad_archive_id === row.ad_archive_id && needsVideo(other)));
  for (const kind of ['thumb', ...(requiredVideo ? ['video'] : [])]) {
    const field = kind + '_url';
    const donors = [row, ...reusable.filter(other => sameMedia(row, other, kind))];
    let saved = null;
    for (const donor of donors) {
      const candidate = donor.media?.[field];
      if (!candidate || !donor.media?.archived) continue;
      if (archive.verify) {
        const verified = await archive.verify(candidate).catch(() => null);
        if (verified === false) continue;
        // A temporary HEAD failure is not proof that an already archived object disappeared.
        if (verified !== true) media.verification_error = true;
      }
      saved = { url: candidate, width: donor.media.thumb_width, height: donor.media.thumb_height };
      break;
    }
    if (!saved) {
      const candidates = unique(donors.flatMap(donor => mediaCandidates(donor.media, kind))).sort((a, b) => Number(!!recoveredMediaUrl(b)) - Number(!!recoveredMediaUrl(a)));
      media['source_' + kind + '_urls'] = candidates;
      for (const url of candidates) {
        try { saved = await archive({ date, offer_id: row.offer_id, ad_archive_id: row.ad_archive_id, kind, url }); break; }
        catch (error) { if (error?.code === 'conflict') throw error; }
      }
    }
    media[field] = saved?.url || null;
    media[kind + '_error'] = !saved?.url;
    if (kind === 'thumb' && saved?.width && saved?.height) {
      media.thumb_width = saved.width; media.thumb_height = saved.height;
    }
  }
  if (!requiredVideo) { media.video_error = false; media.video_url = null; }
  media.error = !!media.thumb_error || !!media.video_error || media.verification_error;
  media.archived = !!(media.thumb_url || media.video_url);
  media.archived_at = now;
  return media;
}
