import { getStore } from "@netlify/blobs";
import { mergeSupabaseOfferData, supabaseAdminHeaders } from "./_supabase-admin.mjs";
import { SUPABASE_URL } from "./_security.mjs";
import { AD_ANALYSIS_MODEL, AD_ANALYSIS_PROMPT_VERSION, ANTHROPIC_URL, buildAdAnalysisPrompt, externalTranscript, finalizeAdReport, imageContent, validateAdReport, validAdDuration } from "./_ad-video-analysis.mjs";

const KEY = process.env.ANTHROPIC_API_KEY || "";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function callClaude(input, previous = "") {
  const content = [{ type: "text", text: previous ? "Continue do ponto interrompido, sem repetir. Complete todas as seções e mantenha TRANSCRIPT por último." : buildAdAnalysisPrompt(input) }, ...(!previous ? imageContent(input.contactSheets) : [])];
  const messages = previous ? [{ role: "user", content: [{ type: "text", text: buildAdAnalysisPrompt(input) }, ...imageContent(input.contactSheets)] }, { role: "assistant", content: [{ type: "text", text: previous }] }, { role: "user", content }] : [{ role: "user", content }];
  const response = await fetch(ANTHROPIC_URL, {
    method: "POST", headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: AD_ANALYSIS_MODEL, max_tokens: 16_000, temperature: 0, messages }),
    signal: AbortSignal.timeout(240_000),
  });
  if (!response.ok) throw new Error(`Claude HTTP ${response.status}`);
  const result = await response.json();
  const text = (result.content || []).filter((part) => part.type === "text").map((part) => part.text).join("").trim();
  if (!text) throw new Error("análise vazia");
  return { text, stopReason: result.stop_reason || "" };
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
