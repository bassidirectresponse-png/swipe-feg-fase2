import { SUPABASE_URL } from "./_security.mjs";
import { supabaseAdminHeaders } from "./_supabase-admin.mjs";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const imageHeaders = { "Cache-Control": "public, max-age=86400, s-maxage=604800", "X-Content-Type-Options": "nosniff" };
const allowedImageHost = host => /(?:^|\.)(?:tiktokcdn\.com|tiktokcdn-us\.com|tiktokcdn-eu\.com|muscdn\.com)$/.test(host);

async function getImage(url) {
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; SwipeFEG/1.0)" }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) return null;
  const type = String(response.headers.get("content-type") || "").split(";")[0].toLowerCase();
  if (!["image/jpeg", "image/png", "image/webp"].includes(type) || Number(response.headers.get("content-length") || 0) > MAX_IMAGE_BYTES) return null;
  const bytes = await response.arrayBuffer();
  return bytes.byteLength > 0 && bytes.byteLength <= MAX_IMAGE_BYTES ? { bytes, type } : null;
}

export default async function handler(request) {
  if (request.method !== "GET") return new Response(null, { status: 405 });
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[0-9]{10,25}$/.test(id)) return new Response(null, { status: 400 });
  try {
    const headers = await supabaseAdminHeaders();
    const filter = new URLSearchParams({ select: "id,data", "data->>kind": "eq.tiktok", "data->>videoId": `eq.${id}`, limit: "1" });
    const offerResponse = await fetch(`${SUPABASE_URL}/rest/v1/offers?${filter}`, { headers, signal: AbortSignal.timeout(8_000) });
    if (!offerResponse.ok) throw new Error(`offer HTTP ${offerResponse.status}`);
    const offer = (await offerResponse.json())[0];
    if (!offer || !/^https:\/\/(?:www\.)?tiktok\.com\//.test(String(offer.data?.url || ""))) return new Response(null, { status: 404 });

    const storageUrl = `${SUPABASE_URL}/storage/v1/object/public/criativos/tiktok/${id}.jpg`;
    const stored = await getImage(storageUrl).catch(() => null);
    if (stored) return new Response(stored.bytes, { status: 200, headers: { ...imageHeaders, "Content-Type": stored.type } });

    const videoUrl = new URL(offer.data.url);
    if (!videoUrl.pathname.includes(`/video/${id}`)) return new Response(null, { status: 404 });
    const oembed = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl.href)}`, { signal: AbortSignal.timeout(10_000) });
    if (!oembed.ok) return new Response(null, { status: 404 });
    const thumbnail = new URL(String((await oembed.json()).thumbnail_url || ""));
    if (thumbnail.protocol !== "https:" || !allowedImageHost(thumbnail.hostname)) return new Response(null, { status: 502 });
    const image = await getImage(thumbnail.href);
    if (!image) return new Response(null, { status: 404 });

    const upload = await fetch(`${SUPABASE_URL}/storage/v1/object/criativos/tiktok/${id}.jpg`, {
      method: "POST", headers: { ...headers, "Content-Type": image.type, "x-upsert": "true" },
      body: image.bytes, signal: AbortSignal.timeout(10_000),
    }).catch(() => null);
    if (upload?.ok) {
      // O próximo carregamento vai direto à cópia persistente, sem depender da CDN.
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/swipe_merge_offer_data`, {
        method: "POST", headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ p_id: offer.id, p_patch: { thumb: storageUrl } }),
        signal: AbortSignal.timeout(8_000),
      }).catch(() => null);
    }
    return new Response(image.bytes, { status: 200, headers: { ...imageHeaders, "Content-Type": image.type } });
  } catch (error) {
    console.error("tiktok-cover", String(error?.message || error).slice(0, 160));
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
