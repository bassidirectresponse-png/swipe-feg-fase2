// Dissecador de VSL — organiza a transcrição completa e gera uma análise
// estratégica separada usando o áudio transcrito + contact sheets do vídeo.

const SUPABASE_URL = (process.env.SUPABASE_URL || "https://ppaajtzbhjixhyfidojd.supabase.co").replace(/\/+$/, "");
const ANON = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwYWFqdHpiaGppeGh5Zmlkb2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMDkzNTcsImV4cCI6MjA5Njc4NTM1N30.uoC_3EHM_dfmkBHJYjPvlaC7DqkJziunz-tug0ItAJc";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";
export const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
export const MODEL = process.env.VSL_DISSECTOR_MODEL || process.env.FURTADO_MODEL || "claude-sonnet-5";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type", "Access-Control-Allow-Methods": "POST, GET, OPTIONS" };
const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...CORS } });

export const clean = (s) => String(s == null ? "" : s)
  .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
  .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
export const clip = (s, n) => {
  s = clean(s);
  if (s.length <= n) return s;
  let out = s.slice(0, n);
  if (/[\uD800-\uDBFF]$/.test(out)) out = out.slice(0, -1);
  return out + "…";
};
export const time = (value) => {
  const total = Math.max(0, Math.round(Number(value) || 0));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
};
const segmentText = (segments) => (Array.isArray(segments) ? segments : []).slice(0, 9000)
  .map((s) => `[${time(s.start)}-${time(s.end)}] ${clean(s.text).trim()}`).filter(Boolean).join("\n");

export function imageContent(images) {
  const content = [];
  for (const [index, image] of (Array.isArray(images) ? images : []).slice(0, 5).entries()) {
    const media = ["image/jpeg", "image/png", "image/webp"].includes(image && image.mediaType) ? image.mediaType : "image/jpeg";
    const data = String((image && image.data) || "").replace(/^data:[^;]+;base64,/, "");
    if (!data || data.length > 1_800_000) continue;
    content.push({ type: "text", text: `Contact sheet ${index + 1}: ${clip(image.label || "linha do tempo visual da VSL", 160)}` });
    content.push({ type: "image", source: { type: "base64", media_type: media, data } });
  }
  return content;
}

export const SYSTEM = `Você é um copy chief sênior especializado em VSLs de resposta direta. Sua tarefa é transformar uma VSL em um ativo reutilizável de copy.

Princípios obrigatórios:
- A transcrição organizada é completa, não um resumo. Preserve claims, números, nomes, tom, ordem e ambiguidades reais.
- Analise áudio/transcrição e contact sheets em conjunto. Não invente speakers; quando incerto, use "Speaker provável" ou "Speaker indefinido".
- Os blocos da VSL usam títulos de nível 1 com intervalo de tempo. Speakers usam títulos de nível 2. Não coloque timestamps nos parágrafos.
- Parágrafos da transcrição têm 1 a 3 frases, com leitura fluida. Não inclua comentários do analista dentro da copy transcrita.
- A análise é em português do Brasil, limpa e operacional. Trate promessas e claims como ativos persuasivos; não crie seções de compliance ou alertas jurídicos.
- Não invente fatos ausentes. Responda somente em Markdown, sem preâmbulo ou despedida.`;

