const MEDIA_HOSTS = ["fbcdn.net", "fbsbx.com", "facebook.com"];

export function isMetaMediaUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      && MEDIA_HOSTS.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch { return false; }
}

function mediaFromNode(node) {
  if (!node || typeof node !== "object") return null;
  const video = node.videoHdUrl || node.videoSdUrl || node.watermarkedVideoHdUrl || node.watermarkedVideoSdUrl;
  if (isMetaMediaUrl(video)) return { type: "video", sourceUrl: video, quality: node.videoHdUrl === video ? "hd" : "sd" };
  const image = node.originalImageUrl || node.resizedImageUrl || node.watermarkedResizedImageUrl;
  if (isMetaMediaUrl(image)) return { type: "image", sourceUrl: image, quality: node.originalImageUrl === image ? "original" : "resized" };
  return null;
}

export function planMetaAds(items, pageId, maxAds = 50) {
  const seen = new Set(), planned = [];
  for (const row of Array.isArray(items) ? items : []) {
    const id = String(row?.adArchiveId || row?.adArchiveID || "");
    const owner = String(row?.pageId || row?.pageID || row?.snapshot?.pageId || "");
    if (!/^\d+$/.test(id) || owner !== String(pageId) || seen.has(id)) continue;
    seen.add(id);
    const snapshot = row.snapshot || {};
    const nodes = [...(snapshot.cards || []), ...(snapshot.videos || []), ...(snapshot.images || []), ...(snapshot.extraVideos || []), ...(snapshot.extraImages || [])];
    const media = [], urls = new Set();
    for (const node of nodes) {
      const asset = mediaFromNode(node);
      if (!asset || urls.has(asset.sourceUrl)) continue;
      urls.add(asset.sourceUrl);
      media.push(asset);
      if (media.length >= 12) break;
    }
    planned.push({
      adArchiveId: id, pageId: owner,
      link: `https://www.facebook.com/ads/library/?id=${id}`,
      title: String(snapshot.title || snapshot.pageName || `Anúncio ${id}`).slice(0, 160),
      copy: String(typeof snapshot.body === "string" ? snapshot.body : snapshot.body?.text || "").slice(0, 4000),
      isActiveAtCapture: row.isActive === true,
      startDate: String(row.startDateFormatted || ""),
      media,
    });
    if (planned.length >= maxAds) break;
  }
  return planned;
}

export function detectMedia(buffer) {
  if (buffer.length > 12 && buffer.toString("ascii", 4, 8) === "ftyp") return { type: "video", ext: "mp4", contentType: "video/mp4" };
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { type: "image", ext: "jpg", contentType: "image/jpeg" };
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { type: "image", ext: "png", contentType: "image/png" };
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return { type: "image", ext: "webp", contentType: "image/webp" };
  throw new Error("arquivo retornado não é vídeo ou imagem original suportada");
}
