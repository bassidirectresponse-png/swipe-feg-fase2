// Furtado Skill — Head Copy Ads IA (FEG)
//
// Escreve anúncios de vídeo (VSL/UGC) modelando o que já foi validado no nicho,
// em 4 FASES encadeadas (a skill "escritor-de-anuncios"):
//   1) biblia   — Bíblia do Nicho: extrai padrões de 2–4 anúncios validados
//                 (enriquecida com o vault + Mega Brain do dashboard, como o Feguinho).
//   2) voc      — Voz do Prospect: pesquisa REAL na web a linguagem do público
//                 (usa a ferramenta de busca do Claude — web_search).
//   3) remessa  — Arquitetura da Remessa: briefing de cada anúncio (promessa/ângulo/
//                 avatar/formato/hipótese) a partir da oferta + Bíblia.
//   4) escrita  — Escreve a copy final (corpo + hooks), pronta pra gravar.
//
// Cada fase recebe do cliente os documentos das fases anteriores (biblia/voc/briefing),
// que ficam salvos por projeto no Supabase. Qualquer usuário LOGADO pode usar
// (a função é só leitura — nunca grava nada).
//
// Fases 1/3/4: STREAMING token a token (NDJSON), igual ao Feguinho.
// Fase 2 (voc): chamada com web_search, não-stream + heartbeat (mantém a conexão viva
//   durante as buscas) + resume em pause_turn; devolve o texto no fim.
//
// Env (Netlify): ANTHROPIC_API_KEY (obrigatória), SUPABASE_URL, SUPABASE_ANON_KEY (com default),
//                FURTADO_MODEL (opcional; default claude-sonnet-5 — mesmo do Feguinho).

import { SUPABASE_ANON_KEY as ANON, SUPABASE_URL, authenticate, bearerToken, corsHeaders, json, preflight, rateLimit, readJson, trustedOrigin } from "./_security.mjs";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.FURTADO_MODEL || "claude-sonnet-5";  // suporta web_search_20260209
const MAX_TOKENS = { biblia: 6000, voc: 6000, remessa: 5000, escrita: 12000 };
const WEB_MAX_USES = 6;   // teto de buscas na Fase 2 (equilíbrio entre profundidade e tempo da função)
// Busca básica (web_search_20250305): NÃO usa o "dynamic filtering" (code_execution) da
// versão 2026 — que estava estourando o limite do ambiente de código e fazendo o modelo
// narrar as tentativas. A básica é previsível e suficiente para coletar falas.
const WEB_TOOL = process.env.FURTADO_WEB_TOOL || "web_search_20250305";
const WEB_COUNTRY = process.env.FURTADO_WEB_COUNTRY || "US";   // busca no mercado dos EUA (inglês)

const METHODS = "POST, GET, OPTIONS";

// ---------- helpers (surrogate-safe, igual ao Feguinho) ----------
const clean = (s) => String(s == null ? "" : s)
  .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
  .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
const clip = (s, n) => {
  s = clean(String(s == null ? "" : s));
  if (s.length <= n) return s;
  let c = s.slice(0, n);
  if (/[\uD800-\uDBFF]$/.test(c)) c = c.slice(0, -1);
  return c + "…";
};
const slug = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const clampInt = (v, lo, hi, d) => { const n = parseInt(v, 10); return isNaN(n) ? d : Math.max(lo, Math.min(hi, n)); };

async function sbGet(path, token) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: ANON, Authorization: `Bearer ${token}` } });
    return r.ok ? await r.json() : [];
  } catch { return []; }
}
// enriquecimento da Fase 1 com a base interna (ads validados + análise-master do nicho)
async function vaultCtx(nichoSlug, token) {
  const nz = encodeURIComponent(nichoSlug);
  const [ads, master] = await Promise.all([
    sbGet(`conhecimento?select=titulo,vendas,conteudo&tipo=eq.ads-validado&nicho=eq.${nz}&order=vendas.desc.nullslast&limit=5`, token),
    sbGet(`conhecimento?select=titulo,conteudo&tipo=eq.analise-master&nicho=eq.${nz}`, token),
  ]);
  return { ads: ads || [], master: master || [] };
}

