// Production handlers with explicit FAKE storage/read adapter. SQL is never executed.
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createIntelHandlers } from "../netlify/functions/_offer-intel-api.mjs";
import { createFAKEStorage } from "./offer-intel-FAKE-storage.mjs";
import { assertDiscoveryV1,assertRelationV1,assertFunnelV1,assertEvidenceV1,assertErrorV1 } from "./helpers/offer-intel-contract-v1.mjs";
import { INVALID_ID_CASES } from "./fixtures/offer-intel-p0-cases.mjs";
const OFFER=randomUUID(),JOB=randomUUID(),D=randomUUID(),R=randomUUID(),F=randomUUID(),E=randomUUID(),S=randomUUID(),AT="2026-10-27T00:00:00.000Z";
const request=(url,body)=>new Request("https://benchmarkinggrupofeg.site/"+url,body===undefined?{}:{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
function fixture({auth=true,admin=true,quota=true}={}){
 const storage=createFAKEStorage(),calls=[],legacy={kind:"oferta",nomeOferta:"FAKE original",preserved:42},before=structuredClone(legacy);
 const evidence={id:E,source:"domain_explorer",source_url:"https://example.com",verification:"verified",observed_at:AT,payload:{detail:"FAKE observation",html:"PRIVATE_HTML",token:"PRIVATE_VALUE"}};
 const discovery={id:D,type:"page",identity_key:"meta:page:123",data:{title:"<img onerror=alert(1)>",source:"apify",ads_count:3,url:"javascript:alert(1)",html:"PRIVATE_HTML"},existing_offer_id:OFFER,status:"new",version:1,created_at:AT,updated_at:AT,evidence:[evidence]};
 const relation={id:R,from_key:"offer:"+OFFER,to_key:"meta:page:123",relation_type:"same_page",status:"pending",version:1,reason:null,created_at:AT,updated_at:AT,evidence:[evidence]};
 const funnel={id:F,investigation_id:JOB,start_step_id:S,steps:[{id:S,kind:"upsell",label:"FAKE",title:"FAKE",original_url:"https://example.com",final_url:"https://example.com/end",http_status:200,redirects:[],verification:"verified",inaccessible_reason:null,classification_basis:{rule:"FAKE"},technologies:[],screenshot_path:"PRIVATE_PATH",observed_at:AT}],edges:[{id:randomUUID(),from_step_id:S,to_step_id:S,kind:"link",verification:"verified"}]};
 for(const row of [discovery,relation])storage.entities.set(row.id,row);
 storage.read=async q=>{
   calls.push(structuredClone(q));
   if(q.resource==="summary")return {active_job:null,last_job:null,counts:{new:1,review:0,confirmed:0,ignored:0,relations_pending:1,funnels:1},latest_at:AT};
   if(q.resource==="evidence")return q.id===E?evidence:null;
   if(q.resource==="funnel")return q.id===F?funnel:null;
   if(q.id)return storage.entities.get(q.id)||null;
   return {items:q.resource==="discoveries"?[discovery]:q.resource==="relations"?[relation]:[{id:F,investigation_id:JOB,title:"FAKE",origin_url:"https://example.com",final_url:"https://example.com/end",steps_count:1,created_at:AT}]};
 };
 let runtimes=0;
 const handlers=createIntelHandlers({authenticate:async()=>auth?{id:OFFER}:null,isAdmin:()=>admin,rateLimit:async()=>({allowed:quota,retryAfter:17}),getServices:()=>{
   runtimes++;return {storage,capabilities:{},reader:{getOffer:async()=>({id:OFFER,data:structuredClone(legacy)}),getDraft:async()=>({target_offer_id:OFFER,new_offer:false,data_patch:{}})}};
 }});
 return {...handlers,storage,calls,legacy,before,runtimes:()=>runtimes};
}
async function response(res,status=200){
 assert.equal(res.status,status);const body=await res.json();
 if(status>=400)assertErrorV1(body);
 assert.doesNotMatch(JSON.stringify(body),/PRIVATE_HTML|PRIVATE_VALUE|PRIVATE_PATH/);
 return body;
}
test("QA B3 section 6 assertions on all real resource handlers, flattened and sanitized",async()=>{
 const f=fixture();
 for(const [name,check] of [["discoveries",assertDiscoveryV1],["relations",assertRelationV1]]){
   const b=await response(await f[name](request(name+"?job_id="+JOB)));
   assert.equal(b.items.length,1);check(b.items[0]);assert.equal(b.next_cursor,null);assert.equal(b.limits.screenshot.available,false);
 }
 const d=(await response(await f.discoveries(request("discoveries?job_id="+JOB)))).items[0];
 assert.equal(d.url,null);assert.equal(d.title,"<img onerror=alert(1)>");assert.equal(d.existing_offer_id,OFFER);
 assertFunnelV1(await response(await f.funnel(request("funnel?id="+F))));
 assertEvidenceV1(await response(await f.evidence(request("evidence?id="+E))));
 const list=await response(await f.funnels(request("funnels?job_id="+JOB)));assert.equal(list.items[0].steps_count,1);
 const summary=await response(await f.summary(request("summary?offer_id="+OFFER+"&offer_ref_kind=offer")));
 assert.deepEqual(summary.counts,{new:1,review:0,confirmed:0,ignored:0,relations_pending:1,funnels:1});
});
for(const [resource,id,check] of [["discovery",D,assertDiscoveryV1],["relation",R,assertRelationV1]])test("QA B3 CAS "+resource+" concurrency, replay, conflict and no legacy mutation",async()=>{
 const f=fixture(),body={id,status:"confirmed",expected_version:1,idempotency_key:randomUUID()};
 const results=await Promise.all([f[resource](request(resource,body)),f[resource](request(resource,{...body,status:"ignored",idempotency_key:randomUUID()}))]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 for(const res of results){const b=await response(res,res.status);if(res.status===200){check(b);assert.equal(b.version,2);assert.equal(b[resource],undefined);}}
 check(await response(await f[resource](request(resource,body))));assert.equal(f.storage.events.length,1);
 await response(await f[resource](request(resource,{...body,status:"ignored"})),409);
 assert.equal(f.storage.entities.get(id).status,"confirmed");assert.deepEqual(f.legacy,f.before);
});
test("QA B3 typed ID corpus rejected before runtime for both reviews",async()=>{
 const f=fixture();
 for(const c of INVALID_ID_CASES)for(const name of ["discovery","relation"])
   await response(await f[name](request(name,{id:c.value,status:"confirmed",expected_version:1,idempotency_key:randomUUID()})),422);
 assert.equal(f.runtimes(),0);
});
test("QA B3 validates and forwards scopes and filters (FAKE read, not SQL semantics)",async()=>{
 const f=fixture();
 await response(await f.discoveries(request("discoveries?job_id="+JOB+"&type=page&status=new,review&q=Brand&sort=ads&limit=7")));
 assert.equal(f.calls[0].job_id,JOB);assert.equal(f.calls[0].limit,7);assert.equal(f.calls[0].q,"Brand");assert.deepEqual(f.calls[0].status,["new","review"]);assert.equal(f.calls[0].sort,"ads");
 for(const kind of ["offer","admin_draft"]){
   await response(await f.relations(request("relations?offer_id="+OFFER+"&offer_ref_kind="+kind)));
   assert.equal(f.calls.at(-1).scope,kind+":"+OFFER);
 }
 const before=f.runtimes();
 for(const query of ["","?job_id=local","?job_id="+JOB+"&offer_id="+OFFER+"&offer_ref_kind=offer","?job_id="+JOB+"&limit=101","?job_id="+JOB+"&sort=wrong"]){
   const res=await f.discoveries(request("discoveries"+query));assert.ok([400,422].includes(res.status));await response(res,res.status);
 }
 assert.equal(f.runtimes(),before);
});
test("QA B3 all resource handlers enforce admin gate and quota before services",async()=>{
 for(const [cfg,status] of [[{auth:false},401],[{admin:false},403],[{quota:false},429]]){
  const f=fixture(cfg);
  for(const name of ["discoveries","discovery","relations","relation","funnels","funnel","summary","evidence"]){
   const review=["discovery","relation"].includes(name);
   const q=name==="summary"?"?offer_id="+OFFER+"&offer_ref_kind=offer":["evidence","funnel"].includes(name)?"?id="+E:"?job_id="+JOB;
   const res=await f[name](request(name+q,review?{id:D,status:"confirmed",expected_version:1,idempotency_key:randomUUID()}:undefined));
   if(status===429)assert.equal(res.headers.get("Retry-After"),"17");
   await response(res,status);
  }
  assert.equal(f.runtimes(),0);
 }
});
test("QA B3 opaque cursor binds filter, scope and ordering, no overlap in handler paging",async()=>{
 const f=fixture(),rows=Array.from({length:3},(_,i)=>({...structuredClone(f.storage.entities.get(D)),id:randomUUID(),rank:3-i}));
 f.storage.read=async q=>({items:rows.filter(r=>!q.cursor||r.rank<q.cursor.rank)});
 const base="discoveries?job_id="+JOB+"&sort=ads&limit=2";
 const a=await response(await f.discoveries(request(base)));assert.ok(a.next_cursor);
 const b=await response(await f.discoveries(request(base+"&cursor="+a.next_cursor)));
 assert.equal(new Set([...a.items,...b.items].map(r=>r.id)).size,3);assert.equal(b.next_cursor,null);
 for(const suffix of ["&q=changed","&status=confirmed","&sort=recent"]){
   await response(await f.discoveries(request((suffix==="&sort=recent"?base.replace("sort=ads","sort=recent"):base+suffix)+"&cursor="+a.next_cursor)),400);
 }
 await response(await f.discoveries(request("discoveries?job_id="+randomUUID()+"&sort=ads&limit=2&cursor="+a.next_cursor)),400);
});
