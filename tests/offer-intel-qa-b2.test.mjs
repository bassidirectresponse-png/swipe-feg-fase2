// Independent QA: production handler factory; FAKE auth, storage, DNS and dispatch.
// No Netlify, PostgreSQL, real network or provider integration is claimed.
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createIntelHandlers } from "../netlify/functions/_offer-intel-api.mjs";
import { createFAKEStorage } from "./offer-intel-FAKE-storage.mjs";
import { resolvePublicUrl, fetchPublicPage } from "../lib/offer-intel-url-safety.mjs";
import { unavailableCollectors } from "../lib/offer-intel-collectors.mjs";
import { signedDispatch } from "../lib/offer-intel-dispatch.mjs";
import { assertJobV1, assertErrorV1 } from "./helpers/offer-intel-contract-v1.mjs";
import { INVALID_ID_CASES, SSRF_URL_CASES, SSRF_TRANSPORT_CASES } from "./fixtures/offer-intel-p0-cases.mjs";
const ID="11111111-1111-4111-8111-111111111111", ID2="22222222-2222-4222-8222-222222222222";
const secret=randomUUID(); // Ephemeral FAKE HMAC key; never a runtime credential.
const request=(route,body)=>new Request("https://benchmarkinggrupofeg.site/"+route,body===undefined?{}:{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
const input=(extra={})=>({offer_id:ID,offer_ref_kind:"offer",idempotency_key:randomUUID(),options:{collect_ads:false,explore_domains:true},...extra});
function fixture({auth=true,admin=true,quota=true,lookup=async()=>[{address:"8.8.8.8",family:4}]}={}) {
  const legacy=new Map([ID,ID2].map(id=>[id,{id,data:{kind:"oferta",nomeOferta:"Same name",preserved:{value:1}}}]));
  const before=structuredClone(legacy),storage=createFAKEStorage(),sent=[],calls={runtime:0,reader:0};
  const services={storage,secret,capabilities:{apify:false,domain_explorer:false},collectors:unavailableCollectors,
    reader:{getOffer:async id=>{calls.reader++;return structuredClone(legacy.get(id)||null);},getDraft:async()=>{calls.reader++;return null;}},
    validateUrl:url=>resolvePublicUrl(url,{lookup}),dispatch:async(id,nonce)=>{sent.push({id,nonce});}};
  const handlers=createIntelHandlers({authenticate:async()=>auth?{id:ID}:null,isAdmin:()=>admin,rateLimit:async()=>({allowed:quota,retryAfter:37}),
    getServices:()=>{calls.runtime++;return services;}});
  return {...handlers,services,storage,sent,calls,legacy,before};
}
async function json(response,status){assert.equal(response.status,status);const body=await response.json();if(status>=400)assertErrorV1(body);return body;}
async function get(f,id){const body=await json(await f.job(request("job?job_id="+id)),200);assertJobV1(body);for(const k of ["job","nonce","lease_token","seed_snapshot","request_hash"])assert.equal(body[k],undefined);return body;}
for(const c of INVALID_ID_CASES)test("QA B2 invalid IDs: "+c.name,async()=>{
  const f=fixture();
  await json(await f.investigations(request("investigations",input({offer_id:c.value}))),422);
  await json(await f.job(request("job",{job_id:c.value,action:"cancel",idempotency_key:randomUUID()})),422);
  assert.deepEqual(f.calls,{runtime:0,reader:0});assert.equal(f.sent.length,0);
});
for(const c of SSRF_URL_CASES)test("QA B2 SSRF HTTP: "+c.name,async()=>{
  const f=fixture();const body=await json(await f.investigations(request("investigations",input({url:c.url}))),c.expectedStatus);
  assert.equal(body.code,c.expectedCode);assert.equal(f.storage.jobs.size,0);assert.equal(f.sent.length,0);
});
for(const c of SSRF_TRANSPORT_CASES.filter(c=>c.host))test("QA B2 DNS: "+c.name,async()=>{
  const f=fixture({lookup:async()=>c.answers.map(address=>({address,family:address.includes(":")?6:4}))});
  const body=await json(await f.investigations(request("investigations",input({url:"https://"+c.host}))),422);
  assert.equal(body.code,"blocked_url");assert.equal(f.storage.jobs.size,0);
});
test("QA B2 real UUID, missing/local draft, homonyms and legacy preservation",async()=>{
  const f=fixture();
  for(const extra of [{offer_id:randomUUID()},{offer_ref_kind:"admin_draft"}]){
    assert.equal((await json(await f.investigations(request("investigations",input(extra))),422)).code,"offer_not_found");
  }
  const a=await json(await f.investigations(request("investigations",input())),202);
  const b=await json(await f.investigations(request("investigations",input({offer_id:ID2}))),202);
  assert.notEqual(a.job_id,b.job_id);assert.equal((await get(f,a.job_id)).offer_id,ID);assert.equal((await get(f,b.job_id)).offer_id,ID2);
  assert.deepEqual(f.legacy,f.before);
});
test("QA B2 concurrent creates, payload conflict, reuse before quota and Retry-After",async()=>{
  const f=fixture(),payload=input();
  const responses=await Promise.all(Array.from({length:8},()=>f.investigations(request("investigations",payload))));
  const bodies=await Promise.all(responses.map(r=>json(r,202)));
  assert.equal(new Set(bodies.map(b=>b.job_id)).size,1);assert.equal(f.storage.jobs.size,1);
  await json(await f.investigations(request("investigations",{...payload,options:{collect_ads:true}})),409);
  const row=await f.storage.get(bodies[0].job_id);
  for(let i=0;i<15;i++){const id=randomUUID();f.storage.jobs.set(id,{...structuredClone(row),id,scope_key:"FAKE:"+i});}
  assert.equal((await json(await f.investigations(request("investigations",input())),202)).reused,true);
  const res=await f.investigations(request("investigations",input({offer_id:ID2})));
  assert.ok(Number(res.headers.get("Retry-After"))>0);await json(res,429);
});
test("QA B2 admin gate on both handlers before runtime; read quota",async()=>{
  for(const [config,status] of [[{auth:false},401],[{admin:false},403]]){
    const f=fixture(config);
    for(const [fn,req] of [[f.investigations,request("investigations")],[f.investigations,request("investigations",input())],[f.job,request("job?job_id="+ID)],[f.job,request("job",{job_id:ID,action:"cancel",idempotency_key:randomUUID()})]])await json(await fn(req),status);
    assert.equal(f.calls.runtime,0);
  }
  const f=fixture({quota:false}),res=await f.job(request("job?job_id="+ID));
  assert.equal(res.headers.get("Retry-After"),"37");assert.equal((await json(res,429)).retry_after,37);
});
test("QA B2 HMAC expiration/tamper, nonce one-use, failed capability and public Job",async()=>{
  const f=fixture(),created=await json(await f.investigations(request("investigations",input({options:{collect_ads:false,explore_domains:true,capture_screenshots:true}}))),202);
  const {id,nonce}=f.sent[0];
  const run=signed=>f.background(new Request("https://benchmarkinggrupofeg.site/background",{method:"POST",...signed}));
  await json(await run(signedDispatch(id,nonce,secret,Date.now()-360000)),403);
  const tampered=signedDispatch(id,nonce,secret);tampered.body=JSON.stringify({job_id:ID2});
  await json(await run(tampered),403);
  assert.equal((await f.storage.get(id)).attempt,0);
  const signed=signedDispatch(id,nonce,secret);
  await json(await run(signed),202);await json(await run(signed),202);
  assert.equal((await f.storage.get(id)).attempt,1);
  const job=await get(f,created.job_id);assert.equal(job.status,"failed");assert.equal(job.error.code,"capability_unavailable");
  assert.deepEqual(f.legacy,f.before);
});
test("QA B2 cancel/retry handlers fence old lease and are idempotent",async()=>{
  const f=fixture(),created=await json(await f.investigations(request("investigations",input())),202),id=created.job_id;
  const old=await f.storage.claim({job_id:id,nonce:f.sent[0].nonce});
  const row=f.storage.jobs.get(id);row.status="failed";row.error={code:"provider_error",message:"FAKE",retryable:true};row.sources[1].status="failed";
  const retry={job_id:id,action:"retry",idempotency_key:randomUUID()};
  assertJobV1(await json(await f.job(request("job",retry)),202));
  assert.equal((await json(await f.job(request("job",retry)),202)).reused,true);
  const claim=await f.storage.claim({job_id:id,nonce:f.sent.at(-1).nonce});assert.notEqual(claim.lease_token,old.lease_token);
  await assert.rejects(()=>f.storage.checkpoint({job_id:id,lease_token:old.lease_token,patch:{status:"succeeded"}}),e=>e.code==="conflict");
  const cancel={job_id:id,action:"cancel",idempotency_key:randomUUID()};
  assertJobV1(await json(await f.job(request("job",cancel)),200));
  assert.equal((await json(await f.job(request("job",cancel)),200)).reused,true);
  await assert.rejects(()=>f.storage.checkpoint({job_id:id,lease_token:claim.lease_token,patch:{status:"succeeded"}}),e=>e.code==="conflict");
  assert.equal((await get(f,id)).status,"cancelled");
});
test("QA B2 real SSRF fetch orchestration blocks redirect before second FAKE transport",async()=>{
  for(const target of ["http://169.254.169.254/","https://private.example/","https://public.example:8443/"]){
    let calls=0;
    await assert.rejects(()=>fetchPublicPage("https://public.example/",{
      lookup:async host=>[{address:host==="private.example"?"10.0.0.1":"8.8.8.8",family:4}],
      transport:async()=>{calls++;return {status:302,headers:{location:target}};}
    }),e=>e.code==="blocked_url");
    assert.equal(calls,1);
  }
});
test("QA B2 history applies shared Job assertions and does not expose internals",async()=>{
  const f=fixture();
  await json(await f.investigations(request("investigations",input())),202);
  const result=await json(await f.investigations(request("investigations?status=active&limit=1")),200);
  assert.equal(result.items.length,1);assert.equal(result.next_cursor,null);
  for(const row of result.items){assertJobV1(row);assert.equal(row.seed_snapshot,undefined);assert.equal(row.lease_token,undefined);}
});
test("QA B2 signed worker revalidates persisted SSRF seed before collector",async()=>{
  const f=fixture();await json(await f.investigations(request("investigations",input())),202);
  const {id,nonce}=f.sent[0];f.storage.jobs.get(id).seed_url="http://169.254.169.254/";
  let collected=0;f.services.collectors={domain_explorer:{run:async()=>{collected++;throw Error("must not run");}}};
  await json(await f.background(new Request("https://benchmarkinggrupofeg.site/background",{method:"POST",...signedDispatch(id,nonce,secret)})),202);
  const job=await get(f,id);assert.equal(job.status,"failed");assert.equal(job.error.code,"blocked_url");assert.equal(collected,0);
});
test("QA B2 concurrent signed deliveries claim once",async()=>{
  const f=fixture();await json(await f.investigations(request("investigations",input())),202);
  const {id,nonce}=f.sent[0],signed=signedDispatch(id,nonce,secret);
  let collected=0;f.services.collectors={domain_explorer:{run:async()=>{collected++;return {status:"unavailable",result_count:0};}}};
  await Promise.all(Array.from({length:6},async()=>json(await f.background(new Request("https://benchmarkinggrupofeg.site/background",{method:"POST",...signed})),202)));
  assert.equal(collected,1);assert.equal((await f.storage.get(id)).attempt,1);
});
