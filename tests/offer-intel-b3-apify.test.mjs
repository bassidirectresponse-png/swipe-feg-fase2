import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createDailyBudget } from "../lib/offer-intel-budget.mjs";
import { createApifyCollector, apifyPlan } from "../lib/offer-intel-apify.mjs";
import { createFAKEWorkerStorage } from "./offer-intel-FAKE-worker-storage.mjs";
import { createFAKEBudgetStorage } from "./offer-intel-FAKE-budget-storage.mjs";
const fixture=()=>({id:randomUUID(),lease_token:randomUUID(),offer_id:randomUUID(),offer_ref_kind:"offer",scope_key:"offer:FAKE",
  seed_snapshot:{data:{nomeOferta:"FAKE Brand",bibliotecas:[{link:"https://www.facebook.com/ads/library/?view_all_page_id=123"}],dominios:[{linkDominio:"https://example.com"}]}}});
const json=data=>Response.json(data),token=["FAKE","provider","fixture"].join("-");
const items=[{adArchiveId:"456",pageId:"123",pageName:"Page",snapshot:{title:"Ad",linkUrl:"https://example.com/offer"}},
  {adArchiveId:"456",pageId:"123",pageName:"Page",snapshot:{title:"Ad",linkUrl:"https://example.com/offer"}}];
