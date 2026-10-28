/** Classifies observations, never ownership. Does not execute HTML or follow forms. */
export function classifyStep({ url = "", title = "", text = "", html = "", http_status = 200, inaccessible_reason = null } = {}) {
  const basis = { version: 2, signals: [], method: "public_document_rules" };
  if (inaccessible_reason || http_status === 401 || http_status === 403 || http_status >= 400 || /captcha|verify you are human/i.test(title)) {
    return { kind: "unknown", verification: "inaccessible", inaccessible_reason: inaccessible_reason || "http_or_access_restriction", classification_basis: basis };
  }
  const path = (() => { try { return new URL(url).pathname; } catch { return ""; } })();
  // A Shopify theme's cart/footer is not evidence that the document is a checkout.
  if(/\bquiz\b/i.test(title)||/(^|[\/_-])quiz([\/_-]|$)/i.test(path)) {
    const fromTitle=/\bquiz\b/i.test(title);
    basis.signals.push({source:fromTitle?"document_title":"url_path",rule:"quiz"});
    return {kind:"quiz",verification:fromTitle?"verified":"inferred",classification_basis:basis,inaccessible_reason:null};
  }
  const content = (title + " " + text).slice(0, 2 * 1024 * 1024);
  const rules = [
    ["upsell", /\b(one.time.offer|upsell|upgrade your order)\b/i],
    ["checkout", /\b(card number|número do cartão|numero do cartao)\b/i],
    ["quiz", /\b(quiz|question \d|pergunta \d)\b/i],
    ["vsl", /<video\b|player\.vimeo|youtube\.com\/embed|wistia|vturb/i],
    ["presell", /\b(advertorial|sponsored article|publieditorial)\b/i],
    ["sales", /\b(add to cart|buy now|comprar agora|adicionar ao carrinho)\b/i],
  ];
  for (const [kind, pattern] of rules) {
    if (pattern.test(kind==="vsl"?content+" "+html:content)||
        (kind==="checkout"&&(/\b(checkout|finalizar compra)\b/i.test(title)||
          /<input\b[^>]{0,2048}\bautocomplete\s*=\s*["']cc-number["']/i.test(html)))) {
      basis.signals.push({ source: "document", rule: kind });
      return { kind, verification: "verified", classification_basis: basis, inaccessible_reason: null };
    }
  }
  for (const kind of ["upsell", "checkout", "quiz", "vsl", "presell"]) {
    if (new RegExp("(^|/)" + kind + "([/-]|$)", "i").test(path)) {
      basis.signals.push({ source: "url_path", rule: kind });
      return { kind, verification: "inferred", classification_basis: basis, inaccessible_reason: null };
    }
  }
  return { kind: content.trim() ? "landing" : "unknown", verification: "inferred", classification_basis: basis, inaccessible_reason: null };
}
