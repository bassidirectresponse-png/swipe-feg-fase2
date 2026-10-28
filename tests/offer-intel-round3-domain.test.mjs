import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { randomUUID } from "node:crypto";
import { LIMITS,hash } from "../lib/offer-intel-core.mjs";
import { fetchPublicPage,pinnedRequest } from "../lib/offer-intel-url-safety.mjs";
import { createDomainExplorer } from "../lib/offer-intel-domain.mjs";
import { documentSignals } from "../lib/offer-intel-document.mjs";
import { createFAKEWorkerStorage } from "./offer-intel-FAKE-worker-storage.mjs";

test("Round3 real FAKE HTTP preserves bounded HTML prefix, evidence and observed-only classification",async t=>{
  const limit=LIMITS.html_bytes;
  const head='<title>Take the Quiz</title><main><h1>Take the Quiz</h1></main>';
  const prefix=head+' '.repeat(limit-Buffer.byteLength(head)-1);
  const bodies={
    '/observed':Buffer.from(prefix+'😀<h1>Checkout</h1>'),
    '/checkout':Buffer.from(' '.repeat(limit-17)+'<h1 data-label="quiz">Quiz</h1>'),
    '/hidden':Buffer.from('<script>'+ ' '.repeat(limit-8)+'</script><h1>Quiz</h1>')
  };
  const server=http.createServer((req,res)=>{
    const body=bodies[req.url];res.setHeader('Content-Type','text/html');
    if(req.url==='/observed')res.setHeader('Content-Length',body.length);
    res.write(body.subarray(0,limit-3));res.end(body.subarray(limit-3));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>{server.closeAllConnections();server.close();});
  const page=url=>fetchPublicPage(url,{lookup:async()=>[{address:'8.8.8.8',family:4}],
    transport:(url,addresses,options)=>{
      assert.equal(addresses[0].address,'8.8.8.8');
      const local=new URL(url);local.port=String(server.address().port);
      // Explicit test-only loopback injection; production validation is unchanged.
      return pinnedRequest(local,[{address:'127.0.0.1',family:4}],options);
    }});
  for(const path of Object.keys(bodies)) {
    const url='http://public.example'+path,response=await page(url);
    assert.equal(response.body.length,limit);assert.equal(response.truncated,true);
    const job={id:randomUUID(),lease_token:randomUUID(),scope_key:'offer:FAKE',seed_url:url,seed_snapshot:{}};
    const storage=createFAKEWorkerStorage(job);
    const explorer=createDomainExplorer({storage,fetchPage:page});
    assert.equal((await explorer.run(job)).status,'succeeded');
    const proof=[...storage.records.evidence.values()].find(e=>e.payload?.checkpoint);
    assert.equal(proof.payload.truncated,true);assert.deepEqual(proof.payload.warnings,['html_truncated']);
    assert.match(proof.payload.detail,/html_truncated/);
    const step=[...storage.records.steps.values()].find(s=>s.original_url===url);
    if(path==='/observed') {
      assert.equal(step.kind,'quiz');assert.equal(step.verification,'verified');
      assert.equal(proof.content_hash,hash(prefix)); // Half of the emoji never becomes U+FFFD.
    } else {
      assert.equal(step.verification,'inferred');assert.equal(step.kind,path==='/checkout'?'checkout':'unknown');
    }
  }
  assert.equal(documentSignals('<main><h1 data-label="quiz','http://public.example').text,'');
  assert.equal(documentSignals('<script>Quiz Checkout','http://public.example').text,'');
});
