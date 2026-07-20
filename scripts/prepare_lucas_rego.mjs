import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const ROOT = path.resolve(process.argv[2] || "/Volumes/PortableSSD/BRAIN FEG CRIATIVOS/ADS LUCAS REGO");
const OUTPUT = path.resolve(process.argv[3] || path.join(os.tmpdir(), "lucas-rego-ready"));
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".m4v", ".webm"]);
const MAX_BYTES = 48 * 1024 * 1024;
const COPY_BYTES = 45 * 1024 * 1024;
const TARGET_BYTES = 44 * 1024 * 1024;
const WORKERS = Math.max(1, Math.min(3, Number(process.env.LUCAS_TRANSCODE_WORKERS || 3)));
const NICHE_BY_FOLDER = new Map([
  ["WL", "Emagrecimento"],
  ["ED", "Disfunção Erétil"],
  ["MEMO", "Memória"],
]);

async function walk(dir) {
  const result = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith("._")) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await walk(absolute));
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

function nicheFor(file) {
  const first = path.relative(ROOT, file).split(path.sep)[0].toUpperCase();
  const niche = NICHE_BY_FOLDER.get(first);
  if (!niche) throw new Error(`Pasta sem nicho reconhecido: ${path.relative(ROOT, file)}`);
  return niche;
}

async function probe(file) {
  const { stdout } = await exec("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-show_entries", "stream=codec_name,codec_type", "-of", "json", file], { maxBuffer: 1024 * 1024 });
  const parsed = JSON.parse(stdout);
  const video = (parsed.streams || []).find(stream => stream.codec_type === "video");
  const duration = Number(parsed.format?.duration || 0);
  if (!video || !Number.isFinite(duration) || duration <= 0) throw new Error("vídeo sem duração válida");
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
  let videoKbps = Math.max(260, Math.min(1500, calculated));
  const temp = `${output}.part.mp4`;
  const filter = "scale=if(gt(iw\\,ih)\\,min(1280\\,iw)\\,min(720\\,iw)):-2";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await fs.rm(temp, { force: true });
    const args = ["-y", "-hide_banner", "-loglevel", "error", "-i", source, "-map", "0:v:0", "-map", "0:a?", "-vf", filter, "-c:v", "h264_videotoolbox", "-b:v", `${videoKbps}k`, "-maxrate", `${Math.round(videoKbps * 1.15)}k`, "-bufsize", `${Math.round(videoKbps * 2)}k`, "-pix_fmt", "yuv420p", "-tag:v", "avc1", "-c:a", "aac", "-b:a", `${audioKbps}k`, "-movflags", "+faststart", temp];
    try { await exec("ffmpeg", args, { maxBuffer: 2 * 1024 * 1024 }); }
    catch {
      args.splice(args.indexOf("h264_videotoolbox"), 1, "libx264", "-preset", "veryfast");
      await exec("ffmpeg", args, { maxBuffer: 2 * 1024 * 1024 });
    }
    const stat = await fs.stat(temp);
    if (stat.size <= MAX_BYTES) { await fs.rename(temp, output); return; }
    videoKbps = Math.max(220, Math.floor(videoKbps * (MAX_BYTES / stat.size) * 0.9));
  }
  throw new Error("não foi possível reduzir o vídeo para menos de 48 MB");
}

async function prepare(record, index, total) {
  const outputName = `${String(index + 1).padStart(3, "0")}-${record.sourceHash.slice(0, 16)}.mp4`;
  const output = path.join(OUTPUT, outputName);
  if (await validPrepared(output)) {
    process.stdout.write(`[${index + 1}/${total}] pronto ${record.nome}\n`);
    return { ...record, mediaFile: outputName };
  }
  const sourceStat = await fs.stat(record.file);
  const info = await probe(record.file);
  process.stdout.write(`[${index + 1}/${total}] preparando ${record.nome}\n`);
  if (sourceStat.size <= COPY_BYTES && path.extname(record.file).toLowerCase() === ".mp4" && info.codec === "h264") await fs.copyFile(record.file, output);
  else await transcode(record.file, output, info.duration);
  if (!(await validPrepared(output))) throw new Error(`saída inválida: ${record.nome}`);
  return { ...record, mediaFile: outputName };
}

async function main() {
  if (!(await fs.stat(ROOT).catch(() => null))?.isDirectory()) throw new Error(`Pasta não encontrada: ${ROOT}`);
  await fs.mkdir(OUTPUT, { recursive: true });
  const files = (await walk(ROOT)).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const unique = new Map();
  process.stdout.write(`Analisando ${files.length} arquivos…\n`);
  for (const file of files) {
    const hash = await sha256(file), previous = unique.get(hash);
    if (!previous || / \(1\)\.[^.]+$/i.test(path.basename(previous))) unique.set(hash, file);
  }
  const records = [...unique].map(([sourceHash, file]) => ({
    sourceHash,
    file,
    sourceFile: path.relative(ROOT, file),
    nome: path.basename(file, path.extname(file)).replace(/ \(1\)$/i, "").trim(),
    nicho: nicheFor(file),
  }));
  const prepared = new Array(records.length);let cursor = 0;
  await Promise.all(Array.from({ length: WORKERS }, async () => {
    for (;;) {
      const index = cursor++;if (index >= records.length) return;
      prepared[index] = await prepare(records[index], index, records.length);
    }
  }));
  const manifest = {
    collection: "Lucas Rego",
    label: "CRIATIVOS LUCAS REGO",
    generatedAt: new Date().toISOString(),
    sourceFiles: files.length,
    duplicatesRemoved: files.length - prepared.length,
    records: prepared.map(({ file, ...record }) => record),
  };
  await fs.writeFile(path.join(OUTPUT, "lucas-rego-import.json"), JSON.stringify(manifest, null, 2) + "\n");
  const totalBytes = (await Promise.all(prepared.map(record => fs.stat(path.join(OUTPUT, record.mediaFile))))).reduce((sum, stat) => sum + stat.size, 0);
  console.log(JSON.stringify({ ok: true, output: OUTPUT, sourceFiles: files.length, unique: prepared.length, duplicatesRemoved: files.length - prepared.length, totalBytes }, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
