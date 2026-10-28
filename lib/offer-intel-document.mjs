import { normalizeUrl, LIMITS } from "./offer-intel-core.mjs";
export const CONTENT_LINK_LIMIT=6;
export function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt);/gi,(m,v)=>{
    if(v[0]==="#"){const n=v[1].toLowerCase()==="x"?parseInt(v.slice(2),16):Number(v.slice(1));return n>0&&n<=0x10ffff?String.fromCodePoint(n):"";}
    return {amp:"&",quot:'"',apos:"'",lt:"<",gt:">"}[v.toLowerCase()]||m;
  });
}
export const plainText=s=>decodeEntities(s.replace(/<[^>]{0,8192}>/g," ")).replace(/\s+/g," ").trim();
export function nonFunnelPage(url,title="") {
  let path="";try{path=new URL(url).pathname.toLowerCase();}catch{}
  return /(^|\/)(policies|privacy(?:-policy)?|terms(?:-of-service)?|refund(?:-policy)?|shipping(?:-policy)?|contact(?:-us)?|faq|about(?:-us)?|our-saga)(\/|$)/i.test(path)||
    /^(privacy policy|terms of service|refund policy|shipping policy|contact us|faq|about us|our saga)(\s*[|–-].*)?$/i.test(title.trim());
}
const attribute=(tag,name)=>decodeEntities(tag.match(new RegExp("(?:^|\\s)"+name+"\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))","i"))?.slice(1).find(v=>v!==undefined)||"");
/** Bounded static tokenizer; ignores chrome by element and role/class/id, including nested divs.
 * No JS execution, DOM navigation or form submission.
 */
export function documentSignals(html,url) {
  const clean=html.slice(0,LIMITS.html_bytes).replace(/<!--[\s\S]*?-->/g,"").replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi," ");
  const title=plainText(clean.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]||"").slice(0,500);
  const stack=[],body=[],anchors=[];let anchor=null,inspected=0;
  const voids=new Set(["area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"]);
  for(const match of clean.matchAll(/<[^>]{0,8192}>|[^<]+/g)) {
    const token=match[0];
    if(token[0]!=="<"){if(!stack.at(-1)?.ignored){body.push(token);if(anchor)anchor.label+=token;}continue;}
    const closing=token.match(/^<\/\s*([a-z0-9-]+)/i);
    if(closing) {
      if(!stack.at(-1)?.ignored)body.push(token);
      if(closing[1].toLowerCase()==="a"&&anchor){anchors.push(anchor);anchor=null;}
      let index=stack.length-1;while(index>=0&&stack[index].name!==closing[1].toLowerCase())index--;
      if(index>=0)stack.length=index;
      continue;
    }
    const name=token.match(/^<\s*([a-z0-9-]+)/i)?.[1]?.toLowerCase();if(!name)continue;
    const chrome=["header","nav","footer","aside","head"].includes(name)||
      /navigation|banner|contentinfo/i.test(attribute(token,"role"))||
      /(^|[\s_-])(header|footer|nav|menu|drawer|breadcrumb|cookie|cart-notification)([\s_-]|$)/i.test(attribute(token,"class")+" "+attribute(token,"id"));
    const ignored=!!stack.at(-1)?.ignored||chrome;
    if(!ignored) {
      body.push(token);
      if(name==="a"&&inspected++<LIMITS.links_per_page)anchor={href:attribute(token,"href"),label:"",tag:token};
    }
    if(!voids.has(name)&&!token.endsWith("/>")){
      if(stack.length>=256)break; // Malformed/adversarial nesting must not cause quadratic parsing.
      stack.push({name,ignored});
    }
  }
  const contentHtml=body.join(" "),h1=plainText(contentHtml.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||"").slice(0,500);
  const forms=[...contentHtml.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/gi)].map(m=>m[0]).join(" ").slice(0,100000);
  const ranked=new Map();
  for(const a of anchors)try {
    const target=normalizeUrl(new URL(a.href,url).href).url,u=new URL(target),label=plainText(a.label);
    if(!a.href||a.href.startsWith("#")||nonFunnelPage(target)||/logout|signout|add.to.cart|delete|unsubscribe/i.test(u.pathname+u.search)||/[?&](action|do|cmd)=/i.test(u.search))continue;
    if(/(^|\.)(facebook\.com|instagram\.com|tiktok\.com|youtube\.com|youtu\.be|twitter\.com|x\.com|pinterest\.com|linkedin\.com)$/i.test(u.hostname))continue;
    const priority=/quiz|checkout|buy|comprar|continue|next|começar|get started|shop now/i.test(label+" "+u.pathname)?2:/button|btn/i.test(a.tag)?1:0;
    if(!ranked.has(target)||ranked.get(target)<priority)ranked.set(target,priority);
  }catch{/* Invalid/non-HTTP URLs never enter the graph. */}
  return {title,h1,text:plainText(contentHtml).slice(0,50000),contentHtml,forms,
    links:nonFunnelPage(url,title)?[]:[...ranked].sort((a,b)=>b[1]-a[1]).slice(0,CONTENT_LINK_LIMIT).map(([link])=>link)};
}
