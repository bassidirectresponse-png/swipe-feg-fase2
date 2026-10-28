import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { identityKey, normalizeUrl, normalizeOptions, pagination, stableJson } from "../lib/offer-intel-core.mjs";
import { resolveReference, createReferenceReader } from "../lib/offer-intel-reference.mjs";
import { isGlobalAddress, resolvePublicUrl, fetchPublicPage } from "../lib/offer-intel-url-safety.mjs";
import { classifyStep } from "../lib/offer-intel-classifier.mjs";
import { createSupabaseStorage } from "../lib/offer-intel-storage.mjs";

const ID="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
test("identidades preservam Page ID como string e URLs funcionais; normalização versionada",()=>{
  assert.equal(identityKey("page","000123"),"meta:page:000123");
  assert.equal(identityKey("domain","https://EXAMPLE.com./a"),"domain:example.com");
  assert.equal(normalizeUrl("https://EXAMPLE.com:443/a#x").key,normalizeUrl("https://example.com/a").key);
  assert.notEqual(normalizeUrl("https://example.com/a?x=1&x=2").key,normalizeUrl("https://example.com/a?x=2&x=1").key);
  assert.notEqual(normalizeUrl("https://example.com/A").key,normalizeUrl("https://example.com/a").key);
  assert.equal(normalizeUrl("https://example.com").version,1);
  assert.equal(stableJson({b:1,a:2}),stableJson({a:2,b:1}));
  assert.throws(()=>normalizeOptions({collect_ads:"true"}));
  assert.throws(()=>pagination(new URLSearchParams({cursor:"bad"})));
});
test("referência real versus ID somente local; draft válido e patch precisam de origem existente",async()=>{
  const FAKE_reader={getOffer:async()=>null,getDraft:async()=>null};
  await assert.rejects(()=>resolveReference({offer_id:ID,offer_ref_kind:"offer"},FAKE_reader),e=>e.code==="offer_not_found");
  await assert.rejects(()=>resolveReference({offer_id:ID,offer_ref_kind:"admin_draft"},FAKE_reader),e=>e.code==="offer_not_found");
  FAKE_reader.getOffer=async()=>({id:ID,data:{kind:"criativo"}});
  await assert.rejects(()=>resolveReference({offer_id:ID,offer_ref_kind:"offer"},FAKE_reader));
  FAKE_reader.getOffer=async()=>({id:ID,data:{nomeOferta:"Produto"}});
  const offer=await resolveReference({offer_id:ID,offer_ref_kind:"offer",url:"https://example.com"},FAKE_reader);
  assert.equal(offer.scope_key,"offer:"+ID);
  assert.equal(offer.seed_url,"https://example.com/");
  FAKE_reader.getDraft=async()=>({target_offer_id:ID,new_offer:true,data_patch:{kind:"brandsvalidated",nomeOferta:"P",nicho:"N"}});
  const draft=await resolveReference({offer_id:ID,offer_ref_kind:"admin_draft"},FAKE_reader);
  assert.equal(draft.scope_key,"admin_draft:"+ID); assert.match(draft.seed_snapshot.draft_hash,/^[a-f0-9]{64}$/);
  FAKE_reader.getDraft=async()=>({target_offer_id:ID,new_offer:false,data_patch:{}});
  FAKE_reader.getOffer=async()=>null;
  await assert.rejects(()=>resolveReference({offer_id:ID,offer_ref_kind:"admin_draft"},FAKE_reader));
});
test("SSRF bloqueia redes privadas/especiais, IPv6 e IP mapeado",async()=>{
  for(const ip of ["127.0.0.1","10.1.2.3","169.254.169.254","100.64.0.1","0.0.0.0","192.0.2.1","224.0.0.1","::1","::","fc00::1","fe80::1","::ffff:127.0.0.1","::ffff:7f00:1","::ffff:a00:1","2001:db8::1","2002:0a00:1::","3fff::1"]) assert.equal(isGlobalAddress(ip),false,ip);
  for(const ip of ["8.8.8.8","1.1.1.1","2606:4700:4700::1111","::ffff:8.8.8.8"]) assert.equal(isGlobalAddress(ip),true,ip);
  for(const url of ["http://localhost","http://10.0.0.1","http://169.254.169.254","http://[::ffff:127.0.0.1]","http://2130706433","https://example.com:8080","file:///etc/passwd","https://u:p@example.com"]) await assert.rejects(()=>resolvePublicUrl(url),e=>["blocked_url","invalid_url"].includes(e.code));
});
test("redirect para privado é recusado antes do segundo request; conexão usa o IP validado",async()=>{
  let calls=0, dns=0;
  const FAKE_lookup=async()=>{dns++;return [{address:"8.8.8.8",family:4}];};
  const FAKE_transport=async(url,addresses)=>{
    calls++; assert.equal(addresses[0].address,"8.8.8.8");
    return {status:302,headers:{location:"http://169.254.169.254/latest/meta-data"}};
  };
  await assert.rejects(()=>fetchPublicPage("https://public.example",{lookup:FAKE_lookup,transport:FAKE_transport}),e=>e.code==="blocked_url");
  assert.equal(calls,1); assert.equal(dns,1);
  let hop=0;
  await assert.rejects(()=>fetchPublicPage("https://public.example",{lookup:async()=>[{address:++hop===1?"8.8.8.8":"10.0.0.1",family:4}],transport:async()=>({status:302,headers:{location:"/again"}})}),e=>e.code==="blocked_url");
});
test("classificação registra fundamento e distingue inferência de acesso bloqueado",()=>{
  assert.equal(classifyStep({url:"https://example.com/checkout"}).verification,"inferred");
  const step=classifyStep({html:"<video src='public.mp4'></video>"});
  assert.equal(step.kind,"vsl"); assert.equal(step.classification_basis.signals[0].source,"document");
  assert.equal(classifyStep({text:"Upgrade your order"}).kind,"upsell");
  assert.equal(classifyStep({http_status:403}).verification,"inaccessible");
});
test("storage REST chama somente tabelas/RPCs novas; referência só lê offers; erros não vazam secrets",async()=>{
  const calls=[];
  const FAKE_fetch=async(url,options)=>{calls.push({url:String(url),options});return Response.json(String(url).includes("/offers?")?[{id:ID,data:{}}]:[]);};
  const storage=createSupabaseStorage({url:"https://example.invalid",serviceKey:"FAKE-service",fetcher:FAKE_fetch});
  await storage.create({actor_id:ID}); await storage.action({}); await storage.claim({}); await storage.checkpoint({}); await storage.review({});
  await storage.get(ID); await storage.list({limit:25});
  await createReferenceReader({supabaseUrl:"https://example.invalid",serviceKey:"FAKE-service",fetcher:FAKE_fetch}).getOffer(ID);
  assert.ok(calls.every(c=>c.url.includes("/offer_intel_")||c.options.method===undefined));
  assert.ok(calls.filter(c=>c.url.includes("/offers?")).every(c=>!c.options.method||c.options.method==="GET"));
  const bad=createSupabaseStorage({url:"https://example.invalid",serviceKey:"FAKE",fetcher:async()=>Response.json({message:"SECRET"},{status:500})});
  await assert.rejects(()=>bad.get(ID),e=>e.code==="capability_unavailable"&&!e.message.includes("SECRET"));
});
test("migration aditiva isola tabelas internas e review CAS; não executa alterações no legado",async()=>{
  const sql=await readFile(new URL("../supabase/migrations/202610270001_offer_intelligence.sql",import.meta.url),"utf8");
  assert.doesNotMatch(sql,/(?:insert into|update|alter table|delete from)\s+(?:public\.)?(?:offers|admin_offer_drafts)\b/i);
  assert.match(sql,/expected_version/); assert.match(sql,/for update/);
  assert.match(sql,/unique \(scope_key,type,identity_key\)/);
  assert.match(sql,/where status in \('queued','running'\)/);
  for(const rpc of ["create","action","claim","checkpoint","review"]) assert.ok(sql.includes("revoke execute on function public.offer_intel_"+rpc+"(jsonb) from public, anon, authenticated"));
  assert.match(sql,/revoke all on public.offer_intel_requests, public.offer_intel_dispatches from public, anon, authenticated/);
});
