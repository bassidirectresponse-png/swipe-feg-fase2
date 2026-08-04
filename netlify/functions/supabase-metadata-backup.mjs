import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { getStore } from "@netlify/blobs";
import { acquireAutomationLock, releaseAutomationLock } from "./_automation-lock.mjs";
import { supabaseAdminHeaders } from "./_supabase-admin.mjs";
import { SUPABASE_URL } from "./_security.mjs";

const PAGE_SIZE = 500;
const RETENTION_DAYS = 30;
const STORE_NAME = "supabase-metadata-backups";

export const config = { schedule: "35 5 * * *" };

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

async function readAllOffers() {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/offers?select=id,created_at,data&order=id.asc`, {
      headers: await supabaseAdminHeaders({
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

function dayFromKey(key) {
  return String(key || "").match(/^daily\/(\d{4}-\d{2}-\d{2})\//)?.[1] || "";
}

async function enforceRetention(store, today) {
  const cutoff = new Date(`${today}T00:00:00.000Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - RETENTION_DAYS);
  const listed = await store.list({ prefix: "daily/" });
  let deleted = 0;
  for (const blob of listed.blobs) {
    const day = dayFromKey(blob.key);
    if (!day || new Date(`${day}T00:00:00.000Z`) >= cutoff) continue;
    await store.delete(blob.key);
    deleted += 1;
  }
  return deleted;
}

export default async () => {
  const lock = await acquireAutomationLock("supabase-metadata-backup", 10 * 60_000);
  if (!lock) return Response.json({ ok: true, skipped: "backup em andamento" });

  try {
    const rows = await readAllOffers();
    const generatedAt = new Date().toISOString();
    const day = generatedAt.slice(0, 10);
    const storageUrls = [...collectStorageUrls(rows)].sort();
    const payload = JSON.stringify({
      schema: "swipe-offers-logical-backup-v1",
      generatedAt,
      source: new URL(SUPABASE_URL).hostname,
      rows,
    });
    const compressed = gzipSync(payload, { level: 9 });
    const sha256 = createHash("sha256").update(compressed).digest("hex");
    const manifest = {
      generatedAt,
      rows: rows.length,
      storageReferences: storageUrls.length,
      sha256,
      bytes: compressed.byteLength,
      storageUrls,
    };

    const store = getStore({ name: STORE_NAME, consistency: "strong" });
    const prefix = `daily/${day}`;
    await store.set(`${prefix}/offers.json.gz`, new Blob([compressed], { type: "application/gzip" }), {
      metadata: { generatedAt, rows: rows.length, sha256 },
    });
    await store.setJSON(`${prefix}/manifest.json`, manifest);
    await store.setJSON("latest.json", { ...manifest, backupKey: `${prefix}/offers.json.gz` });
    const deletedByRetention = await enforceRetention(store, day);

    return Response.json({
      ok: true,
      rows: rows.length,
      storageReferences: storageUrls.length,
      bytes: compressed.byteLength,
      sha256,
      deletedByRetention,
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("Supabase metadata backup failed:", String(error?.message || error));
    return Response.json({ ok: false, error: "backup automático indisponível" }, {
      status: 500,
      headers: { "cache-control": "no-store" },
    });
  } finally {
    await releaseAutomationLock(lock);
  }
};
