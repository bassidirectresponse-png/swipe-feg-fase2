import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";
import { googleAccessToken, readCredential } from "./_fegsys-bigquery.mjs";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const STORE_NAME = "fegsys-drive";
const INDEX_KEY = "matches-v4";
const GLOBAL_INDEX_KEY = "matches-v4-global";
const INDEX_MAX_AGE_MS = 65 * 60 * 1000;
const COPY_MAX_BYTES = 2 * 1024 * 1024;
const DRIVE_REQUEST_TIMEOUT_MS = 18_000;
const DRIVE_MAX_PAGES = 4;
const DRIVE_SEARCH_BATCH_SIZE = 8;
const VIDEO_RE = /^video\//i;
const GOOGLE_DOC = "application/vnd.google-apps.document";
const GOOGLE_FOLDER = "application/vnd.google-apps.folder";
const GOOGLE_SHORTCUT = "application/vnd.google-apps.shortcut";
const DEFAULT_ROOT_IDS = [
  "1O1HoupHFxPPqHLLuAthkZzY6pb-6q2YO",
  "1BVtaUOgSdpWFgU3TFZArlVuSB6FI-DF_"
];
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

function driveLookup(files = []) {
  const videos = new Map(), copies = new Map();
  const add = (map, key, file) => {
    if (!key) return;
    const list = map.get(key) || [];
    if (!list.some(item => item.id === file.id)) list.push(file);
    map.set(key, list);
  };
  for (const file of files) {
    if (VIDEO_RE.test(file?.mimeType || "")) add(videos, normalizeDriveName(file.name), file);
    else if (COPY_MIMES.has(file?.mimeType || "")) {
      add(copies, normalizeDriveName(file.name), file);
      add(copies, copyCore(file.name), file);
    }
  }
  for (const list of [...videos.values(), ...copies.values()]) list.sort(byNewest);
  return { videos, copies };
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

export function matchDriveFiles(creativeName, files = [], lookup = null) {
  const key = normalizeDriveName(creativeName);
  if (!key) return { status: "not_found", video: null, copy: null, videoCandidates: 0, copyCandidates: 0 };
  const indexed = lookup || driveLookup(files);
  const videoMatches = indexed.videos.get(key) || [];
  const copyMatches = indexed.copies.get(key) || [];
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

function configuredRootIds() {
  const configured = String(process.env.FEGSYS_DRIVE_FOLDER_IDS || "").split(/[\s,;]+/).map(value => value.trim()).filter(Boolean);
  return [...new Set(configured.length ? configured : DEFAULT_ROOT_IDS)];
}

function driveQueryValue(value) {
  return String(value || "").replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

function contentQuery(creativeNames = []) {
  const names = creativeNames.map(value => String(value || "").trim()).filter(Boolean);
  if (!names.length) return "trashed = false and id = '__none__'";
  const nameQuery = names.map(name => `name contains '${driveQueryValue(name)}'`).join(" or ");
  return `trashed = false and (${nameQuery}) and (mimeType = '${GOOGLE_SHORTCUT}' or mimeType contains 'video/' or mimeType = '${GOOGLE_DOC}' or mimeType = 'text/plain' or mimeType = 'application/pdf' or mimeType = 'application/msword' or mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')`;
}

async function driveFetch(url, options = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(DRIVE_REQUEST_TIMEOUT_MS) });
}

async function listDrivePage(token, creativeNames = []) {
  const files = [];
  let pageToken = "", pages = 0, incompleteSearch = false;
  do {
    const url = new URL("https://www.googleapis.com/drive/v3/files");
    url.searchParams.set("q", contentQuery(creativeNames));
    url.searchParams.set("spaces", "drive");
    /* A conta de serviço só enxerga o que foi compartilhado com ela. A busca
       usa os nomes vindos do FEGSYS para não varrer o Drive inteiro antes de
       devolver os cards do BigQuery. */
    url.searchParams.set("corpora", "user");
    url.searchParams.set("includeItemsFromAllDrives", "true");
    url.searchParams.set("supportsAllDrives", "true");
    url.searchParams.set("pageSize", "1000");
    url.searchParams.set("fields", "nextPageToken,incompleteSearch,files(id,name,mimeType,size,modifiedTime,webViewLink,thumbnailLink,hasThumbnail,md5Checksum,driveId,parents,shortcutDetails(targetId,targetMimeType))");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await driveFetch(url, { headers: { authorization: `Bearer ${token}` } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Drive recusou a listagem (${response.status})`);
    files.push(...(result.files || []));
    pageToken = String(result.nextPageToken || "");
    incompleteSearch ||= result.incompleteSearch === true;
    pages += 1;
  } while (pageToken && pages < DRIVE_MAX_PAGES);
  return { files, incompleteSearch: incompleteSearch || !!pageToken, pages };
}

async function inspectRoot(token, id) {
  const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}`);
  url.searchParams.set("supportsAllDrives", "true");
  url.searchParams.set("fields", "id,name,mimeType,driveId");
  const response = await driveFetch(url, { headers: { authorization: `Bearer ${token}` } });
  const file = await response.json().catch(() => ({}));
  if (!response.ok || file.mimeType !== GOOGLE_FOLDER) return { id, available: false, name: "", error: `pasta não acessível (${response.status})` };
  return { id, available: true, name: String(file.name || ""), driveId: String(file.driveId || ""), error: "" };
}

function usableDriveFile(file) {
  if (!file || !file.id || file.mimeType === GOOGLE_FOLDER) return null;
  if (file.mimeType !== GOOGLE_SHORTCUT) return file;
  const targetId = String(file.shortcutDetails && file.shortcutDetails.targetId || "");
  const targetMimeType = String(file.shortcutDetails && file.shortcutDetails.targetMimeType || "");
  if (!targetId || !(VIDEO_RE.test(targetMimeType) || COPY_MIMES.has(targetMimeType))) return null;
  return { ...file, id: targetId, mimeType: targetMimeType, shortcutId: file.id };
}

function creativeBatches(creativeNames = []) {
  const unique = [...new Map(creativeNames.map(value => [normalizeDriveName(value), String(value || "").trim()])).values()].filter(Boolean);
  const batches = [];
  for (let index = 0; index < unique.length; index += DRIVE_SEARCH_BATCH_SIZE) batches.push(unique.slice(index, index + DRIVE_SEARCH_BATCH_SIZE));
  return batches;
}

async function listDriveFiles(creativeNames = []) {
  const { token } = await driveToken();
  const rootIds = configuredRootIds(), roots = await Promise.all(rootIds.map(id => inspectRoot(token, id)));
  const batches = creativeBatches(creativeNames);
  const pages = await mapLimit(batches, 6, batch => listDrivePage(token, batch));
  const byId = new Map();
  for (const listed of pages) {
    for (const raw of listed.files) {
      const file = usableDriveFile(raw);
      if (file) byId.set(file.id, file);
    }
  }
  return {
    syncedAt: new Date().toISOString(), roots, files: [...byId.values()],
    pages: pages.reduce((total, page) => total + page.pages, 0),
    incompleteSearch: pages.some(page => page.incompleteSearch), searchedCreatives: creativeNames.length
  };
}

function mergeDriveIndexes(previous, current) {
  const byId = new Map();
  for (const file of [...(previous?.files || []), ...(current?.files || [])]) {
    if (file?.id) byId.set(file.id, file);
  }
  return {
    ...(previous || {}),
    ...(current || {}),
    files: [...byId.values()],
    roots: current?.roots?.length ? current.roots : previous?.roots || [],
    searchedCreatives: Math.max(previous?.searchedCreatives || 0, current?.searchedCreatives || 0)
  };
}

export async function getDriveIndex({ refresh = false, allowStale = false, creativeNames = [] } = {}) {
  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  const signature = createHash("sha256").update(creativeNames.map(normalizeDriveName).filter(Boolean).sort().join("\n")).digest("hex").slice(0, 20);
  const cacheKey = `${INDEX_KEY}-${signature}`;
  const [cached, globalCached] = await Promise.all([
    store.get(cacheKey, { type: "json" }).catch(() => null),
    store.get(GLOBAL_INDEX_KEY, { type: "json" }).catch(() => null)
  ]);
  const stale = !cached || !cached.syncedAt || Date.now() - Date.parse(cached.syncedAt) > INDEX_MAX_AGE_MS;
  /* O painel nunca deve aguardar uma varredura grande do Drive. O índice
     anterior continua válido para leitura; a função agendada o renova. */
  if (!refresh && allowStale && (cached || globalCached)) return cached || globalCached;
  if (!refresh && !stale) return cached;
  const index = await listDriveFiles(creativeNames);
  const globalIndex = mergeDriveIndexes(globalCached, index);
  await Promise.all([store.setJSON(cacheKey, index), store.setJSON(GLOBAL_INDEX_KEY, globalIndex)]);
  return index;
}

function mediaSecret(credential) {
  return createHash("sha256").update(credential.private_key).update("fegsys-drive-media-v1").digest();
}

function mediaPayload(fileId, expiresAt) { return `${fileId}.${expiresAt}`; }

export function signDriveMedia(fileId, { ttlSeconds = 60 * 60 } = {}) {
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

export async function enrichFegsysCards(cards = [], { refresh = false, allowStale = true, includeCopyText = false } = {}) {
  const index = await getDriveIndex({ refresh, allowStale, creativeNames: cards.map(card => card.nome) });
  const lookup = driveLookup(index.files || []);
  let matchedVideos = 0, matchedCopies = 0;
  const enriched = await mapLimit(cards, includeCopyText ? 4 : Math.max(1, cards.length), async card => {
    const match = matchDriveFiles(card.nome, index.files || [], lookup);
    const videoUrl = card.video_url || (match.video ? signDriveMedia(match.video.id) : "");
    const thumbnailUrl = card.thumbnail_url || (match.video && match.video.thumbnailLink || "");
    const copyUrl = card.copy_url || (match.copy && match.copy.webViewLink || "");
    /* A primeira carga entrega imediatamente o link do documento. Exportar o
       texto de cada Google Doc fica opcional para não segurar todos os cards. */
    const copy = card.copy_text || (includeCopyText && match.copy ? await copyText(match.copy) : "");
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
    status: { available: true, error: "", indexedAt: index.syncedAt, roots: index.roots || [], files: (index.files || []).length, pages: index.pages || 0, incompleteSearch: index.incompleteSearch === true, matchedVideos, matchedCopies }
  };
}

export async function fetchDriveMedia(fileId, range = "") {
  const { token } = await driveToken();
  const headers = { authorization: `Bearer ${token}` };
  if (range) headers.range = range;
  return driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`, { headers });
}
