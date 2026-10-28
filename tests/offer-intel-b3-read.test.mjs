import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createIntelHandlers } from "../netlify/functions/_offer-intel-api.mjs";
import { createFAKEStorage } from "./offer-intel-FAKE-storage.mjs";
import { publicFunnel, publicEvidence, publicDiscovery } from "../lib/offer-intel-public.mjs";
import { encodeCursor, pagination } from "../lib/offer-intel-core.mjs";
const ID="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",JOB="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const request=(route,body)=>new Request("https://benchmarkinggrupofeg.site/"+route,body?{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}:{});
function fixture({auth={id:ID},admin=true,quota=true}={}) {
  const storage=createFAKEStorage(),calls=[];
  const rows=Array.from({length:3},(_,i)=>({id:randomUUID(),type:"page",identity_key:"meta:page:"+i,data:{title:"Page "+i,ads_count:10-i,url:"javascript:alert(1)",html:"SECRET_INTERNAL"},
    status:"new",version:1,created_at:"2026-10-27T00:00:00.000Z",updated_at:"2026-10-27T00:00:00.000Z",rank:10-i,evidence:[]}));
  rows.forEach(r=>storage.entities.set(r.id,r));
  storage.read=async q=>{
    calls.push(q);
    if(q.id)return storage.entities.get(q.id)||null;
    if(q.resource==="summary")return {active_job:null,last_job:null,counts:{new:3,review:0,confirmed:0,ignored:0,relations_pending:0,funnels:0},latest_at:null};
    return {items:rows.filter(r=>!q.cursor||r.rank<q.cursor.rank).slice(0,q.limit+1)};
  };
  let runtimes=0;
  const handlers=createIntelHandlers({authenticate:async()=>auth,isAdmin:()=>admin,rateLimit:async()=>({allowed:quota,retryAfter:7}),
    getServices:()=>{runtimes++;return {storage,capabilities:{},reader:{getOffer:async()=>({id:ID,data:{kind:"oferta"}})}};}});
  return {handlers,storage,calls,rows,runtimes:()=>runtimes};
}
test("B3 lists require unambiguous scope; UUID/filter validation before runtime",async()=>{
  const f=fixture();
  for(const route of ["discoveries","relations","funnels"]) {
    assert.equal((await f.handlers[route](request(route))).status,400);
    assert.equal((await f.handlers[route](request(route+"?job_id=local"))).status,422);
    assert.equal((await f.handlers[route](request(route+"?job_id="+JOB+"&offer_id="+ID+"&offer_ref_kind=offer"))).status,400);
    assert.equal((await f.handlers[route](request(route+"?job_id="+JOB+"&type=invalid"))).status,400);
  }
  assert.equal(f.runtimes(),0);
});
test("B3 cursor bound to query, stable ads sort, flattened whitelist and safe URLs",async()=>{
  const f=fixture(),base="discoveries?job_id="+JOB+"&sort=ads&limit=2";
  const first=await (await f.handlers.discoveries(request(base))).json();
  assert.equal(first.items.length,2);assert.ok(first.next_cursor);
  assert.equal(first.items[0].data,undefined);assert.equal(first.items[0].url,null);
  assert.equal(JSON.stringify(first).includes("SECRET_INTERNAL"),false);
  const second=await (await f.handlers.discoveries(request(base+"&cursor="+first.next_cursor))).json();
  assert.equal(second.items.length,1);assert.equal(second.next_cursor,null);
  assert.equal((await f.handlers.discoveries(request(base+"&q=changed&cursor="+first.next_cursor))).status,400);
  assert.equal(f.calls[0].job_id,JOB);
});
test("B3 review CAS concurrency, idempotent replay, stale version and typed ID guard",async()=>{
  const f=fixture(),id=f.rows[0].id,body={id,status:"confirmed",expected_version:1,idempotency_key:"review-key-one"};
  const results=await Promise.all([f.handlers.discovery(request("discovery",body)),f.handlers.discovery(request("discovery",{...body,idempotency_key:"review-key-two",status:"ignored"}))]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  const replay=await (await f.handlers.discovery(request("discovery",body))).json();
  assert.equal(replay.id,id);assert.equal(replay.version,2);assert.equal(replay.discovery,undefined);
  assert.equal(f.storage.events.length,1);
  const before=f.runtimes();
  for(const value of [null,{},[id],12])assert.equal((await f.handlers.discovery(request("discovery",{...body,id:value}))).status,422);
  assert.equal(f.runtimes(),before);
});
test("B3 every endpoint enforces 401/403/429 before storage",async()=>{
  for(const [settings,expected] of [[{auth:null},401],[{admin:false},403],[{quota:false},429]]) {
    const f=fixture(settings);
    for(const route of ["discoveries","discovery","relations","relation","funnels","funnel","summary","evidence"]) {
      const review=["discovery","relation"].includes(route);
      const q=route==="summary"?"?offer_id="+ID+"&offer_ref_kind=offer":["funnel","evidence"].includes(route)?"?id="+ID:"?job_id="+JOB;
      const res=await f.handlers[route](request(route+q,review?{id:ID,status:route==="relation"?"confirmed":"new",expected_version:1,idempotency_key:"review-auth-key"}:undefined));
      assert.equal(res.status,expected,route);if(expected===429)assert.equal(res.headers.get("Retry-After"),"7");
    }
    assert.equal(f.runtimes(),0);
  }
});
test("B3 summary shape and evidence/funnel never expose HTML or storage paths",async()=>{
  const f=fixture(),summary=await (await f.handlers.summary(request("summary?offer_id="+ID+"&offer_ref_kind=offer"))).json();
  assert.equal(summary.counts.new,3);assert.equal(summary.active_job,null);assert.ok(summary.limits.screenshot);
  assert.equal((await f.handlers.evidence(request("evidence?id="+JOB))).status,404);
  const evidence=publicEvidence({payload:{html:"PRIVATE",detail:"x".repeat(6000)},source_url:"javascript:alert(1)"});
  assert.equal(evidence.detail.length,4000);assert.equal(evidence.source_url,null);assert.equal(evidence.payload,undefined);
  const funnel=publicFunnel({id:ID,start_step_id:JOB,steps:[{id:JOB,original_url:"https://example.com",screenshot_path:"private/raw",technologies:[]}],edges:[]});
  assert.equal(funnel.steps[0].screenshot_url,null);assert.equal(funnel.steps[0].screenshot_status,"unavailable");
  assert.equal(funnel.steps[0].screenshot_path,undefined);
});
test("QA-B02: unknown counts remain null; only known nonnegative integers are displayed",()=>{
  for(const value of [null,undefined,-1,2.5,"3",false,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])
    assert.equal(publicDiscovery({data:{ads_count:value}}).ads_count,null);
  for(const value of [0,1,15,Number.MAX_SAFE_INTEGER])
    assert.equal(publicDiscovery({data:{ads_count:value}}).ads_count,value);
});
test("B3 funnel listing preserves steps_count",async()=>{
  const f=fixture();
  f.storage.read=async()=>({items:[{id:ID,investigation_id:JOB,title:"Funil",origin_url:"https://example.com",final_url:"https://example.com/vsl",steps_count:3,created_at:"2026-10-27T00:00:00.000Z"}]});
  const result=await (await f.handlers.funnels(request("funnels?job_id="+JOB))).json();
  assert.equal(result.items[0].steps_count,3);
});
test("QA-B03: B2/B3 cursors preserve exact microseconds and tied-ID boundary",async()=>{
  const stamp="2026-10-27T12:00:00.123456+00:00",canonical=stamp.replace("+00:00","Z");
  const cursor=pagination(new URLSearchParams({cursor:encodeCursor({id:JOB,created_at:stamp})})).cursor;
  assert.equal(cursor.created_at,canonical);
  // SQL comparison modeled with the exact timestamp string and descending UUID tie-breaker.
  assert.ok(canonical===cursor.created_at&&ID<cursor.id);
  const f=fixture(),base="discoveries?job_id="+JOB+"&limit=1";
  const rows=[{...f.rows[0],id:JOB,created_at:stamp,rank:0},{...f.rows[1],id:ID,created_at:stamp,rank:0}];
  f.storage.read=async q=>({items:rows.filter(r=>!q.cursor||(r.created_at.replace("+00:00","Z")===q.cursor.created_at&&r.id<q.cursor.id)).slice(0,q.limit+1)});
  const page1=await (await f.handlers.discoveries(request(base))).json();
  assert.equal(JSON.parse(Buffer.from(page1.next_cursor,"base64url")).created_at,canonical);
  const page2=await (await f.handlers.discoveries(request(base+"&cursor="+page1.next_cursor))).json();
  assert.equal(page2.items[0].id,ID);assert.equal(page2.next_cursor,null);
});
