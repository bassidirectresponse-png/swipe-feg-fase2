// Feguinho Copy Chief — FEG (Versão Beta)
//
// Chat/ferramenta de copy que MODELA o que já vendeu. Faz ANÁLISE DUPLA:
//   1) o vault dissecado (tabela `conhecimento`: ads validados, análises-master,
//      skills de dissecação "atlas") — buscado aqui com o token do usuário;
//   2) o Mega Brain + Radar TikTok do próprio dashboard — mandados pelo cliente
//      (que já tem tudo carregado), como contexto de reforço.
// Junta os dois, monta o prompt e faz STREAMING da resposta do Claude de volta
// pro navegador (NDJSON: uma linha JSON por evento).
//
// Qualquer usuário LOGADO pode usar (somente leitura — a função nunca grava nada).
//
// Variáveis de ambiente (Netlify → Site settings → Environment variables):
//   ANTHROPIC_API_KEY   (obrigatória, secreta)  -> https://console.anthropic.com/settings/keys
//   SUPABASE_URL        (opcional, tem default)
//   SUPABASE_ANON_KEY   (opcional, tem default; é pública)
//   FEGUINHO_MODEL_GERAR / _DISSECAR / _MODELAR  (opcional; troca o modelo por ferramenta)
//
// IMPORTANTE (aprendido na validação): os modelos Claude 5 podem emitir blocos de
// "thinking" antes do texto. Por isso: max_tokens folgado (>=5000) e só repassamos
// os deltas de TEXTO (o "pensando" vira um status discreto, sem vazar o raciocínio).

const SUPABASE_URL = (process.env.SUPABASE_URL || "https://ppaajtzbhjixhyfidojd.supabase.co").replace(/\/+$/, "");
const ANON = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwYWFqdHpiaGppeGh5Zmlkb2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMDkzNTcsImV4cCI6MjA5Njc4NTM1N30.uoC_3EHM_dfmkBHJYjPvlaC7DqkJziunz-tug0ItAJc";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const MODELS = {
  gerar:    process.env.FEGUINHO_MODEL_GERAR    || "claude-sonnet-5",
  dissecar: process.env.FEGUINHO_MODEL_DISSECAR || "claude-sonnet-5",
  modelar:  process.env.FEGUINHO_MODEL_MODELAR  || "claude-sonnet-5",
};
const MAX_TOKENS = { gerar: 3400, dissecar: 4800, modelar: 3400 };

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type", "Access-Control-Allow-Methods": "POST, GET, OPTIONS" };
const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...CORS } });

// ---------- helpers ----------
// Remove surrogates órfãos (emoji cortado ao meio / dado corrompido) — senão a API
// do Claude rejeita com "no low surrogate in string" (HTTP 400). Legendas do TikTok
// vêm cheias de emoji, e cortar por tamanho pode partir um par de surrogates.
const clean = (s) => String(s == null ? "" : s)
  .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
  .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
const clip = (s, n) => {
  s = clean(String(s == null ? "" : s));
  if (s.length <= n) return s;
  let c = s.slice(0, n);
  if (/[\uD800-\uDBFF]$/.test(c)) c = c.slice(0, -1); // não termina no meio de um emoji
  return c + "…";
};
const slug = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const esc = (s) => String(s == null ? "" : s);

async function sbGet(path, token) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: ANON, Authorization: `Bearer ${token}` } });
    return r.ok ? await r.json() : [];
  } catch { return []; }
}

// Contexto do VAULT (buscado no servidor com o token do usuário logado)
async function vaultCtx(tool, nichoSlug, formato, token) {
  const nz = encodeURIComponent(nichoSlug);
  const jobs = [
    sbGet(`conhecimento?select=titulo,vendas,conteudo&tipo=eq.ads-validado&nicho=eq.${nz}&order=vendas.desc.nullslast&limit=6`, token),
    sbGet(`conhecimento?select=titulo,conteudo&tipo=eq.analise-master&nicho=eq.${nz}`, token),
  ];
  if (tool === "dissecar") {
    const which = formato === "vsl" ? "vsl" : "ads";
    jobs.push(sbGet(`conhecimento?select=titulo,conteudo&tipo=eq.skill-dissecador&fonte=like.*${which}*`, token));
  } else {
    jobs.push(sbGet(`conhecimento?select=titulo,conteudo&tipo=eq.framework&limit=2`, token));
  }
  const [ads, master, extra] = await Promise.all(jobs);
  return { ads: ads || [], master: master || [], extra: extra || [] };
}

// ---------- montagem dos prompts ----------
const PERSONA =
  "Você é o FEGUINHO COPY CHIEF, copywriter sênior de Direct Response da FEG (nutra/suplementos, mercado dos EUA vendido em português). " +
  "Sua filosofia inegociável: MODELAR o que já vendeu — nunca criar do zero. Você recebe criativos VALIDADOS (com nº de vendas ou faturamento) " +
  "e deve primeiro extrair os PADRÕES dos CAMPEÕES (os de mais vendas) e só então gerar material novo com o MESMO DNA. " +
  "Tom de copy de resposta direta, português do Brasil, direto e persuasivo. Nunca invente números de estudo/dados como se fossem reais. " +
  "Seja OBJETIVO: entregue direto o que foi pedido, sem preâmbulos, sem se apresentar e sem despedidas. Tabelas enxutas (células curtas). Nada de encher linguiça.";

