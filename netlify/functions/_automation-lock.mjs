import { randomUUID } from "node:crypto";
import { getStore } from "@netlify/blobs";

const localLocks = globalThis.__fegAutomationLocks || new Map();
if (!globalThis.__fegAutomationLocks) globalThis.__fegAutomationLocks = localLocks;

export async function acquireAutomationLock(name, ttlMs = 8 * 60_000) {
  const key = `lock/${String(name).replace(/[^a-z0-9_-]/gi, "-")}`;
  const token = randomUUID();
  const now = Date.now();
  const value = { token, expiresAt: now + ttlMs };
  try {
    const store = getStore({ name: "automation-locks", consistency: "strong" });
    const current = await store.getWithMetadata(key, { type: "json", consistency: "strong" });
    if (current?.data?.expiresAt > now) return null;
    const condition = current?.etag ? { onlyIfMatch: current.etag } : { onlyIfNew: true };
    const result = await store.setJSON(key, value, condition);
    if (!result.modified) return null;
    return { key, token, store };
  } catch {
    const current = localLocks.get(key);
    if (current?.expiresAt > now) return null;
    localLocks.set(key, value);
    return { key, token, store: null };
  }
}

export async function releaseAutomationLock(lock) {
  if (!lock) return;
  if (!lock.store) {
    if (localLocks.get(lock.key)?.token === lock.token) localLocks.delete(lock.key);
    return;
  }
  try {
    const current = await lock.store.getWithMetadata(lock.key, { type: "json", consistency: "strong" });
    if (current?.data?.token !== lock.token || !current.etag) return;
    await lock.store.setJSON(lock.key, { token: lock.token, expiresAt: 0 }, { onlyIfMatch: current.etag });
  } catch {}
}
