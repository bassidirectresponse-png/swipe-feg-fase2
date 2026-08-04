import { createReadStream, readFileSync } from "node:fs";
import { createHash, createSign } from "node:crypto";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { promisify } from "node:util";

const ROOT = path.resolve(new URL("../", import.meta.url).pathname);
const HTML = await fs.readFile(path.join(ROOT, "index.html"), "utf8");
const SUPABASE_URL = (process.env.SUPABASE_URL || HTML.match(/const DEFAULT_URL="([^"]+)"/)?.[1] || "").replace(/\/+$/, "");
const ANON = process.env.SUPABASE_ANON_KEY || HTML.match(/const DEFAULT_KEY="([^"]+)"/)?.[1] || "";
const EMAIL = process.env.SUPABASE_BOT_EMAIL || "";
const PASSWORD = process.env.SUPABASE_BOT_PASSWORD || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const APPLY = process.argv.includes("--apply");
const REQUESTED = new Set(process.argv.filter(value => value.startsWith("--only=")).flatMap(value => value.slice(7).split(",")).filter(Boolean));
const ONLY = REQUESTED.size ? REQUESTED : new Set(["brands", "megabrain", "lucas-rego", "criativo", "ofertas", "tiktok"]);
const LUCAS_READY = path.resolve(process.env.LUCAS_READY || path.join(ROOT, ".tmp", "recovery-lucas"));
const TEMP = path.join(ROOT, ".tmp", "media-migration-downloads");
const OLD_RECOVERY = path.join(ROOT, ".tmp", "old-supabase-recovery");
const BACKUP_PATH = path.join(ROOT, ".tmp", `offers-before-media-recovery-${Date.now()}.json`);
const REPORT_PATH = path.join(ROOT, ".tmp", "media-migration-report.json");
const OLD_REF = "ppaajtzbhjixhyfidojd";
const OLD_PREFIX = `https://${OLD_REF}.supabase.co/storage/v1/object/public/criativos/`;
const NEW_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/criativos/`;
const concurrency = Math.max(1, Math.min(5, Number(process.env.MEDIA_MIGRATION_WORKERS || 2)));
const exec = promisify(execFile);
const MAX_UPLOAD_BYTES = 48 * 1024 * 1024;
const TARGET_UPLOAD_BYTES = 44 * 1024 * 1024;

if (!SUPABASE_URL || !ANON) throw new Error("Configuração do novo Supabase não encontrada");
if (!SERVICE_KEY && (!EMAIL || !PASSWORD)) throw new Error("Defina SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_BOT_EMAIL e SUPABASE_BOT_PASSWORD");
await fs.mkdir(TEMP, { recursive: true });
await fs.mkdir(OLD_RECOVERY, { recursive: true });

const encodeObjectPath = objectPath => objectPath.split("/").map(encodeURIComponent).join("/");
const mimeFor = file => ({ ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm" }[path.extname(file).toLowerCase()] || "application/octet-stream");
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function login() {
  if (SERVICE_KEY) return { token: SERVICE_KEY, apikey: SERVICE_KEY, mode: "service-role" };
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!response.ok) throw new Error(`Login falhou: HTTP ${response.status} ${(await response.text()).slice(0, 240)}`);
  return { token: (await response.json()).access_token, apikey: ANON, mode: "user" };
}

const AUTH = await login();
const authHeaders = { apikey: AUTH.apikey, Authorization: `Bearer ${AUTH.token}` };

async function fetchRows() {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/offers?select=id,created_at,data&order=created_at.asc&offset=${offset}&limit=500`, { headers: authHeaders });
    if (!response.ok) throw new Error(`Falha ao ler offers: HTTP ${response.status} ${(await response.text()).slice(0, 240)}`);
    const page = await response.json();
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}

