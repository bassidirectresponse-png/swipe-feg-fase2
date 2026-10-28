import { normalizeUrl, UUID } from './offer-intel-core.mjs';
import { decodeEntities } from './offer-intel-document.mjs';
import { isIP } from 'node:net';
import { isGlobalAddress } from './offer-intel-url-safety.mjs';

export function displayText(value,max=500) {
  if(typeof value!=='string')return null;
  const text=decodeEntities(value.slice(0,20000))
    .replace(/<(script|style)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi,' ')
    .replace(/<[^>]*(?:>|$)/g,' ').replace(/[\x00-\x1f\x7f]/g,' ').replace(/\s+/g,' ').trim();
  return text?Array.from(text).slice(0,max).join(''):null;
}
export function landingUrl(value) {
  try {
    const result=normalizeUrl(value),u=new URL(result.url),host=u.hostname.replace(/^\[|\]$/g,'');
    if(host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||(isIP(host)&&!isGlobalAddress(host)))return null;
    if([...u.searchParams.keys()].some(k=>/^(access_token|token|api_key|authorization|password|secret)$/i.test(k)))return null;
    return result.url;
  }catch{return null;}
}
export function pagePicture(value) {
  const url=landingUrl(value);if(!url)return null;
  const u=new URL(url);return u.protocol==='https:'&&/(^|\.)fbcdn\.net$/i.test(u.hostname)?url:null;
}
export function startedAt(value) {
  let date;
  if(typeof value==='number'&&Number.isFinite(value)&&value>0)date=new Date(value<1e12?value*1000:value);
  else if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(value)) {
    const normalized=value.replace(' ','T');date=new Date(normalized.length===10?normalized+'T00:00:00Z':/(?:Z|[+-]\d{2}:\d{2})$/.test(normalized)?normalized:normalized+'Z');
    if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value.slice(0,10)&&!/[+-]\d{2}:\d{2}$/.test(value))return null;
  } else return null;
  return Number.isFinite(date.getTime())?date.toISOString():null;
}
export function discoveryDisplay(type,data) {
  const result={},put=(key,value)=>{if(value!==null&&value!==undefined)result[key]=value;};
  if(type==='ad') {
    put('ad_text',displayText(data.ad_text));put('cta_text',displayText(data.cta_text,100));
    const url=landingUrl(data.landing_url);put('landing_url',url);if(url)result.landing_domain=new URL(url).hostname;
    put('started_at',startedAt(data.started_at));
    if(Array.isArray(data.platforms)) {
      const platforms=[...new Set(data.platforms.filter(p=>typeof p==='string').map(p=>p.toLowerCase()).filter(p=>['facebook','instagram','messenger','audience_network'].includes(p)))];
      if(platforms.length)result.platforms=platforms;
    }
    if(typeof data.display_format==='string'&&['image','video','carousel','dco'].includes(data.display_format.toLowerCase()))result.display_format=data.display_format.toLowerCase();
  }
  if(type==='ad'||type==='page')put('page_picture_url',pagePicture(data.page_picture_url));
  if(type==='page'&&Number.isSafeInteger(data.ads_found)&&data.ads_found>=0)result.ads_found=data.ads_found;
  if(type==='domain'&&typeof data.funnel_id==='string'&&UUID.test(data.funnel_id))result.funnel_id=data.funnel_id;
  return result;
}
