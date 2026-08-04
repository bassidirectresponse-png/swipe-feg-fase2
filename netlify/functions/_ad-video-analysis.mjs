export const AD_ANALYSIS_PROMPT_VERSION = "2026-08-04.1";
export const AD_MAX_DURATION_SECONDS = 600;
export const AD_ANALYSIS_MODEL = process.env.AD_ANALYSIS_MODEL || process.env.VSL_DISSECTOR_MODEL || process.env.FURTADO_MODEL || "claude-sonnet-5";
export const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const clean = (value) => String(value == null ? "" : value)
  .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
  .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");

export function validAdDuration(value) {
  const duration = Number(value);
  return Number.isFinite(duration) && duration > 0 && duration <= AD_MAX_DURATION_SECONDS;
}

export function imageContent(images) {
  return (Array.isArray(images) ? images : []).slice(0, 5).flatMap((image) => {
    const mediaType = String(image && image.mediaType || "");
    const data = String(image && image.data || "");
    if (!/^image\/(jpeg|png|webp)$/.test(mediaType) || !/^[A-Za-z0-9+/=]+$/.test(data)) return [];
    return [{ type: "image", source: { type: "base64", media_type: mediaType, data } }];
  });
}

export function buildAdAnalysisPrompt(input) {
  const transcript = clean(input.transcript).trim();
  const segments = Array.isArray(input.segments) ? input.segments.slice(0, 8_000) : [];
  const timedTranscript = externalTranscript(input);
  return `PROMPT MASTER — ENGENHARIA REVERSA VISUAL DE VIDEO ADS

Você é um Engenheiro de Inteligência Competitiva especializado em visão computacional, análise multimodal e engenharia reversa de anúncios de Direct Response em vídeo. Descreva, catalogue e organize somente o que estiver presente. Não produza teoria, sugestões, avaliação de performance ou interpretações estratégicas.

INPUTS DO PROJETO
- Versão da especificação: ${AD_ANALYSIS_PROMPT_VERSION}
- Nicho: ${clean(input.niche).trim() || "NÃO INFORMADO"}
- País-alvo: ${clean(input.country).trim() || "NÃO INFORMADO"}
- Idioma principal: ${clean(input.language).trim() || "NÃO INFORMADO"}
- Plataforma provável: ${clean(input.platform).trim() || "NÃO INFORMADO"}
- Duração verificada: ${formatTime(input.duration)}
- Observações: ${clean(input.notes).trim() || "NÃO INFORMADO"}

HIERARQUIA: visível no vídeo; audível; timestamps e falas do transcript; inferência visual simples; país-alvo. Nunca substitua evidência por suposição. Registre divergências sem corrigir fontes. Use EVIDÊNCIA DIRETA ou INFERÊNCIA VISUAL; NÃO INFORMADO para input ausente; NÃO IDENTIFICADO para elemento não reconhecível. Figuras públicas: nomeie apenas com confiança alta; com confiança média use "possível aparição de"; com baixa confiança descreva sem nome. Suspeita artificial: POSSÍVEL MANIPULAÇÃO — NÃO CONFIRMADA.

TIMESTAMPS: use 00:00/01:27, ancorados no momento real e no transcript. Se inexato, acrescente "aproximadamente". Não invente timestamps. Preserve falas, erros, pontuação e capitalização. Não traduza nem corrija o transcript.

TRANSCRIPT DE REFERÊNCIA PARA SINCRONIZAÇÃO
${timedTranscript}

Produza Markdown puro e EXATAMENTE esta estrutura, sem texto antes ou depois:

# RELATÓRIO GEMINI
## 1. FORMATO GERAL E PERSONAGENS
### Dados básicos
Duração, orientação, resolução aproximada, idioma, plataforma provável, formatos principal/secundário, nível de produção e presença Sim/Não de narração, apresentador, legendas e produto.
### Personagens e papéis
| Personagem ou identificação | Tipo | Função narrativa | Aparência e ambiente | Forma de aparição | Confiança da identificação |
### Depoimentos
Quantidade, formato, distribuição, resultado/dados e origem visual, ou NÃO IDENTIFICADO.

## 2. HOOK VISUAL — PRIMEIROS 3 SEGUNDOS
### Camada 1 — Text overlay
Texto exato, capitalização, cor, tamanho, posição, destaques, números, animação; se ausente: Sem texto.
### Camada 2 — Som
Fala exata, falante, voice-over/tela, música, efeitos, ruído, silêncio e volume.
### Camada 3 — Visual
Primeiro frame, pessoa/objeto, expressão, ação, câmera, B-roll, demonstração, corte de TV, interrupção, antes/depois e enquadramento.
### Camada 4 — Vibe
Atmosfera objetiva, iluminação, temperatura, velocidade, som e espontaneidade.

## 3. MAPA DE BLOCOS COM TIMESTAMPS
Use somente: Hook; Segmentação; Teasing; Prova/Credibilidade; Dor/Agitação; Reconhecimento de Descrença; Mecanismo (tease); Invalidação; Benefício; Qualificador; Motivo pra Continuar; Push-Pull; CTA; Perrengue Cobiçado; Future Pacing; Bullets; Grupo/Exclusividade. Não force blocos.
| Bloco Canônico | Timestamp inicial | Primeiras 5 a 7 palavras exatas | Timestamp final | Últimas 5 a 7 palavras exatas | O que aparece na tela | Observações de sincronização |
Use SEM FALA para bloco visual e TIMESTAMP ESTIMADO PELO VÍDEO quando necessário.

## 4. PROVAS VISUAIS, DEMONSTRAÇÕES E TEXTO NA TELA
### Demonstração ativa
Timestamps, pessoa, objeto, ação, resultado e texto; ou NÃO IDENTIFICADO.
### Provas visuais em ordem cronológica
| Timestamp | Tipo de prova | O que aparece | Texto legível | Origem ou instituição mostrada | Legibilidade | Observação |
### Texto na tela durante todo o anúncio
| Timestamp inicial | Timestamp final | Texto exato | Posição | Estilo | Palavras ou números destacados |
Preserve erros; use [TRECHO ILEGÍVEL]. Classifique a legenda predominante.
### Símbolos carregados do nicho
| Timestamp | Objeto ou cena | Descrição literal |
### Produto e oferta visual
Aparição inicial/final, formato, embalagem/uso, preço, desconto, garantia, frete, bônus, urgência, CTA, URL, QR, cliffhanger e tipo de encerramento.

## 5. CENÁRIO, EDIÇÃO E RITMO
### Cenários
| Timestamp inicial | Timestamp final | Cenário | Personagens presentes | Mudança de bloco coincidente? |
Inclua fundo real/virtual, chroma, desfoque e arquivo.
### Ritmo de edição
Rápido (<2s), médio (2–5s), longo (>5s), contínuo ou misto; acelerações, desacelerações, trechos sem corte, quantidade e duração aparente.
### Música e áudio
| Timestamp | Elemento de áudio | Descrição | Intensidade | Função observável |
### Recursos de edição
| Timestamp | Recurso | Descrição |

## 6. SENSAÇÃO GERAL E PONTOS DE FRICÇÃO
Atmosfera e transições objetivas, sem julgamento.
| Timestamp | Tipo de fricção | Descrição objetiva do que ocorre |
Forneça exatamente dois momentos distintos; se não houver, preencha o restante com NÃO IDENTIFICADO.

## 7. CAMPOS DE DURAÇÃO
DURAÇÃO TOTAL DO ANÚNCIO: [minutos e segundos]
DURAÇÃO ÚTIL DE COPY: [timestamp inicial até timestamp final]
ÚLTIMA FALA DE VENDA OU CTA: "[fala exata]"
TIMESTAMP DA ÚLTIMA FALA DE VENDA OU CTA: [timestamp]
FLAG DE CAUDA: Sim / Não
INÍCIO DA CAUDA: [timestamp ou NÃO APLICÁVEL]
FIM DA CAUDA: [timestamp ou NÃO APLICÁVEL]
DURAÇÃO DA CAUDA: [duração ou NÃO APLICÁVEL]
CONTEÚDO DA CAUDA: [literal]

## TRANSCRIPT
Fonte: transcript externo

[O SISTEMA ANEXARÁ O TRANSCRIPT EXTERNO VERBATIM]

Esta deve ser a última seção. Não reproduza, resuma, traduza nem corrija o transcript nesta etapa; o sistema anexará a fonte original literalmente. Não escreva nada depois do marcador.`;
}