// ---------- persona + prompts ----------
const PERSONA =
  "Você é o FURTADO SKILL — HEAD DE COPY DE ADS da FEG (nutra/suplementos, mercado dos EUA vendido em português do Brasil). " +
  "Você escreve anúncios de VÍDEO (VSL/UGC) que convertem MODELANDO padrões já validados no nicho — mesmo avatar, mesmo tipo de mecanismo, mesmo formato de promessa, mesmos tipos de prova que aquele público já aceitou. " +
  "Princípios inegociáveis: (1) EXTRAIA, não interprete — capture o que ESTÁ no material/na fala real, não a sua leitura; quando faltar, escreva 'não fica claro' em vez de inventar. " +
  "(2) Nunca invente números de estudo/dados como se fossem reais. (3) Anúncios serão GRAVADOS em vídeo: frases curtas, fluidez de leitura em voz alta, ritmo de fala — nada de parágrafos densos. " +
  "Seja objetivo: entregue direto o que foi pedido, sem preâmbulos, sem se apresentar e sem despedidas. Responda SEMPRE em português do Brasil e em Markdown.";

function bibliaPrompt(nicho, ads, ctx) {
  const ctxAds = (ctx.ads || []).map(a => `### ${a.titulo} (${a.vendas != null ? a.vendas + " vendas" : "s/nº"})\n${clip(a.conteudo, 1200)}`).join("\n\n") || "(sem ads validados do vault para este nicho)";
  const ctxMaster = (ctx.master || []).map(m => clip(m.conteudo, 2500)).join("\n\n") || "(sem análise-master para este nicho)";
  const user = `TAREFA — montar a BÍBLIA DO NICHO a partir dos anúncios validados abaixo.

Para CADA anúncio colado, extraia internamente 5 blocos (Perfil do Público; Estrutura: formato/blocos/tempo/ângulo; Mecanismo do problema e da solução + nome chiclete; Promessa: resultado+prazo, benefícios funcionais/dimensionais/emocionais; Provas: autoridades/vilões/estudos). São EXTRAÇÕES, não interpretações — copie o que está no texto; se algo estiver ausente/ambíguo, escreva "não fica claro no anúncio".

Depois CRUZE todos e consolide numa única Bíblia, seguindo EXATAMENTE esta estrutura em Markdown:

# Bíblia do Nicho — ${nicho}

## 1. Avatar
- Perfil demográfico recorrente
- Crença limitante dominante no nicho
- O que esse público já tentou e não funcionou

## 2. Linguagem do Nicho
- Palavras e expressões que aparecem em mais de um anúncio (liste-as entre aspas)

## 3. Mecanismo
- O que torna o mecanismo da solução diferente do que o público já testou
- Causa raiz apresentada para o problema, e por que ela é nova para o público
- Nome(s) chiclete do mecanismo

## 4. Promessa
- Padrão de promessa observado (resultado + prazo)
- Benefícios funcionais, dimensionais e emocionais mais explorados

## 5. Autoridade e Prova
- Heróis (autoridades) que aparecem em mais de um anúncio
- Vilões institucionais que aparecem em mais de um anúncio
- Tipos de prova que esse público aceita

## 6. Ângulos Recorrentes
- Ângulos que aparecem em mais de um anúncio
- Ângulo que parece mais forte (mais explorado)

## 7. Call to Action
- Padrões de urgência usados
- Principais narrativas de fechamento

## 8. Elementos Obrigatórios do Nicho
- APENAS os elementos persuasivos que apareceram na MAIORIA dos anúncios analisados (os que não podem faltar em um novo anúncio deste nicho)

NICHO: ${nicho}

=== ANÚNCIOS VALIDADOS COLADOS (separados por "-----") ===
${clip(ads, 16000)}

=== REFORÇO — BASE INTERNA (vault: campeões validados do nicho, ordem por vendas) ===
${clip(ctxAds, 4000)}

=== REFORÇO — ANÁLISE MASTER DO NICHO ===
${clip(ctxMaster, 2500)}`;
  return { system: PERSONA, user, max_tokens: MAX_TOKENS.biblia };
}

