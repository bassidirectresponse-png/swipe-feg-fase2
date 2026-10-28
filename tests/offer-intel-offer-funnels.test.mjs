import test from "node:test";
import assert from "node:assert/strict";
import { createIntelHandlers } from "../netlify/functions/_offer-intel-api.mjs";
import { createFAKEStorage } from "./offer-intel-FAKE-storage.mjs";
import { offerFunnels } from "../lib/offer-intel-records.mjs";
const ID="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",PRODUCT="https://ultimapeak.com/products/ultimapeak-daily-gummies";
const funnel=(id,origin,created_at)=>({id,investigation_id:id,title:id,origin_url:origin,final_url:origin,steps_count:1,created_at});
// Two investigations of the same offer: each one snapshots the product page and an ad-landing quiz.
const FUNNELS=[funnel("new-product",PRODUCT,"2026-10-28T12:42:00Z"),funnel("new-quiz","https://shop.ultimapeak.com/pages/quiz-funnel-v2","2026-10-28T12:41:00Z"),
  funnel("old-product",PRODUCT+"/","2026-10-28T06:42:00Z"),funnel("old-quiz","https://shop.ultimapeak.com/pages/quiz-funnel-v2","2026-10-28T06:41:00Z")];
const snapshot=data=>({data:{kind:"brandsvalidated",...data}});
test("offer map keeps only registered product pages, newest snapshot per entry",()=>{
  const out=offerFunnels(FUNNELS,snapshot({dominios:[{nome:"Página principal",linkDominio:"https://www.ultimapeak.com/products/ultimapeak-daily-gummies"}]}));
  assert.deepEqual(out.map(f=>f.id),["new-product"]);
});
test("offer without registered URLs still deduplicates repeated investigations",()=>{
  assert.deepEqual(offerFunnels(FUNNELS,snapshot({})).map(f=>f.id),["new-product","new-quiz"]);
});
test("funnels endpoint and summary count use the registered products of the offer",async()=>{
  const storage=createFAKEStorage();
  storage.read=async q=>q.resource==="summary"?{active_job:null,last_job:null,counts:{new:0,review:0,confirmed:0,ignored:0,relations_pending:0,funnels:4},latest_at:null}:{items:FUNNELS};
  const handlers=createIntelHandlers({authenticate:async()=>({id:ID}),isAdmin:()=>true,rateLimit:async()=>({allowed:true}),
    getServices:()=>({storage,capabilities:{},reader:{getOffer:async()=>({id:ID,data:{kind:"brandsvalidated",dominios:[{linkDominio:PRODUCT}]}})}})});
  const req=r=>new Request("https://benchmarkinggrupofeg.site/"+r);
  const list=await (await handlers.funnels(req("funnels?offer_id="+ID+"&offer_ref_kind=offer"))).json();
  assert.deepEqual(list.items.map(f=>f.id),["new-product"]);assert.equal(list.next_cursor,null);
  const summary=await (await handlers.summary(req("summary?offer_id="+ID+"&offer_ref_kind=offer"))).json();
  assert.equal(summary.counts.funnels,1);
});