export function externalTranscript(input = {}) {
  const transcript = clean(input.transcript).trim();
  const segments = Array.isArray(input.segments) ? input.segments.slice(0, 8_000) : [];
  const timed = segments
    .map((part) => `[${formatTime(part.start)}] ${clean(part.text).trim()}`)
    .filter((line) => !/\]\s*$/.test(line))
    .join("\n");
  return timed || transcript || "NÃO INFORMADO";
}

export function finalizeAdReport(report, input = {}) {
  const value = clean(report).trim();
  const transcriptAt = value.indexOf("## TRANSCRIPT");
  const analysis = (transcriptAt >= 0 ? value.slice(0, transcriptAt) : value).trimEnd();
  return `${analysis}\n\n## TRANSCRIPT\nFonte: transcript externo\n\n${externalTranscript(input)}`.trim();
}

export function formatTime(value) {
  const total = Math.max(0, Math.round(Number(value) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function validateAdReport(report, transcript) {
  const value = clean(report).trim();
  const required = [
    "# RELATÓRIO GEMINI", "## 1. FORMATO GERAL E PERSONAGENS",
    "## 2. HOOK VISUAL", "## 3. MAPA DE BLOCOS", "## 4. PROVAS VISUAIS",
    "## 5. CENÁRIO", "## 6. SENSAÇÃO GERAL", "## 7. CAMPOS DE DURAÇÃO",
    "## TRANSCRIPT", "Fonte: transcript externo",
  ];
  const missing = required.filter((heading) => !value.includes(heading));
  const transcriptAt = value.lastIndexOf("## TRANSCRIPT");
  const transcriptBlock = transcriptAt >= 0 ? value.slice(transcriptAt) : "";
  const headingsAfterTranscript = transcriptBlock.split("\n").slice(1).some((line) => /^#{1,6}\s/.test(line.trim()));
  const expectedTranscript = clean(transcript).trim() || "NÃO INFORMADO";
  if (transcriptAt < 0 || headingsAfterTranscript || !transcriptBlock.endsWith(expectedTranscript)) missing.push("transcript completo e por último");
  return { complete: missing.length === 0, missing: [...new Set(missing)] };
}
