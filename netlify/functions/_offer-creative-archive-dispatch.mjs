import { createHmac } from "node:crypto";
import { SUPABASE_URL } from "./_security.mjs";
import {
  mediaArchiveDue,
  queueMediaArchive,
} from "./_creative-integrity.mjs";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const MAX_DISPATCHES = 8;
const PAGE_SIZE = 1000;

function serverHeaders(extra = {}) {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    ...extra,
  };
}

async function listPending() {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const params = new URLSearchParams({ select: "id,data", limit: String(PAGE_SIZE), offset: String(offset) });
    const response = await fetch(`${SUPABASE_URL}/rest/v1/offers?${params}`, {
      headers: serverHeaders({ accept: "application/json" }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`não foi possível consultar os criativos (HTTP ${response.status})`);
    const page = await response.json();
    if (!Array.isArray(page)) throw new Error("resposta inválida ao consultar os criativos");
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  const now = Date.now();
  return rows
    .filter(row => mediaArchiveDue(row?.data || {}, now))
    .sort((a, b) => (Number(a?.data?.mediaArchiveAttempts) || 0) - (Number(b?.data?.mediaArchiveAttempts) || 0))
    .slice(0, MAX_DISPATCHES);
}

async function markQueued(row) {
  const now = new Date().toISOString();
  const data = queueMediaArchive(row.data || {}, now);
  const response = await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(row.id)}`, {
    method: "PATCH",
    headers: serverHeaders({ "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify({ data }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`não foi possível reservar o criativo ${row.id}`);
  return data;
}

async function markDispatchFailure(row, data) {
  const attempts = Math.max(1, Number(data.mediaArchiveAttempts) || 1);
  const delayMinutes = Math.min(12 * 60, 10 * (2 ** Math.min(8, attempts - 1)));
  const next = {
    ...data,
    fbIngestStatus: "pending",
    mediaArchiveStatus: "retry_scheduled",
    mediaArchiveError: "não foi possível iniciar o worker",
    mediaArchiveNextRetryAt: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
  };
  const response = await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(row.id)}`, {
    method: "PATCH",
    headers: serverHeaders({ "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify({ data: next }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) console.error(`offer archive: falha ao liberar ${row.id}`);
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
      let queued = row.data || {};
      try {
        queued = await markQueued(row);
        await dispatch(row, queued);
        dispatched += 1;
      } catch (error) {
        console.error("offer archive dispatch:", String(error?.message || error));
        await markDispatchFailure(row, queued).catch(() => {});
      }
    }
    console.log(`offer archive: ${dispatched} criativo(s) enviado(s)`);
    return Response.json({ ok: true, pending: pending.length, dispatched });
  } catch (error) {
    console.error("offer archive scheduled:", String(error?.message || error));
    return Response.json({ ok: false, error: "não foi possível executar a automação" }, { status: 500 });
  }
};
