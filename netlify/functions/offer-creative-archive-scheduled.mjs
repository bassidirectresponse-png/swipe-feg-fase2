import { createHmac } from "node:crypto";
import { SUPABASE_URL } from "./_security.mjs";

export const config = { schedule: "*/10 * * * *" };

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const MAX_DISPATCHES = 4;
const STALE_QUEUE_MS = 45 * 60_000;
const MAX_ATTEMPTS = 12;

function serverHeaders(extra = {}) {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    ...extra,
  };
}

function isFacebookUrl(value) {
  try {
    const url = new URL(String(value || ""));
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    return url.protocol === "https:" && !url.username && !url.password
      && ["facebook.com", "fb.com", "fb.me", "fb.watch"].some(suffix => host === suffix || host.endsWith(`.${suffix}`));
  } catch {
    return false;
  }
}

function hasStoredMedia(data) {
  return Boolean(String(data.video || "").trim() || String(data.print || data.img || "").trim());
}

function isDue(data, now) {
  const status = String(data.mediaArchiveStatus || data.fbIngestStatus || "").toLowerCase();
  const attempts = Math.max(0, Number(data.mediaArchiveAttempts) || 0);
  if (attempts >= MAX_ATTEMPTS || status === "done" || hasStoredMedia(data)) return false;
  const nextRetry = Date.parse(data.mediaArchiveNextRetryAt || "");
  if (Number.isFinite(nextRetry) && nextRetry > now) return false;
  if (status === "queued" || status === "working") {
    const queuedAt = Date.parse(data.mediaArchiveQueuedAt || data.fbIngestAt || "");
    return !Number.isFinite(queuedAt) || now - queuedAt >= STALE_QUEUE_MS;
  }
  return true;
}

async function listPending() {
  const params = new URLSearchParams({ select: "id,data", limit: "1000" });
  const response = await fetch(`${SUPABASE_URL}/rest/v1/offers?${params}`, {
    headers: serverHeaders({ accept: "application/json" }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`não foi possível consultar os criativos (HTTP ${response.status})`);
  const rows = await response.json();
  const now = Date.now();
  return (Array.isArray(rows) ? rows : [])
    .filter(row => {
      const data = row?.data || {};
      return data.kind === "criativo"
        && Boolean(data.sourceOfferId)
        && data.mediaArchiveRequired === true
        && isFacebookUrl(data.linkAnuncio)
        && isDue(data, now);
    })
    .sort((a, b) => (Number(a?.data?.mediaArchiveAttempts) || 0) - (Number(b?.data?.mediaArchiveAttempts) || 0))
    .slice(0, MAX_DISPATCHES);
}

async function markQueued(row) {
  const now = new Date().toISOString();
  const data = {
    ...(row.data || {}),
    fbIngestStatus: "working",
    fbIngestError: "",
    mediaArchiveRequired: true,
    mediaArchiveStatus: "queued",
    mediaArchiveQueuedAt: now,
    mediaArchiveAttempts: Math.max(0, Number(row?.data?.mediaArchiveAttempts) || 0) + 1,
  };
  const response = await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(row.id)}`, {
    method: "PATCH",
    headers: serverHeaders({ "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify({ data }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`não foi possível reservar o criativo ${row.id}`);
  return data;
}

async function dispatch(row, data) {
  const body = JSON.stringify({
    id: row.id,
    sourceOfferId: data.sourceOfferId,
    adUrl: data.linkAnuncio,
    attempt: data.mediaArchiveAttempts,
  });
  const signature = createHmac("sha256", SERVICE_KEY).update(body).digest("hex");
  const origin = String(process.env.URL || process.env.DEPLOY_PRIME_URL || "https://benchmarkinggrupofeg.site").replace(/\/+$/, "");
  const response = await fetch(`${origin}/.netlify/functions/offer-creative-archive-background`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-feg-archive-signature": signature },
    body,
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`worker recusou o criativo ${row.id} (HTTP ${response.status})`);
}

export default async () => {
  if (!SERVICE_KEY) {
    console.error("offer archive: SUPABASE_SERVICE_ROLE_KEY não configurada");
    return Response.json({ ok: false, error: "automação não configurada" }, { status: 500 });
  }
  try {
    const pending = await listPending();
    let dispatched = 0;
    for (const row of pending) {
      try {
        const data = await markQueued(row);
        await dispatch(row, data);
        dispatched += 1;
      } catch (error) {
        console.error("offer archive dispatch:", String(error?.message || error));
      }
    }
    console.log(`offer archive: ${dispatched} criativo(s) enviado(s)`);
    return Response.json({ ok: true, pending: pending.length, dispatched });
  } catch (error) {
    console.error("offer archive scheduled:", String(error?.message || error));
    return Response.json({ ok: false, error: "não foi possível executar a automação" }, { status: 500 });
  }
};