function transcriptPrompt(meta) {
  const isPt = /^pt\b/i.test(meta.language || "");
  return `ORGANIZE A TRANSCRIÇÃO COMPLETA DA VSL.

Nome: ${meta.name}
Nicho informado: ${meta.niche || "não informado — inferir pela transformação dominante"}
Idioma detectado: ${meta.language || "não detectado"}
Duração: ${time(meta.duration)}
${meta.canonical ? "Há um roteiro canônico abaixo. Priorize-o para o texto e use o Whisper/VSL para validar ordem, execução e discrepâncias." : "Não há roteiro canônico; use integralmente a transcrição do Whisper."}

CONTRATO DE SAÍDA:
1. ${isPt ? `Crie apenas "# ${meta.name} — Transcrição Organizada Original PT-BR".` : `Crie primeiro "# ${meta.name} — Transcrição Organizada Original" e depois "# ${meta.name} — Transcrição Organizada PT-BR", estruturalmente idêntica.`}
2. Inclua no início: "## Metadados", "## Mapa de Extração para Obsidian", "## Readers / Speakers Identificados" e "## Observações Visuais Importantes".
3. No mapa, use subseções e tabelas para Histórias, Mecanismo, Provas, Objeções, Oferta e Fechamento e Depoimentos quando existirem. Aponte para os headings dos blocos.
4. Organize toda a copy em blocos reais, escolhendo entre Micro-Lead, Lead, Background Story, Emotional Story, Discovery Story, Marketing Thesis, Product Build Up, Big Offer e Close. Use exatamente o formato "# Lead - 00:00-05:00".
5. Sob cada bloco, use speakers como "## [Expert — Nome]:", "## [Narrador]:", "## [Depoimento — Nome]:", "## [Texto na Tela]:" ou marcador conservador equivalente.
6. Não use bullets, resumos, interpretações ou comentários de estratégia dentro dos blocos transcritos.
7. Finalize com "# Ambiguidades Reais de Transcrição/Speaker" somente para ambiguidades que realmente existirem.
8. Corrija apenas erros fonéticos óbvios e artefatos de codificação; não reescreva a copy.

ROTEIRO CANÔNICO OPCIONAL:
${clip(meta.canonical, 120_000) || "(não fornecido)"}

TRANSCRIÇÃO BRUTA COMPLETA:
${clip(meta.transcript, 180_000)}

SEGMENTOS COM TEMPO — use para definir os intervalos, mas remova os timestamps dos parágrafos finais:
${clip(meta.segmentText, 180_000)}`;
}

function analysisPrompt(meta, organized) {
  return `DISSEQUE E EXPLIQUE A VSL EM UM ÚNICO DOCUMENTO: "# ${meta.name} — Dissecação Estratégica".

Use a transcrição organizada abaixo e as contact sheets. Escreva em PT-BR. Separe a dissecação pelos mesmos blocos cronológicos da VSL e explique, para cada bloco: o que acontece, objetivo persuasivo, técnica de copy, crença construída/quebrada, prova usada, emoção ativada, transição e como modelar.

Depois da dissecação cronológica, inclua obrigatoriamente:
- Veredito estratégico
- Big Idea detalhada
- Pergunta paradoxal
- Gimmick
- Avatar: tentativas, crenças, vergonha, solução rejeitada, promessa desejada, inimigo aceito, culpa removida e identidade ferida
- Belief Ladder em ordem
- MUP, MSOL e mecanismo
- Provas e evidências categorizadas
- Objeções e quebras
- Oferta completa: produto, stack, bônus, preço/âncoras, garantia, urgência e CTA
- Inventário de provas usando: Demonstração, Motivo Lógico, Seja Específico, Explique o Mecanismo, Reafirme Crenças do Leitor, Reconheça a Descrença, Mencione uma Autoridade, Depoimentos, Humildade, Copy Lógica e Mostre Personalidade. Para cada uma, informe como aparece, onde aparece, função e como modelar.
- Banco de ativos reutilizáveis: frases fortes, analogias, nomes chiclete, curiosidades, bullets/fascinations, histórias, claims, comparações, demonstrações, mecanismos, inimigos, CTAs, garantias, reason why now e padrões de fechamento
- Blueprint de modelagem
- Perguntas em aberto

Use tabelas quando melhorarem comparação. Não crie tags aleatórias, rótulos entre colchetes ou seções de riscos/compliance. Não confunda análise com transcrição.

NICHO: ${meta.niche || "inferir"}

TRANSCRIÇÃO ORGANIZADA:
${clip(organized, 190_000)}`;
}

function analysisCorePrompt(meta) {
  return `CRIE A PRIMEIRA PARTE DA DISSECAÇÃO ESTRATÉGICA DA VSL "${meta.name}".

Escreva em PT-BR e comece exatamente com "# ${meta.name} — Dissecação Estratégica".

CONTRATO DE SAÍDA:
1. Faça uma dissecação cronológica COMPLETA, cobrindo do início até ${time(meta.duration)} sem parar antes do fim.
2. Use os mesmos intervalos de cinco minutos da transcrição como referência, mas renomeie cada trecho pela função real: Micro-Lead, Lead, Background Story, Emotional Story, Discovery Story, Marketing Thesis, Product Build Up, Big Offer, Close ou nome conservador equivalente.
3. Para cada bloco explique: o que acontece, objetivo persuasivo, técnica de copy, crença construída ou quebrada, prova usada, emoção, transição e como modelar.
4. Depois inclua: Veredito estratégico, Big Idea, Pergunta paradoxal, Gimmick, Avatar completo, Belief Ladder em ordem, MUP, MSOL, mecanismo, provas, objeções e oferta completa.
5. Não resuma a VSL inteira em poucos parágrafos. Não encerre sem cobrir o fechamento, preço/âncoras, garantia, urgência e CTA quando existirem.
6. Use tabelas somente quando melhorarem a comparação. Não crie compliance nem invente fatos.

NICHO: ${meta.niche || "inferir"}
IDIOMA ORIGINAL: ${meta.language || "não detectado"}
DURAÇÃO: ${time(meta.duration)}

TRANSCRIÇÃO COMPLETA ORIGINAL:
${clip(meta.organized || meta.transcript, 190_000)}`;
}

