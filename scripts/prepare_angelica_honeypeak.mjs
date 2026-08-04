import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const args = process.argv.slice(2);
const valueOf = flag => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : "";
};
const ANGELICA_ROOT = path.resolve(valueOf("--angelica") || "");
const VSL_ROOT = path.resolve(valueOf("--vsl") || "");
const OUTPUT = path.resolve(valueOf("--output") || ".tmp/angelica-honeypeak-ready");
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".m4v", ".webm"]);
const WORKERS = Math.max(1, Math.min(3, Number(process.env.MEDIA_PREP_WORKERS || 3)));

async function isDirectory(directory) {
  return Boolean((await fs.stat(directory).catch(() => null))?.isDirectory());
}

async function listVideos(directory) {
  const result = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith("._")) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await listVideos(absolute));
    else if (VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) result.push(absolute);
  }
  return result;
}

async function sha256(file) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(file);
    stream.on("error", reject);
    stream.on("data", chunk => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function probe(file) {
  const { stdout } = await exec("ffprobe", [
    "-v", "error", "-show_entries", "format=duration,size",
    "-show_entries", "stream=codec_name,codec_type", "-of", "json", file,
  ], { maxBuffer: 1024 * 1024 });
  const parsed = JSON.parse(stdout);
  const video = (parsed.streams || []).find(stream => stream.codec_type === "video");
  const duration = Number(parsed.format?.duration || 0);
  const size = Number(parsed.format?.size || 0);
  if (!video || !Number.isFinite(duration) || duration <= 0) throw new Error(`vídeo inválido: ${path.basename(file)}`);
  return { codec: String(video.codec_name || "").toLowerCase(), duration, size };
}

function parseAngelicaName(filename) {
  let clean = filename.normalize("NFC").replace(/\.(mp4|mov|m4v|webm)$/i, "").trim();
  const salesMatch = clean.match(/(?:\.mp4[. ]*)?([0-9oO]+)\s*vendas?\s*$/i);
  let sales = null;
  if (salesMatch) {
    sales = Number(salesMatch[1].replace(/[oO]/g, "0"));
    clean = clean.slice(0, salesMatch.index).replace(/\.mp4[. ]*$/i, "").trim();
  }
  clean = clean.replace(/^c[oó]pia de\s+/i, "").replace(/\s+/g, " ").trim();
  const niche = /\bMG\d*\b/i.test(clean) ? "Emagrecimento" : "Memória";
  return { name: clean, sales: Number.isFinite(sales) ? sales : null, niche };
}

async function transcode(source, output, info, profile) {
  const maxBytes = profile === "vsl" ? 112 * 1024 * 1024 : 48 * 1024 * 1024;
  const targetBytes = profile === "vsl" ? 102 * 1024 * 1024 : 44 * 1024 * 1024;
  const audioKbps = profile === "vsl" ? 48 : 64;
  const maxVideoKbps = profile === "vsl" ? 520 : 1500;
  const minVideoKbps = profile === "vsl" ? 145 : 240;
  const maxWidth = profile === "vsl" ? 854 : 1280;
  const maxHeight = profile === "vsl" ? 480 : 720;
  let videoKbps = Math.max(minVideoKbps, Math.min(maxVideoKbps, Math.floor((targetBytes * 8 / info.duration / 1000) - audioKbps - 10)));
  const temp = `${output}.part.mp4`;
  const scale = `scale=if(gt(iw\\,ih)\\,min(${maxWidth}\\,iw)\\,-2):if(gt(iw\\,ih)\\,-2\\,min(${maxHeight}\\,ih))`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await fs.rm(temp, { force: true });
    let encode = ["-c:v", "h264_videotoolbox", "-b:v", `${videoKbps}k`, "-maxrate", `${Math.round(videoKbps * 1.12)}k`, "-bufsize", `${Math.round(videoKbps * 2)}k`];
    const base = ["-y", "-hide_banner", "-loglevel", "error", "-i", source, "-map", "0:v:0", "-map", "0:a?", "-vf", scale];
    const tail = ["-pix_fmt", "yuv420p", "-tag:v", "avc1", "-c:a", "aac", "-b:a", `${audioKbps}k`, "-ac", "1", "-movflags", "+faststart", temp];
    try {
      await exec("ffmpeg", [...base, ...encode, ...tail], { maxBuffer: 3 * 1024 * 1024 });
    } catch {
      encode = ["-c:v", "libx264", "-preset", "veryfast", "-b:v", `${videoKbps}k`, "-maxrate", `${Math.round(videoKbps * 1.12)}k`, "-bufsize", `${Math.round(videoKbps * 2)}k`];
      await exec("ffmpeg", [...base, ...encode, ...tail], { maxBuffer: 3 * 1024 * 1024 });
    }
    const stat = await fs.stat(temp);
    if (stat.size <= maxBytes) {
      await fs.rename(temp, output);
      return;
    }
    videoKbps = Math.max(minVideoKbps, Math.floor(videoKbps * (maxBytes / stat.size) * 0.9));
  }
  throw new Error(`não foi possível otimizar ${path.basename(source)}`);
}