function sourcesBlock(ctx, mega, tiktok) {
  const ctxAds = (ctx.ads || []).map(a => `### ${a.titulo} (${a.vendas != null ? a.vendas + " vendas" : "s/nº"})\n${clip(a.conteudo, 1400)}`).join("\n\n") || "(sem ads validados do vault para este nicho)";
  const ctxMaster = (ctx.master || []).map(m => clip(m.conteudo, 3000)).join("\n\n") || "(sem análise-master para este nicho)";
  const ctxMega = (mega || []).map(d => `- ${clip(d.nome, 50)} — autor ${d.autor || "?"} · ${d.valor || "?"} ${d.tipo === "faturamento" ? "US$ (faturamento)" : "vendas"}: ${clip(d.copy, 500)}`).join("\n") || "(nenhuma copy no Mega Brain para este nicho ainda)";
  const ctxTt = (tiktok || []).map(d => `- [${Number(d.views || 0).toLocaleString("en-US")} views · eng ${Math.round((d.eng || 0) * 1000) / 10}%] ${clip(d.cap, 100)} — ${d.url || ""}`).join("\n") || "(nenhum vídeo do Radar para este nicho)";
  return { ctxAds, ctxMaster, ctxMega, ctxTt };
}

function build(tool, nicho, formato, input, ctx, mega, tiktok) {
  const S = sourcesBlock(ctx, mega, tiktok);
  const fmtLabel = formato === "vsl" ? "VSL (video sales letter)" : "anúncio (criativo curto)";

  if (tool === "dissecar") {
    const atlas = (ctx.extra || [])[0];
    const method = atlas ? atlas.conteudo : "";
    const system = PERSONA + "\n\nAgora você atua como DISSECADOR. Siga FIELMENTE o método abaixo, respeitando cada módulo/bloco na ordem indicada. Não resuma o método: aplique-o por completo ao material.\n\n===== MÉTODO (SKILL ATLAS) =====\n" + clip(method, 28000);
    const user = `TAREFA: dissecar o ${fmtLabel} abaixo, bloco a bloco, seguindo o método ATLAS à risca (Lead, História/Descoberta, Mecanismo do problema, Mecanismo da solução, Oferta, Fechamento — e o que mais o método pedir). Para cada bloco: cite o trecho, nomeie a técnica e explique por que funciona. No fim, dê um veredito de forças/fraquezas e o que modelar.

NICHO: ${nicho}

=== MATERIAL A DISSECAR ===
${clip(input, 12000)}

=== REFERÊNCIA — CAMPEÕES VALIDADOS DO NICHO (para comparar padrões) ===
${clip(S.ctxAds, 3500)}`;
    return { system, user, model: MODELS.dissecar, max_tokens: MAX_TOKENS.dissecar };
  }

  if (tool === "modelar") {
    const alvo = formato === "vsl"
      ? "3 variações de ESTRUTURA de VSL (por blocos: Lead, História/Descoberta, Mecanismo do problema, Mecanismo da solução, Oferta, Fechamento), cada uma com um ângulo diferente"
      : "5 variações do criativo (hook + corpo curto), cada uma com um ângulo distinto";
    const system = PERSONA;
    const user = `TAREFA: a partir do criativo/ideia CAMPEÃ abaixo, gere ${alvo}. Antes, extraia em 1 tabela os padrões que fazem ele vender (gatilho, promessa, mecanismo, prova, oferta). Cada variação deve manter o DNA vencedor e indicar de qual campeão veio a estrutura.

NICHO: ${nicho}  ·  FORMATO: ${fmtLabel}
CRIATIVO/IDEIA CAMPEÃ (base a modelar): ${clip(input, 6000)}

=== CRIATIVOS VALIDADOS DO VAULT (ordem por vendas) ===
${S.ctxAds}

=== ANÁLISE MASTER DO NICHO ===
${clip(S.ctxMaster, 2500)}

=== MEGA BRAIN (copies validadas do dashboard) ===
${S.ctxMega}`;
    return { system, user, model: MODELS.modelar, max_tokens: MAX_TOKENS.modelar };
  }

  // gerar (default)
  const entrega = formato === "vsl"
    ? "1 ESTRUTURA de VSL completa por blocos (Lead / História / Mecanismo do problema / Mecanismo da solução / Oferta / Fechamento), com o texto de cada bloco, modelada nos campeões"
    : "5 HOOKS novos + 1 CORPO de anúncio curto, modelados nos criativos validados (priorize os de MAIS vendas)";
  const system = PERSONA;
  const user = `TAREFA:
1) Primeiro, extraia numa tabela os PADRÕES dos CAMPEÕES abaixo (estrutura → exemplo → nº de vendas).
2) Depois entregue: ${entrega}. Para cada peça, diga de QUAL campeão você clonou a estrutura (e as vendas dele).
3) No fim, indique QUAIS vídeos do Radar TikTok usar como hook e COMO (usar o vídeo para edição / a legenda como base do gancho).

NICHO: ${nicho}  ·  FORMATO: ${fmtLabel}
IDEIA / MECANISMO / ÂNGULO DO USUÁRIO: ${clip(input, 4000)}

=== CRIATIVOS VALIDADOS — VAULT (base principal, ordem por vendas) ===
${S.ctxAds}

=== ANÁLISE MASTER DO NICHO ===
${clip(S.ctxMaster, 3000)}

=== MEGA BRAIN (copies validadas do dashboard) ===
${S.ctxMega}

=== RADAR TIKTOK (orgânicos por views/engajamento — candidatos a hook) ===
${S.ctxTt}`;
  return { system, user, model: MODELS.gerar, max_tokens: MAX_TOKENS.gerar };
}

