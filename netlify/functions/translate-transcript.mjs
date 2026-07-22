// Tradução fiel das transcrições avulsas para português brasileiro.
// O cliente envia partes pequenas em sequência para funcionar também com
// vídeos longos sem exceder o tempo de uma função síncrona.
import { authenticate, json, preflight, rateLimit, readJson, trustedOrigin } from "./_security.mjs";

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.TRANSCRIBER_TRANSLATION_MODEL || process.env.VSL_DISSECTOR_MODEL || process.env.FURTADO_MODEL || "claude-sonnet-5";
const METHODS = "POST, GET, OPTIONS";

const clean = value => String(value == null ? "" : value)
  .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
  .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");

const SYSTEM = `Você é um tradutor profissional especializado em anúncios, VSLs e copy de resposta direta.
Traduza integralmente para português brasileiro natural e fiel, independentemente do idioma de origem.
Preserve intenção, força persuasiva, tom, ordem, parágrafos, números, nomes, marcas, claims e termos técnicos.
Não resuma, não omita, não explique, não suavize, não censure e não acrescente informação.
Entregue somente a tradução, sem título, prefácio, observações ou aspas.`;

export default async req => {
  const options = preflight(req, METHODS); if (options) return options;
  if (req.method === "GET") return json(req, 200, { ok: true, service: "translate-transcript", ready: !!ANTHROPIC_KEY }, METHODS);
  if (req.method !== "POST") return json(req, 405, { ok: false, error: "método inválido" }, METHODS);
  if (!trustedOrigin(req)) return json(req, 403, { ok: false, error: "origem não autorizada" }, METHODS);
  if (!ANTHROPIC_KEY) return json(req, 500, { ok: false, error: "serviço de tradução não configurado" }, METHODS);
  const user = await authenticate(req);
  if (!user) return json(req, 401, { ok: false, error: "sessão inválida — faça login de novo" }, METHODS);
  const quota = await rateLimit("translate-transcript", user.id, { limit: 160, windowMs: 10 * 60_000 });
  if (!quota.allowed) return json(req, 429, { ok: false, error: "limite temporário de tradução atingido", retryAfter: quota.retryAfter }, METHODS);

  let input;
  try { input = await readJson(req, { maxBytes: 16 * 1024 }); }
  catch (error) { return json(req, error.status || 400, { ok: false, error: error.message }, METHODS); }
  const text = clean(input.text).trim().slice(0, 8_000);
  if (!text) return json(req, 400, { ok: false, error: "trecho vazio" }, METHODS);
  const part = Math.max(1, Number(input.part) || 1), total = Math.max(part, Number(input.total) || part);
  const sourceLanguage = clean(input.language || "não detectado").slice(0, 40);

  let upstream;
  try {
    upstream = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8_000,
        system: SYSTEM,
        thinking: { type: "disabled" },
        messages: [{ role: "user", content: `IDIOMA ORIGINAL: ${sourceLanguage}\nPARTE: ${part}/${total}\n\nTEXTO ORIGINAL:\n${text}` }],
      }),
    });
  } catch {
    return json(req, 502, { ok: false, retryable: true, error: "falha temporária na tradução" }, METHODS);
  }
  const raw = await upstream.text();
  if (!upstream.ok) return json(req, upstream.status === 429 ? 429 : 502, { ok: false, retryable: upstream.status === 429 || upstream.status >= 500, error: upstream.status === 429 ? "serviço de tradução ocupado" : "não foi possível traduzir esta parte" }, METHODS);
  let payload;
  try { payload = JSON.parse(raw); } catch { return json(req, 502, { ok: false, retryable: true, error: "resposta de tradução inválida" }, METHODS); }
  const translation = (Array.isArray(payload.content) ? payload.content : []).filter(item => item && item.type === "text").map(item => item.text).join("").trim();
  if (!translation) return json(req, 502, { ok: false, retryable: true, error: "tradução vazia" }, METHODS);
  return json(req, 200, { ok: true, translation }, METHODS);
};
