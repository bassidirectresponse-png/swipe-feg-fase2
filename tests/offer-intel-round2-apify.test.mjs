import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { hash,stableJson } from "../lib/offer-intel-core.mjs";
import { createApifyCollector,apifyPlan } from "../lib/offer-intel-apify.mjs";
import { createFAKEWorkerStorage } from "./offer-intel-FAKE-worker-storage.mjs";
const job=()=>({id:randomUUID(),lease_token:randomUUID(),scope_key:"url:FAKE",seed_snapshot:{data:{nomeOferta:"FAKE Brand"}}});
test("Round2 definitive Apify 401/402/403/422 failures store sanitized rejection and retry with a NEW charged reservation",async()=>{
  for(const status of [401,402,403,422]) {
    const j=job(),storage=createFAKEWorkerStorage(j),keys=[];let posts=0,recover=false,gets=0;
    const token=randomUUID(),other=randomUUID();
    const adapter=createApifyCollector({storage,token,budget:{reserve:async key=>{keys.push(key);return {day:"2026-10-28",daily_used:keys.length};}},
      fetcher:async(_url,o)=>{
        if(o.method==="POST"){posts++;
          if(!recover)return Response.json({error:{type:"billing",message:'Account limited: invoice unpaid. Bearer '+token+' access_token="'+other+'"'}},{status});
          return Response.json({data:{id:"accepted",status:"SUCCEEDED",defaultDatasetId:"dataset"}});
        }
        gets++;return Response.json([]);
      }});
    await assert.rejects(()=>adapter.run(j),e=>e.code==="provider_rejected"&&e.retryable&&e.message.includes("invoice unpaid")&&!e.message.includes(token)&&!e.message.includes(other));
    const first=[...storage.records.providers.values()][0];assert.equal(first.state,"failed");assert.equal(first.provider_run_id,undefined);
    assert.equal(first.usage.last_error.code,"provider_rejected");assert.equal(first.usage.last_error.http_status,status);
    assert.equal(first.usage.start_attempt,1);assert.equal(gets,0);
    recover=true;assert.equal((await adapter.run(j)).status,"succeeded");
    assert.equal(posts,2);assert.equal(new Set(keys).size,2);assert.equal(keys.length,2);
    assert.equal([...storage.records.providers.values()][0].usage.start_attempt,2);
  }
});
test("Round2 5xx, transport error, and unstructured 4xx remain unknown; retry only GET",async()=>{
  for(const failure of ["network",500,503,403]) {
    const j=job(),storage=createFAKEWorkerStorage(j);let posts=0,reservations=0;
    const adapter=createApifyCollector({storage,token:randomUUID(),budget:{reserve:async()=>{reservations++;return {};}},
      fetcher:async(_url,o)=>{
        if(o.method==="POST"){posts++;if(failure==="network")throw Error("FAKE timeout");
          return failure===403?new Response("FAKE proxy denied",{status:403}):Response.json({error:{message:"FAKE server error"}},{status:failure});}
        return Response.json({data:{items:[]}});
      }});
    await assert.rejects(()=>adapter.run(j));assert.equal([...storage.records.providers.values()][0].state,"unknown");
    await assert.rejects(()=>adapter.run(j));assert.equal(posts,1);assert.equal(reservations,1);
  }
});
test("Round2 legacy unknown without run_id keeps old reconciliation marker and never starts a new run",async()=>{
  const j=job(),storage=createFAKEWorkerStorage(j),query_key=hash(stableJson(apifyPlan(j).actorInput));
  const marker="SwipeFEG-OfferIntel/1 reservation/"+hash(j.id+":"+query_key);
  await storage.provider({job_id:j.id,lease_token:j.lease_token,query_key,expected_state:"reserved",patch:{state:"unknown"}});
  let posts=0;
  const adapter=createApifyCollector({storage,token:randomUUID(),budget:{reserve:async()=>{throw Error("no reservation allowed");}},
    fetcher:async(url,o)=>{
      if(o.method==="POST"){posts++;throw Error("no POST allowed");}
      if(url.includes("/acts/"))return Response.json({data:{items:[{id:"legacy",startedAt:new Date().toISOString()}]}});
      if(url.includes("/actor-runs/"))return Response.json({data:{id:"legacy",status:"SUCCEEDED",defaultDatasetId:"dataset",meta:{userAgent:marker}}});
      return Response.json([]);
    }});
  assert.equal((await adapter.run(j)).status,"succeeded");assert.equal(posts,0);
});
test("Round2 concurrent retries of rejected run admit only one new POST and reservation identity",async()=>{
  const j=job(),storage=createFAKEWorkerStorage(j),keys=[];let posts=0;
  const adapter=createApifyCollector({storage,token:randomUUID(),budget:{reserve:async key=>{keys.push(key);return {};}},
    fetcher:async(_url,o)=>{if(o.method==="POST"){posts++;return Response.json({error:{message:"FAKE billing refusal"}},{status:402});}throw Error("GET not expected");}});
  await assert.rejects(()=>adapter.run(j));
  await Promise.allSettled([adapter.run(j),adapter.run(j)]);
  assert.equal(posts,2);assert.equal(new Set(keys).size,2);
});
