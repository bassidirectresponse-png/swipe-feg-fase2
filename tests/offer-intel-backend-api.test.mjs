import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createIntelHandlers } from "../netlify/functions/_offer-intel-api.mjs";
import { createFAKEStorage } from "./offer-intel-FAKE-storage.mjs";
import { createReferenceReader } from "../lib/offer-intel-reference.mjs";
import { publicLimits } from "../lib/offer-intel-limits.mjs";
import { signedDispatch } from "../lib/offer-intel-dispatch.mjs";
import { unavailableCollectors } from "../lib/offer-intel-collectors.mjs";

const ID="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",ACTOR="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",secret=["FAKE","signing","fixture"].join("-");
function fixture({now,auth={id:ACTOR},admin=true,quota=true}={}) {
  const storage=createFAKEStorage({now}),calls=[],sent=[];
  const FAKE_fetch=async(url,opts)=>{
    calls.push({url:String(url),opts});
    const id=new URL(url).searchParams.get("id")?.slice(3);
    return Response.json(id===ID?[{id:ID,data:{nomeOferta:"Produto",kind:"oferta"}}]:[]);
  };
  const reader=createReferenceReader({supabaseUrl:"https://example.invalid",serviceKey:"FAKE-service",fetcher:FAKE_fetch,readDraft:async()=>null});
  const services={storage,reader,secret,capabilities:{apify:true,domain_explorer:false},collectors:unavailableCollectors,validateUrl:async()=>{},dispatch:async(id,nonce)=>{sent.push({id,nonce});}};
  const handlers=createIntelHandlers({authenticate:async()=>auth,isAdmin:()=>admin,rateLimit:async()=>({allowed:quota,retryAfter:37}),getServices:()=>services});
  return {storage,calls,sent,services,...handlers};
}
function req(route,body) {
  return new Request("https://benchmarkinggrupofeg.site/.netlify/functions/"+route,{...(body?{method:"POST",body:JSON.stringify(body),headers:{"Content-Type":"application/json"}}:{})});
}
const input=(key="create-key-1",extra={})=>({offer_id:ID,offer_ref_kind:"offer",idempotency_key:key,...extra});
async function create(f,key,extra){const res=await f.investigations(req("offer-intel-investigations",input(key,extra)));return {res,body:await res.json()};}
test("POST concorrentes criam um job; chave repetida, alias de reuso e conflito de payload",async()=>{
  const f=fixture();
  const results=await Promise.all([create(f,"create-key-a"),create(f,"create-key-b")]);
  assert.equal(results[0].res.status,202);assert.equal(results[1].res.status,202);
  assert.equal(results[0].body.job_id,results[1].body.job_id);assert.equal(f.storage.jobs.size,1);
  assert.ok(results[1].body.reused);
  const repeat=await create(f,"create-key-b");assert.equal(repeat.body.job_id,results[0].body.job_id);
  assert.equal((await create(f,"create-key-a",{options:{collect_ads:false}})).res.status,409);
  assert.ok(f.calls.every(c=>c.url.includes("/offers?")&&(!c.opts.method||c.opts.method==="GET")));
  assert.equal(JSON.stringify(results).includes("nonce"),false);
});
test("IDs só locais e drafts inexistentes retornam offer_not_found; nenhum job órfão",async()=>{
  const f=fixture();
  const bad=await create(f,"local-id-key",{offer_id:randomUUID()});
  assert.equal(bad.res.status,422);assert.equal(bad.body.code,"offer_not_found");
  assert.equal((await create(f,"draft-id-key",{offer_ref_kind:"admin_draft"})).res.status,422);
  assert.equal(f.storage.jobs.size,0);
});
test("QA-B01 HTTP: tipos inválidos de offer_id/job_id dão 422 antes de runtime, reader e provider",async()=>{
  let runtimeCalls=0;
  const handlers=createIntelHandlers({authenticate:async()=>({id:ACTOR}),isAdmin:()=>true,getServices:()=>{runtimeCalls++;throw Error("não deve ser chamado");}});
  for(const value of [[ID],{id:ID},null,123,true]) {
    const result=await handlers.investigations(req("offer-intel-investigations",input("bad-type-key",{offer_id:value,url:"https://example.com"})));
    assert.equal(result.status,422);
    assert.deepEqual(await result.json(),{ok:false,code:"offer_not_found",error:"Oferta ou rascunho não encontrado no servidor.",retryable:false});
    const action=await handlers.job(req("offer-intel-job",{job_id:value,action:"cancel",idempotency_key:"bad-job-key"}));
    assert.equal(action.status,422);assert.equal((await action.json()).ok,false);
  }
  assert.equal(runtimeCalls,0);
});
test("8b: Apify indisponível retorna 503 e limits; URL manual sem anúncios é admitida",async()=>{
  const f=fixture();f.services.capabilities.apify=false;
  const unavailable=await create(f,"missing-apify-key");
  assert.equal(unavailable.res.status,503);assert.equal(unavailable.body.code,"credentials_missing");
  assert.equal(unavailable.body.limits.apify.available,false);assert.equal(f.storage.jobs.size,0);
  const manual=await f.investigations(req("offer-intel-investigations",{url:"https://example.com",idempotency_key:"manual-domain-key",options:{collect_ads:false,explore_domains:true}}));
  assert.equal(manual.status,202);
  const data=await manual.json();
  assert.equal(data.job,undefined);assert.equal(data.limits.domain_explorer.page_timeout_s,20);
  assert.equal(data.limits.screenshot.available,false);assert.equal(data.limits.apify.daily_used,undefined);
  const signed=signedDispatch(data.job_id,f.sent[0].nonce,secret);
  await f.background(new Request("https://benchmarkinggrupofeg.site/worker",{method:"POST",...signed}));
  const row=await f.storage.get(data.job_id);
  assert.equal(row.status,"failed");assert.equal(row.error.code,"capability_unavailable");
  assert.equal(row.offer_id,null); // manual worker must not treat null persisted fields as a supplied reference
});
test("8b: histórico sem filtro, active/listas, cursor e Job achatado",async()=>{
  const f=fixture(),{body}=await create(f,"history-key");
  const original=f.storage.jobs.get(body.job_id);
  for(const status of ["running","failed","succeeded"]) {
    const id=randomUUID();f.storage.jobs.set(id,{...structuredClone(original),id,status,scope_key:"other:"+id});
  }
  for(const filter of ["active","queued,running"]) {
    const result=await (await f.investigations(req("offer-intel-investigations?status="+filter))).json();
    assert.deepEqual(result.items.map(j=>j.status).sort(),["queued","running"]);
    assert.ok(result.items.every(j=>j.limits.apify&&j.id&&!j.job&&!j.lease_token));
  }
  const page1=await (await f.investigations(req("offer-intel-investigations?limit=2"))).json();
  const page2=await (await f.investigations(req("offer-intel-investigations?limit=2&cursor="+page1.next_cursor))).json();
  assert.equal(new Set([...page1.items,...page2.items].map(j=>j.id)).size,4);assert.equal(page2.next_cursor,null);
  assert.equal((await f.investigations(req("offer-intel-investigations?status=queued,invalid"))).status,400);
  const single=await (await f.job(req("offer-intel-job?job_id="+body.job_id))).json();
  assert.equal(single.id,body.job_id);assert.equal(single.job,undefined);assert.equal(single.ok,true);
});
test("dispatch expirado é recuperado pelo mesmo POST sem recriar job nem reutilizar nonce vencido",async()=>{
  let time=Date.now();const f=fixture({now:()=>time}),first=await create(f,"lost-dispatch-key"),old=f.sent[0].nonce;
  time+=301000;
  const next=await create(f,"lost-dispatch-key");
  assert.equal(next.body.job_id,first.body.job_id);assert.equal(next.body.reused,true);
  assert.notEqual(f.sent.at(-1).nonce,old);assert.equal(f.storage.jobs.size,1);
  assert.equal(await f.storage.claim({job_id:first.body.job_id,nonce:old}),null);
  assert.ok(await f.storage.claim({job_id:first.body.job_id,nonce:f.sent.at(-1).nonce}));
});
test("admissão rejeita quota de novos jobs com 429 estruturado depois de permitir reuso",async()=>{
  const f=fixture(),{body}=await create(f,"quota-first-key"),row=f.storage.jobs.get(body.job_id);
  for(let i=0;i<14;i++){const id=randomUUID();f.storage.jobs.set(id,{...structuredClone(row),id,scope_key:"other:"+i});}
  assert.equal((await create(f,"quota-reuse-key")).res.status,202);
  const result=await f.investigations(req("offer-intel-investigations",{url:"https://example.com/new",idempotency_key:"quota-new-key",options:{collect_ads:false}}));
  assert.equal(result.status,429);assert.ok(Number(result.headers.get("Retry-After"))>0);
  assert.equal((await result.json()).code,"rate_limited");
});
test("401/403 antes de storage e 429 com Retry-After; origem inválida",async()=>{
  for(const [config,status,code] of [[{auth:null},401,"session_expired"],[{admin:false},403,"forbidden"]]) {
    const f=fixture(config),r=await create(f);
    assert.equal(r.res.status,status);assert.equal(r.body.code,code);assert.equal(f.calls.length,0);
  }
  const f=fixture({quota:false}),r=await f.investigations(req("offer-intel-investigations"));
  assert.equal(r.status,429);assert.equal(r.headers.get("Retry-After"),"37");assert.equal((await r.json()).retry_after,37);
  const denied=await fixture().investigations(new Request("https://benchmarkinggrupofeg.site/.netlify/functions/offer-intel-investigations",{headers:{origin:"https://evil.example"}}));
  assert.equal(denied.status,403);
});
test("reuso precede quota/cooldown; scope terminal tem cooldown",async()=>{
  const f=fixture();
  const {body}=await create(f);
  const job=f.storage.jobs.get(body.job_id);
  for(let i=0;i<15;i++)f.storage.jobs.set(randomUUID(),{...job,id:randomUUID(),scope_key:"other:"+i});
  assert.equal((await create(f,"new-alias-key")).res.status,202);
  job.status="succeeded";
  const r=await create(f,"cooldown-key");assert.equal(r.res.status,429);assert.equal(r.body.code,"cooldown");
});
test("claim concorrente gera um lease; nonce one-use; lease antigo não faz checkpoint",async()=>{
  let time=Date.now();const f=fixture({now:()=>time}),{body}=await create(f),dispatch=f.sent[0];
  const claims=await Promise.all([f.storage.claim({job_id:body.job_id,nonce:dispatch.nonce}),f.storage.claim({job_id:body.job_id,nonce:dispatch.nonce})]);
  assert.equal(claims.filter(Boolean).length,1);
  const old=claims.find(Boolean).lease_token;time+=121000;
  assert.equal(await f.storage.claim({job_id:body.job_id,nonce:dispatch.nonce}),null);
  const r=await f.storage.action({job_id:body.job_id,actor_id:ACTOR,action:"retry",idempotency_key:"retry-old-key",request_hash:"retry"});
  const next=await f.storage.claim({job_id:body.job_id,nonce:r.nonce});
  assert.notEqual(next.lease_token,old);
  await assert.rejects(()=>f.storage.checkpoint({job_id:body.job_id,lease_token:old,patch:{status:"succeeded"}}),e=>e.code==="conflict");
});
test("retry/cancel idempotentes e cancelamento impede checkpoint tardio",async()=>{
  const f=fixture(),{body}=await create(f);
  let j=f.storage.jobs.get(body.job_id);j.status="failed";j.error={retryable:true};j.sources[0].status="failed";
  const action={job_id:j.id,action:"retry",idempotency_key:"retry-key-1"};
  const a=await f.job(req("offer-intel-job",action)),b=await f.job(req("offer-intel-job",action));
  assert.equal(a.status,202);assert.equal(b.status,202);assert.equal((await b.json()).reused,true);
  const nonce=f.sent.at(-1).nonce,claimed=await f.storage.claim({job_id:j.id,nonce});
  const cancel={job_id:j.id,action:"cancel",idempotency_key:"cancel-key-1"};
  const c=await f.job(req("offer-intel-job",cancel)),d=await f.job(req("offer-intel-job",cancel));
  assert.equal((await c.json()).status,"cancelled");assert.equal((await d.json()).reused,true);
  await assert.rejects(()=>f.storage.checkpoint({job_id:j.id,lease_token:claimed.lease_token,patch:{status:"succeeded"}}));
});
test("worker exige HMAC/nonce e informa capacidade indisponível sem mock de produção",async()=>{
  const f=fixture(),{body}=await create(f,"worker-key-1",{options:{capture_screenshots:true}});
  const invalid=await f.background(req("offer-intel-background",{job_id:body.job_id}));assert.equal(invalid.status,403);
  const signed=signedDispatch(body.job_id,f.sent[0].nonce,secret);
  const make=()=>new Request("https://benchmarkinggrupofeg.site/.netlify/functions/offer-intel-background",{method:"POST",...signed});
  assert.equal((await f.background(make())).status,202);
  const row=await f.storage.get(body.job_id);
  assert.equal(row.status,"failed");assert.equal(row.error.code,"capability_unavailable");
  assert.equal(row.sources.find(s=>s.name==="screenshot").status,"unavailable");
  await f.background(make());assert.equal((await f.storage.get(body.job_id)).attempt,1);
  const response=await f.job(req("offer-intel-job?job_id="+body.job_id)),publicRow=await response.json();
  assert.equal(publicRow.id,body.job_id);assert.equal(publicRow.lease_token,undefined);assert.equal(publicRow.seed_snapshot,undefined);
  assert.equal(publicRow.limits.domain_explorer.max_pages,20);
});
test("worker com coletor FAKE explicitamente injetado persiste estado, GET não despacha",async()=>{
  const f=fixture(),{body}=await create(f,"worker-fake-key",{options:{explore_domains:false}});
  f.services.collectors={apify:{async run(){return {status:"succeeded",result_count:0,counts:{discoveries:0}};}}};
  const signed=signedDispatch(body.job_id,f.sent[0].nonce,secret);
  await f.background(new Request("https://benchmarkinggrupofeg.site/worker",{method:"POST",...signed}));
  assert.equal((await f.storage.get(body.job_id)).status,"succeeded");
  const before=f.sent.length;
  await f.job(req("offer-intel-job?job_id="+body.job_id));assert.equal(f.sent.length,before);
  const history=await (await f.investigations(req("offer-intel-investigations?offer_id="+ID+"&offer_ref_kind=offer&limit=1"))).json();
  assert.equal(history.items.length,1);assert.equal(history.next_cursor,null);assert.deepEqual(history.limits,publicLimits(f.services.capabilities));
});
test("RPC review FAKE compare-and-set e idempotência preservam decisão e único evento",async()=>{
  const f=fixture(),id=randomUUID();
  f.storage.entities.set(id,{id,version:1,status:"new"});
  const action={id,entity_type:"discovery",status:"confirmed",expected_version:1,actor_id:ACTOR,idempotency_key:"review-key-1",request_hash:"hash"};
  const [first,second]=await Promise.allSettled([f.storage.review(action),f.storage.review({...action,idempotency_key:"review-key-2",status:"ignored",request_hash:"other"})]);
  assert.equal(first.status,"fulfilled");assert.equal(second.status,"rejected");
  assert.equal((await f.storage.review(action)).version,2);assert.equal(f.storage.events.length,1);
});
