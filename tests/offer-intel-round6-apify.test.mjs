import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {apifyPlan,apifyRecords,createApifyCollector} from '../lib/offer-intel-apify.mjs';
import {publicDiscovery} from '../lib/offer-intel-public.mjs';
import {publicLimits} from '../lib/offer-intel-limits.mjs';
import {createFAKEWorkerStorage} from './offer-intel-FAKE-worker-storage.mjs';
import {hash,stableJson} from '../lib/offer-intel-core.mjs';
const job=()=>({id:randomUUID(),lease_token:randomUUID(),scope_key:'offer:FAKE',seed_snapshot:{data:{nomeOferta:'FAKE Brand',bibliotecas:[{link:'https://www.facebook.com/ads/library/?view_all_page_id=123'}],dominios:[{linkDominio:'https://shop.brand.example'}]}}});
test('R6 Apify plan prioritizes pages, registrable domains, name, exposes 6x30 limits',()=>{
 const j=job(),plan=apifyPlan(j),urls=plan.actorInput.startUrls.map(u=>new URL(u.url));
 assert.equal(urls[0].searchParams.get('view_all_page_id'),'123');assert.equal(urls[1].searchParams.get('q'),'brand.example');assert.equal(urls[2].searchParams.get('q'),'FAKE Brand');
 assert.ok(urls.every(u=>u.searchParams.get('sort_data[mode]')==='total_impressions'));assert.equal(plan.actorInput.resultsLimit,30);
 j.seed_snapshot.data.bibliotecas=Array.from({length:10},(_,i)=>({link:'https://www.facebook.com/ads/library/?view_all_page_id='+(100+i)}));
 assert.equal(apifyPlan(j).actorInput.startUrls.length,6);assert.equal(apifyPlan(j).runOptions.maxItems,180);
 assert.equal(publicLimits().apify.max_queries,6);assert.equal(publicLimits().apify.results_per_query,30);
});
test('R6 two-hop Apify caps queries/results, reserves each run and replays datasets without new POST',async()=>{
 const j=job(),storage=createFAKEWorkerStorage(j),inputs=[],reservations=new Set();let posts=0;
 const items=Array.from({length:230},(_,i)=>({adArchiveId:String(1000+i),pageId:'123',snapshot:{link_url:'https://dest'+i+'.example/'}}));
 const fetcher=async(url,o)=>{
  if(o.method==='POST'){posts++;inputs.push(JSON.parse(o.body));assert.equal(reservations.size,posts);return Response.json({data:{id:'run'+posts,status:'SUCCEEDED',defaultDatasetId:'ds'+posts}});}
  if(url.includes('actor-runs')){const id=url.match(/actor-runs\/(run\d)/)[1];return Response.json({data:{id,status:'SUCCEEDED',defaultDatasetId:id.replace('run','ds')}});}
  return Response.json(url.includes('ds2')?items.map(r=>({...r,adArchiveId:String(Number(r.adArchiveId)+1000)})):items);
 };
 const collector=createApifyCollector({storage,token:randomUUID(),fetcher,budget:{reserve:async key=>{reservations.add(key);return {};}}});
 await collector.run(j);assert.equal(posts,2);assert.equal(inputs.reduce((n,p)=>n+p.startUrls.length,0),6);
 assert.ok(inputs.every(p=>p.resultsLimit===30));assert.ok(inputs[1].startUrls.every(u=>new URL(u.url).searchParams.get('q').startsWith('dest')));
 assert.equal([...storage.records.discoveries.values()].filter(d=>d.type==='ad').length,180);
 await collector.run(j);assert.equal(posts,2);assert.equal(reservations.size,2);
});
test('R6 a full initial six-query plan never starts a second hop',async()=>{
 const j=job();j.seed_snapshot.data.bibliotecas=Array.from({length:6},(_,i)=>({link:'https://www.facebook.com/ads/library/?view_all_page_id='+(100+i)}));
 const storage=createFAKEWorkerStorage(j);let posts=0;
 await createApifyCollector({storage,token:randomUUID(),budget:{reserve:async()=>({})},fetcher:async(_u,o)=>o.method==='POST'?(posts++,Response.json({data:{id:'run',status:'SUCCEEDED',defaultDatasetId:'ds'}})):Response.json([{adArchiveId:'1',pageId:'100',snapshot:{link_url:'https://new.example/'}}])}).run(j);
 assert.equal(posts,1);
});
test('R6 legacy unknown input restores the original query key instead of starting expanded collection',async()=>{
 const j=job(),storage=createFAKEWorkerStorage(j),old=apifyPlan(j).actorInput;old.startUrls=old.startUrls.slice(0,2);old.resultsLimit=15;
 const key=hash(stableJson(old));await storage.provider({job_id:j.id,lease_token:j.lease_token,query_key:key,request:{input:old}});
 await storage.provider({job_id:j.id,lease_token:j.lease_token,query_key:key,expected_state:'reserved',patch:{state:'unknown'}});
 let posts=0;
 await assert.rejects(()=>createApifyCollector({storage,token:randomUUID(),budget:{reserve:async()=>{throw Error('No reserve');}},fetcher:async(_u,o)=>{if(o.method==='POST')posts++;return Response.json({data:{items:[]}});}}).run(j));
 assert.equal(posts,0);assert.equal(storage.records.providers.size,1);
});
test('R6 observed collation count, days active and videos flatten without invented metrics or sensitive URLs',()=>{
 const rows=apifyRecords(job(),[{adArchiveId:'1',pageId:'123',start_date_formatted:'2026-10-20',collation_count:4,snapshot:{videos:[{video_hd_url:'https://video.xx.fbcdn.net/ad.mp4',video_preview_image_url:'https://scontent.xx.fbcdn.net/thumb.jpg'}]}},{adArchiveId:'2',snapshot:{}}],'FAKE',[],'2026-10-28T00:00:00Z').discoveries;
 const ad=publicDiscovery(rows.find(r=>r.identity_key==='meta:ad:1'));assert.equal(ad.collation_count,4);assert.equal(ad.days_active,8);assert.match(ad.video_url,/ad.mp4$/);assert.match(ad.video_preview_url,/thumb.jpg$/);assert.match(ad.ad_library_url,/id=1$/);
 const absent=publicDiscovery(rows.find(r=>r.identity_key==='meta:ad:2'));assert.ok(!('days_active' in absent));assert.ok(!('collation_count' in absent));
 assert.ok(!('video_url' in publicDiscovery({type:'ad',data:{video_url:'https://cdn.example/a?accessToken=FAKE'}})));
});
