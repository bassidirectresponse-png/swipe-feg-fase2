import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const config = await readFile(new URL("../netlify.toml", import.meta.url), "utf8");
const hashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
  .map(match => `'sha256-${createHash("sha256").update(match[1]).digest("base64")}'`);

if (!hashes.length) throw new Error("nenhum script inline encontrado");
if (process.argv.includes("--check")) {
  const missing = hashes.filter(hash => !config.includes(hash));
  if (missing.length) {
    console.error(`CSP desatualizada: ${missing.length} hash ausente`);
    process.exitCode = 1;
  } else console.log(`CSP válida: ${hashes.length} hash(es) inline conferido(s)`);
} else {
  for (const hash of hashes) console.log(hash);
}
