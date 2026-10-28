// Independent QA: real collector/transport code; only local HTTP and explicit FAKE providers/storage.
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { randomUUID } from "node:crypto";
import { createDomainExplorer } from "../lib/offer-intel-domain.mjs";
import { createApifyCollector } from "../lib/offer-intel-apify.mjs";
import { createFAKEBudgetStorage } from "./offer-intel-FAKE-budget-storage.mjs";
import { createDailyBudget } from "../lib/offer-intel-budget.mjs";
import { fetchPublicPage,pinnedRequest } from "../lib/offer-intel-url-safety.mjs";
import { classifyStep } from "../lib/offer-intel-classifier.mjs";
import { createFAKEWorkerStorage } from "./offer-intel-FAKE-worker-storage.mjs";
const job=()=>({id:randomUUID(),lease_token:randomUUID(),offer_id:randomUUID(),offer_ref_kind:"offer",scope_key:"offer:FAKE",
 seed_url:"https://public.example/",seed_snapshot:{data:{nomeOferta:"FAKE",bibliotecas:[{link:"https://www.facebook.com/ads/library/?view_all_page_id=123"}]} }});
async function local(t){
 const calls=[],server=http.createServer((req,res)=>{
  calls.push({path:req.url,method:req.method,headers:req.headers});
  res.setHeader("Content-Type","text/html");
  if(req.url==="/large"){res.write(Buffer.alloc(1024*1024+1,65));res.end(Buffer.alloc(1024*1024+1,65));}
  else if(req.url==="/slow"){res.write("<title>");}
  else if(req.url==="/redirect"){res.writeHead(302,{location:"http://169.254.169.254/"});res.end();}
  else if(req.url==="/loop"){res.writeHead(302,{location:"/loop"});res.end();}
  else res.end('<title>Public page</title><form method="POST" action="/submit"><input name="x"></form>');
 });
 await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve);});
 t.after(()=>{server.closeAllConnections();server.close();});
 const transport=(url,addresses,options)=>{
  assert.deepEqual(addresses,[{address:"8.8.8.8",family:4}]);
  // Test-only route: retain hostname but pin actual connection to loopback on ephemeral port.
  const mapped=new URL(url);mapped.protocol="http:";mapped.port=String(server.address().port);
  return pinnedRequest(mapped,[{address:"127.0.0.1",family:4}],options);
 };
 return {calls,page:(url,options={})=>fetchPublicPage(url,{lookup:async()=>[{address:"8.8.8.8",family:4}],transport,...options})};
}
test("QA real Node streaming transport caps bytes/time, redirects and sends only GET without credentials",async t=>{
 const f=await local(t);
 await assert.rejects(()=>f.page("http://public.example/large"),e=>e.code==="response_too_large");
 await assert.rejects(()=>f.page("http://public.example/slow",{timeoutMs:80}),e=>e.code==="provider_error"||e.name==="AbortError");
 const n=f.calls.length;await assert.rejects(()=>f.page("http://public.example/redirect"),e=>e.code==="blocked_url");assert.equal(f.calls.length,n+1);
 const before=f.calls.length;await assert.rejects(()=>f.page("http://public.example/loop"),e=>e.code==="invalid_url");assert.equal(f.calls.length-before,6);
 const j=job(),s=createFAKEWorkerStorage(j);j.seed_url="http://public.example/";
 await createDomainExplorer({storage:s,fetchPage:f.page}).run(j);
 assert.ok(f.calls.every(c=>c.method==="GET"&&!c.headers.cookie&&!c.headers.authorization));assert.ok(!f.calls.some(c=>c.path==="/submit"));
 assert.ok(f.calls.every(c=>c.headers.host.startsWith("public.example:")));
});
test("QA classifier only claims verified for observed document signals",()=>{
 assert.equal(classifyStep({url:"https://example.com/checkout",text:"Welcome"}).verification,"inferred");
 assert.notEqual(classifyStep({text:"Payment method"}).kind,"checkout");
 assert.notEqual(classifyStep({text:"Card number"}).kind,"checkout");
 const seen=classifyStep({html:'<main><form><input autocomplete="cc-number"></form></main>'});assert.equal(seen.verification,"verified");assert.equal(seen.classification_basis.signals[0].source,"document");
 assert.equal(classifyStep({text:"Payment method",http_status:403}).verification,"inaccessible");
});
test("QA same Apify investigation twice: one POST, stable identities, decisions and legacy snapshots unchanged",async()=>{
 const j=job(),s=createFAKEWorkerStorage(j),legacy={offers:{[j.offer_id]:structuredClone(j.seed_snapshot.data)},drafts:{FAKE:{note:"keep"}}},original=structuredClone(legacy);
 let posts=0,reservations=0;const rows=Array.from({length:3},()=>({adArchiveId:"456",pageId:"123",pageName:"FAKE",snapshot:{linkUrl:"https://public.example/"}}));
 const collector=createApifyCollector({storage:s,token:randomUUID(),budget:{reserve:async()=>{reservations++;return {};}},
 fetcher:async(url,o)=>{if(o.method==="POST"){posts++;return Response.json({data:{id:"FAKERUN",status:"SUCCEEDED",defaultDatasetId:"FAKEDS"}});}
 if(url.includes("actor-runs"))return Response.json({data:{id:"FAKERUN",status:"SUCCEEDED",defaultDatasetId:"FAKEDS"}});
 return Response.json(rows);}});
 await collector.run(j);const ids=[...s.records.discoveries.keys()].sort();
 for(const d of s.records.discoveries.values()){d.status="confirmed";d.version=4;}
 for(const r of s.records.relations.values()){r.status="ignored";r.version=5;}
 await collector.run(j);
 assert.equal(posts,1);assert.equal(reservations,1);assert.deepEqual([...s.records.discoveries.keys()].sort(),ids);assert.equal(ids.length,3);
 assert.ok([...s.records.discoveries.values()].every(d=>d.status==="confirmed"&&d.version===4));
 assert.ok([...s.records.relations.values()].every(r=>r.status==="ignored"&&r.version===5));
 assert.deepEqual(legacy,original);assert.deepEqual(j.seed_snapshot.data,legacy.offers[j.offer_id]);
 assert.ok(!Object.hasOwn(s.records,"offers")&&!Object.hasOwn(s.records,"drafts"));
});
test("QA cancel while page is in flight prevents persistence and further pages",async()=>{
 const j=job(),s=createFAKEWorkerStorage(j);let calls=0;
 const collector=createDomainExplorer({storage:s,fetchPage:async url=>{
   calls++;s.cancel();return {status:200,headers:{"content-type":"text/html"},final_url:url,redirects:[],body:Buffer.from('<a href="/next">next</a>')};
 }});
 await assert.rejects(()=>collector.run(j),e=>e.code==="conflict");
 assert.equal(calls,1);assert.equal(s.records.evidence.size,0);
});
test("QA cancelled Apify after accepted POST cannot persist or start another request",async()=>{
 const j=job(),s=createFAKEWorkerStorage(j);let calls=0;
 const collector=createApifyCollector({storage:s,token:randomUUID(),budget:{reserve:async()=>({})},fetcher:async()=>{
  calls++;s.cancel();return Response.json({data:{id:"FAKERUN",status:"RUNNING",defaultDatasetId:"FAKEDS"}});
 }});
 await assert.rejects(()=>collector.run(j),e=>e.code==="conflict");assert.equal(calls,1);assert.equal(s.records.discoveries.size,0);
 await assert.rejects(()=>collector.run(j),e=>e.code==="conflict");assert.equal(calls,1);
});
test("QA PostgreSQL budget adapter with FAKE storage rejects sixteenth reservation before provider POST",async()=>{
 const storage=createFAKEBudgetStorage();let posts=0;
 const budget=createDailyBudget({storage});
 await Promise.all(Array.from({length:15},(_,i)=>budget.reserve("FAKE-"+i)));
 assert.equal((await budget.reserve("FAKE-0")).reused,true);
 const j=job(),s=createFAKEWorkerStorage(j);
 await assert.rejects(()=>createApifyCollector({storage:s,budget,token:randomUUID(),fetcher:async()=>{posts++;}}).run(j),e=>e.code==="daily_limit");
 assert.equal(posts,0);
});
test("QA unknown Apify reconciliation stays GET-only on repeated ambiguous results",async()=>{
 const j=job(),s=createFAKEWorkerStorage(j);let posts=0;
 const collector=createApifyCollector({storage:s,token:randomUUID(),budget:{reserve:async()=>({})},fetcher:async(_url,o)=>{
  if(o.method==="POST"){posts++;throw Error("FAKE accepted then disconnected");}
  return Response.json({data:{items:[]}});
 }});
 for(let i=0;i<3;i++)await assert.rejects(()=>collector.run(j),e=>e.code==="provider_error");
 assert.equal(posts,1);assert.equal([...s.records.providers.values()][0].state,"unknown");
});
test("QA-B04 retries transient child only, preserves successful root and caches recovered observation",async()=>{
 for(const status of [503,408,429]){
  const j=job(),s=createFAKEWorkerStorage(j),calls=[];
  const explorer=createDomainExplorer({storage:s,fetchPage:async url=>{
   calls.push(url);const root=new URL(url).pathname==="/",attempt=calls.filter(x=>x===url).length;
   return {status:root||attempt>1?200:status,headers:{"content-type":"text/html"},final_url:url,redirects:[],
    body:Buffer.from(root?'<title>Root</title><a href="/child">next</a>':"<title>Recovered</title>")};
  }});
  const first=await explorer.run(j);assert.equal(first.status,"succeeded");assert.equal(first.error.code,"pages_inaccessible");
  assert.equal((await explorer.run(j)).status,"succeeded");await explorer.run(j);
  assert.equal(calls.filter(u=>new URL(u).pathname==="/").length,1);
  assert.equal(calls.filter(u=>u.endsWith("/child")).length,2);
  assert.equal([...s.records.steps.values()].find(x=>x.original_url.endsWith("/child")).title,"Recovered");
 }
});
test("QA-B05 cycles/convergence survive collection and cached edge repair without HTTP",async()=>{
 for(const graph of [{"/":["/b"],"/b":["/"]},{"/":["/b","/c"],"/b":["/c"],"/c":[]},{"/":["/b"],"/b":["/c"],"/c":["/"]}]){
  const j=job(),s=createFAKEWorkerStorage(j);let calls=0;
  const explorer=createDomainExplorer({storage:s,fetchPage:async url=>{
   calls++;const path=new URL(url).pathname;
   return {status:200,headers:{"content-type":"text/html"},final_url:url,redirects:[],body:Buffer.from("<title>"+path+"</title>"+graph[path].map(to=>'<a href="'+to+'">next</a>').join(""))};
  }});
  await explorer.run(j);const expected=Object.values(graph).flat().length;
  assert.equal(s.records.edges.size,expected);assert.equal(calls,Object.keys(graph).length);
  const before=calls,titles=[...s.records.steps.values()].map(x=>x.title).sort();
  s.records.edges.clear();await explorer.run(j);
  assert.equal(calls,before);assert.equal(s.records.edges.size,expected);assert.deepEqual([...s.records.steps.values()].map(x=>x.title).sort(),titles);
 }
});
test("QA real worker plus Domain Explorer reports page-level failure as successful source with warning",async()=>{
 const { createIntelHandlers }=await import("../netlify/functions/_offer-intel-api.mjs");
 const { createFAKEStorage }=await import("./offer-intel-FAKE-storage.mjs");
 const { signedDispatch }=await import("../lib/offer-intel-dispatch.mjs");
 const storage=createFAKEStorage(),secret=randomUUID();let dispatch,workerRecords;
 const services={storage,secret,reader:{},capabilities:{domain_explorer:true},validateUrl:async()=>{},dispatch:async(id,nonce)=>{dispatch={id,nonce};},
 collectors:{domain_explorer:{run:async(row,ctx)=>{
   const workerStorage=createFAKEWorkerStorage(row);workerRecords=workerStorage.records;
   return createDomainExplorer({storage:workerStorage,fetchPage:async url=>({status:url.endsWith("/bad")?503:200,headers:{"content-type":"text/html"},final_url:url,redirects:[],
     body:Buffer.from(url.endsWith("/bad")?"Unavailable":'<title>Checkout</title>Payment method<a href="/bad">next</a>')})}).run(row,ctx);
 }}}};
 const api=createIntelHandlers({authenticate:async()=>({id:randomUUID()}),isAdmin:()=>true,getServices:()=>services});
 const created=await api.investigations(new Request("https://benchmarkinggrupofeg.site/create",{method:"POST",headers:{"Content-Type":"application/json"},
 body:JSON.stringify({url:"https://public.example/",idempotency_key:randomUUID(),options:{collect_ads:false,explore_domains:true}})}));
 assert.equal(created.status,202);
 await api.background(new Request("https://benchmarkinggrupofeg.site/background",{method:"POST",...signedDispatch(dispatch.id,dispatch.nonce,secret)}));
 const row=await storage.get(dispatch.id);assert.equal(row.status,"succeeded");assert.equal(row.sources.find(s=>s.name==="domain_explorer").status,"succeeded");
 assert.equal(row.sources.find(s=>s.name==="domain_explorer").error.code,"pages_inaccessible");
 assert.ok(row.counts.discoveries>0);assert.ok([...workerRecords.steps.values()].some(s=>s.verification==="verified"));
 assert.ok([...workerRecords.steps.values()].some(s=>s.verification==="inaccessible"));
});