function collectOldReferences(value, found = []) {
  if (typeof value === "string") {
    if (value.startsWith(OLD_PREFIX)) found.push({ url: value, objectPath: decodeURIComponent(value.slice(OLD_PREFIX.length).split(/[?#]/)[0]) });
    return found;
  }
  if (Array.isArray(value)) value.forEach(child => collectOldReferences(child, found));
  else if (value && typeof value === "object") Object.values(value).forEach(child => collectOldReferences(child, found));
  return found;
}

function replaceReferences(value, replacements) {
  if (typeof value === "string") return replacements.get(value) || value;
  if (Array.isArray(value)) return value.map(child => replaceReferences(child, replacements));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, replaceReferences(child, replacements)]));
  return value;
}

async function publicObjectExists(objectPath) {
  const response = await fetch(`${NEW_PREFIX}${encodeObjectPath(objectPath)}`, { method: "HEAD", cache: "no-store" });
  return response.ok;
}

async function uploadFile(objectPath, file) {
  const stat = await fs.stat(file);
  if (!stat.isFile() || stat.size < 100) throw new Error("arquivo local vazio ou inválido");
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/criativos/${encodeObjectPath(objectPath)}`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": mimeFor(file), "Content-Length": String(stat.size), "x-upsert": "true" },
    body: Readable.toWeb(createReadStream(file)),
    duplex: "half",
  });
  if (!response.ok) throw new Error(`upload HTTP ${response.status}: ${(await response.text()).slice(0, 260)}`);
  if (!(await publicObjectExists(objectPath))) throw new Error("o upload respondeu, mas o arquivo público não pôde ser validado");
  return stat.size;
}

async function download(url, target, expectedPrefix = "", requestHeaders = {}) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0", ...requestHeaders }, signal: AbortSignal.timeout(180_000) });
      const type = response.headers.get("content-type") || "";
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (expectedPrefix && !type.startsWith(expectedPrefix)) throw new Error(`tipo inesperado: ${type || "desconhecido"}`);
      if (!response.body) throw new Error("resposta sem conteúdo");
      const handle = await fs.open(target, "w");
      try {
        for await (const chunk of Readable.fromWeb(response.body)) await handle.write(chunk);
      } finally { await handle.close(); }
      if ((await fs.stat(target)).size < 100) throw new Error("download vazio");
      return target;
    } catch (error) {
      lastError = error;
      await fs.rm(target, { force: true });
      await sleep(attempt * 1200);
    }
  }
  throw lastError;
}

async function sha256(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

function readGoogleCredential() {
  let raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "";
  if (!raw && process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64) raw = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64, "base64").toString("utf8");
  if (!raw && process.env.GOOGLE_SERVICE_ACCOUNT_FILE) {
    try { raw = requireFile(process.env.GOOGLE_SERVICE_ACCOUNT_FILE); } catch {}
  }
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return value.type === "service_account" && value.client_email && value.private_key ? value : null;
  } catch { return null; }
}

function requireFile(file) {
  return readFileSync(file, "utf8").trim();
}

let googleTokenCache = null;
async function googleDriveToken() {
  if (googleTokenCache && googleTokenCache.expiresAt > Date.now() + 60_000) return googleTokenCache.value;
  const credential = readGoogleCredential();
  if (!credential) return "";
  const now = Math.floor(Date.now() / 1000);
  const base64url = value => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${base64url({ alg: "RS256", typ: "JWT" })}.${base64url({ iss: credential.client_email, scope: "https://www.googleapis.com/auth/drive.readonly", aud: credential.token_uri || "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`;
  const signer = createSign("RSA-SHA256"); signer.update(unsigned); signer.end();
  const assertion = `${unsigned}.${signer.sign(credential.private_key, "base64url")}`;
  const response = await fetch(credential.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.access_token) throw new Error(`autenticação Google recusada (${response.status})`);
  googleTokenCache = { value: result.access_token, expiresAt: Date.now() + 55 * 60_000 };
  return googleTokenCache.value;
}

async function probe(file) {
  const { stdout } = await exec("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-show_entries", "stream=codec_name,codec_type", "-of", "json", file], { maxBuffer: 1024 * 1024 });
  const parsed = JSON.parse(stdout);
  const video = (parsed.streams || []).find(stream => stream.codec_type === "video");
  const duration = Number(parsed.format?.duration || 0);
  if (!video || !Number.isFinite(duration) || duration <= 0) throw new Error("o arquivo baixado não contém um vídeo válido");
  return { codec: String(video.codec_name || "").toLowerCase(), duration };
}

async function compressVideo(source, output, duration) {
  const audioKbps = 64;
  let videoKbps = Math.max(240, Math.min(1600, Math.floor((TARGET_UPLOAD_BYTES * 8 / duration / 1000) - audioKbps - 12)));
  const temp = `${output}.part.mp4`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await fs.rm(temp, { force: true });
    const common = ["-y", "-hide_banner", "-loglevel", "error", "-i", source, "-map", "0:v:0", "-map", "0:a?", "-vf", "scale=if(gt(iw\\,ih)\\,min(1280\\,iw)\\,min(720\\,iw)):-2", "-b:v", `${videoKbps}k`, "-maxrate", `${Math.round(videoKbps * 1.15)}k`, "-bufsize", `${Math.round(videoKbps * 2)}k`, "-pix_fmt", "yuv420p", "-tag:v", "avc1", "-c:a", "aac", "-b:a", `${audioKbps}k`, "-movflags", "+faststart", temp];
    try { await exec("ffmpeg", [...common.slice(0, 12), "-c:v", "h264_videotoolbox", ...common.slice(12)], { maxBuffer: 2 * 1024 * 1024 }); }
    catch { await exec("ffmpeg", [...common.slice(0, 12), "-c:v", "libx264", "-preset", "veryfast", ...common.slice(12)], { maxBuffer: 2 * 1024 * 1024 }); }
    const size = (await fs.stat(temp)).size;
    if (size <= MAX_UPLOAD_BYTES) { await fs.rename(temp, output); return output; }
    videoKbps = Math.max(200, Math.floor(videoKbps * (MAX_UPLOAD_BYTES / size) * 0.9));
  }
  throw new Error("não foi possível compactar o vídeo para o limite do Storage");
}

