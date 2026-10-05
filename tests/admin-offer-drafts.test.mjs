import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
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

test("novas ofertas privadas não entram no banco público nem no cache local",async()=>{
  const backend=await readFile(new URL("../netlify/functions/admin-offer-drafts.mjs",import.meta.url),"utf8");
  const html=await readFile(new URL("../index.html",import.meta.url),"utf8");
  assert.match(backend,/new_offer:newOffer/);
  assert.match(backend,/newOffer&&\(body\.data_patch\.kind!=="brandsvalidated"/);
  assert.match(html,/offers=offers\.filter\(row=>!row\.adminPrivate\)/);
  assert.match(html,/offers\.push\(\{id:draft\.target_offer_id,created_at:draft\.updated_at,data:draft\.data_patch,adminPrivate:true\}\)/);
  assert.match(html,/offers\.filter\(o=>!o\.adminPrivate\)\.map/);
  assert.match(html,/editingId&&offers\.find\(row=>row\.id===editingId\)\?\.adminPrivate/);
  assert.match(html,/if\(row&&!row\.adminPrivate\)await syncOfferCreatives\(row\)/);
});
