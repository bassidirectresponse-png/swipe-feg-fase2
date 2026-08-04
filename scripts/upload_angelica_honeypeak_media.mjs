import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { authHeaders, productionAdminAuth } from "./_supabase-auth.mjs";

const execFileAsync = promisify(execFile);

const args = process.argv.slice(2);
const valueOf = flag => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : "";
};

const PREPARED = path.resolve(valueOf("--prepared") || ".tmp/angelica-honeypeak-ready");
const WORKERS = Math.max(1, Math.min(4, Number(valueOf("--workers") || 3)));
const WAIT_MINUTES = Math.max(0, Number(valueOf("--wait-minutes") || 30));
// O bucket temporario foi criado com limite de 50 MB. Mantemos margem para
// overhead e geramos um MP4 H.264 progressive-download quando necessario.
const MAX_STORAGE_BYTES = 47 * 1024 * 1024;
const TARGET_STORAGE_BYTES = 44 * 1024 * 1024;
const manifest = JSON.parse(await fs.readFile(path.join(PREPARED, "manifest.json"), "utf8"));
const auth = await productionAdminAuth();
const supabaseUrl = auth.url;

async function waitForDatabase() {
  const deadline = Date.now() + WAIT_MINUTES * 60_000;
  let attempt = 0;
  for (;;) {
    attempt += 1;
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/offers?select=id&limit=1`, {
        headers: authHeaders(auth),
        signal: AbortSignal.timeout(30_000),
      });
      if (response.ok) {
        console.log(`[Supabase] banco disponível após ${attempt} verificação(ões)`);
        return;
      }
      console.log(`[Supabase] aguardando banco: HTTP ${response.status}`);
    } catch (error) {
      console.log(`[Supabase] aguardando banco: ${error.name}`);
    }
    if (Date.now() >= deadline) throw new Error("Supabase continuou indisponível até o limite de espera");
    await new Promise(resolve => setTimeout(resolve, 20_000));
  }
}

const honeyUnique = [...new Map(manifest.honeyPeak.map(item => [item.hash, item])).values()];
const tasks = [
  ...manifest.angelica.map(item => ({ collection: "megabrain/angelica", item })),
  ...honeyUnique.map(item => ({ collection: "offers/honey-peak-gelatin", item })),
];

let skippedUploads = 0;
let performedUploads = 0;

async function remoteFileIsComplete(objectPath, expectedSize) {
  try {
    const response = await fetch(`${supabaseUrl}/storage/v1/object/public/criativos/${objectPath}`, {
      method: "HEAD",
      signal: AbortSignal.timeout(30_000),
    });
    return response.ok && Number(response.headers.get("content-length")) === expectedSize;
  } catch {
    return false;
  }
}

async function upload(filename, objectPath, contentType) {
  const localPath = path.join(PREPARED, filename);
  const stat = await fs.stat(localPath);
  if (await remoteFileIsComplete(objectPath, stat.size)) {
    skippedUploads += 1;
    return "skipped";
  }
  const body = await fs.readFile(localPath);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(`${supabaseUrl}/storage/v1/object/criativos/${objectPath}`, {
        method: "POST",
        headers: authHeaders(auth, {
          "Content-Type": contentType,
          "x-upsert": "true",
        }),
        body,
        signal: AbortSignal.timeout(20 * 60_000),
      });
      if (response.ok) {
        performedUploads += 1;
        return "uploaded";
      }
      const error = await response.text();
      if (attempt === 3 || response.status < 500) {
        throw new Error(`${response.status} ${error.slice(0, 220)}`);
      }
    } catch (error) {
      if (attempt === 3) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, 2_000 * (attempt + 1)));
  }
}

async function probeDuration(filename) {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1",
    path.join(PREPARED, filename),
  ], { timeout: 60_000 });
  const duration = Number(String(stdout).trim());
  if (!Number.isFinite(duration) || duration <= 0) throw new Error(`duracao invalida: ${filename}`);
  return duration;
}

async function prepareVideo(item) {
  const originalFile = item.videoFile;
  const originalPath = path.join(PREPARED, originalFile);
  const originalStat = await fs.stat(originalPath);
  if (originalStat.size <= MAX_STORAGE_BYTES) {
    item.storageVideoFile = originalFile;
    item.storageBytes = originalStat.size;
    return { filename: originalFile, bytes: originalStat.size };
  }

  const optimizedFile = `${path.parse(originalFile).name}.storage.mp4`;
  const optimizedPath = path.join(PREPARED, optimizedFile);
  try {
    const current = await fs.stat(optimizedPath);
    if (current.size > 0 && current.size <= MAX_STORAGE_BYTES) {
      item.storageVideoFile = optimizedFile;
      item.storageBytes = current.size;
      return { filename: optimizedFile, bytes: current.size };
    }
  } catch {}

  const duration = await probeDuration(originalFile);
  const totalKbps = Math.floor((TARGET_STORAGE_BYTES * 8) / duration / 1000);
  const audioKbps = 28;
  const videoKbps = Math.max(45, totalKbps - audioKbps - 5);
  const temporaryPath = `${optimizedPath}.part.mp4`;
  await fs.rm(temporaryPath, { force: true });
  await execFileAsync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y", "-i", originalPath,
    "-map", "0:v:0", "-map", "0:a:0?",
    "-c:v", "libx264", "-preset", "veryfast", "-b:v", `${videoKbps}k`,
    "-maxrate", `${Math.max(videoKbps + 12, Math.round(videoKbps * 1.18))}k`,
    "-bufsize", `${Math.max(128, videoKbps * 3)}k`, "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", `${audioKbps}k`, "-ac", "1", "-ar", "32000",
    "-movflags", "+faststart", temporaryPath,
  ], { timeout: 45 * 60_000, maxBuffer: 1024 * 1024 });
  await fs.rename(temporaryPath, optimizedPath);
  const optimizedStat = await fs.stat(optimizedPath);
  if (optimizedStat.size <= 0 || optimizedStat.size > MAX_STORAGE_BYTES) {
    throw new Error(`midia otimizada excedeu o limite seguro: ${optimizedFile} (${optimizedStat.size} bytes)`);
  }
  item.storageVideoFile = optimizedFile;
  item.storageBytes = optimizedStat.size;
  console.log(`[Otimizado] ${originalFile}: ${Math.round(originalStat.size / 1048576)} MB -> ${Math.round(optimizedStat.size / 1048576)} MB`);
  return { filename: optimizedFile, bytes: optimizedStat.size };
}

let cursor = 0;
let completed = 0;
async function worker() {
  for (;;) {
    const index = cursor;
    cursor += 1;
    if (index >= tasks.length) return;
    const { collection, item } = tasks[index];
    const base = `${collection}/${item.hash.slice(0, 24)}`;
    const preparedVideo = await prepareVideo(item);
    await upload(preparedVideo.filename, `${base}.mp4`, "video/mp4");
    await upload(item.thumbnailFile, `${base}.jpg`, "image/jpeg");
    completed += 1;
    console.log(`[${completed}/${tasks.length}] ${collection === "megabrain/angelica" ? "Angélica" : "Honey Peak"}: mídia armazenada`);
  }
}

await waitForDatabase();
await Promise.all(Array.from({ length: WORKERS }, worker));
// Quando dois nomes apontam para o mesmo binario, o Map preserva apenas a
// ultima entrada. Propagamos o arquivo otimizado a todas as referencias para
// que uma nova ingestao valide exatamente o objeto realmente armazenado.
const honeyStorageByHash = new Map(honeyUnique.map(item => [item.hash, {
  storageVideoFile: item.storageVideoFile,
  storageBytes: item.storageBytes,
}]));
for (const item of manifest.honeyPeak) Object.assign(item, honeyStorageByHash.get(item.hash) || {});
await fs.writeFile(path.join(PREPARED, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({
  ok: true,
  angelica: manifest.angelica.length,
  honeyPeakUnique: honeyUnique.length,
  duplicateHoneyFilesSkipped: manifest.honeyPeak.length - honeyUnique.length,
  filesUploaded: performedUploads,
  filesAlreadyComplete: skippedUploads,
  localPathsPersisted: false,
}, null, 2));
