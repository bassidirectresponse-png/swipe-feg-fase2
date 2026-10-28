import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {apifyRecords} from '../lib/offer-intel-apify.mjs';
import {publicDiscovery} from '../lib/offer-intel-public.mjs';
import {discoveryDisplay,startedAt} from '../lib/offer-intel-display.mjs';
import {createFAKEWorkerStorage} from './offer-intel-FAKE-worker-storage.mjs';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/offer-intel-apify-display-FAKE.json',import.meta.url),'utf8'));
const job=()=>({id:randomUUID(),lease_token:randomUUID(),scope_key:'offer:FAKE',created_at:'2026-10-28T00:00:00Z'});
const at='2026-10-28T00:00:00Z';
test('R5 realistic identified FAKE Apify snake/camel fields flatten through allowlist',()=>{
  const rows=apifyRecords(job(),fixture,'FAKErun',[],at).discoveries;
  const ad=publicDiscovery(rows.find(d=>d.identity_key==='meta:ad:111111111'));
  assert.equal(ad.ad_text,'Feel better & discover your daily routine.');
  assert.equal(ad.landing_domain,'wellness.example');assert.equal(ad.landing_url,fixture[0].snapshot.link_url);
  assert.equal(ad.started_at,new Date(fixture[0].start_date*1000).toISOString());
  assert.equal(ad.cta_text,'Shop Now');assert.equal(ad.display_format,'video');
  assert.deepEqual(ad.platforms,['facebook','instagram']);assert.equal(ad.page_picture_url,fixture[0].snapshot.page_profile_picture_url);
  const second=publicDiscovery(rows.find(d=>d.identity_key==='meta:ad:333333333'));
  assert.equal(second.started_at,'2026-10-26T13:15:00.000Z');assert.equal(second.cta_text,'Learn more');
  const page=publicDiscovery(rows.find(d=>d.type==='page'));
  assert.equal(page.page_picture_url,ad.page_picture_url);assert.ok(!('ads_found' in page)); // Derived from stored scope, not this batch.
});
test('R5 missing and malicious values are omitted, text bounded and dates explicit',()=>{
  assert.deepEqual(discoveryDisplay('ad',{}),{});
  const projected=discoveryDisplay('ad',{ad_text:'<script>secret()</script>&lt;b&gt;'+ 'é'.repeat(600)+'&lt;/b&gt;',cta_text:'<i>Buy</i>',
    landing_url:'javascript:alert(1)',landing_domain:'forged',started_at:'not a date',platforms:['FACEBOOK','unknown',{}],display_format:'unknown',page_picture_url:'https://fbcdn.net.evil.example/a',secret:'PRIVATE'});
  assert.equal(projected.ad_text.length,500);assert.doesNotMatch(projected.ad_text,/[<>]|secret/);assert.equal(projected.cta_text,'Buy');
  assert.deepEqual(projected.platforms,['facebook']);assert.ok(!('landing_domain' in projected));assert.ok(!('secret' in projected));
  for(const url of ['http://127.0.0.1/a','https://u:p@example.com','https://example.com/?access_token=PRIVATE','ftp://example.com'])assert.ok(!('landing_url' in discoveryDisplay('ad',{landing_url:url})));
  for(const date of [null,{},'',0,'2026-02-30'])assert.equal(startedAt(date),null);
  assert.equal(startedAt('2026-10-27'),'2026-10-27T00:00:00.000Z');
  assert.equal(discoveryDisplay('page',{ads_found:null}).ads_found,undefined);assert.equal(discoveryDisplay('page',{ads_found:0}).ads_found,0);
});
test('R5 FAKE persistence merges recollections and counts distinct ads across scope, preserves reviews',async()=>{
  const j=job(),s=createFAKEWorkerStorage(j),fence={job_id:j.id,lease_token:j.lease_token};
  s.records.discoveries.set('prior',{id:'prior',scope_key:j.scope_key,type:'ad',data:{page_id:'222222222'}});
  s.records.discoveries.set('other',{id:'other',scope_key:'offer:OTHER',type:'ad',data:{page_id:'222222222'}});
  const batch=apifyRecords(j,[...fixture,fixture[0]],'FAKErun',[],at);
  await s.persist({...fence,batch});
  const page=[...s.records.discoveries.values()].find(d=>d.type==='page');assert.equal(page.data.ads_found,3);
  page.status='confirmed';page.version=2;
  await s.persist({...fence,batch:apifyRecords(j,[{ad_archive_id:'111111111',page_id:'222222222',snapshot:{}}],'FAKErun',[],at)});
  assert.equal(page.data.ads_found,3);
  const storedPage=s.records.discoveries.get(page.id);assert.equal(storedPage.status,'confirmed');assert.equal(storedPage.version,2);
  const ad=[...s.records.discoveries.values()].find(d=>d.identity_key==='meta:ad:111111111');
  assert.equal(publicDiscovery(ad).ad_text,'Feel better & discover your daily routine.');
});
test('R5 FAKE persistence links only the latest funnel of the matching domain and scope',async()=>{
  const j=job(),s=createFAKEWorkerStorage(j),fence={job_id:j.id,lease_token:j.lease_token};
  for(const [scope,created,id] of [[j.scope_key,'2026-10-25',randomUUID()],[j.scope_key,'2026-10-27',randomUUID()],['other','2026-10-29',randomUUID()]]) {
    const step=randomUUID();s.records.steps.set(step,{id:step,original_url:'https://wellness.example/'});
    s.records.funnels.set(id,{id,scope_key:scope,created_at:created,start_step_id:step});
  }
  const expected=[...s.records.funnels.values()][1].id;
  await s.persist({...fence,batch:apifyRecords(j,fixture,'FAKErun',[],at)});
  const domain=[...s.records.discoveries.values()].find(d=>d.type==='domain');assert.equal(publicDiscovery(domain).funnel_id,expected);
  assert.deepEqual(discoveryDisplay('domain',{funnel_id:'local-id'}),{});
});
