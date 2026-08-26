import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const OUTPUT = path.resolve(process.argv[2] || "prepared/swipe-spy-2026-08-26");
const MAX_BYTES = 48 * 1024 * 1024;
const COPY_BYTES = 45 * 1024 * 1024;
const TARGET_BYTES = 44 * 1024 * 1024;
const WORKERS = Math.max(1, Math.min(3, Number(process.env.SPY_TRANSCODE_WORKERS || 3)));
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".m4v", ".webm"]);

const META_ROOT = "/Users/guilhermeaugustobassi/Desktop/criativos spy swl/DOWLOAD CRIATIVOS SPY 26-08";
const SOURCES = [
  { dir: path.join(META_ROOT, "DIABETES"), nicho: "Diabetes/Glicose", plataforma: "meta", importBatch: "SPY META DB 2026-08-26", facebookManifest: true },
  { dir: path.join(META_ROOT, "MEMORY"), nicho: "Memória", plataforma: "meta", importBatch: "SPY META MEMO 2026-08-26", facebookManifest: true },
  { dir: path.join(META_ROOT, "WL"), nicho: "Emagrecimento", plataforma: "meta", importBatch: "SPY META WL 2026-08-26", facebookManifest: true },
  { dir: path.join(META_ROOT, "ED"), nicho: "Disfunção Erétil", plataforma: "meta", importBatch: "SPY META ED 2026-08-26", facebookManifest: true },
  { dir: "/Users/guilhermeaugustobassi/Desktop/criativos spy swl/Diabetes - 20-08-2026", nicho: "Diabetes/Glicose", plataforma: "meta", importBatch: "SPY META DB 2026-08-20", facebookManifest: false },
  { dir: "/Volumes/PortableSSD/CRIATIVOS FEG SPY/CRIATIVOS SPY NATIVO DOWLOAD/WL BK", nicho: "Emagrecimento", plataforma: "taboola", importBatch: "SPY NATIVO WL BK 2026-08-26", facebookManifest: false },
];