test("QA unavailable PostgreSQL budget fails closed before provider POST without fallback",async()=>{
 let posts=0;
 const budget=createDailyBudget({storage:{budgetReserve:async()=>{throw Error("FAKE database outage");}}});
 const j=job(),s=createFAKEWorkerStorage(j);
 await assert.rejects(()=>createApifyCollector({storage:s,budget,token:randomUUID(),fetcher:async()=>{posts++;}}).run(j),
   e=>e.status===503&&e.code==="capability_unavailable");
 assert.equal(posts,0);
});


test("QA UI preserves succeeded source warning without a failed label",async()=>{
 const {readFileSync}=await import("node:fs"),vm=await import("node:vm");
 const ctx={};vm.createContext(ctx);
 vm.runInContext(readFileSync(new URL("../lib/offer-intel.js",import.meta.url),"utf8"),ctx);
 const job=ctx.OfferIntel.formatJob({status:"succeeded",sources:[{name:"domain_explorer",status:"succeeded",
   result_count:2,error:{code:"pages_inaccessible",message:"Aviso: 1 de 2 páginas ficaram inacessíveis."}}]});
 assert.equal(job.status,"succeeded");
 assert.equal(job.sources[0].statusLabel,"Concluída");
 assert.equal(job.sources[0].error.code,"pages_inaccessible");
 assert.match(job.sources[0].error.message,/1 de 2/);
});


test("QA v1.4 rejection permits only explicit retry with another reservation; no refund",async()=>{
 const j=job(),storage=createFAKEWorkerStorage(j),budgetStorage=createFAKEBudgetStorage();
 let posts=0;
 const collector=createApifyCollector({storage,budget:createDailyBudget({storage:budgetStorage}),token:randomUUID(),
   fetcher:async(_url,options)=>{
     assert.equal(options.method,"POST");posts++;
     return Response.json({error:{message:"FAKE billing rejection"}},{status:402});
   }});
 await assert.rejects(()=>collector.run(j),e=>e.code==="provider_rejected");
 assert.equal(posts,1);assert.equal(budgetStorage.reservations.size,1);
 assert.equal([...storage.records.providers.values()][0].state,"failed");
 // Second invocation models an explicit admin retry; production dispatch remains guarded by its lease.
 await assert.rejects(()=>collector.run(j),e=>e.code==="provider_rejected");
 assert.equal(posts,2);assert.equal(budgetStorage.reservations.size,2);
});
