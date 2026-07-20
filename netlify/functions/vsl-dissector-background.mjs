// Processamento persistente do Dissecador de VSL.
// Cada chamada conclui uma parte, salva o resultado e agenda a continuação.
import { getStore } from "@netlify/blobs";
import {
  ANTHROPIC_URL,
  MODEL,
  SYSTEM,
  analysisAssetsFromPartsPrompt,
  analysisChunkPrompt,
  analysisRepairPrompt,
  analysisSynthesisPrompt,
  clean,
  imageContent,
  translationChunkPrompt,
} from "./vsl-dissector.mjs";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";
const CHUNK_CHARS = Math.max(22_000, Number(process.env.VSL_ANALYSIS_CHUNK_CHARS) || 32_000);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

function isPortuguese(language) {
  return /^(pt|portugu)/i.test(String(language || "").trim());
}

function stripTranslationTitle(value) {
  return clean(value).trim().replace(/^#\s+[^\n]*Transcri[cç][aã]o[^\n]*\n+/i, "").trim();
}

function composeTranscript(job) {
  const original = clean(job.input && job.input.organizedTranscript || job.transcriptDoc || "").trim();
  const translated = (job.translationParts || []).map(stripTranslationTitle).filter(Boolean).join("\n\n");
  if (!translated) return original;
  return `${original}\n\n---\n\n# ${job.input.name} — Transcrição Organizada PT-BR\n\n${translated}`;
}

function composeAnalysis(job) {
  return [...(job.coreParts || []), job.synthesisDoc, job.assetsDoc, job.repairDoc].filter(Boolean).join("\n\n---\n\n");
}

function analysisGaps(job) {
  const analysis = composeAnalysis(job);
  const checks = [
    ["Veredito estratégico", /veredito estrat[eé]gico/i],
    ["Big Idea", /big idea/i],
    ["Pergunta paradoxal", /pergunta paradoxal/i],
    ["Gimmick", /gimmick/i],
    ["Avatar", /\bavatar\b/i],
    ["Belief Ladder", /belief ladder/i],
    ["MUP", /\bMUP\b/i],
    ["MSOL", /\bMSOL\b/i],
    ["Provas e evidências", /provas? (?:e |&)evid[eê]ncias|invent[aá]rio de provas/i],
    ["Objeções", /obje[cç][oõ]es/i],
    ["Oferta e fechamento", /oferta completa|big offer|fechamento/i],
    ["Ativos reutilizáveis", /ativos reutiliz[aá]veis|banco de ativos/i],
    ["Blueprint de modelagem", /blueprint de modelagem/i],
  ];
  const missing = checks.filter(([, pattern]) => !pattern.test(analysis)).map(([label]) => label);
  if ((job.coreParts || []).length < (job.totalChunks || 1) || analysis.length < 6_000) missing.unshift("Dissecação cronológica completa");
  return [...new Set(missing)];
}

async function collectAnthropicOnce(user, images, maxTokens, previousOutput = "") {
  const messages = [{ role: "user", content: [{ type: "text", text: clean(user) }, ...imageContent(images)] }];
  if (previousOutput) {
    messages.push(
      { role: "assistant", content: [{ type: "text", text: previousOutput }] },
      { role: "user", content: [{ type: "text", text: "Continue exatamente do ponto em que a resposta foi interrompida. Não reinicie, não resuma e não repita o conteúdo anterior. Termine todas as seções pendentes e encerre somente quando esta parte estiver completa." }] },
    );
  }
  const upstream = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: clean(SYSTEM),
      thinking: { type: "disabled" },
      messages,
      stream: true,
    }),
  });
  if (!upstream.ok || !upstream.body) {
    await upstream.body?.cancel().catch(() => {});
    throw new Error(`Claude HTTP ${upstream.status}`);
  }
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
    if (event.type === "error") throw new Error((event.error && event.error.message) || "erro do serviço de análise");
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
  if (!output.trim()) throw new Error("o serviço de análise não retornou conteúdo");
  return { output: output.trim(), stopReason };
}