async function thumbnail(source, output) {
  await exec("ffmpeg", [
    "-y", "-hide_banner", "-loglevel", "error", "-ss", "3", "-i", source,
    "-frames:v", "1", "-vf", "scale=640:-2", "-q:v", "4", output,
  ], { maxBuffer: 1024 * 1024 });
}

async function prepareRecord(record, index, total) {
  const prefix = record.profile === "vsl" ? "honeypeak-vsl" : "angelica";
  const videoName = `${prefix}-${record.hash.slice(0, 18)}.mp4`;
  const thumbName = `${prefix}-${record.hash.slice(0, 18)}.jpg`;
  const videoPath = path.join(OUTPUT, videoName);
  const thumbPath = path.join(OUTPUT, thumbName);
  const mediaKey = `${record.profile}:${record.hash}`;
  if (!mediaTasks.has(mediaKey)) mediaTasks.set(mediaKey, (async () => {
    const info = await probe(record.source);
    const prepared = await fs.stat(videoPath).catch(() => null);
    const preparedInfo = prepared?.size >= 1024 ? await probe(videoPath).catch(() => null) : null;
    if (!preparedInfo) {
      await fs.rm(videoPath, { force: true });
      await fs.rm(`${videoPath}.part.mp4`, { force: true });
      process.stdout.write(`[${index + 1}/${total}] otimizando ${record.label}\n`);
      await transcode(record.source, videoPath, info, record.profile);
    } else {
      process.stdout.write(`[${index + 1}/${total}] reutilizando ${record.label}\n`);
    }
    const thumb = await fs.stat(thumbPath).catch(() => null);
    if (!thumb || thumb.size < 1024) {
      await fs.rm(thumbPath, { force: true });
      await thumbnail(videoPath, thumbPath);
    }
    return probe(videoPath);
  })());
  const finalInfo = await mediaTasks.get(mediaKey);
  return {
    key: record.key,
    name: record.name,
    niche: record.niche,
    sales: record.sales,
    hash: record.hash,
    videoFile: videoName,
    thumbnailFile: thumbName,
    duration: Math.round(finalInfo.duration * 10) / 10,
    bytes: finalInfo.size,
  };
}

const mediaTasks = new Map();

async function mapWorkers(records) {
  const output = new Array(records.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: WORKERS }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= records.length) return;
      output[index] = await prepareRecord(records[index], index, records.length);
    }
  }));
  return output;
}

async function main() {
  if (!await isDirectory(ANGELICA_ROOT)) throw new Error("informe uma pasta válida em --angelica");
  if (!await isDirectory(VSL_ROOT)) throw new Error("informe uma pasta válida em --vsl");
  await fs.mkdir(OUTPUT, { recursive: true });

  const angelicaFiles = (await listVideos(ANGELICA_ROOT)).sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
  const vslFiles = (await listVideos(VSL_ROOT)).sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
  const angelica = [];
  for (const source of angelicaFiles) {
    const parsed = parseAngelicaName(path.basename(source));
    angelica.push({ source, hash: await sha256(source), key: `angelica:${parsed.name}`, label: parsed.name, ...parsed, profile: "angelica" });
  }
  const vsls = [];
  for (let index = 0; index < vslFiles.length; index += 1) {
    const source = vslFiles[index];
    const number = Number(path.basename(source).match(/(\d+)/)?.[1] || index + 1);
    vsls.push({ source, hash: await sha256(source), key: `honeypeak:vsl:${number}`, label: `VSL ${String(number).padStart(2, "0")}`, name: `VSL ${String(number).padStart(2, "0")}`, niche: "Disfunção Erétil", sales: null, profile: "vsl", number });
  }

  const records = await mapWorkers([...angelica, ...vsls]);
  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    angelica: records.filter(record => record.key.startsWith("angelica:")),
    honeyPeak: records.filter(record => record.key.startsWith("honeypeak:")).sort((a, b) => Number(a.name.match(/\d+/)?.[0]) - Number(b.name.match(/\d+/)?.[0])),
  };
  await fs.writeFile(path.join(OUTPUT, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, angelica: manifest.angelica.length, honeyPeak: manifest.honeyPeak.length, output: OUTPUT }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