function vocPrompt(nicho, biblia) {
  const user = `TASK — Build the VOICE OF CUSTOMER (VOC) for the "${nicho}" niche: capture how REAL people in the US market actually talk about this problem, by researching the web.

LANGUAGE & MARKET:
- This is US-MARKET research. Search in ENGLISH only — never in Portuguese.
- First translate "${nicho}" to its natural English market term (e.g. "Emagrecimento" → "weight loss"; "Disfunção Erétil" → "erectile dysfunction"; "Neuropatia" → "nerve pain / neuropathy"; "Memória" → "memory / brain fog"; "Diabetes / Glicose" → "blood sugar"). Search using that English term.

WHERE TO SEARCH (real people, real comments):
- Reddit, YouTube video comments, TikTok, Facebook groups, health/wellness forums, and product review pages (Amazon reviews, etc.).
- Prioritize RECENT discussions — roughly the LAST 30 DAYS (up to ~6 months is acceptable). Note the approximate date when available.

HOW TO SEARCH (be efficient — avoid hitting limits):
- Run only a SMALL number of focused searches (AT MOST 5–6 total). Craft targeted English queries, e.g.: "[english niche] reddit what finally worked", "[english niche] youtube comments frustrated", "[english niche] tiktok", "[english niche] amazon reviews disappointed", "[english niche] forum can't believe".
- Do a broad pass, then STOP searching and write the document with what you gathered. Do NOT retry endlessly.

COLLECTION RULES:
- Copy quotes EXACTLY as written (keep the original English, slang and typos). Never paraphrase, translate, or clean them up.
- Keep the SOURCE for each quote (platform · approx date · link/handle if available).
- If a category has fewer than 5 strong real quotes after a genuine search, deliver what you found and say so — never invent quotes.

CRITICAL — your reply MUST contain ONLY the final VOC document in the exact format below. Do NOT narrate your search process. Do NOT mention tools, web_search, code execution, "code_execution", usage limits, retries, or what you are "going to" do. No preamble, no sign-off.

OUTPUT FORMAT (Markdown — quotes stay in English; section titles and the Síntese are in Portuguese, as shown):

# Voz do Prospect — ${nicho}
_Fonte: mercado dos EUA — falas reais em inglês coletadas na web (Reddit, YouTube, TikTok, fóruns, reviews)._

## Dores e Frustrações Reais
1. "[exact English quote]" — [platform · ~date · link/handle]
...(up to 5)

## Desejos e Sonhos Reais
...

## Crenças e Opiniões sobre o Tema
...

## Ceticismo e Objeções
...

## Falsas Crenças sobre Como o Problema Funciona
...

## Síntese (em português)
- Expressões/gírias em inglês que se repetem (liste entre aspas)
- Perfil que emerge dessas falas (compara com o avatar da Bíblia — reforça ou contradiz?)
- Crença limitante dominante confirmada pela pesquisa
- 5 a 8 expressões/gatilhos em inglês prontos para modelar nos anúncios

NICHE (Portuguese label): ${nicho}

=== BÍBLIA DO NICHO (use the avatar, language and angles to decide what to search for) ===
${clip(biblia, 9000) || "(no Bible provided — research by the niche above)"}`;
  return { system: PERSONA, user, max_tokens: MAX_TOKENS.voc };
}