async function collectAnthropic(user, images, maxTokens) {
  let complete = "";
  for (let continuation = 0; continuation < 3; continuation++) {
    let lastError;
    let page;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        page = await collectAnthropicOnce(user, images, maxTokens, complete);
        break;
      } catch (error) {
        lastError = error;
        if (attempt === 2 || !/(HTTP (408|409|429|5\d\d)|fetch|network|socket|timeout|terminated)/i.test(String(error && error.message || error))) throw error;
        await wait(1_500 * (attempt + 1));
      }
    }
    if (!page) throw lastError || new Error("o serviço de análise não retornou conteúdo");
    complete = complete ? `${complete}\n${page.output}` : page.output;
    if (page.stopReason !== "max_tokens") return complete.trim();
  }
  throw new Error("Esta parte é extensa demais para uma única etapa. O conteúdo anterior foi preservado; use Tentar novamente para continuar.");
}

function checkpointIndex(job) {
  return job.phase === "translation" ? Number(job.translationIndex || 0) : Number(job.chunkIndex || 0);
}

async function requeue(req, job) {
  const url = new URL("/.netlify/functions/vsl-dissector-background", req.url);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: job.id, key: job.jobKey, phase: job.phase, index: checkpointIndex(job) }),
  });
  if (!response.ok) throw new Error("não foi possível continuar a análise automaticamente");
}

function friendlyError(error) {
  const raw = String(error && error.message || error);
  if (/Claude HTTP 401|Claude HTTP 403/i.test(raw)) return "O acesso ao serviço de análise precisa ser renovado.";
  if (/Claude HTTP 429/i.test(raw)) return "O serviço de análise está ocupado. Use Tentar novamente em alguns instantes.";
  if (/Claude HTTP 5\d\d|fetch|network|socket|timeout|terminated/i.test(raw)) return "A conexão com o serviço de análise foi interrompida. A parte já concluída foi preservada.";
  return raw.replace(/^Claude HTTP \d+:\s*/i, "").slice(0, 600);
}