async function prepareDownloadedVideo(file) {
  const info = await probe(file);
  const size = (await fs.stat(file)).size;
  if (size <= MAX_UPLOAD_BYTES && path.extname(file).toLowerCase() === ".mp4") return { file, extraCleanup: [] };
  const output = `${file}.ready.mp4`;
  await compressVideo(file, output, info.duration);
  return { file: output, extraCleanup: [output] };
}

function driveId(link) {
  return String(link || "").match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] || String(link || "").match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1] || "";
}

let lucasManifest = null;
async function loadLucasManifest() {
  if (lucasManifest) return lucasManifest;
  const parsed = JSON.parse(await fs.readFile(path.join(LUCAS_READY, "lucas-rego-import.json"), "utf8"));
  lucasManifest = new Map(parsed.records.map(record => [record.sourceHash.slice(0, 16).toLowerCase(), path.join(LUCAS_READY, record.mediaFile)]));
  return lucasManifest;
}

async function resolveSource(objectPath, row) {
  // A instância original pode ser usada apenas como fonte exata de recuperação.
  // O arquivo é preservado localmente com o mesmo caminho e hash antes do upload.
  const recovered = path.join(OLD_RECOVERY, objectPath);
  await fs.mkdir(path.dirname(recovered), { recursive: true });
  if (!((await fs.stat(recovered).catch(() => null))?.isFile())) {
    await download(`${OLD_PREFIX}${encodeObjectPath(objectPath)}`, recovered);
  }
  const originalBytes = (await fs.stat(recovered)).size;
  const originalSha256 = await sha256(recovered);
  if (originalBytes < 100) throw new Error("objeto original vazio ou inválido");
  if (/\.(?:mp4|mov|webm)$/i.test(recovered)) {
    const prepared = await prepareDownloadedVideo(recovered);
    return {
      file: prepared.file,
      cleanup: prepared.file !== recovered,
      cleanupFiles: prepared.extraCleanup,
      source: "old-supabase-exact",
      originalBytes,
      originalSha256,
    };
  }
  return { file: recovered, cleanup: false, source: "old-supabase-exact", originalBytes, originalSha256 };

  /* c8 ignore next 2 -- fallback mantido para recuperações futuras sem a origem antiga */
  const prefix = objectPath.split("/")[0];
  if (prefix === "brands" && ONLY.has("brands")) {
    const [, slug, ...rest] = objectPath.split("/");
    const file = path.join(ROOT, "assets", slug, ...rest);
    if ((await fs.stat(file).catch(() => null))?.isFile()) return { file, cleanup: false, source: "assets" };
  }
  if (prefix === "lucas-rego" && ONLY.has("lucas-rego")) {
    const hash = path.basename(objectPath, path.extname(objectPath)).toLowerCase();
    const file = (await loadLucasManifest()).get(hash);
    if (file && (await fs.stat(file).catch(() => null))?.isFile()) return { file, cleanup: false, source: "lucas-rego" };
  }
  if (prefix === "megabrain" && ONLY.has("megabrain")) {
    const id = driveId(row.data?.linkDrive);
    if (!id) throw new Error("card sem linkDrive válido");
    const file = path.join(TEMP, `${row.id}-${path.basename(objectPath)}`);
    const driveToken = await googleDriveToken();
    if (driveToken) await download(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`, file, "", { authorization: `Bearer ${driveToken}` });
    else await download(`https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`, file, "video/");
    const prepared = await prepareDownloadedVideo(file);
    return { file: prepared.file, cleanup: true, cleanupFiles: [file, ...prepared.extraCleanup], source: driveToken ? "google-drive-api" : "google-drive-public" };
  }
  if (prefix === "tiktok" && ONLY.has("tiktok")) {
    const sourceUrl = row.data?.url || row.data?.link || "";
    if (!sourceUrl) throw new Error("card sem URL do TikTok");
    const metaResponse = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(sourceUrl)}`, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(30_000) });
    if (!metaResponse.ok) throw new Error(`oEmbed HTTP ${metaResponse.status}`);
    const thumbnail = (await metaResponse.json()).thumbnail_url;
    if (!thumbnail) throw new Error("oEmbed sem thumbnail_url");
    const file = path.join(TEMP, `${row.id}-${path.basename(objectPath)}`);
    await download(thumbnail, file, "image/");
    return { file, cleanup: true, source: "tiktok-oembed" };
  }
  return null;
}

