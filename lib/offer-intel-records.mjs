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
export function evidence(job,key,fields,now) {
  return {id:recordId(job.id,"evidence",key),evidence_key:key,observed_at:now,...fields};
}
export function knownDomainMatches(job,domain) {
  if(!job.offer_id||!urlSeeds({...job,seed_url:null}).some(url=>new URL(url).hostname===domain))return [];
  return [{ref_kind:job.offer_ref_kind,ref_id:job.offer_id,label:domain}];
}
