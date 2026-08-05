import { getStore } from "@netlify/blobs";
import { mergeSupabaseOfferData, supabaseAdminHeaders } from "./_supabase-admin.mjs";
import { SUPABASE_URL } from "./_security.mjs";
import { AD_ANALYSIS_MODEL, AD_ANALYSIS_PROMPT_VERSION, ANTHROPIC_URL, buildAdAnalysisPrompt, externalTranscript, finalizeAdReport, imageContent, validateAdReport, validAdDuration } from "./_ad-video-analysis.mjs";

const KEY = process.env.ANTHROPIC_API_KEY || "";
const FALLBACK_MODEL = process.env.AD_ANALYSIS_FALLBACK_MODEL || "claude-sonnet-4-6";
const MAX_OUTPUT_TOKENS = 8_192;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class ClaudeRequestError extends Error {
  constructor(status, detail) {
    super(`Claude HTTP ${status}: ${detail || "erro sem detalhes"}`);
    this.name = "ClaudeRequestError";
    this.status = status;
    this.detail = detail || "";
  }
}

function compactClaudeError(raw) {
  const text = String(raw || "").trim();
  if (!text) return "erro sem detalhes";
  try {
    const body = JSON.parse(text);
    return String((body.error && (body.error.message || body.error.type)) || body.message || text).replace(/\s+/g, " ").slice(0, 700);
  } catch (_) {
    return text.replace(/\s+/g, " ").slice(0, 700);
  }
}

export function claudeRequestBody(model, messages) {
  // Claude Sonnet pode habilitar raciocínio adaptativo. `temperature` não é
  // compatível com esse modo e fazia a API rejeitar a análise com HTTP 400.
  return { model, max_tokens: MAX_OUTPUT_TOKENS, messages };
}

async function requestClaude(input, previous, model, maxImages) {
  const sheets = imageContent(input.contactSheets).slice(0, maxImages);
  const continuation = "Continue do ponto interrompido, sem repetir. Complete todas as seções e mantenha TRANSCRIPT por último.";
  const content = [{ type: "text", text: previous ? continuation : buildAdAnalysisPrompt(input) }, ...(!previous ? sheets : [])];
  const messages = previous
    ? [{ role: "user", content: [{ type: "text", text: buildAdAnalysisPrompt(input) }, ...sheets] }, { role: "assistant", content: [{ type: "text", text: previous }] }, { role: "user", content }]
    : [{ role: "user", content }];
  const response = await fetch(ANTHROPIC_URL, {
    method: "POST", headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify(claudeRequestBody(model, messages)),
    signal: AbortSignal.timeout(240_000),
  });
  if (!response.ok) throw new ClaudeRequestError(response.status, compactClaudeError(await response.text().catch(() => "")));
  const result = await response.json();
  const text = (result.content || []).filter((part) => part.type === "text").map((part) => part.text).join("").trim();
  if (!text) throw new Error("análise vazia");
  return { text, stopReason: result.stop_reason || "" };
}

async function callClaude(input, previous = "") {
  const models = [AD_ANALYSIS_MODEL, FALLBACK_MODEL].filter((model, index, list) => model && list.indexOf(model) === index);
  let lastError;
  for (const model of models) {
    for (const maxImages of [5, 3, 1]) {
      try { return await requestClaude(input, previous, model, maxImages); }
      catch (error) {
        lastError = error;
        const detail = String(error && (error.detail || error.message) || "");
        if (!(error instanceof ClaudeRequestError)) throw error;
        const modelError=[400,404,422].includes(error.status)&&/(model|not found|does not exist|unsupported|invalid model)/i.test(detail);
        if (modelError) break;
        const payloadError=[400,413,422].includes(error.status)&&/(image|request.*(large|size)|payload|context|token|too many|dimensions|megapixel)/i.test(detail);
        if (payloadError&&maxImages>1) continue;
        throw error;
      }
    }
    const detail = String(lastError && (lastError.detail || lastError.message) || "");
    if (!/(model|not found|does not exist|unsupported|invalid model)/i.test(detail)) throw lastError;
  }
  throw lastError || new Error("nenhum modelo Claude disponível");
}

async function completeReport(input) {
  let report = "";
  for (let page = 0; page < 3; page += 1) {
    let response, lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try { response = await callClaude(input, report); break; }
      catch (error) { lastError = error; if (!/(429|5\d\d|timeout|fetch|network)/i.test(String(error.message)) || attempt === 2) throw error; await wait(1500 * (attempt + 1)); }
    }
    if (!response) throw lastError;
    report = report ? `${report}\n${response.text}` : response.text;
    const finalized = finalizeAdReport(report, input);
    const validation = validateAdReport(finalized, externalTranscript(input));
    if (response.stopReason !== "max_tokens" && validation.complete) return finalized;
  }
  const finalized = finalizeAdReport(report, input);
  const validation = validateAdReport(finalized, externalTranscript(input));
  if (!validation.complete) throw new Error(`análise incompleta: ${validation.missing.join(", ")}`);
  return finalized;
}

async function saveToCard(input, report) {
  if (!input.cardId) return;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(input.cardId)}&select=data`, { headers: await supabaseAdminHeaders({ accept: "application/json" }), signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`card HTTP ${response.status}`);
  const row = (await response.json())[0];
  if (!row) throw new Error("card não encontrado");
  const now = new Date().toISOString();
  const patch = { adVisualAnalysis: report, adAnalysisStatus: "complete", adAnalysisPromptVersion: AD_ANALYSIS_PROMPT_VERSION, adAnalysisUpdatedAt: now, adAnalysisDuration: Number(input.duration) };
  await mergeSupabaseOfferData(input.cardId, patch, { ...(row.data || {}), ...patch });
}

export default async (req) => {
  if (req.method !== "POST") return;
  const store = getStore({ name: "ad-analysis-jobs", consistency: "strong" });
  let job;
  try {
    if (!KEY) throw new Error("serviço não configurado");
    const body = JSON.parse(await req.text() || "{}");
    job = await store.get(String(body.id || ""), { type: "json" });
    if (!job || job.jobKey !== body.key || job.status === "complete") return;
    if (!validAdDuration(job.input && job.input.duration)) throw new Error("duração incompatível com anúncio");
    job.status = "working"; job.progress = 20; job.message = "Lendo vídeo, copy e linha do tempo…"; job.updatedAt = new Date().toISOString(); await store.setJSON(job.id, job);
    const report = await completeReport(job.input);
    job.report = report; job.progress = 90; job.message = "Salvando a dissecação no card…"; job.updatedAt = new Date().toISOString(); await store.setJSON(job.id, job);
    await saveToCard(job.input, report);
    job.status = "complete"; job.progress = 100; job.message = "Engenharia reversa concluída."; job.updatedAt = new Date().toISOString(); await store.setJSON(job.id, job);
  } catch (error) {
    console.error("ad-analysis-background:", String(error && error.message || error).slice(0, 300));
    if (job) { job.status = "error"; job.error = String(error && error.message || error).slice(0, 500); job.message = job.error; job.updatedAt = new Date().toISOString(); await store.setJSON(job.id, job).catch(() => {}); if (job.input && job.input.cardId) await mergeSupabaseOfferData(job.input.cardId, { adAnalysisStatus: "error", adAnalysisError: job.error, adAnalysisUpdatedAt: job.updatedAt }).catch(() => {}); }
  }
};

export const config = { background: true };
export { completeReport };
