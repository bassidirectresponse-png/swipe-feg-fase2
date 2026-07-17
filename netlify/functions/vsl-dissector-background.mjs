// Pipeline persistente do Dissecador de VSL.
// O sufixo -background faz a Netlify executar por até 15 minutos. Cada chamada
// processa apenas uma etapa, salva o checkpoint e agenda a próxima chamada.
import { getStore } from "@netlify/blobs";
import {
  ANTHROPIC_URL,
  MODEL,
  SYSTEM,
  analysisAssetsFromPartsPrompt,
  analysisChunkPrompt,
  analysisSynthesisPrompt,
  clean,
  imageContent,
} from "./vsl-dissector.mjs";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";
const CHUNK_CHARS = Math.max(25_000, Number(process.env.VSL_ANALYSIS_CHUNK_CHARS) || 45_000);

function splitCompleteText(value, maxChars = CHUNK_CHARS) {
  const text = clean(value).trim();
  if (!text) return [];
  const chunks = [];
  let current = "";
  for (const line of text.split("\n")) {
    if (line.length > maxChars) {
      if (current.trim()) chunks.push(current.trim());
      current = "";
      for (let at = 0; at < line.length; at += maxChars) chunks.push(line.slice(at, at + maxChars));
      continue;
    }
    const next = current ? `${current}\n${line}` : line;
    if (next.length > maxChars && current.trim()) {
      chunks.push(current.trim());
      current = line;
    } else current = next;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function synthesisSource(parts) {
  const all = Array.isArray(parts) ? parts : [];
  const perPart = Math.max(1_500, Math.floor(165_000 / Math.max(1, all.length)));
  return all.map((part, index) => `## Parte ${index + 1}\n${clean(part).slice(0, perPart)}`).join("\n\n");
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function collectAnthropicOnce(user, images, maxTokens) {
  const upstream = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: clean(SYSTEM),
      thinking: { type: "disabled" },
      messages: [{ role: "user", content: [{ type: "text", text: clean(user) }, ...imageContent(images)] }],
      stream: true,
    }),
  });
  if (!upstream.ok || !upstream.body) throw new Error(`Claude HTTP ${upstream.status}: ${(await upstream.text().catch(() => "")).slice(0, 300)}`);
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "", output = "", stopReason = "";
  const consume = (line) => {
    if (!line.startsWith("data:")) return;
    const raw = line.slice(5).trim();
    if (!raw || raw === "[DONE]") return;
    let event;
    try { event = JSON.parse(raw); } catch { return; }
    if (event.type === "content_block_delta" && event.delta && event.delta.type === "text_delta") output += event.delta.text || "";
    if (event.type === "message_delta" && event.delta && event.delta.stop_reason) stopReason = event.delta.stop_reason;
    if (event.type === "error") throw new Error((event.error && event.error.message) || "erro do Claude");
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      consume(buffer.slice(0, newline));
      buffer = buffer.slice(newline + 1);
    }
  }
  buffer += decoder.decode();
  if (buffer.trim()) consume(buffer);
  if (!output.trim()) throw new Error("o modelo não retornou texto");
  if (stopReason === "max_tokens") throw new Error("a resposta atingiu o limite antes de concluir esta parte");
  return output.trim();
}

async function collectAnthropic(user, images, maxTokens) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await collectAnthropicOnce(user, images, maxTokens); }
    catch (error) {
      lastError = error;
      if (attempt === 2 || !/(HTTP (408|409|429|5\d\d)|fetch|network|socket|timeout|terminated)/i.test(String(error && error.message || error))) throw error;
      await wait(1_500 * (attempt + 1));
    }
  }
  throw lastError;
}

async function requeue(event, job) {
  const url = `${event.rawUrl ? new URL(event.rawUrl).origin : `https://${event.headers.host}`}/.netlify/functions/vsl-dissector-background`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: job.id, key: job.jobKey, phase: job.phase, index: job.chunkIndex }),
  });
  if (!response.ok) throw new Error(`não foi possível agendar a continuação (HTTP ${response.status})`);
}

