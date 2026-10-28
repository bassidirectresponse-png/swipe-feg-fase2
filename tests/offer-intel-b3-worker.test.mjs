import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createIntelHandlers } from "../netlify/functions/_offer-intel-api.mjs";
import { createFAKEStorage } from "./offer-intel-FAKE-storage.mjs";
import { signedDispatch } from "../lib/offer-intel-dispatch.mjs";
test("B3 worker retains durable counts if source fails after checkpoint",async()=>{
  const storage=createFAKEStorage(),secret=["FAKE","worker","fixture"].join("-");let nonce;
  const services={storage,secret,reader:{},validateUrl:async()=>{},capabilities:{domain_explorer:true},
    dispatch:async(_id,n)=>{nonce=n;},collectors:{domain_explorer:{run:async(_job,{checkpoint})=>{
      await checkpoint({counts:{discoveries:1,relations:0,funnels:0,steps:0}});throw Error("FAKE interruption");
    }}}};
  const handlers=createIntelHandlers({authenticate:async()=>({id:randomUUID()}),isAdmin:()=>true,getServices:()=>services});
  const response=await handlers.investigations(new Request("https://benchmarkinggrupofeg.site/create",{method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({url:"https://example.com",idempotency_key:"partial-checkpoint-key",options:{collect_ads:false,explore_domains:true}})}));
  const created=await response.json();assert.equal(response.status,202);
  await handlers.background(new Request("https://benchmarkinggrupofeg.site/worker",{method:"POST",...signedDispatch(created.job_id,nonce,secret)}));
  const job=await storage.get(created.job_id);assert.equal(job.status,"partial");assert.equal(job.counts.discoveries,1);
});