function analysisAssetsPrompt(meta) {
  return `CRIE A SEGUNDA PARTE DA DISSECAÇÃO ESTRATÉGICA DA VSL "${meta.name}".

Escreva em PT-BR e comece com "# Inventário Estratégico e Banco de Ativos". Não repita a dissecação cronológica.

Inclua obrigatoriamente, com exemplos e localização temporal quando identificável:
- Inventário de provas: Demonstração, Motivo Lógico, Seja Específico, Explique o Mecanismo, Reafirme Crenças do Leitor, Reconheça a Descrença, Autoridade, Depoimentos, Humildade, Copy Lógica e Personalidade. Para cada item: como aparece, onde, função e como modelar.
- Banco de ativos reutilizáveis: frases fortes, analogias, nomes chiclete, curiosidades, bullets/fascinations, histórias, claims, comparações, demonstrações, mecanismos, inimigos, CTAs, garantias, reason why now e padrões de fechamento.
- Blueprint de modelagem por etapas.
- Mapa de extração para Obsidian.
- Perguntas em aberto e ambiguidades reais.

Não invente elementos ausentes, não crie compliance e não encerre no meio de uma seção.

NICHO: ${meta.niche || "inferir"}
DURAÇÃO: ${time(meta.duration)}

TRANSCRIÇÃO COMPLETA ORIGINAL:
${clip(meta.organized || meta.transcript, 190_000)}`;
}

// Prompts usados pelo pipeline persistente. A análise cronológica é dividida
// em blocos independentes para que nenhuma VSL seja cortada por tamanho.
export function translationChunkPrompt(meta, chunk, index, total) {
  return `TRADUZA INTEGRALMENTE A PARTE ${index + 1} DE ${total} DA TRANSCRIÇÃO ORGANIZADA DA VSL "${meta.name}" PARA PT-BR.

CONTRATO OBRIGATÓRIO:
1. Preserve todos os headings Markdown, blocos, leitores/speakers, ordem, números, nomes, claims e marcadores de incerteza.
2. Traduza apenas o texto; não resuma, explique, suavize, adapte ou acrescente análise.
3. Preserve parágrafos curtos e não coloque timestamps dentro dos parágrafos.
4. Não repita o título principal do documento; ele será inserido automaticamente. Preserve todos os demais headings.
5. Entregue somente o Markdown traduzido desta parte, do primeiro ao último caractere relevante.

PARTE: ${index + 1}/${total}
IDIOMA ORIGINAL: ${meta.language || "não detectado"}

CONTEÚDO ORIGINAL:
${clean(chunk)}`;
}

export function analysisChunkPrompt(meta, chunk, index, total, translation = "") {
  return `DISSEQUE A PARTE ${index + 1} DE ${total} DA VSL "${meta.name}".

Esta é uma parte cronológica; analise TODO o trecho recebido sem antecipar ou inventar partes ausentes.
Escreva em PT-BR. ${index === 0 ? `Comece exatamente com "# ${meta.name} — Dissecação Estratégica".` : `Comece com "# Continuação da Dissecação — Parte ${index + 1} de ${total}".`}

CONTRATO DE SAÍDA:
1. Cubra o trecho inteiro, do primeiro ao último bloco/timestamp presente.
2. Para cada bloco use a função real (Micro-Lead, Lead, Background Story, Emotional Story, Discovery Story, Marketing Thesis, Product Build Up, Big Offer, Close ou equivalente conservador).
3. Explique: o que acontece, objetivo persuasivo, técnica de copy, crença construída ou quebrada, prova, emoção, transição e como modelar.
4. Inclua no final "## Síntese factual e ativos desta parte" com fatos, claims, provas, objeções, mecanismo, oferta, frases fortes e CTAs realmente encontrados. Essa síntese alimentará a consolidação global.
5. Não resuma em poucos parágrafos, não crie compliance e não invente fatos.

NICHO: ${meta.niche || "inferir"}
IDIOMA ORIGINAL: ${meta.language || "não detectado"}
DURAÇÃO TOTAL: ${time(meta.duration)}
PARTE: ${index + 1}/${total}

TRECHO COMPLETO ORIGINAL DESTA PARTE:
${clean(chunk)}

${translation ? `TRADUÇÃO PT-BR ORGANIZADA DA MESMA PARTE — use junto com o original, sem analisar duas vezes:\n${clean(translation)}` : ""}`;
}

