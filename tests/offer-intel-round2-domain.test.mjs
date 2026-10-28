import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { classifyStep } from "../lib/offer-intel-classifier.mjs";
import { documentSignals, CONTENT_LINK_LIMIT } from "../lib/offer-intel-document.mjs";
import { createDomainExplorer } from "../lib/offer-intel-domain.mjs";
import { createFAKEWorkerStorage } from "./offer-intel-FAKE-worker-storage.mjs";
import { randomUUID } from "node:crypto";
const shopify=readFileSync(new URL("./fixtures/offer-intel-shopify-our-saga.html",import.meta.url),"utf8");
test("Round2 real Shopify fixture: legal/about pages unknown, Ingredients not quiz from navigation",()=>{
  assert.match(shopify,/<header\b/i);assert.match(shopify,/<footer\b/i);assert.match(shopify,/Take (?:the )?Quiz/i);
  for(const [path,title] of [["/pages/our-saga","Our Saga"],["/policies/privacy-policy","Privacy policy"],["/pages/ingredients","Ingredients"]]) {
    const html=shopify.replace(/<title>[\s\S]*?<\/title>/i,"<title>"+title+"</title>");
    const result=classifyStep({url:"https://primalviking.com"+path,title,html});
    assert.notEqual(result.kind,"quiz");assert.notEqual(result.kind,"checkout");
    if(path!=="/pages/ingredients")assert.equal(result.kind,"unknown");
  }
});
test("Round2 quiz/checkout require own heading, path or form, not a nav link or body CTA",()=>{
  const chrome='<header><h1>Take the Quiz</h1><a href="/quiz">Quiz</a></header><footer>Checkout <input autocomplete="cc-number"></footer>';
  const base={url:"https://example.com/products/powder",title:"Ingredients",html:chrome+'<main><h1>Ingredients</h1><a href="/quiz">Take the Quiz</a></main>'};
  assert.notEqual(classifyStep(base).kind,"quiz");assert.notEqual(classifyStep(base).kind,"checkout");
  assert.equal(classifyStep({...base,html:chrome+"<main><h1>Take the Quiz</h1></main>"}).kind,"quiz");
  assert.equal(classifyStep({...base,html:chrome+"<main><form><label>Question 1</label><input type=radio></form></main>"}).kind,"quiz");
  assert.equal(classifyStep({...base,html:'<main><form><input autocomplete="cc-number"></form></main>'}).kind,"checkout");
});
test("Round2 content CTAs prioritized; navigation/legal/social ignored, bounded six links",()=>{
  const html='<header><nav><a href="/nav-only">Take Quiz</a></nav></header><div class="menu-drawer"><a href="/drawer">Menu</a></div>'+
    '<main><a href="/policies/privacy-policy">Privacy</a><a href="https://instagram.com/store">Social</a>'+
    Array.from({length:30},(_,i)=>'<a href="/content/'+i+'">Details</a>').join("")+
    '<a class="button" href="/checkout">Buy now</a><a href="/pages/quiz">Start quiz</a></main><footer><a href="/footer-only">Footer</a></footer>';
  const doc=documentSignals(html,"https://example.com");
  assert.equal(doc.links.length,CONTENT_LINK_LIMIT);
  assert.match(doc.links[0],/checkout/);assert.match(doc.links[1],/quiz/);
  assert.ok(doc.links.every(u=>!/(nav-only|drawer|privacy|instagram|footer-only)/.test(u)));
});
test("Round2 inaccessible-only and actual deadline failure remain failed sources",async()=>{
  const job={id:randomUUID(),lease_token:randomUUID(),scope_key:"url:FAKE",seed_url:"https://example.com",seed_snapshot:{}};
  const storage=createFAKEWorkerStorage(job);
  const explorer=createDomainExplorer({storage,fetchPage:async url=>({status:503,final_url:url,headers:{},redirects:[],body:Buffer.from("unavailable")})});
  assert.equal((await explorer.run(job)).status,"failed");
  assert.equal((await explorer.run(job,{deadline:0})).status,"failed");
});