// ---------- handler (Netlify Functions v2, streaming) ----------
export default async (req) => {
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: CORS });
  if (req.method === "GET") return json(200, { ok: true, service: "feguinho", ready: !!ANTHROPIC_KEY });
  if (req.method !== "POST") return json(405, { ok: false, error: "método inválido" });
  if (!ANTHROPIC_KEY) return json(500, { ok: false, error: "ANTHROPIC_API_KEY não configurada no Netlify" });

  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json(401, { ok: false, error: "sem autenticação" });

  // valida a sessão (qualquer usuário logado serve; a função é só leitura)
  try {
    const u = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON, Authorization: `Bearer ${token}` } });
    if (!u.ok) return json(401, { ok: false, error: "sessão inválida — faça login de novo" });
  } catch { return json(401, { ok: false, error: "não deu para validar a sessão" }); }

  let body;
  try { body = await req.json(); } catch { return json(400, { ok: false, error: "corpo inválido" }); }
  const tool = ["gerar", "dissecar", "modelar"].includes(body.tool) ? body.tool : "gerar";
  const nicho = clip(body.nicho || "", 60);
  const formato = body.formato === "vsl" ? "vsl" : "anuncio";
  const input = String(body.input || "").trim();
  if (!input) return json(400, { ok: false, error: "escreva algo para o Feguinho trabalhar" });
  const mega = Array.isArray(body.mega) ? body.mega.slice(0, 8) : [];
  const tiktok = Array.isArray(body.tiktok) ? body.tiktok.slice(0, 8) : [];

  const ctx = await vaultCtx(tool, slug(nicho), formato, token);
  const { system, user, model, max_tokens } = build(tool, nicho, formato, input, ctx, mega, tiktok);

  const enc = new TextEncoder();
  // thinking DESLIGADO de propósito: no claude-sonnet-5 o "thinking" padrão roda ~38s
  // sem streamar (e, com max_tokens baixo, chega a consumir tudo e voltar vazio). Desligado,
  // o texto começa em ~1,5s — essencial pro streaming não estourar o timeout da Netlify.
  // A análise dos campeões continua acontecendo no TEXTO (o prompt força a tabela de padrões).
  // clean() final: garante que NENHUM surrogate órfão chegue ao JSON.stringify → Claude
  const payload = { model, max_tokens, system: clean(system), stream: true, thinking: { type: "disabled" }, messages: [{ role: "user", content: clean(user) }] };

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj) => { try { controller.enqueue(enc.encode(JSON.stringify(obj) + "\n")); } catch {} };
      send({ t: "meta", tool, model, nicho, formato, sources: { ads: (ctx.ads || []).length, master: (ctx.master || []).length, mega: mega.length, tiktok: tiktok.length } });
      try {
        const up = await fetch(ANTHROPIC_URL, {
          method: "POST",
          headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!up.ok || !up.body) {
          const t = await up.text().catch(() => "");
          send({ t: "error", v: `Claude HTTP ${up.status}: ${clip(t, 200)}` });
          send({ t: "done" }); controller.close(); return;
        }
        const reader = up.body.getReader();
        const dec = new TextDecoder();
        let buf = "", lastStatus = 0, gotText = false;
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
            if (ev.type === "content_block_delta") {
              const d = ev.delta || {};
              if (d.type === "text_delta" && d.text) { gotText = true; send({ t: "text", v: d.text }); }
              else if (d.type === "thinking_delta") { const now = Date.now(); if (now - lastStatus > 1200) { lastStatus = now; send({ t: "status", v: "pensando" }); } }
            } else if (ev.type === "error") {
              send({ t: "error", v: esc((ev.error && ev.error.message) || "erro do modelo") });
            }
          }
        }
        if (!gotText) send({ t: "error", v: "o modelo não retornou texto — tente de novo em instantes" });
        send({ t: "done" });
        controller.close();
      } catch (e) {
        send({ t: "error", v: "falha no streaming: " + clip(e && e.message ? e.message : e, 160) });
        send({ t: "done" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no", ...CORS },
  });
};
