import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {extractPublicDocument,createDomainExplorer} from '../lib/offer-intel-domain.mjs';
import {documentSignals} from '../lib/offer-intel-document.mjs';
import {createFAKEWorkerStorage} from './offer-intel-FAKE-worker-storage.mjs';
const joy=readFileSync(new URL('./fixtures/offer-intel-joymode.html',import.meta.url),'utf8');
test('Round4 real public Joymode fixture is commercial, not offcanvas login barrier',()=>{
  assert.match(joy,/offcanvas-login/);assert.match(joy,/type="password"/);
  const doc=extractPublicDocument(joy,'https://www.tryjoymode.com/');
  assert.equal(doc.inaccessible_reason,null);assert.equal(doc.title,"JOYMODE Men's Sexual Wellness");
  assert.doesNotMatch(doc.forms,/type="password"/);
});
test('Round4 login barriers versus ancillary forms and navigation',()=>{
  const form='<form action="/account/login"><input type="password"><button>Submit</button></form>';
  for(const wrapper of ['header','nav','footer','dialog'])assert.equal(extractPublicDocument('<'+wrapper+'>'+form+'</'+wrapper+'><main><h1>Product</h1></main>','https://shop.example/products/a').inaccessible_reason,null);
  for(const attr of ['class="modal"','class="cart-drawer"','role="dialog"','hidden','aria-hidden="true"','style="display:none"'])assert.equal(extractPublicDocument('<div '+attr+'>'+form+'</div><main>Product</main>','https://shop.example/').inaccessible_reason,null);
  assert.equal(extractPublicDocument('<main><h1>Product</h1><button>Add to cart</button>'+form+'</main>','https://shop.example/').inaccessible_reason,null);
  for(const path of ['/password','/login','/account/login'])assert.equal(extractPublicDocument('<title>Store</title><main>'+form+'</main>','https://shop.example'+path).inaccessible_reason,'login');
  const shopifyPassword='<title>Store – Opening soon</title><main><h1>Opening soon</h1><form method="post" action="/password"><input type="hidden" name="form_type" value="storefront_password"><input type="password" name="password"><button>Enter</button></form></main>';
  assert.equal(extractPublicDocument(shopifyPassword,'https://shop.example/password').inaccessible_reason,'login');
  assert.equal(extractPublicDocument('<main><h1>Sign in</h1></main>','https://shop.example/').inaccessible_reason,'login');
  assert.equal(extractPublicDocument('<main>'+form+'</main>','https://shop.example/').inaccessible_reason,'login');
});
test('Round4 excludes Cloudflare technical and account links, decodes observed entities',()=>{
  const doc=documentSignals('<title>Men&#39;s &amp; Health &ndash; Store</title><main><h1>A&#x2014;B &ldquo;C&rdquo;</h1><a href="/cdn-cgi/l/email-protection">Buy now</a><a href="/a/account/login">Account</a><a href="/products/a">Buy now</a></main>','https://shop.example/');
  assert.equal(doc.title,"Men's & Health – Store");assert.equal(doc.h1,'A—B “C”');assert.deepEqual(doc.links,['https://shop.example/products/a']);
});
test('Round4 persists decoded title/label and detects final Shopify password redirect',async()=>{
  for(const blocked of [false,true]){
    const job={id:randomUUID(),lease_token:randomUUID(),scope_key:'offer:FAKE',seed_url:'https://shop.example/',seed_snapshot:{}};
    const storage=createFAKEWorkerStorage(job);
    const result=await createDomainExplorer({storage,fetchPage:async url=>({status:200,headers:{'content-type':'text/html'},final_url:blocked?url+'password':url,redirects:blocked?[{from:url,to:url+'password',status:302}]:[],body:Buffer.from('<title>A &amp; B &ndash; Men&#39;s</title><main><h1>Product</h1></main>')})}).run(job);
    assert.equal(result.status,blocked?'failed':'succeeded');
    const step=[...storage.records.steps.values()].find(s=>s.title);
    assert.equal(step.title,"A & B – Men's");assert.equal(step.label,step.title);
    assert.equal(step.inaccessible_reason,blocked?'login':null);
  }
});