async function patchRows(rows, replacements) {
  let patched = 0;
  for (const row of rows) {
    const currentRefs = collectOldReferences(row.data);
    if (!currentRefs.some(ref => replacements.has(ref.url))) continue;
    const data = replaceReferences(row.data, replacements);
    const response = await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(row.id)}`, {
      method: "PATCH",
      headers: { ...authHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ data }),
    });
    if (!response.ok) throw new Error(`Falha ao atualizar card ${row.id}: HTTP ${response.status} ${(await response.text()).slice(0, 220)}`);
    patched += 1;
  }
  return patched;
}

async function main() {
  const rows = await fetchRows();
  await fs.writeFile(BACKUP_PATH, JSON.stringify({ exportedAt: new Date().toISOString(), supabaseUrl: SUPABASE_URL, rows }, null, 2) + "\n", { mode: 0o600 });
  const objectMap = new Map();
  for (const row of rows) {
    for (const ref of collectOldReferences(row.data)) {
      const entry = objectMap.get(ref.objectPath) || { objectPath: ref.objectPath, urls: new Set(), rows: [] };
      entry.urls.add(ref.url);
      if (!entry.rows.some(candidate => candidate.id === row.id)) entry.rows.push(row);
      objectMap.set(ref.objectPath, entry);
    }
  }
  const selected = [...objectMap.values()].filter(entry => ONLY.has(entry.objectPath.split("/")[0]));
  const report = { startedAt: new Date().toISOString(), apply: APPLY, authMode: AUTH.mode, backupPath: path.relative(ROOT, BACKUP_PATH), only: [...ONLY], totalRows: rows.length, selected: selected.length, restored: [], existing: [], unresolved: [], failed: [] };
  const replacements = new Map();
  let cursor = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= selected.length) return;
      const entry = selected[index];
      const newUrl = `${NEW_PREFIX}${encodeObjectPath(entry.objectPath)}`;
      try {
        if (await publicObjectExists(entry.objectPath)) {
          entry.urls.forEach(url => replacements.set(url, newUrl));
          report.existing.push(entry.objectPath);
          console.log(`[${index + 1}/${selected.length}] já existe ${entry.objectPath}`);
          continue;
        }
        const source = await resolveSource(entry.objectPath, entry.rows[0]);
        if (!source) {
          report.unresolved.push({ objectPath: entry.objectPath, reason: "fonte segura ainda não mapeada" });
          console.log(`[${index + 1}/${selected.length}] sem fonte ${entry.objectPath}`);
          continue;
        }
        if (!APPLY) {
          report.restored.push({ objectPath: entry.objectPath, source: source.source, originalBytes: source.originalBytes, originalSha256: source.originalSha256, dryRun: true });
          console.log(`[${index + 1}/${selected.length}] pronto para restaurar ${entry.objectPath} <- ${source.source}`);
        } else {
          const bytes = await uploadFile(entry.objectPath, source.file);
          entry.urls.forEach(url => replacements.set(url, newUrl));
          report.restored.push({ objectPath: entry.objectPath, source: source.source, bytes, originalBytes: source.originalBytes, originalSha256: source.originalSha256 });
          console.log(`[${index + 1}/${selected.length}] restaurado ${entry.objectPath} (${Math.round(bytes / 1024)} KB)`);
        }
        if (source.cleanup) for (const file of source.cleanupFiles || [source.file]) await fs.rm(file, { force: true });
      } catch (error) {
        report.failed.push({ objectPath: entry.objectPath, error: String(error.message || error) });
        console.error(`[${index + 1}/${selected.length}] falhou ${entry.objectPath}: ${error.message || error}`);
      }
    }
  }));
  report.patchedRows = APPLY ? await patchRows(rows, replacements) : 0;
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ selected: report.selected, restored: report.restored.length, existing: report.existing.length, unresolved: report.unresolved.length, failed: report.failed.length, patchedRows: report.patchedRows, report: path.relative(ROOT, REPORT_PATH) }, null, 2));
  if (report.failed.length) process.exitCode = 2;
}

main().catch(error => { console.error(error); process.exitCode = 1; });
