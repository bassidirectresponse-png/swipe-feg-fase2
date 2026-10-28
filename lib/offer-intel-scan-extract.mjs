import { decodeEntities,plainText } from './offer-intel-document.mjs';
import { landingUrl,displayText } from './offer-intel-display.mjs';
import { registrableDomain,buildMetaLibrarySearchUrl } from './apify-offer-discovery.mjs';

export const SCAN_LIMITS=Object.freeze({pages:400,locs:2000,sitemaps:10,probes:120,probe_ms:25000,probe_concurrency:4,blocked:8,scripts:6,script_bytes:512*1024,assets:60,external_ms:8000});
export const rootDomain=host=>registrableDomain(host)||host;
export const hostMatches=(host,root)=>host===root||host.endsWith('.'+root);
export const attr=(tag,name)=>decodeEntities(tag.match(new RegExp('(?:^|\\s)'+name+'\\s*=\\s*(?:"([^"]*)"|\x27([^\x27]*)\x27|([^\\s>]+))','i'))?.slice(1).find(v=>v!==undefined)||'');
export function observedUrl(value,base){try{return landingUrl(new URL(decodeEntities(value),base).href);}catch{return null;}}
export function uniqueRows(rows,key=JSON.stringify){return [...new Map(rows.map(r=>[key(r),r])).values()];}
const checkoutHosts={Hotmart:['hotmart.com'],Kiwify:['kiwify.com.br','kiwify.com'],Eduzz:['eduzz.com'],Monetizze:['monetizze.com.br'],Braip:['braip.com'],PerfectPay:['perfectpay.com.br'],Cakto:['cakto.com.br'],Ticto:['ticto.com.br','ticto.com'],Kirvano:['kirvano.com'],Hubla:['hub.la'],Greenn:['greenn.com.br'],Lastlink:['lastlink.com'],Doppus:['doppus.com'],Payt:['payt.com.br'],Pepper:['pepper.com.br','pepper.com'],Yampi:['yampi.com.br'],CartPanda:['cartpanda.com','mycartpanda.com'],Guru:['digitalmanager.guru'],Stripe:['stripe.com'],PayPal:['paypal.com'],PagSeguro:['pagseguro.uol.com.br','pagbank.com.br'],MercadoPago:['mercadopago.com','mercadopago.com.br'],ClickBank:['clickbank.net','clickbank.com'],BuyGoods:['buygoods.com'],Digistore24:['digistore24.com'],MaxWeb:['maxweb.com'],ThriveCart:['thrivecart.com'],SamCart:['samcart.com'],Shopify:['myshopify.com','shopify.com'],CheckoutChamp:['checkoutchamp.com','konnektive.com'],Stickyio:['sticky.io']};
const techHosts=[['cms','WordPress',['wordpress.com','wp.com']],['ecommerce','Shopify',['cdn.shopify.com','myshopify.com']],['vsl_player','VTurb',['converteai.net','vturb.com.br']],['vsl_player','Vidalytics',['vidalytics.com']],['vsl_player','Panda',['pandavideo.com.br','pandavideo.com']],['vsl_player','Wistia',['wistia.com','wistia.net']],['email','Klaviyo',['klaviyo.com']],['email','Mailchimp',['list-manage.com','mailchimp.com']],['email','ActiveCampaign',['activehosted.com']],['cdn','Cloudflare',['cloudflare.com','cloudflareinsights.com']],['analytics','Google Tag Manager',['googletagmanager.com']],['analytics','Google Analytics',['google-analytics.com']],['page_builder','ClickFunnels',['clickfunnels.com']],['page_builder','Leadpages',['leadpages.net']]];
function pixelCode(source){
  const code=[],text=[];let i=0,expressionStart=true;
  while(i<source.length){
    const start=i,c=source[i],next=source[i+1];let opaque=false,keepLiteral=false;
    if(c==='/'&&next==='/'){i+=2;while(i<source.length&&!/[\r\n]/.test(source[i]))i++;opaque=true;}
    else if(c==='/'&&next==='*'){const end=source.indexOf('*/',i+2);i=end<0?source.length:end+2;opaque=true;}
    else if(c==='"'||c==="'"||c==='`'){
      i++;while(i<source.length){if(source[i]==='\\'){i=Math.min(i+2,source.length);continue;}if(source[i++]===c)break;}
      opaque=true;keepLiteral=c!=='`';expressionStart=false;
    }else if(c==='/'&&expressionStart){
      i++;let bracket=false;
      while(i<source.length){const ch=source[i++];if(ch==='\\'){i=Math.min(i+1,source.length);continue;}if(ch==='[')bracket=true;else if(ch===']')bracket=false;else if(ch==='/'&&!bracket)break;}
      while(i<source.length&&/[a-z]/i.test(source[i]))i++;
      opaque=true;expressionStart=false;
    }else if(/[\w$]/.test(c)){
      i++;while(i<source.length&&/[\w$]/.test(source[i]))i++;
      expressionStart=/^(?:return|throw|case|yield|await|typeof|void|delete|in|of|instanceof|else|do)$/.test(source.slice(start,i));
    }else{i++;if(!/\s/.test(c))expressionStart=/[=([{,:;!?&|~%^<>+*\/-]/.test(c);}
    const token=source.slice(start,i),blank=' '.repeat(token.length);
    code.push(opaque?blank:token);text.push(opaque&&!keepLiteral?blank:token);
  }
  return {code:code.join(''),text:text.join('')};
}
export function pixelIds(text,page_url) {
  // Static recognition only: strings are arguments, never starting points;
  // comments, templates and regex literals cannot provide installation signals.
  const lexical=pixelCode(text),code=lexical.code;text=lexical.text;
  const patterns={meta:/fbq\s*\(\s*['"]init['"]\s*,\s*['"](\d+)['"]/gi,tiktok:/ttq\.load\s*\(\s*['"]([A-Z0-9]+)['"]/gi,
    ga4:/gtag\s*\(\s*['"]config['"]\s*,\s*['"](G-[A-Z0-9]{4,})['"]/g,
    gtm:/\)\s*\(\s*window\s*,\s*document\s*,\s*['"]script['"]\s*,\s*['"][\w]+['"]\s*,\s*['"](GTM-[A-Z0-9]+)['"]/g,
    google_ads:/gtag\s*\(\s*['"]config['"]\s*,\s*['"](AW-\d+)['"]/g,
    taboola:/(?:_tfa\.push\s*\(\s*\{[^}]{0,1000}?\bid\s*:\s*|taboola\.com\/libtrc\/unip\/)(\d+)/gi,
    outbrain:/(?:obApi\s*\(\s*['"]obAdvId['"]\s*,\s*['"]?|ob_adv_id\s*[:=]\s*['"]?)(\d+)/gi,
    pinterest:/pintrk\s*\(\s*['"]load['"]\s*,\s*['"](\d+)['"]/gi,snap:/snaptr\s*\(\s*['"]init['"]\s*,\s*['"]([\w-]+)['"]/gi,
    bing:/\bti\s*:\s*['"]?(\d+)['"]?\s*[,}]/gi,hotjar:/\bhjid\s*:\s*(\d+)/gi,clarity:/(?:clarity\s*\(\s*['"](?:init|projectId)['"]\s*,\s*['"]|clarity\.ms\/tag\/)([a-z0-9]+)/gi};
  const rows=[];for(const [type,re] of Object.entries(patterns)){
    if(type==='bing'&&!/uetq|bat\.bing\.com/i.test(text))continue;
    for(const m of text.matchAll(re))if(code[m.index]?.trim()&&(!/[\w$]/.test(m[0][0])||!/[\p{ID_Continue}$\u200c\u200d]/u.test(text[m.index-1]||'')))rows.push({type,id:m[1],page_url});
  }
  for(const m of text.matchAll(/\)\s*\(\s*window\s*,\s*document\s*,\s*['"]clarity['"]\s*,\s*['"]script['"]\s*,\s*['"]([a-z0-9]+)['"]/gi))if(code[m.index]?.trim())rows.push({type:'clarity',id:m[1],page_url});
  return uniqueRows(rows).slice(0,500);
}
const seconds=value=>{if(typeof value!=='string'||!value.trim())return null;const parts=value.split(':');const n=parts.length>1?parts.reduce((a,v)=>a*60+Number(v),0):Number(value);return Number.isFinite(n)&&n>=0?n:null;};
export function extractCtas(html,page_url) {
  const clean=html.replace(/<(script|style)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi,'');
  const stack=[],rows=[];let active=null;
  for(const m of clean.matchAll(/<[^>]{0,8192}>|[^<]+/g)) {
    const tag=m[0];if(tag[0]!=='<'){if(active)active.text+=tag;continue;}
    const closing=tag.match(/^<\/([\w-]+)/);if(closing){
      if(active&&closing[1]===active.tag){rows.push({...active,text:displayText(active.text,300)});active=null;}
      let i=stack.length-1;while(i>=0&&stack[i].tag!==closing[1])i--;if(i>=0)stack.length=i;continue;
    }
    const name=tag.match(/^<([\w-]+)/)?.[1]?.toLowerCase();if(!name)continue;
    const hidden=!!stack.at(-1)?.hidden||/\shidden(?:\s|>|=)/i.test(tag)||attr(tag,'aria-hidden')==='true'||/display\s*:\s*none|visibility\s*:\s*hidden/i.test(attr(tag,'style'))||/(?:^|\s)(?:hidden|d-none|elementor-hidden\S*|delay|cta-hidden|esconder|oculto)(?:\s|$)/i.test(attr(tag,'class'));
    let show=seconds(attr(tag,'data-show-on'));let settings;try{settings=JSON.parse(attr(tag,'data-settings'));}catch{}
    if(show===null&&Number.isFinite(Number(settings?._animation_delay))&&settings?._animation_delay!==undefined)show=Number(settings._animation_delay)/1000;
    show=show??stack.at(-1)?.show??null;
    const raw=attr(tag,'href')||attr(tag,'data-href')||attr(tag,'onclick').match(/(?:location(?:\.href)?\s*=|(?:window\.)?open\s*\()\s*['"]([^'"]+)/)?.[1];
    if(['a','vturb-anchor-button','smartplayer-anchor-button'].includes(name)||attr(tag,'onclick')||attr(tag,'data-href')||attr(tag,'data-show-on')||attr(tag,'data-hide-on')) {
      const href=raw?observedUrl(raw,page_url):null;
      if(rows.length<200)active={tag:name,page_url,text:'',href,hidden,show_on_s:show};
    }
    if(!['input','img','br','meta','link','source','hr'].includes(name)&&!tag.endsWith('/>')){if(stack.length>=256)break;stack.push({tag:name,hidden,show});}
  }
  return uniqueRows(rows.map(({tag,...row})=>row)).slice(0,200);
}
export function extractScanPage(html,page_url) {
  html=html.replace(/<!--[\s\S]*?(?:-->|$)/g,'');
  const pixels=[];
  // Visible prose and JSON documents are not evidence of an installed pixel.
  // External JavaScript is inspected separately after the safe fetch.
  for(const m of html.matchAll(/<script\b([^>]{0,8192})>([\s\S]*?)<\/script\s*>/gi)){
    const type=attr(m[1],'type').trim().toLowerCase();
    if(!type||type==='module'||/^(?:text|application)\/(?:java|ecma)script$/.test(type))pixels.push(...pixelIds(m[2],page_url));
    const src=observedUrl(attr(m[1],'src'),page_url);
    if(src){const u=new URL(src),id=u.searchParams.get('id');
      if(hostMatches(u.hostname,'googletagmanager.com')){
        const type=u.pathname==='/gtm.js'&&/^GTM-[A-Z0-9]+$/.test(id||'')?'gtm':u.pathname==='/gtag/js'&&/^G-[A-Z0-9]{4,}$/.test(id||'')?'ga4':u.pathname==='/gtag/js'&&/^AW-\d+$/.test(id||'')?'google_ads':null;
        if(type)pixels.push({type,id,page_url});
      }
    }
  }
  const urls=new Set(),scripts=[],images=[],videos=[];
  const add=(list,raw)=>{const url=raw&&observedUrl(raw,page_url);if(url){urls.add(url);if(list.length<SCAN_LIMITS.assets)list.push({url,page_url});}};
  for(const m of html.matchAll(/<(?:a|script|iframe|img|source|video|link|meta|form)\b[^>]{0,8192}>/gi)) {
    const tag=m[0],name=tag.match(/^<(\w+)/)[1].toLowerCase();
    for(const field of ['href','src','action']){const url=attr(tag,field)&&observedUrl(attr(tag,field),page_url);if(url)urls.add(url);}
    if(name==='script'){const url=observedUrl(attr(tag,'src'),page_url);if(attr(tag,'src')&&url)scripts.push(url);}
    if(name==='img'||name==='source'&&!/video|\.(mp4|m3u8|webm)/i.test(attr(tag,'type')+attr(tag,'src'))) {add(images,attr(tag,'src'));for(const src of attr(tag,'srcset').split(','))add(images,src.trim().split(/\s+/)[0]);}
    if(name==='video'||name==='source')add(videos,attr(tag,'src'));
    add(images,attr(tag,'poster'));if(name==='meta'&&['og:image','twitter:image'].includes(attr(tag,'property')||attr(tag,'name')))add(images,attr(tag,'content'));
  }
  for(const m of html.matchAll(/url\(\s*['"]?([^'"\s)]+)['"]?\s*\)/gi))add(images,m[1]);
  // JS literals can carry checkout or media URLs, but host checks still apply.
  for(const m of html.matchAll(/https?:\/\/[^\s<>"'\\)]+/g)){const u=observedUrl(m[0],page_url);if(u)urls.add(u);if(urls.size>=2000)break;}
  const checkout=[],tech=[],vsl=[];
  for(const url of urls){const u=new URL(url);
    const asset=/\.(?:js|css|png|jpe?g|svg|webp|gif|woff2?)(?:$)/i.test(u.pathname)||/^(?:cdn|static|js|scripts|assets)\./i.test(u.hostname);
    for(const [platform,hosts] of Object.entries(checkoutHosts))if(!asset&&hosts.some(h=>hostMatches(u.hostname,h))&&(platform!=='Shopify'||/\/(?:cart|checkouts?)(?:\/|$)/i.test(u.pathname)))checkout.push({platform,url,page_url});
    for(const [category,name,hosts] of techHosts)if(hosts.some(h=>hostMatches(u.hostname,h)))tech.push({category,name,page_url});
    let provider=null,id=null;
    if(hostMatches(u.hostname,'converteai.net')&&/\/(players|ab-test)\//.test(u.pathname)){provider='vturb';id=u.pathname.match(/\/(?:players|ab-test)\/([^/]+)/)?.[1];}
    else for(const [p,hosts] of [['vidalytics',['vidalytics.com']],['panda',['pandavideo.com.br','pandavideo.com']],['wistia',['wistia.com','wistia.net']],['vimeo',['vimeo.com']],['youtube',['youtube.com','youtube-nocookie.com','youtu.be']]])if(hosts.some(h=>hostMatches(u.hostname,h))){provider=p;id=u.searchParams.get('v')||u.pathname.split('/').filter(Boolean).at(-1);}
    if(/\.m3u8$/i.test(u.pathname))provider='hls';else if(/\.mp4$/i.test(u.pathname))provider='mp4';
    if(provider)vsl.push({provider,page_url,player_id:id,media_url:['mp4','hls'].includes(provider)?url:null,duration_s:null,height:null,pitch_s:null,...(provider==='vturb'?{player_url:url}:{})});
  }
  if(/\bdata-elementor-(?:type|id)\s*=|\bclass\s*=\s*['"][^'"]*\belementor-/i.test(html))tech.push({category:'page_builder',name:'Elementor',page_url});
  if([...urls].some(u=>new URL(u).pathname.startsWith('/wp-content/')))tech.push({category:'cms',name:'WordPress',page_url});
  if(tech.some(t=>t.name==='Shopify'))for(const url of urls){const u=new URL(url);if(u.hostname===new URL(page_url).hostname&&/^\/(?:cart|checkouts?)(?:\/|$)/i.test(u.pathname))checkout.push({platform:'Shopify',url,page_url});}
  const ctas=extractCtas(html,page_url),timings=ctas.map(c=>c.show_on_s).filter(Number.isFinite),pitch=timings.length?Math.min(...timings):null;
  for(const v of vsl)v.pitch_s=pitch;
  return {checkout:uniqueRows(checkout).slice(0,200),pixels:uniqueRows(pixels).slice(0,500),tech:uniqueRows(tech),vsl:uniqueRows(vsl).slice(0,40),ctas,
    assets:{images:uniqueRows(images,r=>r.url),videos:uniqueRows(videos.filter(v=>/\.(mp4|m3u8|webm)(?:\?|$)/i.test(v.url)),r=>r.url)},scripts:uniqueRows(scripts)};
}
export const domainAdsUrl=host=>buildMetaLibrarySearchUrl(rootDomain(host));
