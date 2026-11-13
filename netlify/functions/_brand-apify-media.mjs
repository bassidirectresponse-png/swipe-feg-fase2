import {createHash} from 'node:crypto';
import {getStore} from '@netlify/blobs';
import {acquireAutomationLock,releaseAutomationLock} from './_automation-lock.mjs';
import {adKey} from '../../lib/brand-media-archive.mjs';
import {planMetaAds} from '../../lib/apify-brand-archive.mjs';
const store=()=>getStore({name:'brand-media-archive',consistency:'strong'});
const key=url=>'sources/'+createHash('sha256').update(adKey(url)).digest('hex')+'.json';
const ACTOR='apify~facebook-ads-scraper';
function unavailable(message,code='BRAND_MEDIA_SOURCE_REQUIRED'){return Object.assign(new Error(message),{code});}
async function api(path,options={}){
  const token=process.env.APIFY_TOKEN;
  if(!token)throw unavailable('Credencial Apify não configurada.','APIFY_UNAVAILABLE');
  const r=await fetch(`https://api.apify.com/v2/${path}`,{...options,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(35000)});
  if(!r.ok)throw unavailable(`Apify indisponível (HTTP ${r.status}).`,'APIFY_UNAVAILABLE');
  return r.json();
}
export function exactApifyMedia(items,url){
  const expected=adKey(url);
  const rows=(Array.isArray(items)?items:[]).filter(row=>{
    const id=String(row.adArchiveId || row.adArchiveID || '');
    return expected.startsWith('ad:') ? expected===`ad:${id}` : adKey(row.inputUrl || row.url)===expected;
  });
  const result=[];
  for(const row of rows){
    const page=String(row.pageId || row.pageID || row.snapshot?.pageId || '');
    if(!page || row.error)continue;
    result.push(...planMetaAds([row],page,1).flatMap(ad=>ad.media));
  }
  return [...new Map(result.map(m=>[m.sourceUrl,m])).values()];
}
export async function startBrandCollection(urls){
  const lock=await acquireAutomationLock('brand-apify-start',120000);
  if(!lock)return {busy:true};
  try{
    const unique=[...new Map(urls.filter(u=>adKey(u)&&!adKey(u).startsWith('media:')).map(u=>[adKey(u),u])).values()].slice(0,150);
    const candidates=[];
    for(const url of unique)if(!await store().get(key(url),{type:'json'}))candidates.push(url);
    if(!candidates.length)return {started:false,reused:unique.length};
    const stamp=new Date().toISOString();
    // Reserve BEFORE the paid request. An uncertain start is never automatically charged again.
    await Promise.all(candidates.map(url=>store().setJSON(key(url),{url,state:'starting',at:stamp})));
    const r=await api(`acts/${ACTOR}/runs?timeout=240&memory=1024&maxItems=${candidates.length}&maxTotalChargeUsd=1`,{method:'POST',body:JSON.stringify({startUrls:candidates.map(url=>({url})),resultsLimit:1,onlyTotal:false,includeAboutPage:false,isDetailsPerAd:false})});
    if(!r.data?.id)throw unavailable('Apify não retornou recibo da coleta.','APIFY_UNAVAILABLE');
    const receipt={runId:r.data.id,datasetId:r.data.defaultDatasetId,urls:candidates,at:stamp};
    await store().setJSON('runs/'+receipt.runId+'.json',receipt);
    await Promise.all(candidates.map(url=>store().setJSON(key(url),{url,state:'running',runId:receipt.runId,at:stamp})));
    return {started:true,runId:receipt.runId,links:candidates.length,reused:unique.length-candidates.length};
  }finally{await releaseAutomationLock(lock);}
}
export async function brandCollectionStatus(runId){
  const receipt=await store().get('runs/'+runId+'.json',{type:'json'});
  if(!receipt)throw unavailable('Coleta não registrada.');
  const {data:run}=await api('actor-runs/'+runId);
  if(!['SUCCEEDED','FAILED','TIMED-OUT','ABORTED'].includes(run.status))return {status:run.status,runId};
  let items=await store().get('datasets/'+runId+'.json',{type:'json'});
  if(!items){items=await api(`datasets/${receipt.datasetId}/items?clean=true&limit=1000`);await store().setJSON('datasets/'+runId+'.json',items);}
  let available=0;
  await Promise.all(receipt.urls.map(async url=>{
    const media=exactApifyMedia(items,url);if(media.length)available++;
    await store().setJSON(key(url),{url,runId,state:media.length?'ready':'unavailable',media,at:receipt.at,
      error:media.length?'':'A Apify não recuperou mídia desse link exato. É necessário um link público da biblioteca ou o arquivo original.'});
  }));
  return {status:run.status,runId,links:receipt.urls.length,available,unavailable:receipt.urls.length-available};
}
export async function resolveBrandMedia(url){
  let receipt=await store().get(key(url),{type:'json'});
  if(!receipt){await startBrandCollection([url]);receipt=await store().get(key(url),{type:'json'});}
  if(receipt?.state==='starting')throw unavailable('Coleta com início não confirmado; revisão necessária antes de nova cobrança.');
  if(receipt?.state==='running'){
    await brandCollectionStatus(receipt.runId);
    receipt=await store().get(key(url),{type:'json'});
  }
  if(receipt?.state==='running')throw unavailable('Coleta Apify em andamento.','BRAND_MEDIA_PROCESSING');
  if(receipt?.state==='ready' && receipt.media?.length)return {media:receipt.media,source:'apify:'+receipt.runId};
  throw unavailable(receipt?.error || 'Mídia não recuperada pela Apify.');
}
