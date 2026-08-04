import { createHmac } from "node:crypto";
import { SUPABASE_URL } from "./_security.mjs";
import { acquireAutomationLock, releaseAutomationLock } from "./_automation-lock.mjs";
import {
  automationSigningSecret,
  mergeSupabaseOfferData,
  shallowDataPatch,
  supabaseAdminHeaders,
} from "./_supabase-admin.mjs";
import {
  queueTranscription,
  transcriptionDue,
} from "./_creative-integrity.mjs";

const MAX_DISPATCHES = 4;
const PAGE_SIZE = 1000;

const serverHeaders = supabaseAdminHeaders;

async function listPending() {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const params = new URLSearchParams({
      select: "id,data",
      "data->>kind": "in.(criativo,megabrain)",
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    const response = await fetch(`${SUPABASE_URL}/rest/v1/offers?${params}`, {
      headers: await serverHeaders({ accept: "application/json" }),
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

async function saveData(id, before, data) {
  await mergeSupabaseOfferData(id, shallowDataPatch(before, data), data);
}

async function dispatch(row, data) {
  const body = JSON.stringify({
    id: row.id,
    videoUrl: data.video,
    attempt: data.transcriptionAttempts,
  });
  const signature = createHmac("sha256", automationSigningSecret()).update(body).digest("hex");
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
  await saveData(row.id, data, {
    ...data,
    transcriptionStatus: "retry_scheduled",
    transcricaoStatus: "pending",
    transcriptionLastError: "não foi possível iniciar o worker",
    transcriptionNextRetryAt: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
  });
}

export default async function runCreativeTranscriptionDispatch() {
  const lock = await acquireAutomationLock("creative-transcription", 9 * 60_000);
  if (!lock) return Response.json({ ok: true, skipped: "already_running" });
  try {
    const pending = await listPending();
    let dispatched = 0;
    for (const row of pending) {
      const queued = queueTranscription(row.data || {}, new Date().toISOString());
      try {
        await saveData(row.id, row.data || {}, queued);
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
  } finally {
    await releaseAutomationLock(lock);
  }
}
