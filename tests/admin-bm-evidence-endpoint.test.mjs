import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import handler from "../netlify/functions/admin-bm-evidence.mjs";

const url="https://benchmarkinggrupofeg.site/.netlify/functions/admin-bm-evidence?ref=legacy:ultima-peak/print-01.jpeg";

test("print legado da BM exige sessão admin e conserva os bytes originais",async t=>{
  const originalFetch=globalThis.fetch;t.after(()=>{globalThis.fetch=originalFetch;});
  assert.equal((await handler(new Request(url))).status,401);
  const request=new Request(url,{headers:{Authorization:"Bearer test-token",Origin:"https://benchmarkinggrupofeg.site"}});
  globalThis.fetch=async()=>Response.json({id:"ordinary-user",email:"ordinary@example.com"});
  assert.equal((await handler(request)).status,403);
  globalThis.fetch=async()=>Response.json({id:"ff9e002e-7ed1-4bc3-8571-18ffcb0c95c3",email:"adminswipefeg@swipefeg.app"});
  const response=await handler(request);
  assert.equal(response.status,200);
  assert.equal(response.headers.get("cache-control"),"private, no-store");
  const original=await readFile(new URL("../assets/ultima-peak/print-01.jpeg",import.meta.url));
  assert.deepEqual(Buffer.from(await response.arrayBuffer()),original);
  assert.equal((await handler(new Request(url.replace("print-01.jpeg","../print-01.jpeg"),{headers:request.headers}))).status,400);
});

test("build público não inclui os prints nem a função privada",async()=>{
  const {existsSync}=await import("node:fs");
  assert.equal(existsSync(new URL("../dist/assets/ultima-peak/print-01.jpeg",import.meta.url)),false);
  assert.equal(existsSync(new URL("../dist/netlify/functions/admin-bm-evidence.mjs",import.meta.url)),false);
});
