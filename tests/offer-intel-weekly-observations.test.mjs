import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAd, groupCreatives, selectProducts, buildProductRanking, publicAd, scoreCreative } from '../lib/offer-intel-weekly.mjs';
import { runCreativeReviewSlice } from '../lib/offer-intel-weekly-worker.mjs';
import { createFAKEWeeklyStorage, createFAKEWeeklyApify } from './offer-intel-weekly-FAKE-storage.mjs';
const oldAt='2026-10-28T01:00:00.000Z', newAt='2026-11-10T01:00:00.000Z';
const offer={id:'10000000-0000-4000-8000-000000000001',data:{kind:'brandsvalidated',nomeOferta:'Acme - Omega',bibliotecas:[{link:'https://www.facebook.com/ads/library/?view_all_page_id=123'}]}};
const item=(id='42', extra={})=>({adArchiveId:id,pageId:'123',startDate:Math.floor(Date.parse('2026-10-20T01:00:00Z')/1000),collationCount:2,snapshot:{body:{text:'Acme Omega is the creative being observed for this product.'}},...extra});
const analysis=Object.fromEntries(['gancho','angulo','promessa','mecanismo','formato','cta','publico','por_que_funciona'].map(k=>[k,'Copy observada']));

test('normalization captures the collection date and deduplication chooses the newest observation independent of dataset order',()=>{
  const old=normalizeAd(item(),new Date(oldAt)), latest=normalizeAd(item('42',{collationCount:5}),new Date(newAt));
  assert.equal(old.observed_at,oldAt);
  for(const ads of [[old,latest],[latest,old]]){
    const [group]=groupCreatives(ads);
    assert.equal(group.days_active,21);assert.equal(group.repetitions,5);assert.equal(group.observed_at,newAt);
    const {rows}=buildProductRanking({ads,products:selectProducts({offers:[offer]})});
    assert.equal(rows[0].days_active,21);assert.equal(rows[0].repetitions,5);
  }
});

test('creative observations spanning multiple collections expose their range',()=>{
  const [group]=groupCreatives([normalizeAd(item('42'),new Date(oldAt)),normalizeAd(item('43'),new Date(newAt))]);
  assert.equal(group.observed_from,oldAt);assert.equal(group.observed_at,newAt);assert.equal(group.mixed_observations,true);
});

test('new observation metadata replaces archived metadata, and changed numeric claims invalidate retained analysis',()=>{
  const products=selectProducts({offers:[offer]});
  const old=buildProductRanking({ads:[normalizeAd(item(),new Date(oldAt))],products}).rows[0];
  old.media={archived:true,thumb_url:'https://saved.example/42.jpg',observed_at:oldAt,observed_from:oldAt};old.analysis=analysis;
  const same=buildProductRanking({ads:[normalizeAd(item(),new Date(oldAt))],products,existingRows:[old]}).rows[0];
  assert.deepEqual(same.analysis,analysis);
  const latest=buildProductRanking({ads:[normalizeAd(item('42',{collationCount:5}),new Date(newAt))],products,existingRows:[old]}).rows[0];
  assert.equal(latest.media.thumb_url,'https://saved.example/42.jpg');assert.equal(latest.media.observed_at,newAt);assert.equal(latest.media.observed_from,newAt);
  assert.equal(latest.analysis,null);
  assert.equal(publicAd(latest).observed_at,newAt);
});

async function replay({createdAt=oldAt, missingTimestamp=false, current=newAt}={}){
  let clockValue=Date.parse(createdAt);
  const storage=createFAKEWeeklyStorage({offers:[offer],clock:()=>clockValue});
  const queued=await storage.enqueue({review_date:'2026-10-28',trigger:'manual'});
  const report=await storage.claim({report_id:queued.report.id,nonce:queued.nonce}),fence={report_id:report.id,lease_token:report.lease_token};
  const product=selectProducts({offers:[offer]})[0];
  await storage.saveProducts({...fence,products:[{...product,pages:product.sources}]});
  const key='a'.repeat(32);
  await storage.run({...fence,batch_key:key,patch:{state:'succeeded',page_ids:product.sources.map(s=>s.key),dataset_id:'oldDataset',usd_est:.48,created_at:createdAt,updated_at:current}});
  if(missingTimestamp) delete storage.runs.get(report.id+':'+key).created_at;
  await storage.checkpoint({...fence,patch:{phase:'collect'}});
  report.phase='collect';
  const apify=createFAKEWeeklyApify();apify.datasets.set('oldDataset',[item()]);
  const ai=async({prompt})=>({text:JSON.stringify(prompt.includes('<semana>')?{bullets:['1','2','3','4','5']}:prompt.includes('<top10>')?{bullets:['1','2','3']}:analysis),usage:{input_tokens:100,output_tokens:100}});
  ai.countTokens=async()=>1000;
  const run=()=>runCreativeReviewSlice({report,storage,apify,claude:ai,archive:async()=>{},model:'claude-sonnet-5',now:()=>new Date(current)});
  return {storage,apify,report,run};
}

test('reprocessing an old dataset keeps original age and score, preserves observation through archival, and does not buy another collection',async()=>{
  const {storage,apify,report,run}=await replay();await run();
  const [row]=await storage.listAds(report.id);
  assert.equal(row.days_active,8);assert.equal(row.score,scoreCreative(8,2));
  assert.equal(row.media.observed_at,oldAt);assert.equal(publicAd(row).observed_at,oldAt);
  assert.equal(publicAd(row).window_metrics['14d'].active_days,8);
  assert.equal(apify.starts.length,0);
});

test('an old stored dataset without a collection timestamp fails closed instead of inventing an observation today',async()=>{
  const {run,apify}=await replay({missingTimestamp:true});
  await assert.rejects(run(),/data|observa|coleta/i);assert.equal(apify.starts.length,0);
});

test('corrected observation metrics invalidate a product summary even when its top ad IDs are unchanged',async()=>{
  const { hash }=await import('../lib/offer-intel-core.mjs');
  const {storage,report,run}=await replay();
  await storage.saveProduct({report_id:report.id,lease_token:report.lease_token,offer_id:offer.id,patch:{summary:{bullets:['Old claim','Old angle','Old format'],basis:hash('42')}}});
  await run();
  const [product]=await storage.listProducts(report.id);
  assert.deepEqual(product.summary.bullets,['1','2','3']);
});
