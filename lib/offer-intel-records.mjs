import { hash, normalizeUrl } from "./offer-intel-core.mjs";
// Deterministic IDs keep retries/parallel discoveries attached to the same FK target.
export function recordId(...parts) {
  const h=hash(JSON.stringify(parts));return h.slice(0,8)+"-"+h.slice(8,12)+"-5"+h.slice(13,16)+"-8"+h.slice(17,20)+"-"+h.slice(20,32);
}
export function urlSeeds(job) {
  const data=job.seed_snapshot?.data||{},raw=[job.seed_url,data.linkOferta,data.advertorialLink,data.vslLink,
    ...(Array.isArray(data.dominios)?data.dominios.flatMap(d=>[d.linkDominio,d.linkCheckout,d.vslLink,d.advertorialLink]):[])];
  return [...new Set(raw.flatMap(value=>{try{return [normalizeUrl(value).url];}catch{return [];}}))].slice(0,20);
}
// Offer-scoped funnel map: only funnels that start (or land) on a URL registered in the offer, newest snapshot per entry.
const pageKey=value=>{try{const u=new URL(value);return u.hostname.toLowerCase().replace(/^www\./,"")+u.pathname.replace(/\/+$/,"");}catch{return null;}};
export function offerFunnels(items,snapshot) {
  const registered=new Set(urlSeeds({seed_url:null,seed_snapshot:snapshot}).map(pageKey).filter(Boolean)),seen=new Set();
  return items.filter(f=>{
    const keys=[pageKey(f.origin_url),pageKey(f.final_url)].filter(Boolean);
    if(registered.size&&!keys.some(k=>registered.has(k)))return false;
    const entry=keys[0]||f.id;
    if(seen.has(entry))return false;
    seen.add(entry);return true;
  });
}
export function evidence(job,key,fields,now) {
  return {id:recordId(job.id,"evidence",key),evidence_key:key,observed_at:now,...fields};
}
export function knownDomainMatches(job,domain) {
  if(!job.offer_id||!urlSeeds({...job,seed_url:null}).some(url=>new URL(url).hostname===domain))return [];
  return [{ref_kind:job.offer_ref_kind,ref_id:job.offer_id,label:domain}];
}
