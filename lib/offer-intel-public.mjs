// Public projections are deliberately explicit: never spread provider payloads or HTML.
const text=(v,n=1000)=>typeof v==="string"?v.slice(0,n):null;
export function safePublicUrl(value) {
  try { const u=new URL(value); return ["https:","http:"].includes(u.protocol)&&!u.username&&!u.password?u.href:null; } catch {return null;}
}
export function publicEvidence(row) {
  return {id:row.id,source:text(row.source,80),source_url:safePublicUrl(row.source_url),verification:row.verification,
    observed_at:row.observed_at,detail:text(row.payload?.detail,4000)};
}
export function publicDiscovery(row) {
  const d=row.data||{}, matches=(d.existing_matches||[]).filter(m=>["offer","admin_draft"].includes(m.ref_kind)).slice(0,20)
    .map(m=>({ref_kind:m.ref_kind,ref_id:m.ref_id,label:text(m.label,300)}));
  return {id:row.id,type:row.type,identity_key:row.identity_key,title:text(d.title,500),page_id:text(d.page_id,40),page_name:text(d.page_name,300),
    domain:text(d.domain,255),url:safePublicUrl(d.url),thumbnail_url:safePublicUrl(d.thumbnail_url),ads_count:Math.max(0,Number(d.ads_count)||0),
    first_seen:row.created_at,last_seen:row.updated_at,source:text(d.source,80),status:row.status,version:row.version,
    already_in_swipe:!!row.existing_offer_id||matches.length>0,existing_offer_id:row.existing_offer_id||null,
    existing_ref_kind:row.existing_offer_id?"offer":matches[0]?.ref_kind||null,
    existing_ref_id:row.existing_offer_id||matches[0]?.ref_id||null,existing_matches:matches,evidence:(row.evidence||[]).map(publicEvidence)};
}
function endpoint(key) {
  const parts=key.split(":"),kind=parts[0]==="meta"?parts[1]:parts[0],id=parts.slice(parts[0]==="meta"?2:1).join(":");
  return {key,kind,id,label:id};
}
export function publicRelation(row) {
  return {id:row.id,from:endpoint(row.from_key),to:endpoint(row.to_key),relation_type:row.relation_type,status:row.status,
    version:row.version,reason:text(row.reason,2000),evidence:(row.evidence||[]).map(publicEvidence)};
}
export function publicFunnel(row) {
  const steps=(row.steps||[]).map(s=>({id:s.id,kind:s.kind,label:text(s.label,300),title:text(s.title,500),
    original_url:safePublicUrl(s.original_url),final_url:safePublicUrl(s.final_url),http_status:s.http_status,
    redirects:(s.redirects||[]).map(r=>({from:safePublicUrl(r.from),to:safePublicUrl(r.to),status:r.status})),
    verification:s.verification,inaccessible_reason:text(s.inaccessible_reason,300),classification_basis:s.classification_basis,
    technologies:(s.technologies||[]).filter(t=>typeof t==="string").slice(0,20),screenshot_url:null,
    screenshot_status:"unavailable",observed_at:s.observed_at}));
  const start=steps.find(s=>s.id===row.start_step_id)||steps[0];
  return {id:row.id,investigation_id:row.investigation_id,origin_url:start?.original_url||null,final_url:start?.final_url||null,
    start_step_id:row.start_step_id,technologies:[...new Set(steps.flatMap(s=>s.technologies))],steps,
    edges:(row.edges||[]).map(e=>({id:e.id,from:e.from_step_id,to:e.to_step_id,kind:e.kind,label:e.kind,verification:e.verification}))};
}