test("budget RPC FAKE admits exactly 15 concurrent reservations and reuses known key",async()=>{
  const storage=createFAKEBudgetStorage(),budget=createDailyBudget({storage});
  const results=await Promise.allSettled(Array.from({length:20},(_,i)=>budget.reserve("reservation-"+i)));
  assert.equal(results.filter(r=>r.status==="fulfilled").length,15);
  const used=storage.reservations.size;
  assert.ok(used<=15);
  const reused=await budget.reserve("reservation-0");assert.equal(reused.reused,true);assert.equal(reused.daily_used,used);
  for(let i=used;i<15;i++)await budget.reserve("fill-"+i);
  await assert.rejects(()=>budget.reserve("over-limit"),e=>e.status===429&&e.code==="daily_limit"&&e.retryAfter===43200);
});
test("B3 budget failure is closed; no fallback and no provider POST",async()=>{
  const job=fixture(),storage=createFAKEWorkerStorage(job);let calls=0;
  const budget=createDailyBudget({storage:{budgetReserve:async()=>{throw Error("FAKE outage");}}});
  await assert.rejects(()=>createApifyCollector({storage,budget,token,fetcher:async()=>{calls++;}}).run(job),e=>e.status===503);
  assert.equal(calls,0);
});
test("Postgres budget daily_limit prevents the sixteenth provider POST",async()=>{
  const job=fixture(),storage=createFAKEWorkerStorage(job),budgetStorage=createFAKEBudgetStorage();
  const budget=createDailyBudget({storage:budgetStorage});let calls=0;
  for(let i=0;i<15;i++)await budget.reserve("filled-"+i);
  await assert.rejects(()=>createApifyCollector({storage,budget,token,fetcher:async()=>{calls++;}}).run(job),
    e=>e.status===429&&e.code==="daily_limit");
  assert.equal(calls,0);assert.equal(budgetStorage.reservations.size,15);
});
test("B3 Apify reserves before POST, persists run immediately, known-page seeds and Meta dedupe",async()=>{
  const job=fixture(),storage=createFAKEWorkerStorage(job),calls=[],events=[];
  const original=storage.provider;storage.provider=async p=>{const r=await original(p);if(p.patch?.provider_run_id)events.push("saved-run");return r;};
  const budget={reserve:async()=>{events.push("reserved");return {day:"2026-10-28",daily_used:1};}};
  const FAKE_fetch=async(url,options)=>{
    calls.push({url,options});const path=new URL(url).pathname;
    if(options.method==="POST"){assert.deepEqual(events,["reserved"]);events.push("POST");return json({data:{id:"run1",status:"RUNNING",defaultDatasetId:"dataset1"}});}
    assert.ok(events.includes("saved-run"));
    if(path.includes("actor-runs"))return json({data:{id:"run1",status:"SUCCEEDED",defaultDatasetId:"dataset1"}});
    return json(items);
  };
  const adapter=createApifyCollector({storage,budget,token,fetcher:FAKE_fetch}),result=await adapter.run(job);
  assert.equal(result.status,"succeeded");assert.equal(storage.records.discoveries.size,3);assert.equal(storage.records.relations.size,1);
  const input=JSON.parse(calls[0].options.body);assert.equal(input.startUrls.length,3);assert.match(input.startUrls[0].url,/view_all_page_id=123/);
  assert.equal(input.resultsLimit,30);assert.ok(calls[0].url.includes("maxItems=90"));
  const page=[...storage.records.discoveries.values()].find(d=>d.type==="page");assert.equal(page.identity_key,"meta:page:123");assert.equal(page.data.ads_count,null);
  assert.equal(page.data.existing_matches[0].ref_id,job.offer_id);
  await adapter.run(job);assert.equal(calls.filter(c=>c.options.method==="POST").length,1);assert.equal(storage.records.discoveries.size,3);
  assert.ok(calls.every(c=>c.url.startsWith("https://api.apify.com/v2/")&&c.options.redirect==="error"));
});
test("B3 ambiguous POST persists unknown; reconcile by unique run marker without another POST",async()=>{
  const job=fixture(),storage=createFAKEWorkerStorage(job);let posts=0,marker;
  const budget={reserve:async()=>({day:"2026-10-28",daily_used:1})};
  const FAKE_fetch=async(url,options)=>{
    if(options.method==="POST"){posts++;marker=options.headers["User-Agent"];throw Error("FAKE connection lost after accepted POST");}
    if(url.includes("/acts/"))return json({data:{items:[{id:"recovered",startedAt:new Date().toISOString()}]}});
    if(url.includes("/actor-runs/"))return json({data:{id:"recovered",status:"SUCCEEDED",defaultDatasetId:"dataset1",meta:{userAgent:marker}}});
    return json(items);
  };
  const adapter=createApifyCollector({storage,budget,token,fetcher:FAKE_fetch});
  await assert.rejects(()=>adapter.run(job),e=>e.code==="provider_error");
  assert.equal([...storage.records.providers.values()][0].state,"unknown");
  const result=await adapter.run(job);assert.equal(result.status,"succeeded");assert.equal(posts,1);
  assert.equal([...storage.records.providers.values()][0].provider_run_id,"recovered");
});
test("B3 no reconciliation match stays unknown, never restarts or reserves twice",async()=>{
  const job=fixture(),storage=createFAKEWorkerStorage(job);let posts=0,reservations=0;
  const adapter=createApifyCollector({storage,token,budget:{reserve:async()=>{reservations++;return {};}},
    fetcher:async(_url,options)=>{if(options.method==="POST"){posts++;throw Error("FAKE timeout");}return json({data:{items:[]}});}});
  await assert.rejects(()=>adapter.run(job));await assert.rejects(()=>adapter.run(job));
  assert.equal(posts,1);assert.equal(reservations,1);assert.equal([...storage.records.providers.values()][0].state,"unknown");
});
test("B3 provider identity storage failure after accepted POST cannot cause another charge",async()=>{
  const job=fixture(),storage=createFAKEWorkerStorage(job),save=storage.provider;let fail=true,posts=0,marker;
  storage.provider=async p=>{if(p.patch?.provider_run_id&&fail){fail=false;throw Error("FAKE database outage");}return save(p);};
  const adapter=createApifyCollector({storage,token,budget:{reserve:async()=>({})},fetcher:async(url,o)=>{
    if(o.method==="POST"){posts++;marker=o.headers["User-Agent"];return json({data:{id:"accepted",status:"RUNNING"}});}
    if(url.includes("/acts/"))return json({data:{items:[{id:"accepted",startedAt:new Date().toISOString()}]}});
    if(url.includes("/actor-runs/"))return json({data:{id:"accepted",status:"SUCCEEDED",defaultDatasetId:"ds",meta:{userAgent:marker}}});
    return json(items);
  }});
  await assert.rejects(()=>adapter.run(job));await adapter.run(job);assert.equal(posts,1);
});
test("B3 two adapter invocations share provider CAS: at most one POST",async()=>{
  const job=fixture(),storage=createFAKEWorkerStorage(job);let posts=0;
  const adapter=createApifyCollector({storage,token,budget:{reserve:async()=>({})},fetcher:async(_url,o)=>{
    if(o.method==="POST"){posts++;return json({data:{id:"one",status:"SUCCEEDED",defaultDatasetId:"ds"}});}return json(items);
  }});
  const results=await Promise.allSettled([adapter.run(job),adapter.run(job)]);
  assert.equal(posts,1);assert.equal(results.filter(r=>r.status==="fulfilled").length,1);
});
test("B3 absent credentials and no search targets do not call provider",async()=>{
  const job=fixture(),storage=createFAKEWorkerStorage(job);let calls=0;
  await assert.rejects(()=>createApifyCollector({storage,token:"",fetcher:async()=>{calls++;}}).run(job),e=>e.code==="credentials_missing");
  assert.equal(apifyPlan({...job,seed_snapshot:{}}),null);assert.equal(calls,0);
});
