import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { selectProducts } from '../lib/offer-intel-weekly.mjs';
import { runCreativeReviewSlice } from '../lib/offer-intel-weekly-worker.mjs';
import { createFAKEWeeklyStorage, createFAKEWeeklyApify } from './offer-intel-weekly-FAKE-storage.mjs';
const date = '2026-11-11';
const analysis = Object.fromEntries(['gancho','angulo','promessa','mecanismo','formato','cta','publico','por_que_funciona'].map(k => [k,'Observação válida']));
const offer = { id: randomUUID(), data: {kind:'brandsvalidated',nomeOferta:'Acme - Omega',bibliotecas:[{link:'https://www.facebook.com/ads/library/?view_all_page_id=123'}]} };
async function setup() {
  const storage=createFAKEWeeklyStorage({offers:[offer]});
  const queued=await storage.enqueue({review_date:date,trigger:'manual'});
  const report=await storage.claim({report_id:queued.report.id,nonce:queued.nonce});
  return {storage,report,fence:{report_id:report.id,lease_token:report.lease_token}};
}

test('a transient dataset read failure preserves archived rows and does not convert successful collection into a paid retry', async () => {
  const {storage,report,fence}=await setup();
  report.summary={bullets:['Saved 1','Saved 2','Saved 3','Saved 4','Saved 5']};
  report.cost={recovery_requested:true};
  await storage.checkpoint({...fence,patch:{summary:report.summary,cost:report.cost}});
  const product=selectProducts({offers:[offer]})[0];
  await storage.saveProducts({...fence,products:[{...product,pages:product.sources,ads_collected:9}]});
  await storage.saveAds({...fence,ads:[{offer_id:offer.id,rank:1,ad_archive_id:'42',ad_ids:['42'],match_keys:[],media:{archived:true,thumb_url:'https://saved.example/42.jpg'},analysis}]});
  await storage.run({...fence,batch_key:'original',patch:{state:'succeeded',page_ids:product.sources.map(s=>s.key),dataset_id:'dataset42',usd_est:0.24}});
  const apify=createFAKEWeeklyApify();apify.items=async()=>{throw new Error('temporary read failure');};
  await assert.rejects(runCreativeReviewSlice({storage,report,apify,archive:async()=>{},claude:async()=>{},model:'claude-sonnet-5'}), /dataset|coleta/i);
  assert.equal((await storage.listAds(report.id))[0].media.thumb_url,'https://saved.example/42.jpg');
  assert.equal((await storage.listRuns(report.id))[0].state,'succeeded');
  assert.equal(apify.starts.length,0);
  assert.deepEqual((await storage.getReport({id:report.id})).summary.bullets,['Saved 1','Saved 2','Saved 3','Saved 4','Saved 5']);
  assert.equal((await storage.listProducts(report.id))[0].ads_collected,9);
});

test('same-slice recovery generates a fresh executive summary after clearing the old report summary', async () => {
  const {storage,report,fence}=await setup();
  report.summary={bullets:['Old 1','Old 2','Old 3','Old 4','Old 5']};
  report.cost={recovery_requested:true};
  await storage.checkpoint({...fence,patch:{summary:report.summary,cost:report.cost}});
  const apify=createFAKEWeeklyApify({itemsFor:()=>[{adArchiveId:'42',pageId:'123',startDate:1793577600,snapshot:{body:{text:'Acme Omega support for your routine'}}}]});
  const ai=async({prompt})=>({text:JSON.stringify(prompt.includes('<semana>')?{bullets:['Fresh 1','Fresh 2','Fresh 3','Fresh 4','Fresh 5']}:prompt.includes('<top10>')?{bullets:['One','Two','Three']}:analysis),usage:{input_tokens:100,output_tokens:100}});
  ai.countTokens=async()=>1000;
  await runCreativeReviewSlice({storage,report,apify,archive:async()=>{},claude:ai,model:'claude-sonnet-5'});
  assert.deepEqual((await storage.getReport({id:report.id})).summary.bullets,['Fresh 1','Fresh 2','Fresh 3','Fresh 4','Fresh 5']);
});
