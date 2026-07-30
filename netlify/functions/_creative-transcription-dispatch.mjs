import { createHmac } from "node:crypto";
import { SUPABASE_URL } from "./_security.mjs";
import {
  queueTranscription,
  transcriptionDue,
} from "./_creative-integrity.mjs";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const MAX_DISPATCHES = 4;
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
    if (!response.ok) throw new Error(`não foi possível consultar as transcrições (HTTP ${response.status})`);
    const page = await response.json();
    if (!Array.isArray(page)) throw new Error("resposta inválida ao consultar as transcrições");
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  const now = Date.now();
  return rows
    .filter(row => transcriptionDue(row?.data || {}, now))
    .sort((a, b) => (Number(a?.data?.transcriptionAttempts) || 0) - (Number(b?.data?.transcriptionAttempts) || 0))
    .slice(0, MAX_DISPATCHES);
}

async function saveData(id, data) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: serverHeaders({ "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify({ data }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`não foi possível reservar a transcrição ${id}`);
}

async function dispatch(row, data) {
  const body = JSON.stringify({
    id: row.id,
    videoUrl: data.video,
    attempt: data.transcriptionAttempts,
  });
  const signature = createHmac("sha256", SERVICE_KEY).update(body).digest("hex");
  const origin = String(process.env.URL || process.env.DEPLOY_PRIME_URL || "https://benchmarkinggrupofeg.site").replace(/\/+$/, "");
  const response = await fetch(`${origin}/.netlify/functions/transcribe-background`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-feg-transcription-signature": signature },
    body,
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`worker de transcrição recusou ${row.id} (HTTP ${response.status})`);
}

async function release(row, data) {
  const attempts = Math.max(1, Number(data.transcriptionAttempts) || 1);
  const delayMinutes = Math.min(6 * 60, 10 * (2 ** Math.min(7, attempts - 1)));
  await saveData(row.id, {
    ...data,
    transcriptionStatus: "retry_scheduled",
    transcricaoStatus: "pending",
    transcriptionLastError: "não foi possível iniciar o worker",
    transcriptionNextRetryAt: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
  });
}

export default async function runCreativeTranscriptionDispatch() {
  if (!SERVICE_KEY) {
    console.error("creative transcription: SUPABASE_SERVICE_ROLE_KEY não configurada");
    return Response.json({ ok: false, error: "automação não configurada" }, { status: 500 });
  }
  try {
    const pending = await listPending();
    let dispatched = 0;
    for (const row of pending) {
      const queued = queueTranscription(row.data || {}, new Date().toISOString());
      try {
        await saveData(row.id, queued);
        await dispatch(row, queued);
        dispatched += 1;
      } catch (error) {
        console.error("creative transcription dispatch:", String(error?.message || error));
        await release(row, queued).catch(() => {});
      }
    }
    console.log(`creative transcription: ${dispatched} item(ns) enviado(s)`);
    return Response.json({ ok: true, pending: pending.length, dispatched });
  } catch (error) {
    console.error("creative transcription scheduled:", String(error?.message || error));
    return Response.json({ ok: false, error: "não foi possível executar a automação" }, { status: 500 });
  }
}