export function analysisSynthesisPrompt(meta, source) {
  return `CONSOLIDE A ESTRATÉGIA GLOBAL DA VSL "${meta.name}" usando as análises cronológicas abaixo.

Comece com "# Consolidação Estratégica Global" e escreva em PT-BR. Não repita a dissecação bloco a bloco.
Inclua obrigatoriamente: Veredito estratégico; Big Idea detalhada; Pergunta paradoxal; Gimmick; Avatar completo (tentativas, crenças, vergonha, solução rejeitada, promessa desejada, inimigo aceito, culpa removida e identidade ferida); Belief Ladder em ordem; MUP; MSOL; mecanismo; provas categorizadas; objeções e quebras; oferta completa (produto, stack, bônus, preço/âncoras, garantia, urgência e CTA). Não invente itens ausentes.

NICHO: ${meta.niche || "inferir"}
DURAÇÃO: ${time(meta.duration)}

ANÁLISES E SÍNTESES DE TODAS AS PARTES:
${clean(source)}`;
}

export function analysisAssetsFromPartsPrompt(meta, source) {
  return `CRIE O INVENTÁRIO ESTRATÉGICO FINAL DA VSL "${meta.name}" com base nas análises de todas as partes.

Comece com "# Inventário Estratégico e Banco de Ativos". Escreva em PT-BR e não repita a dissecação cronológica.
Inclua: inventário de provas (Demonstração, Motivo Lógico, Especificidade, Mecanismo, Crenças do Leitor, Reconhecimento da Descrença, Autoridade, Depoimentos, Humildade, Copy Lógica e Personalidade), sempre informando como aparece, onde, função e como modelar; frases fortes; analogias; nomes chiclete; curiosidades; bullets/fascinations; histórias; claims; comparações; demonstrações; mecanismos; inimigos; CTAs; garantias; reason why now; padrões de fechamento; blueprint de modelagem; mapa para Obsidian; perguntas em aberto e ambiguidades reais. Não invente elementos ausentes.

NICHO: ${meta.niche || "inferir"}
DURAÇÃO: ${time(meta.duration)}

ANÁLISES E SÍNTESES DE TODAS AS PARTES:
${clean(source)}`;
}

export function analysisRepairPrompt(meta, analysis, missing) {
  return `COMPLETE O DOCUMENTO DE DISSECAÇÃO ESTRATÉGICA DA VSL "${meta.name}".

O documento abaixo já contém a análise cronológica. Escreva somente um complemento em PT-BR com as seções ausentes ou insuficientes: ${missing.join(", ")}.

CONTRATO OBRIGATÓRIO DA SKILL:
- Um único documento de análise, limpo e operacional.
- Veredito estratégico, Big Idea, pergunta paradoxal, gimmick, avatar completo, Belief Ladder, MUP, MSOL, mecanismo, provas, objeções, oferta e fechamento.
- Inventário de provas com Demonstração, Motivo Lógico, Especificidade, Mecanismo, Crenças do Leitor, Reconhecimento da Descrença, Autoridade, Depoimentos, Humildade, Copy Lógica e Personalidade.
- Banco de ativos reutilizáveis e Blueprint de modelagem.
- Não invente, não crie compliance e não repita partes já completas.

DOCUMENTO ATUAL:
${clean(analysis).slice(0, 170_000)}`;
}