function remessaPrompt(nicho, biblia, oferta, nCorpos, nHooks) {
  const user = `TAREFA — ARQUITETURA DA REMESSA: antes de escrever qualquer anúncio, defina a estratégia de CADA um (promessa, ângulo, avatar do narrador, formato e hipótese de teste). Apoie TODAS as escolhas no que já foi validado no nicho (Bíblia), não em preferência genérica. NÃO escolha pelo usuário — proponha com raciocínio para ele aprovar/ajustar.

Produza um briefing para CADA um dos ${nCorpos} corpo(s), cada um com ${nHooks} hook(s). Formato (Markdown):

# Briefing da Remessa — ${nicho}

## Oferta
- Expert: ...
- Mecanismo do problema: ...
- Mecanismo da solução / nome chiclete: ...
- Promessa principal: ...

## Anúncio 1 (Corpo 1) — ${nHooks} hooks
- Promessa: (pode variar entre anúncios, testando ênfases)
- Ângulo: (qual ângulo da Bíblia explora)
- Avatar/narrador: (sexo, idade, aparência — coerente com o avatar da Bíblia)
- Formato: (Jornada do Herói / Storytelling / Conspiração / Especialista-educacional)
- Hipótese sendo testada: (o que ESSA variação testa em relação às outras)
- Raciocínio: (por que essa promessa/ângulo/formato, com base na Bíblia)

## Anúncio 2 (Corpo 2) — ${nHooks} hooks
... (repita a estrutura para todos os ${nCorpos} corpos)

NICHO: ${nicho}

=== DADOS DA OFERTA (informados pelo usuário) ===
${clip(oferta, 4000)}

=== BÍBLIA DO NICHO (base das escolhas) ===
${clip(biblia, 9000) || "(sem Bíblia informada — peça para gerar a Fase 1 antes)"}`;
  return { system: PERSONA, user, max_tokens: MAX_TOKENS.remessa };
}

function escritaPrompt(nicho, biblia, voc, briefing, nCorpos, nHooks) {
  const user = `TAREFA — ESCREVER a REMESSA COMPLETA com ${nCorpos} anúncio(s), cada um com corpo completo + ${nHooks} hooks, pronta para GRAVAÇÃO em vídeo e com lastro total no que foi validado no nicho e no briefing.

Cada anúncio precisa:
- Corresponder ao respectivo Corpo/Anúncio do briefing, sem misturar ângulos entre eles.
- Abrir com ${nHooks} HOOKS fortes que conectem direto com dores/desejos/gatilhos do público (as ${nHooks} aberturas puxam para o MESMO corpo daquele anúncio).
- Qualificar o público com identificação imediata logo no início.
- Apresentar o nome chiclete do mecanismo e fazer a promessa principal do briefing.
- Usar a LINGUAGEM NATIVA do prospect — puxe expressões reais do VOC, não linguagem de marca.
- Seguir o formato narrativo definido no briefing / dominante na Bíblia.
- Trabalhar benefícios funcionais, dimensionais e emocionais + dores/desejos.
- Fechar com CTA forte seguindo o padrão de urgência validado na Bíblia, sem soar óbvio/forçado.
- Manter congruência com a oferta (mecanismo do problema/solução, nome chiclete, expert) — sem contradizê-los.
- FRASES CURTAS, ritmo de fala natural, respeitando o tempo médio padrão do nicho.

Formato (Markdown): entregue EXATAMENTE ${nCorpos} seções, de "## Anúncio 1 — Corpo 1" até "## Anúncio ${nCorpos} — Corpo ${nCorpos}". Em cada seção, liste os ${nHooks} hooks (rotulados Hook A, B, C...) e depois o CORPO completo do primeiro ao último bloco.

NICHO: ${nicho}  ·  REMESSA: ${nCorpos} corpo(s) · ${nHooks} hooks por corpo

=== BRIEFING DA REMESSA (o que foi definido para este anúncio) ===
${clip(briefing, 16000) || "(sem briefing — gere a Fase 3 antes)"}

=== BÍBLIA DO NICHO (padrões validados) ===
${clip(biblia, 7000) || "(sem Bíblia — gere a Fase 1 antes)"}

=== VOZ DO PROSPECT (linguagem real — puxe expressões daqui) ===
${clip(voc, 6000) || "(sem VOC — gere a Fase 2 antes)"}`;
  return { system: PERSONA, user, max_tokens: MAX_TOKENS.escrita };
}

