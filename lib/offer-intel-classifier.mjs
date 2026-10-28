import { documentSignals, nonFunnelPage, plainText } from "./offer-intel-document.mjs";
/** Classifies observations, never ownership. Does not execute HTML or follow forms. */
export function classifyStep({ url = "", title = "", text = "", html = "", http_status = 200, inaccessible_reason = null } = {}) {
  const basis = { version: 3, signals: [], method: "public_document_rules" };
  if (inaccessible_reason || http_status === 401 || http_status === 403 || http_status >= 400 || /captcha|verify you are human/i.test(title)) {
    return { kind: "unknown", verification: "inaccessible", inaccessible_reason: inaccessible_reason || "http_or_access_restriction", classification_basis: basis };
  }
  const path = (() => { try { return new URL(url).pathname; } catch { return ""; } })();
  const own=html?documentSignals(html,url):{h1:"",forms:"",text,contentHtml:""};
  if(nonFunnelPage(url,title))return {kind:"unknown",verification:"inferred",inaccessible_reason:null,
    classification_basis:{...basis,signals:[{source:"url_or_title",rule:"non_funnel_page"}]}};
  const heading=title+" "+own.h1;
  const cartForm=/(^|\/)cart\/?$/i.test(path)&&
    /<form\b[^>]*\saction\s*=\s*["'](?:https?:\/\/[^/"']+)?\/cart\/?(?:\?[^"']*)?["']/i.test(own.forms)&&
    /<(?:button|input)\b[^>]*\sname\s*=\s*["']checkout["']/i.test(own.forms);
  // A Shopify theme's cart/footer is not evidence that the document is a checkout.
  const quizForm=/\b(question\s+\d+|pergunta\s+\d+)\b/i.test(plainText(own.forms));
  if(/\bquiz\b/i.test(heading)||quizForm||/(^|[\/_-])quiz([\/_-]|$)/i.test(path)) {
    const fromTitle=/\bquiz\b/i.test(title),fromHeading=/\bquiz\b/i.test(own.h1);
    basis.signals.push({source:fromTitle?"document_title":fromHeading?"document_h1":quizForm?"document_form":"url_path",rule:"quiz"});
    return {kind:"quiz",verification:fromTitle||fromHeading||quizForm?"verified":"inferred",classification_basis:basis,inaccessible_reason:null};
  }
  const content = (title + " " + own.text).slice(0, 2 * 1024 * 1024);
  const rules = [
    ["upsell", /\b(one.time.offer|upsell|upgrade your order)\b/i],
    ["checkout", /\b(checkout|finalizar compra)\b/i],
    ["vsl", /<video\b|player\.vimeo|youtube\.com\/embed|wistia|vturb/i],
    ["presell", /\b(advertorial|sponsored article|publieditorial)\b/i],
    ["sales", /\b(add to cart|buy now|comprar agora|adicionar ao carrinho)\b/i],
  ];
  for (const [kind, pattern] of rules) {
    if (pattern.test(kind==="vsl"?content+" "+own.contentHtml:kind==="checkout"?heading:content)||
        (kind==="checkout"&&(cartForm||/<input\b[^>]{0,2048}\bautocomplete\s*=\s*["']cc-number["']/i.test(own.forms)))) {
      basis.signals.push({ source: "document", rule: kind });
      return { kind, verification: "verified", classification_basis: basis, inaccessible_reason: null };
    }
  }
  for (const kind of ["upsell", "checkout", "quiz", "vsl", "presell"]) {
    if (new RegExp("(^|/)" + (kind==="checkout"?"checkouts?":kind) + "([/-]|$)", "i").test(path)) {
      basis.signals.push({ source: "url_path", rule: kind });
      return { kind, verification: "inferred", classification_basis: basis, inaccessible_reason: null };
    }
  }
  return { kind: content.trim() ? "landing" : "unknown", verification: "inferred", classification_basis: basis, inaccessible_reason: null };
}
