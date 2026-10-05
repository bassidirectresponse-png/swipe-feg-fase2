import assert from "node:assert/strict";
import test from "node:test";
import handler from "../netlify/functions/admin-offer-drafts.mjs";

const url="https://benchmarkinggrupofeg.site/.netlify/functions/admin-offer-drafts";

test("rascunhos da BM são inacessíveis sem sessão administrativa",async t=>{
  const originalFetch=globalThis.fetch;t.after(()=>{globalThis.fetch=originalFetch;});
  assert.equal((await handler(new Request(url))).status,401);
  const request=new Request(url,{headers:{Authorization:"Bearer test-token",Origin:"https://benchmarkinggrupofeg.site"}});
  globalThis.fetch=async()=>Response.json({id:"ordinary-user",email:"ordinary@example.com"});
  assert.equal((await handler(request)).status,403);
  const foreign=new Request(url,{headers:{Authorization:"Bearer test-token",Origin:"https://other.example"}});
  assert.equal((await handler(foreign)).status,403);
});