// ---------- Anthropic: streaming (todas as fases; opcionalmente com web_search) ----------
// Retorna { gotText, searches }. Com opts.soft = true, NÃO emite {t:"error"} (deixa
// o chamador decidir o fallback). Com opts.searchStatus = true, avisa cada busca.
async function streamAnthropic(payload, send, opts = {}) {
  const body = {
    model: payload.model, max_tokens: payload.max_tokens, system: clean(payload.system),
    thinking: { type: "disabled" },
    messages: payload.messages || [{ role: "user", content: clean(payload.user) }],
    stream: true,
  };
  if (payload.tools) body.tools = payload.tools;
  let up;
  try {
    up = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    if (!opts.soft) send({ t: "error", v: "falha de conexão com o Claude" });
    return { gotText: false, searches: 0 };
  }
  if (!up.ok || !up.body) {
    const t = await up.text().catch(() => "");
    if (!opts.soft) send({ t: "error", v: `Claude HTTP ${up.status}: ${clip(t, 200)}` });
    return { gotText: false, searches: 0, httpErr: up.status };
  }
  const reader = up.body.getReader(); const dec = new TextDecoder();
  let buf = "", lastStatus = 0, gotText = false, searches = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (!raw || raw === "[DONE]") continue;
      let ev; try { ev = JSON.parse(raw); } catch { continue; }
      if (ev.type === "content_block_start") {
        const cb = ev.content_block || {};
        if (cb.type === "server_tool_use") {           // 1 busca disparada
          searches++;
          if (opts.searchStatus) send({ t: "status", v: `pesquisando na web… (${searches})` });
        } else if (cb.type === "web_search_tool_result" && opts.searchStatus) {
          send({ t: "status", v: `lendo resultados… (${searches})` });
        }
      } else if (ev.type === "content_block_delta") {
        const d = ev.delta || {};
        if (d.type === "text_delta" && d.text) { gotText = true; send({ t: "text", v: d.text }); }
        else if (d.type === "thinking_delta") { const now = Date.now(); if (now - lastStatus > 1200) { lastStatus = now; send({ t: "status", v: "pensando" }); } }
      } else if (ev.type === "error") {
        if (!opts.soft) send({ t: "error", v: (ev.error && ev.error.message) || "erro do modelo" });
      }
    }
  }
  if (!gotText && !opts.soft) send({ t: "error", v: "o modelo não retornou texto — tente de novo em instantes" });
  return { gotText, searches };
}

// Fallback do VOC quando a web não está disponível/estourou: compõe a partir do
// conhecimento do público + Bíblia (sempre entrega algo útil — nenhuma fase fica vazia).
function vocFallbackUser(nicho, biblia) {
  return `TASK — Build the VOICE OF CUSTOMER (VOC) for the "${nicho}" niche (US market). The web search did not return this round, so compose from your deep knowledge of how this US/English-speaking audience really talks. On the FIRST line, in italics, warn (in Portuguese): "_Falas representativas do padrão do público dos EUA (a busca web não retornou nesta rodada) — rode de novo para tentar coletar citações reais._". Then deliver the SAME structure: 5 categories with 5 lines each, quotes in ENGLISH (natural, raw, real), each with a short Portuguese gloss in parentheses; section titles and the Síntese in Portuguese. Do not narrate your process or mention tools/limits.

# Voz do Prospect — ${nicho}

## Dores e Frustrações Reais
## Desejos e Sonhos Reais
## Crenças e Opiniões sobre o Tema
## Ceticismo e Objeções
## Falsas Crenças sobre Como o Problema Funciona
## Síntese (em português)

=== BÍBLIA DO NICHO ===
${clip(biblia, 9000) || "(no Bible provided — use the niche above)"}`;
}