function composeAnalysis(job) {
  return [...(job.coreParts || []), job.synthesisDoc, job.assetsDoc].filter(Boolean).join("\n\n---\n\n");
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 202, body: "" };
  const store = getStore({ name: "vsl-jobs", consistency: "strong" });
  let job;
  try {
    if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_API_KEY não configurada");
    const request = JSON.parse(event.body || "{}");
    if (!request.id || !request.key) throw new Error("job inválido");
    job = await store.get(request.id, { type: "json" });
    if (!job || job.jobKey !== request.key) throw new Error("job não encontrado");
    if (job.status === "complete") return { statusCode: 202, body: "" };
    // Background Functions podem ser repetidas pela plataforma. Um evento de
    // checkpoint antigo não pode executar de novo depois que o job avançou.
    if (request.phase && (request.phase !== job.phase || Number(request.index || 0) !== Number(job.chunkIndex || 0))) {
      return { statusCode: 202, body: "" };
    }

    const input = job.input || {};
    const sourceText = input.organizedTranscript || input.transcript || input.canonicalScript || "";
    const chunks = splitCompleteText(sourceText);
    if (!chunks.length) throw new Error("transcrição vazia");
    job.status = "working";
    job.error = "";

    if (job.phase === "core") {
      const index = Math.max(0, Number(job.chunkIndex) || 0);
      if (index >= chunks.length) {
        job.phase = "synthesis";
      } else {
        job.message = `Dissecando parte ${index + 1} de ${chunks.length}…`;
        job.progress = 70 + Math.round((index / chunks.length) * 18);
        job.updatedAt = new Date().toISOString();
        await store.setJSON(job.id, job);
        const part = await collectAnthropic(analysisChunkPrompt(input, chunks[index], index, chunks.length), input.contactSheets, 10_000);
        job.coreParts = Array.isArray(job.coreParts) ? job.coreParts : [];
        job.coreParts[index] = part;
        job.chunkIndex = index + 1;
        job.analysisDoc = composeAnalysis(job);
        job.progress = 70 + Math.round(((index + 1) / chunks.length) * 18);
        job.message = `Parte ${index + 1} de ${chunks.length} concluída e salva.`;
        if (job.chunkIndex >= chunks.length) job.phase = "synthesis";
      }
    } else if (job.phase === "synthesis") {
      job.message = "Consolidando Big Idea, avatar, crenças, mecanismo e oferta…";
      job.progress = 91;
      job.updatedAt = new Date().toISOString();
      await store.setJSON(job.id, job);
      job.synthesisDoc = await collectAnthropic(analysisSynthesisPrompt(input, synthesisSource(job.coreParts)), input.contactSheets, 10_000);
      job.phase = "assets";
      job.analysisDoc = composeAnalysis(job);
      job.progress = 95;
      job.message = "Estratégia global concluída e salva.";
    } else if (job.phase === "assets") {
      job.message = "Montando inventário de provas e ativos reutilizáveis…";
      job.progress = 96;
      job.updatedAt = new Date().toISOString();
      await store.setJSON(job.id, job);
      job.assetsDoc = await collectAnthropic(analysisAssetsFromPartsPrompt(input, synthesisSource(job.coreParts)), input.contactSheets, 10_000);
      job.phase = "done";
      job.status = "complete";
      job.analysisDoc = composeAnalysis(job);
      job.progress = 100;
      job.message = "Transcrição completa e dissecação concluídas.";
    } else if (job.phase === "done") {
      job.status = "complete";
      job.progress = 100;
    } else throw new Error(`etapa desconhecida: ${job.phase}`);

    job.updatedAt = new Date().toISOString();
    await store.setJSON(job.id, job);
    if (job.status !== "complete") await requeue(event, job);
  } catch (error) {
    console.error("vsl-dissector-background falhou:", String(error && error.message || error).slice(0, 400));
    if (job) {
      job.status = "error";
      job.error = String(error && error.message || error).slice(0, 600);
      job.message = `Falha na etapa atual: ${job.error}`;
      job.analysisDoc = composeAnalysis(job);
      job.updatedAt = new Date().toISOString();
      await store.setJSON(job.id, job).catch(() => {});
    }
  }
  return { statusCode: 202, body: "" };
};

export { splitCompleteText, synthesisSource };
