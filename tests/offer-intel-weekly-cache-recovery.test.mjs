import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {selectProducts} from '../lib/offer-intel-weekly.mjs';
import {runCreativeReviewSlice} from '../lib/offer-intel-weekly-worker.mjs';
import {createFAKEWeeklyStorage,createFAKEWeeklyApify} from './offer-intel-weekly-FAKE-storage.mjs';
const now=new Date('2026-11-10T19:00:00Z');
const offer={id:randomUUID(),data:{kind:'brandsvalidated',nomeOferta:'Acme - Omega',bibliotecas:[{link:'https://www.facebook.com/ads/library/?view_all_page_id=123'}]}};
const sources=selectProducts({offers:[offer]})[0].sources;
const item={adArchiveId:'42',pageId:'123',startDate:Math.floor(Date.parse('2026-10-20T12:00:00Z')/1000),snapshot:{displayFormat:'image',body:{text:'Acme Omega supplement for the daily routine'},images:[{originalImageUrl:'https://scontent.fbcdn.net/fresh-image.jpg'}]}};
const analysis=Object.fromEntries(['gancho','angulo','promessa','mecanismo','formato','cta','publico','por_que_funciona'].map(k=>[k,'Dado observado']));
const claude=async({kind})=>({text:JSON.stringify(kind==='ad'?analysis:{bullets:Array.from({length:kind==='week'?5:3},(_,i)=>'Observação '+i)}),usage:{input_tokens:100,output_tokens:100}});
claude.countTokens=async()=>1000;
async function setup({recover=true,shared=true}={}){
  const storage=createFAKEWeeklyStorage({offers:[offer],clock:()=>now.getTime()});
  const q=await storage.enqueue({review_date:'2026-11-04',trigger:'manual'});
  if(recover)await storage.prepareRecovery(q.report);
  const report=await storage.claim({report_id:q.report.id,nonce:q.nonce});
  const apify=createFAKEWeeklyApify({itemsFor:()=>[item]});
  if(shared){
    storage.listReusableRuns=async()=>[{state:'succeeded',report_id:'other',dataset_id:'paidDataset',created_at:'2026-10-28T12:00:00Z',page_ids:sources.map(s=>s.key)}];
    apify.datasets.set('paidDataset',[item]);
  }
  const deps={storage,report,apify,claude,archive:async()=>({url:'https://stored.example/thumb.jpg'}),model:'claude-sonnet-5',now:()=>now};
  return {...deps,run:()=>runCreativeReviewSlice(deps),fence:{report_id:report.id,lease_token:report.lease_token}};
}
test('explicit recovery reuses a paid dataset from the other folder with zero new collection requests and its original observation date',async()=>{
  const {run,storage,report,apify}=await setup(); const result=await run();
  assert.equal(result.status,'succeeded');assert.equal(apify.starts.length,0);
  const [ad]=await storage.listAds(report.id);assert.equal(ad.media.observed_at,'2026-10-28T12:00:00.000Z');assert.equal(ad.days_active,8);
  const saved=await storage.getReport({id:report.id});assert.equal(saved.cost.reused_runs,1);assert.equal(saved.cost.sources_skipped,0);
});
test('scheduled/new reports still collect fresh observations rather than silently recycling old datasets',async()=>{
  const {run,apify}=await setup({recover:false});await run();assert.equal(apify.starts.length,1);
});
test('a read failure in a paid shared dataset aborts before any new paid POST',async()=>{
  const {run,apify}=await setup();apify.items=async()=>{throw new Error('dataset unavailable');};
  await assert.rejects(run(),/dataset unavailable/);assert.equal(apify.starts.length,0);
});
test('terminal receipts release only the over-reserved amount and allow pending sources within the original cap',async()=>{
  const {run,storage,report,fence,apify}=await setup({shared:false});
  const reservation='apify:paid';await storage.budgetReserve({review_date:report.review_date,kind:'apify',reservation,usd:15});
  await storage.run({...fence,batch_key:'a'.repeat(32),patch:{state:'succeeded',reservation,page_ids:['page:123'],provider_run_id:'oldRun',dataset_id:'paidDataset',usd_est:15}});
  apify.datasets.set('paidDataset',[item]);apify.receipt=async id=>({status:'SUCCEEDED',finished_at:now.toISOString(),usd:id==='oldRun'?1:0.01});
  await run();
  assert.equal(storage.ledger.find(x=>x.reservation===reservation).usd,1);
  assert.equal(apify.starts.length,1);assert.ok((await storage.budgetUsage({review_date:report.review_date,kind:'apify'})).used_usd<=15);
});
test('unknown starts without a terminal receipt remain reserved; the repair does not invent a refund',async()=>{
  const {run,storage,report,fence,apify}=await setup({shared:false});
  const reservation='apify:unknown';await storage.budgetReserve({review_date:report.review_date,kind:'apify',reservation,usd:15});
  await storage.run({...fence,batch_key:'a'.repeat(32),patch:{state:'unknown',reservation,page_ids:['page:123'],usd_est:15}});
  apify.receipt=async()=>{throw new Error('no receipt');};await run();
  assert.equal(storage.ledger.find(x=>x.reservation===reservation).usd,15);assert.equal(apify.starts.length,0);
});

test('evidence mode completes every report section without calling or reserving an external model',async()=>{
  const deps=await setup();
  deps.claude=()=>{throw new Error('external models are disabled');};
  const result=await runCreativeReviewSlice({...deps,analysisMode:'observed_data'});
  assert.equal(result.status,'succeeded');
  const saved=await deps.storage.getReport({id:deps.report.id});
  assert.equal(saved.summary.bullets.length,5);assert.equal(saved.cost.analysis_mode,'observed_data');
  assert.equal((await deps.storage.listProducts(deps.report.id))[0].summary.bullets.length,3);
  const [ad]=await deps.storage.listAds(deps.report.id);assert.equal(ad.analysis.method,'observed_data');
  assert.match(ad.analysis.formato,/não foi transcrito/);
  assert.equal(deps.storage.ledger.filter(x=>x.kind==='ai').length,0);
});