// ---------- handler (Netlify Functions v2, streaming NDJSON) ----------
export default async (req) => {
  const options = preflight(req, METHODS); if (options) return options;
  if (req.method === "GET") return json(req, 200, { ok: true, service: "furtado", ready: !!ANTHROPIC_KEY }, METHODS);
  if (req.method !== "POST") return json(req, 405, { ok: false, error: "método inválido" }, METHODS);
  if (!trustedOrigin(req)) return json(req, 403, { ok: false, error: "origem não autorizada" }, METHODS);
  if (!ANTHROPIC_KEY) return json(req, 500, { ok: false, error: "serviço não configurado" }, METHODS);

  const token = bearerToken(req);
  const sessionUser = await authenticate(req);
  if (!sessionUser) return json(req, 401, { ok: false, error: "sessão inválida — faça login de novo" }, METHODS);
  const quota = await rateLimit("furtado", sessionUser.id, { limit: 12, windowMs: 60_000 });
  if (!quota.allowed) return json(req, 429, { ok: false, error: "muitas solicitações; aguarde um instante", retryAfter: quota.retryAfter }, METHODS);

  let body;
  try { body = await readJson(req, { maxBytes: 256 * 1024 }); }
  catch (error) { return json(req, error.status || 400, { ok: false, error: error.message }, METHODS); }
  const phase = ["biblia", "voc", "remessa", "escrita"].includes(body.phase) ? body.phase : "biblia";
  const nicho = clip(body.nicho || "", 80) || "(nicho não informado)";
  const biblia = String(body.biblia || "");
  const voc = String(body.voc || "");
  const briefing = String(body.briefing || "");
  const nCorpos = clampInt(body.nCorpos, 1, 8, 3);
  const nHooks = clampInt(body.nHooks, 1, 6, 3);

  // valida inputs por fase
  let built;
  if (phase === "biblia") {
    const ads = String(body.input || "").trim();
    if (!ads) return json(req, 400, { ok: false, error: "cole 2 a 4 anúncios validados para gerar a Bíblia" }, METHODS);
    const ctx = await vaultCtx(slug(nicho), token);
    built = { ...bibliaPrompt(nicho, ads, ctx), model: MODEL };
  } else if (phase === "voc") {
    built = { ...vocPrompt(nicho, biblia), model: MODEL };
  } else if (phase === "remessa") {
    const oferta = String(body.input || "").trim();
    if (!oferta) return json(req, 400, { ok: false, error: "informe os dados da oferta (expert, mecanismos, nome chiclete, promessa)" }, METHODS);
    built = { ...remessaPrompt(nicho, biblia, oferta, nCorpos, nHooks), model: MODEL };
  } else {
    built = { ...escritaPrompt(nicho, biblia, voc, briefing, nCorpos, nHooks), model: MODEL };
  }

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (obj) => { if (closed) return; try { controller.enqueue(enc.encode(JSON.stringify(obj) + "\n")); } catch {} };
      send({ t: "meta", phase, model: MODEL, nicho });
      let hb = null;
      try {
        if (phase === "voc") {
          // STREAMING com web_search: o texto flui token a token (conexão viva) e,
          // se a plataforma cortar, o cliente ainda fica com o resultado parcial.
          const t0 = Date.now();
          send({ t: "status", v: "pesquisando na web…" });
          hb = setInterval(() => send({ t: "status", v: `pesquisando na web… ${Math.round((Date.now() - t0) / 1000)}s` }), 3000);
          const vp = { system: built.system, user: built.user, model: built.model, max_tokens: built.max_tokens,
            tools: [{ type: WEB_TOOL, name: "web_search", max_uses: WEB_MAX_USES, user_location: { type: "approximate", country: WEB_COUNTRY } }] };
          const r = await streamAnthropic(vp, send, { soft: true, searchStatus: true });
          if (hb) { clearInterval(hb); hb = null; }
          if (r.searches) send({ t: "meta2", searches: r.searches });
          if (!r.gotText) {
            // web indisponível/limite/timeout da busca → garante o VOC pelo conhecimento do público
            send({ t: "status", v: "web indisponível — compilando pelo conhecimento do público…" });
            await streamAnthropic({ system: built.system, user: vocFallbackUser(nicho, biblia), model: built.model, max_tokens: built.max_tokens }, send);
          }
        } else {
          await streamAnthropic({ model: built.model, max_tokens: built.max_tokens, system: built.system, user: built.user }, send);
        }
      } catch (e) {
        send({ t: "error", v: "falha: " + clip(e && e.message ? e.message : e, 160) });
      } finally {
        if (hb) clearInterval(hb);
        send({ t: "done" });
        closed = true;
        try { controller.close(); } catch {}
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { ...corsHeaders(req, METHODS), "Content-Type": "application/x-ndjson; charset=utf-8", "X-Accel-Buffering": "no" },
  });
};
