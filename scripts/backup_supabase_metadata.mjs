#!/usr/bin/env node
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import fs from "node:fs/promises";
import path from "node:path";
import { authHeaders, productionAdminAuth } from "./_supabase-auth.mjs";

const PAGE_SIZE = 500;

function collectStorageUrls(value, output = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) collectStorageUrls(item, output);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectStorageUrls(item, output);
  } else if (typeof value === "string" && value.includes("/storage/v1/object/")) {
    output.add(value);
  }
  return output;
}

async function readAllOffers(auth) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const response = await fetch(`${auth.url}/rest/v1/offers?select=id,created_at,data&order=id.asc`, {
      headers: authHeaders(auth, {
        Accept: "application/json",
        "Range-Unit": "items",
        Range: `${offset}-${offset + PAGE_SIZE - 1}`,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`backup: leitura recusada (HTTP ${response.status})`);
    const page = await response.json();
    if (!Array.isArray(page)) throw new Error("backup: resposta inválida");
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

const auth = await productionAdminAuth();
const rows = await readAllOffers(auth);
const generatedAt = new Date().toISOString();
const storageUrls = [...collectStorageUrls(rows)].sort();
const payload = JSON.stringify({
  schema: "swipe-offers-logical-backup-v1",
  generatedAt,
  source: new URL(auth.url).hostname,
  rows,
});
const compressed = gzipSync(payload, { level: 9 });
const checksum = createHash("sha256").update(compressed).digest("hex");
const day = generatedAt.slice(0, 10);
const outputDir = path.resolve(process.env.BACKUP_DIR || ".backups");
await fs.mkdir(outputDir, { recursive: true, mode: 0o700 });
const backupPath = path.join(outputDir, `offers-${day}.json.gz`);
const manifestPath = path.join(outputDir, `offers-${day}.manifest.json`);
await fs.writeFile(backupPath, compressed, { mode: 0o600 });
await fs.writeFile(manifestPath, JSON.stringify({
  generatedAt,
  rows: rows.length,
  storageReferences: storageUrls.length,
  sha256: checksum,
  bytes: compressed.byteLength,
  storageUrls,
}, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ ok: true, rows: rows.length, storageReferences: storageUrls.length, bytes: compressed.byteLength, sha256: checksum }));