export default async (req) => {
  if (req.method !== "POST") return;
  const store = getStore({ name: "vsl-jobs", consistency: "strong" });
  let job;
  try {
    if (!ANTHROPIC_KEY) throw new Error("O serviço de análise ainda não foi configurado.");
    const declared = Number(req.headers.get("content-length") || 0);
    if (declared > 32 * 1024) throw new Error("job inválido");
    const raw = await req.text();
    if (Buffer.byteLength(raw, "utf8") > 32 * 1024) throw new Error("job inválido");
    const request = JSON.parse(raw || "{}");
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(String(request.id || "")) || !/^[\w-]{32,256}$/.test(String(request.key || ""))) throw new Error("job inválido");
    job = await store.get(request.id, { type: "json" });
    if (!job || job.jobKey !== request.key) throw new Error("job não encontrado");
    if (job.status === "complete") return;
    if (request.phase && request.phase !== job.phase) return;
    if (Number.isInteger(request.index) && request.index !== checkpointIndex(job)) return;

    const input = job.input || {};
    const sourceText = input.organizedTranscript || input.transcript || input.canonicalScript || "";
    const chunks = splitCompleteText(sourceText);
    if (!chunks.length) throw new Error("A transcrição está vazia.");
    job.totalChunks = chunks.length;

    // Migra também o job criado pela versão anterior, que começava direto na análise.
    let migrated = false;
    if (!isPortuguese(input.language) && !job.translationInitialized) {
      job.translationInitialized = true;
      job.translationParts = [];
      job.translationIndex = 0;
      job.phase = "translation";
      job.chunkIndex = 0;
      migrated = true;
    } else if (isPortuguese(input.language) && !job.translationInitialized) {
      job.translationInitialized = true;
    }

    if (!migrated && request.phase && (request.phase !== job.phase || Number(request.index || 0) !== checkpointIndex(job))) return;
    job.status = "working";
    job.error = "";

    if (job.phase === "translation") {
      const index = Math.max(0, Number(job.translationIndex) || 0);
      job.message = `Organizando a versão em português: parte ${index + 1} de ${chunks.length}…`;
      job.progress = 70 + Math.round((index / chunks.length) * 7);
      job.updatedAt = new Date().toISOString();
      await store.setJSON(job.id, job);
      const translated = await collectAnthropic(translationChunkPrompt(input, chunks[index], index, chunks.length), [], 16_000);
      job.translationParts = Array.isArray(job.translationParts) ? job.translationParts : [];
      job.translationParts[index] = translated;
      job.translationIndex = index + 1;
      job.transcriptDoc = composeTranscript(job);
      job.message = `Versão em português: parte ${index + 1} de ${chunks.length} concluída.`;
      if (job.translationIndex >= chunks.length) {
        job.phase = "core";
        job.chunkIndex = 0;
      }
    } else if (job.phase === "core") {
      const index = Math.max(0, Number(job.chunkIndex) || 0);
      job.message = `Dissecando parte ${index + 1} de ${chunks.length}…`;
      job.progress = 77 + Math.round((index / chunks.length) * 12);
      job.updatedAt = new Date().toISOString();
      await store.setJSON(job.id, job);
      const translation = Array.isArray(job.translationParts) ? job.translationParts[index] || "" : "";
      const part = await collectAnthropic(analysisChunkPrompt(input, chunks[index], index, chunks.length, translation), input.contactSheets, 16_000);
      job.coreParts = Array.isArray(job.coreParts) ? job.coreParts : [];
      job.coreParts[index] = part;
      job.chunkIndex = index + 1;
      job.analysisDoc = composeAnalysis(job);
      job.message = `Dissecação: parte ${index + 1} de ${chunks.length} concluída e salva.`;
      if (job.chunkIndex >= chunks.length) job.phase = "synthesis";
    } else if (job.phase === "synthesis") {
      job.message = "Consolidando Big Idea, avatar, crenças, mecanismo e oferta…";
      job.progress = 91;
      job.updatedAt = new Date().toISOString();
      await store.setJSON(job.id, job);
      job.synthesisDoc = await collectAnthropic(analysisSynthesisPrompt(input, synthesisSource(job.coreParts)), input.contactSheets, 16_000);
      job.phase = "assets";
      job.analysisDoc = composeAnalysis(job);
      job.message = "Estratégia global concluída e salva.";
    } else if (job.phase === "assets") {
      job.message = "Organizando provas, peças reutilizáveis e blueprint…";
      job.progress = 96;
      job.updatedAt = new Date().toISOString();
      await store.setJSON(job.id, job);
      job.assetsDoc = await collectAnthropic(analysisAssetsFromPartsPrompt(input, synthesisSource(job.coreParts)), input.contactSheets, 16_000);
      job.phase = "validate";
      job.analysisDoc = composeAnalysis(job);
      job.message = "Conferindo se a dissecação está completa…";
    } else if (job.phase === "validate") {
      const missing = analysisGaps(job);
      if (!missing.length) {
        job.phase = "done";
        job.status = "complete";
        job.progress = 100;
        job.message = "Transcrição completa e dissecação concluídas.";
      } else {
        job.missingSections = missing;
        job.phase = "repair";
        job.message = `Completando ${missing.length} seção${missing.length === 1 ? "" : "ões"} da dissecação…`;
        job.progress = 98;
      }
    } else if (job.phase === "repair") {
      const missing = Array.isArray(job.missingSections) ? job.missingSections : analysisGaps(job);
      job.message = "Completando as seções finais da dissecação…";
      job.progress = 98;
      job.updatedAt = new Date().toISOString();
      await store.setJSON(job.id, job);
      job.repairDoc = await collectAnthropic(analysisRepairPrompt(input, composeAnalysis(job), missing), input.contactSheets, 16_000);
      job.analysisDoc = composeAnalysis(job);
      const remaining = analysisGaps(job);
      if (remaining.length) throw new Error(`A análise ainda ficou incompleta: ${remaining.join(", ")}.`);
      job.phase = "done";
      job.status = "complete";
      job.progress = 100;
      job.message = "Transcrição completa e dissecação concluídas.";
    } else if (job.phase === "done") {
      job.status = "complete";
      job.progress = 100;
    } else throw new Error(`etapa desconhecida: ${job.phase}`);

    job.updatedAt = new Date().toISOString();
    await store.setJSON(job.id, job);
    if (job.status !== "complete") await requeue(req, job);
  } catch (error) {
    console.error("vsl-dissector-background falhou:", friendlyError(error).slice(0, 240));
    if (job) {
      job.status = "error";
      job.error = friendlyError(error);
      job.message = job.error;
      job.transcriptDoc = composeTranscript(job);
      job.analysisDoc = composeAnalysis(job);
      job.updatedAt = new Date().toISOString();
      await store.setJSON(job.id, job).catch(() => {});
    }
  }
};

export const config = { background: true };
export { analysisGaps, collectAnthropic, splitCompleteText, synthesisSource };
