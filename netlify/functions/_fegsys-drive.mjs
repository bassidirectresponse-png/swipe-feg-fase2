import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";
import { googleAccessToken, readCredential } from "./_fegsys-bigquery.mjs";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const STORE_NAME = "fegsys-drive";
const INDEX_KEY = "files-v1";
const INDEX_MAX_AGE_MS = 65 * 60 * 1000;
const COPY_MAX_BYTES = 2 * 1024 * 1024;
const VIDEO_RE = /^video\//i;
const GOOGLE_DOC = "application/vnd.google-apps.document";
const COPY_MIMES = new Set([
  GOOGLE_DOC,
  "text/plain",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

export function normalizeDriveName(value) {
  return String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\.(mp4|mov|m4v|webm|avi|mkv|docx?|pdf|txt)$/i, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function copyCore(value) {
  const wrappers = new Set(["copy", "roteiro", "script", "documento", "doc", "texto", "creative", "criativo"]);
  const tokens = normalizeDriveName(value).split(" ").filter(Boolean);
  while (tokens.length && wrappers.has(tokens[0])) tokens.shift();
  while (tokens.length && wrappers.has(tokens[tokens.length - 1])) tokens.pop();
  return tokens.join(" ");
}

function byNewest(a, b) {
  return String(b.modifiedTime || "").localeCompare(String(a.modifiedTime || "")) || String(a.name || "").localeCompare(String(b.name || ""));
}

export function matchDriveFiles(creativeName, files = []) {
  const key = normalizeDriveName(creativeName);
  if (!key) return { status: "not_found", video: null, copy: null, videoCandidates: 0, copyCandidates: 0 };
  const videoMatches = files.filter(file => VIDEO_RE.test(file.mimeType || "") && normalizeDriveName(file.name) === key).sort(byNewest);
  const copyMatches = files.filter(file => COPY_MIMES.has(file.mimeType || "") && (normalizeDriveName(file.name) === key || copyCore(file.name) === key)).sort(byNewest);
  const video = videoMatches[0] || null, copy = copyMatches[0] || null;
  return {
    status: video && copy ? "complete" : video ? "video_only" : copy ? "copy_only" : "not_found",
    video,
    copy,
    videoCandidates: videoMatches.length,
    copyCandidates: copyMatches.length
  };
}

async function driveToken() {
  const credential = readCredential();
  if (!credential) throw new Error("credencial Google não configurada");
  return { credential, token: await googleAccessToken(credential, [DRIVE_SCOPE]) };
}

async function listDriveFiles() {
  const { token } = await driveToken();
  const files = [];
  let pageToken = "";
  do {
    const url = new URL("https://www.googleapis.com/drive/v3/files");
    url.searchParams.set("q", "trashed = false and (mimeType contains 'video/' or mimeType = 'application/vnd.google-apps.document' or mimeType = 'text/plain' or mimeType = 'application/pdf' or mimeType = 'application/msword' or mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')");
    url.searchParams.set("spaces", "drive");
    url.searchParams.set("corpora", "allDrives");
    url.searchParams.set("includeItemsFromAllDrives", "true");
    url.searchParams.set("supportsAllDrives", "true");
    url.searchParams.set("pageSize", "1000");
    url.searchParams.set("fields", "nextPageToken,incompleteSearch,files(id,name,mimeType,size,modifiedTime,webViewLink,thumbnailLink,hasThumbnail,md5Checksum,driveId,parents)");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Drive recusou a listagem (${response.status})`);
    files.push(...(result.files || []));
    pageToken = String(result.nextPageToken || "");
  } while (pageToken);
  return { syncedAt: new Date().toISOString(), files };
}

export async function getDriveIndex({ refresh = false } = {}) {
  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  const cached = await store.get(INDEX_KEY, { type: "json" }).catch(() => null);
  const stale = !cached || !cached.syncedAt || Date.now() - Date.parse(cached.syncedAt) > INDEX_MAX_AGE_MS;
  if (!refresh && !stale) return cached;
  const index = await listDriveFiles();
  await store.setJSON(INDEX_KEY, index);
  return index;
}

function mediaSecret(credential) {
  return createHash("sha256").update(credential.private_key).update("fegsys-drive-media-v1").digest();
}

function mediaPayload(fileId, expiresAt) { return `${fileId}.${expiresAt}`; }

export function signDriveMedia(fileId, { ttlSeconds = 15 * 60 } = {}) {
  const credential = readCredential();
  if (!credential) throw new Error("credencial Google não configurada");
  const expiresAt = Math.floor(Date.now() / 1000) + Math.max(60, Math.min(3600, ttlSeconds));
  const sig = createHmac("sha256", mediaSecret(credential)).update(mediaPayload(fileId, expiresAt)).digest("base64url");
  return `/.netlify/functions/fegsys-drive-media?id=${encodeURIComponent(fileId)}&exp=${expiresAt}&sig=${encodeURIComponent(sig)}`;
}

export function verifyDriveMedia(fileId, expiresAt, signature) {
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(String(fileId || ""))) return false;
  const exp = Number(expiresAt), now = Math.floor(Date.now() / 1000);
  if (!Number.isInteger(exp) || exp < now || exp > now + 3700 || !/^[A-Za-z0-9_-]{40,60}$/.test(String(signature || ""))) return false;
  const credential = readCredential();
  if (!credential) return false;
  const expected = createHmac("sha256", mediaSecret(credential)).update(mediaPayload(fileId, exp)).digest();
  let actual;
  try { actual = Buffer.from(signature, "base64url"); } catch { return false; }
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function limitedText(response) {
  const length = Number(response.headers.get("content-length") || 0);
  if (length > COPY_MAX_BYTES) return "";
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > COPY_MAX_BYTES) return "";
  return buffer.toString("utf8").trim();
}

async function copyText(file) {
  if (!file || ![GOOGLE_DOC, "text/plain"].includes(file.mimeType)) return "";
  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  const cacheKey = `copy-${file.id}-${createHash("sha256").update(String(file.modifiedTime || "")).digest("hex").slice(0, 12)}`;
  const cached = await store.get(cacheKey, { type: "text" }).catch(() => null);
  if (cached != null) return cached;
  const { token } = await driveToken();
  const url = file.mimeType === GOOGLE_DOC
    ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}/export?mimeType=text%2Fplain`
    : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media&supportsAllDrives=true`;
  const response = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) return "";
  const text = await limitedText(response);
  await store.set(cacheKey, text || "", { metadata: { modifiedTime: file.modifiedTime || "" } });
  return text;
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length); let cursor = 0;
  async function run() { while (cursor < items.length) { const index = cursor++; results[index] = await worker(items[index], index); } }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

export async function enrichFegsysCards(cards = [], { refresh = false } = {}) {
  const index = await getDriveIndex({ refresh });
  let matchedVideos = 0, matchedCopies = 0;
  const enriched = await mapLimit(cards, 4, async card => {
    const match = matchDriveFiles(card.nome, index.files || []);
    const videoUrl = card.video_url || (match.video ? signDriveMedia(match.video.id) : "");
    const thumbnailUrl = card.thumbnail_url || (match.video && match.video.thumbnailLink || "");
    const copyUrl = card.copy_url || (match.copy && match.copy.webViewLink || "");
    const copy = card.copy_text || (match.copy ? await copyText(match.copy) : "");
    if (!card.video_url && match.video) matchedVideos += 1;
    if (!(card.copy_text || card.copy_url) && match.copy) matchedCopies += 1;
    return {
      ...card,
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      copy_url: copyUrl,
      copy_text: copy,
      mediaAvailable: !!videoUrl,
      copyAvailable: !!(copy || copyUrl),
      drive_status: match.status,
      drive_video_name: match.video && match.video.name || "",
      drive_video_view_url: match.video && match.video.webViewLink || "",
      drive_copy_name: match.copy && match.copy.name || "",
      drive_video_candidates: match.videoCandidates,
      drive_copy_candidates: match.copyCandidates
    };
  });
  return {
    cards: enriched,
    status: { available: true, error: "", indexedAt: index.syncedAt, files: (index.files || []).length, matchedVideos, matchedCopies }
  };
}

export async function fetchDriveMedia(fileId, range = "") {
  const { token } = await driveToken();
  const headers = { authorization: `Bearer ${token}` };
  if (range) headers.range = range;
  return fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`, { headers });
}
