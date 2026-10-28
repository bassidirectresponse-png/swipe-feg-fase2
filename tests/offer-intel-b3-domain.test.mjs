import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { randomUUID } from "node:crypto";
import { createDomainExplorer, extractPublicDocument } from "../lib/offer-intel-domain.mjs";
import { fetchPublicPage, pinnedRequest } from "../lib/offer-intel-url-safety.mjs";
import { createFAKEWorkerStorage } from "./offer-intel-FAKE-worker-storage.mjs";
const fixture=url=>({id:randomUUID(),lease_token:randomUUID(),scope_key:"url:FAKE",seed_url:url,seed_snapshot:{},options:{}});
async function FAKEHTTP(t,handler) {
  const requests=[],server=http.createServer((req,res)=>{requests.push({url:req.url,method:req.method,headers:req.headers});handler(req,res);});
  await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve);});
  t.after(()=>{server.closeAllConnections();server.close();});
  const port=server.address().port;
  // Explicit test-only injection maps a vetted public URL onto a local FAKE server.
  // Production has neither this mapping nor an env flag to permit loopback/private ports.
  const transport=(url,addresses,options)=>pinnedRequest(new URL("http://127.0.0.1:"+port+url.pathname+url.search),addresses,options);
  const lookup=async()=>[{address:"8.8.8.8",family:4}];
  return {requests,page:(url,options={})=>fetchPublicPage(url,{lookup,transport,...options})};
}
test("B3 Domain Explorer real HTTP pipeline: redirects, title/tech, graph, checkpoints and resume",async t=>{
  const fake=await FAKEHTTP(t,(req,res)=>{
    if(req.url==="/"){res.writeHead(302,{location:"/vsl"});res.end();return;}
    res.setHeader("content-type","text/html");
    if(req.url==="/vsl")res.end('<title>Oferta pública</title><video src="x"></video><script src="https://cdn.shopify.com/x"></script><a href="/checkout">Comprar</a><form method="post" action="/submit"><button>Enviar</button></form><a href="/logout">Sair</a>');
    else res.end("<title>Checkout</title>Payment method");
  });
  const job=fixture("http://public.example/"),storage=createFAKEWorkerStorage(job),updates=[];
  const explorer=createDomainExplorer({storage,fetchPage:fake.page});
  const result=await explorer.run(job,{checkpoint:async p=>updates.push(p)});
  assert.equal(result.status,"succeeded");assert.equal(result.result_count,2);
  assert.ok([...storage.records.steps.values()].some(s=>s.kind==="vsl"&&s.classification_basis.signals.length));
  assert.ok([...storage.records.steps.values()].some(s=>s.kind==="checkout"));
  assert.ok([...storage.records.steps.values()].some(s=>s.technologies.includes("Shopify")));
  assert.ok([...storage.records.edges.values()].some(e=>e.kind==="redirect"));
  assert.ok([...storage.records.edges.values()].some(e=>e.kind==="link"));
  assert.equal(storage.records.funnels.size,1);assert.equal(updates.length,2);
  assert.ok(fake.requests.every(r=>r.method==="GET"&&!r.headers.cookie&&!r.headers.authorization));
  assert.ok(fake.requests.every(r=>!["/submit","/logout"].includes(r.url)));
  const before=fake.requests.length,counts=structuredClone(result.counts);
  const resumed=await explorer.run(job);
  assert.equal(fake.requests.length,before);assert.deepEqual(resumed.counts,counts);
  assert.ok([...storage.records.evidence.values()].every(e=>!e.payload.html));
  assert.equal(storage.records.relations.size,1);
});
test("B3 Domain 401/403/login/CAPTCHA/timeout/non-HTML become inaccessible evidence",async t=>{
  const fake=await FAKEHTTP(t,(req,res)=>{
    if(req.url==="/slow")return;
    res.setHeader("content-type",req.url==="/pdf"?"application/pdf":"text/html");
    if(["/401","/403"].includes(req.url))res.statusCode=Number(req.url.slice(1));
    res.end(req.url==="/login"?'<title>Login</title><input type="password">':req.url==="/captcha"?"<title>Verify you are human</title>":"<title>Document</title>");
  });
  for(const [path,reason] of [["401","http_401"],["403","http_403"],["login","login"],["captcha","captcha"],["slow","timeout"],["pdf","unsupported_content_type"]]) {
    const job=fixture("http://public.example/"+path),storage=createFAKEWorkerStorage(job);
    await createDomainExplorer({storage,fetchPage:url=>fake.page(url,{timeoutMs:100})}).run(job);
    const step=[...storage.records.steps.values()][0];
    assert.equal(step.verification,"inaccessible",path);assert.equal(step.inaccessible_reason,reason,path);
  }
});
test("B3 Domain redirect to private IP is blocked before a second HTTP request",async t=>{
  const fake=await FAKEHTTP(t,(_req,res)=>{res.writeHead(302,{location:"http://169.254.169.254/latest"});res.end();});
  const job=fixture("http://public.example/"),storage=createFAKEWorkerStorage(job);
  await createDomainExplorer({storage,fetchPage:fake.page}).run(job);
  assert.equal(fake.requests.length,1);assert.equal([...storage.records.steps.values()][0].inaccessible_reason,"blocked_url");
  assert.equal([...storage.records.steps.values()][0].redirects[0].to,"http://169.254.169.254/latest");
});
test("B3 Domain bounded concurrency/pages/depth/links; cancellation fences persistence",async t=>{
  let active=0,max=0;
  const fake=await FAKEHTTP(t,(req,res)=>{
    active++;max=Math.max(max,active);res.setHeader("content-type","text/html");
    setTimeout(()=>{active--;res.end("<title>Landing</title>"+Array.from({length:300},(_,i)=>'<a href="/p'+i+'">x</a>').join(""));},5);
  });
  const job=fixture("http://public.example/"),storage=createFAKEWorkerStorage(job);
  const result=await createDomainExplorer({storage,fetchPage:fake.page}).run(job);
  assert.equal(result.result_count,20);assert.ok(max<=2);assert.equal(fake.requests.length,20);
  assert.ok([...storage.records.evidence.values()].every(e=>e.payload.links.length<=200&&e.payload.depth<=2));
  storage.cancel();await assert.rejects(()=>storage.persist({job_id:job.id,lease_token:job.lease_token,batch:{}}),e=>e.code==="conflict");
});
test("B3 document extraction ignores scripts/forms, unsafe URLs and labels classification evidence",()=>{
  const doc=extractPublicDocument('<title>Quiz &amp; saúde</title><script><a href="/evil">x</a></script><form action="/send"></form><a href="javascript:alert(1)">bad</a><a href="/quiz?a=1&amp;b=2">next</a>',"https://example.com/");
  assert.equal(doc.title,"Quiz & saúde");assert.deepEqual(doc.links,["https://example.com/quiz?a=1&b=2"]);
});
test("B3 Domain explores persisted Apify destinations even without an initial URL",async t=>{
  const fake=await FAKEHTTP(t,(_req,res)=>{res.setHeader("content-type","text/html");res.end("<title>Public landing</title>");});
  const job=fixture(null),storage=createFAKEWorkerStorage(job);
  storage.records.evidence.set("FAKE-provider-proof",{source:"apify",evidence_key:"apify:domain:public.example",source_url:"http://public.example/offer",payload:{}});
  const result=await createDomainExplorer({storage,fetchPage:fake.page}).run(job);
  assert.equal(result.result_count,1);assert.equal(fake.requests[0].url,"/offer");
});
