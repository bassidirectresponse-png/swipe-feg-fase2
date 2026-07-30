import { boundedBuffer, safeRemoteFetch } from "./_security.mjs";

const FACEBOOK_PAGE_HOSTS = ["facebook.com", "fb.com", "fb.me", "fb.watch"];
const FACEBOOK_MEDIA_HOSTS = ["facebook.com", "fbcdn.net", "fbsbx.com", "akamaihd.net"];
const MAX_HTML_BYTES = 5 * 1024 * 1024;
const DESKTOP_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

function isAllowedHost(value, suffixes) {
  try {
    const url = new URL(String(value || ""));
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    return url.protocol === "https:" && !url.username && !url.password
      && suffixes.some(suffix => host === suffix || host.endsWith(`.${suffix}`));
  } catch {
    return false;
  }
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&#0*38;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#0*34;/gi, "\"")
    .replace(/&#x2f;/gi, "/")
    .replace(/&#0*47;/gi, "/");
}

export function decodeFacebookUrl(value) {
  let decoded = decodeHtmlEntities(value)
    .replace(/\\\//g, "/")
    .replace(/\\u([0-9a-f]{4})/gi, (_match, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\x([0-9a-f]{2})/gi, (_match, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
  decoded = decodeHtmlEntities(decoded).replace(/\\+$/g, "");
  try {
    const url = new URL(decoded);
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function mediaCandidates(html, extensionPattern, metaPattern) {
  const escaped = /https?:[^"'<>{}\s]+/gi;
  const meta = new RegExp(`<meta[^>]+(?:property|name)=["'](?:${metaPattern})["'][^>]+content=["']([^"']+)["']`, "gi");
  const candidates = [];
  for (const match of String(html || "").matchAll(meta)) candidates.push(match[1]);
  for (const match of String(html || "").matchAll(escaped)) candidates.push(match[0]);
  const extension = new RegExp(`\\.(?:${extensionPattern})$`, "i");
  return [...new Set(candidates
    .map(decodeFacebookUrl)
    .filter(value => {
      if (!value) return false;
      try { return extension.test(new URL(value).pathname); } catch { return false; }
    }))];
}

export function extractFacebookMediaFromHtml(html) {
  const videos = mediaCandidates(html, "mp4|mov|m4v", "og:video(?::secure_url)?|twitter:player:stream")
    .filter(url => isAllowedHost(url, FACEBOOK_MEDIA_HOSTS));
  if (videos.length) return { mediaUrl: videos[0], type: "video" };

  const images = mediaCandidates(html, "jpe?g|png|webp", "og:image|twitter:image")
    .filter(url => isAllowedHost(url, FACEBOOK_MEDIA_HOSTS))
    .sort((a, b) => {
      const score = value => (/scontent|external/i.test(value) ? 2 : 0) + (/static/i.test(value) ? -3 : 0);
      return score(b) - score(a);
    });
  if (images.length) return { mediaUrl: images[0], type: "image" };
  return null;
}

async function fetchFacebookHtml(url) {
  const response = await safeRemoteFetch(url, {
    allowedHostSuffixes: FACEBOOK_PAGE_HOSTS,
    maxRedirects: 4,
    timeoutMs: 25_000,
    headers: {
      "User-Agent": DESKTOP_UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!response.ok) throw new Error(`página pública indisponível (HTTP ${response.status})`);
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (contentType && !contentType.includes("text/html")) throw new Error("resposta pública inválida");
  return (await boundedBuffer(response, MAX_HTML_BYTES)).toString("utf8");
}

async function resolvePublicUrl(value) {
  if (!isAllowedHost(value, FACEBOOK_PAGE_HOSTS)) throw new Error("link do Facebook inválido");
  const original = new URL(value);
  if (!["fb.me", "fb.watch"].includes(original.hostname.toLowerCase())) return original.toString();
  const response = await safeRemoteFetch(original, {
    allowedHostSuffixes: FACEBOOK_PAGE_HOSTS,
    maxRedirects: 4,
    timeoutMs: 15_000,
    method: "HEAD",
    headers: { "User-Agent": DESKTOP_UA },
  });
  return response.url && isAllowedHost(response.url, FACEBOOK_PAGE_HOSTS) ? response.url : original.toString();
}

function publicPlayerUrls(url) {
  const encoded = encodeURIComponent(url);
  const parsed = new URL(url);
  const looksLikeVideo = /\/(?:reel|videos?)\//i.test(parsed.pathname);
  const candidates = [];
  if (looksLikeVideo || /\/posts?\//i.test(parsed.pathname)) {
    candidates.push(`https://www.facebook.com/plugins/video.php?href=${encoded}&show_text=false`);
  }
  candidates.push(`https://www.facebook.com/plugins/post.php?href=${encoded}&show_text=false`);
  candidates.push(url);
  return [...new Set(candidates)];
}

export async function extractFacebookPublicMedia(adUrl) {
  const resolved = await resolvePublicUrl(adUrl);
  const failures = [];
  for (const candidate of publicPlayerUrls(resolved)) {
    try {
      const media = extractFacebookMediaFromHtml(await fetchFacebookHtml(candidate));
      if (media) return { ...media, source: candidate.includes("/plugins/") ? "facebook-player" : "facebook-public-page" };
      failures.push("sem mídia");
    } catch (error) {
      failures.push(String(error?.message || error));
    }
  }
  const unavailable = new Error("o Facebook não disponibilizou a mídia publicamente; o link foi preservado para nova tentativa");
  unavailable.code = "FACEBOOK_MEDIA_UNAVAILABLE";
  unavailable.details = failures.slice(0, 3);
  throw unavailable;
}