async function streamAnthropic({ system, user, images, maxTokens, channel }, send) {
  const content = [{ type: "text", text: clean(user) }, ...imageContent(images)];
  const upstream = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system: clean(system), thinking: { type: "disabled" }, messages: [{ role: "user", content }], stream: true }),
  });
  if (!upstream.ok || !upstream.body) throw new Error(`Claude HTTP ${upstream.status}: ${clip(await upstream.text().catch(() => ""), 240)}`);

  const reader = upstream.body.getReader(), decoder = new TextDecoder();
  let buffer = "", output = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl); buffer = buffer.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim(); if (!raw || raw === "[DONE]") continue;
      let event; try { event = JSON.parse(raw); } catch { continue; }
      const delta = event && event.delta;
      if (event.type === "content_block_delta" && delta && delta.type === "text_delta" && delta.text) {
        output += delta.text; send({ t: "text", channel, v: delta.text });
      } else if (event.type === "error") throw new Error((event.error && event.error.message) || "erro do Claude");
    }
  }
  if (!output.trim()) throw new Error("o modelo não retornou texto");
  return output;
}

export default async (req) => {
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: CORS });
  if (req.method === "GET") return json(200, { ok: true, service: "vsl-dissector", ready: !!ANTHROPIC_KEY, model: MODEL });
  if (req.method !== "POST") return json(405, { ok: false, error: "método inválido" });
  if (!ANTHROPIC_KEY) return json(500, { ok: false, error: "ANTHROPIC_API_KEY não configurada no Netlify" });

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return json(401, { ok: false, error: "sem autenticação" });
  try {
    const user = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON, Authorization: `Bearer ${token}` } });
    if (!user.ok) return json(401, { ok: false, error: "sessão inválida — faça login de novo" });
  } catch { return json(401, { ok: false, error: "não deu para validar a sessão" }); }

  let body; try { body = await req.json(); } catch { return json(400, { ok: false, error: "corpo inválido" }); }
  const meta = {
    name: clip(body.name || "VSL sem título", 140), niche: clip(body.niche || "", 100), language: clip(body.language || "", 16),
    duration: Number(body.duration) || 0, transcript: clean(body.transcript || "").trim(), canonical: clean(body.canonicalScript || "").trim(),
    organized: clean(body.organizedTranscript || "").trim(), segmentText: segmentText(body.segments), images: body.contactSheets,
  };
  if (!meta.transcript && !meta.canonical) return json(400, { ok: false, error: "transcrição vazia" });
  const phase = String(body.phase || "legacy");
  if (!["legacy", "analysis-core", "analysis-assets"].includes(phase)) return json(400, { ok: false, error: "etapa inválida" });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (value) => { if (!closed) try { controller.enqueue(encoder.encode(JSON.stringify(value) + "\n")); } catch {} };
      try {
        send({ t: "meta", model: MODEL, name: meta.name });
        if (phase === "analysis-core") {
          send({ t: "status", phase, v: "Dissecando blocos, crenças, mecanismo e oferta…" });
          await streamAnthropic({ system: SYSTEM, user: analysisCorePrompt(meta), images: meta.images, maxTokens: 12000, channel: "analysis" }, send);
          send({ t: "phase_done", phase });
          return;
        }
        if (phase === "analysis-assets") {
          send({ t: "status", phase, v: "Montando inventário de provas e ativos reutilizáveis…" });
          await streamAnthropic({ system: SYSTEM, user: analysisAssetsPrompt(meta), images: meta.images, maxTokens: 10000, channel: "analysis" }, send);
          send({ t: "phase_done", phase });
          return;
        }
        send({ t: "status", phase: "transcript", v: "Organizando a transcrição e identificando os blocos…" });
        const organized = await streamAnthropic({ system: SYSTEM, user: transcriptPrompt(meta), images: meta.images, maxTokens: 24000, channel: "transcript" }, send);
        send({ t: "phase_done", phase: "transcript" });
        send({ t: "status", phase: "analysis", v: "Dissecando estratégia, mecanismos, provas e oferta…" });
        await streamAnthropic({ system: SYSTEM, user: analysisPrompt(meta, organized), images: meta.images, maxTokens: 16000, channel: "analysis" }, send);
        send({ t: "phase_done", phase: "analysis" });
      } catch (error) {
        send({ t: "error", v: clip(error && error.message ? error.message : error, 280) });
      } finally {
        send({ t: "done" }); closed = true; try { controller.close(); } catch {}
      }
    },
  });
  return new Response(stream, { status: 200, headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no", ...CORS } });
};