async function sha256(file) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(file);
    stream.on("error", reject);
    stream.on("data", chunk => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function naturalCompare(a, b) {
  return a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" });
}

function sourceIndex(file) {
  const match = path.basename(file).match(/^(\d+)/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

async function facebookLinks(dir) {
  const manifest = path.join(dir, "manifest.jsonl");
  const text = await fs.readFile(manifest, "utf8").catch(() => "");
  const result = new Map();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const record = JSON.parse(line);
      const url = String(record.source_url || "").trim();
      if (Number.isFinite(Number(record.index)) && /^https:\/\/(?:www\.)?facebook\.com\//i.test(url)) result.set(Number(record.index), url);
    } catch {}
  }
  return result;
}

async function sourceRecords(source) {
  const entries = await fs.readdir(source.dir, { withFileTypes: true });
  const links = source.facebookManifest ? await facebookLinks(source.dir) : new Map();
  return entries
    .filter(entry => entry.isFile() && !entry.name.startsWith("._") && VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map(entry => {
      const file = path.join(source.dir, entry.name);
      const index = sourceIndex(file);
      return {
        file,
        sourceFile: entry.name,
        originalName: path.basename(entry.name, path.extname(entry.name)),
        nicho: source.nicho,
        plataforma: source.plataforma,
        importBatch: source.importBatch,
        sourceKey: `${source.importBatch}/${entry.name}`.toLowerCase(),
        linkAnuncio: links.get(index) || "",
        index,
      };
    })
    .sort((a, b) => a.index - b.index || naturalCompare(a.sourceFile, b.sourceFile));
}

async function probe(file) {
  const { stdout } = await exec("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-show_entries", "stream=codec_name,codec_type", "-of", "json", file], { maxBuffer: 1024 * 1024 });
  const parsed = JSON.parse(stdout);
  const video = (parsed.streams || []).find(stream => stream.codec_type === "video");
  const duration = Number(parsed.format?.duration || 0);
  if (!video || !Number.isFinite(duration) || duration <= 0) throw new Error(`vídeo sem duração válida: ${file}`);
  return { codec: String(video.codec_name || "").toLowerCase(), duration };
}

async function validPrepared(file) {
  try {
    const stat = await fs.stat(file);
    if (stat.size < 1024 || stat.size > MAX_BYTES) return false;
    return (await probe(file)).codec === "h264";
  } catch { return false; }
}

async function transcode(source, output, duration) {
  const audioKbps = 64;
  const calculated = Math.floor((TARGET_BYTES * 8 / duration / 1000) - audioKbps - 12);
  let videoKbps = Math.max(260, Math.min(1800, calculated));
  const temp = `${output}.part.mp4`;
  const filter = "scale=if(gt(iw\\,ih)\\,min(1280\\,iw)\\,min(720\\,iw)):-2";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await fs.rm(temp, { force: true });
    const common = ["-y", "-hide_banner", "-loglevel", "error", "-i", source, "-map", "0:v:0", "-map", "0:a?", "-vf", filter, "-b:v", `${videoKbps}k`, "-maxrate", `${Math.round(videoKbps * 1.15)}k`, "-bufsize", `${Math.round(videoKbps * 2)}k`, "-pix_fmt", "yuv420p", "-tag:v", "avc1", "-c:a", "aac", "-b:a", `${audioKbps}k`, "-movflags", "+faststart", temp];
    try { await exec("ffmpeg", [...common.slice(0, 12), "-c:v", "h264_videotoolbox", ...common.slice(12)], { maxBuffer: 2 * 1024 * 1024 }); }
    catch { await exec("ffmpeg", [...common.slice(0, 12), "-c:v", "libx264", "-preset", "veryfast", ...common.slice(12)], { maxBuffer: 2 * 1024 * 1024 }); }
    const stat = await fs.stat(temp);
    if (stat.size <= MAX_BYTES) { await fs.rename(temp, output); return; }
    videoKbps = Math.max(220, Math.floor(videoKbps * (MAX_BYTES / stat.size) * 0.9));
  }
  throw new Error(`não foi possível reduzir para menos de 48 MB: ${source}`);
}

async function prepare(record, index, total) {
  const mediaFile = `${String(index + 1).padStart(3, "0")}-${record.sourceHash.slice(0, 16)}.mp4`;
  const output = path.join(OUTPUT, mediaFile);
  if (await validPrepared(output)) {
    process.stdout.write(`[${index + 1}/${total}] pronto ${record.importBatch}/${record.sourceFile}\n`);
    return { ...record, mediaFile };
  }
  const sourceStat = await fs.stat(record.file);
  const info = await probe(record.file);
  process.stdout.write(`[${index + 1}/${total}] preparando ${record.importBatch}/${record.sourceFile}\n`);
  await fs.rm(output, { force: true });
  if (sourceStat.size <= COPY_BYTES && path.extname(record.file).toLowerCase() === ".mp4" && info.codec === "h264") {
    try { await fs.link(record.file, output); }
    catch { await fs.copyFile(record.file, output); }
  } else await transcode(record.file, output, info.duration);
  if (!(await validPrepared(output))) throw new Error(`saída inválida: ${record.sourceFile}`);
  return { ...record, mediaFile };
}

async function main() {
  for (const source of SOURCES) {
    if (!(await fs.stat(source.dir).catch(() => null))?.isDirectory()) throw new Error(`Pasta não encontrada: ${source.dir}`);
  }
  await fs.mkdir(OUTPUT, { recursive: true });
  const all = (await Promise.all(SOURCES.map(sourceRecords))).flat();
  const unique = new Map();
  const duplicates = [];
  process.stdout.write(`Analisando ${all.length} arquivos…\n`);
  for (const record of all) {
    const sourceHash = await sha256(record.file);
    if (unique.has(sourceHash)) {
      const kept = unique.get(sourceHash);
      duplicates.push({ duplicate: `${record.importBatch}/${record.sourceFile}`, kept: `${kept.importBatch}/${kept.sourceFile}`, sourceHash });
      continue;
    }
    unique.set(sourceHash, { ...record, sourceHash });
  }
  const records = [...unique.values()];
  const prepared = new Array(records.length);let cursor = 0;
  await Promise.all(Array.from({ length: WORKERS }, async () => {
    for (;;) {
      const index = cursor++;if (index >= records.length) return;
      prepared[index] = await prepare(records[index], index, records.length);
    }
  }));
  const manifest = {
    schemaVersion: 1,
    collection: "Swipe de Criativos",
    generatedAt: new Date().toISOString(),
    sourceFiles: all.length,
    duplicatesRemoved: duplicates.length,
    duplicates,
    records: prepared.map(({ file, index, ...record }) => record),
  };
  await fs.writeFile(path.join(OUTPUT, "swipe-import.json"), JSON.stringify(manifest, null, 2) + "\n");
  const byNiche = prepared.reduce((acc, record) => { acc[record.nicho] = (acc[record.nicho] || 0) + 1;return acc; }, {});
  const totalBytes = (await Promise.all(prepared.map(record => fs.stat(path.join(OUTPUT, record.mediaFile))))).reduce((sum, stat) => sum + stat.size, 0);
  console.log(JSON.stringify({ ok: true, output: OUTPUT, sourceFiles: all.length, unique: prepared.length, duplicatesRemoved: duplicates.length, byNiche, totalBytes }, null, 2));
}

main().catch(error => { console.error(error);process.exitCode = 1; });
