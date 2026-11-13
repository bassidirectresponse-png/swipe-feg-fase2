import {createHash} from 'node:crypto';
import {getStore} from '@netlify/blobs';
import {acquireAutomationLock,releaseAutomationLock} from './_automation-lock.mjs';
import {adKey} from '../../lib/brand-media-archive.mjs';
import {safeRemoteFetch,boundedBuffer} from './_security.mjs';
import {planMetaAds} from '../../lib/apify-brand-archive.mjs';
const store=()=>getStore({name:'brand-media-archive',consistency:'strong'});
const key=url=>'sources/'+createHash('sha256').update(adKey(url)).digest('hex')+'.json';
const ACTOR='apify~facebook-ads-scraper';
export function collectionOutcome(status, media = []) {
  if (media.length) return 'ready';
  return status === 'SUCCEEDED' ? 'unavailable' : 'incomplete';
}
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
export function previewRequiresLogin(url, html='') {
  try {
    const u=new URL(url);
    if(!['facebook.com','fb.me'].some(h=>u.hostname===h||u.hostname.endsWith('.'+h)))return false;
    return /\/(?:login(?:page|\.php)?|checkpoint)(?:[/?]|$)/i.test(u.pathname)
      || /name=["']email["']/.test(html)&&/name=["']pass["']/.test(html);
  } catch { return false; }
}
async function previewAccessCheck(url) {
  if(!/^(?:preview|experience):/.test(adKey(url)))return null;
  try {
    const response=await safeRemoteFetch(url,{allowedHostSuffixes:['facebook.com','fb.me'],timeoutMs:10000,maxRedirects:4,headers:{'User-Agent':'Mozilla/5.0'}});
    const html=(await boundedBuffer(response,1024*1024)).toString('utf8');
    if(!previewRequiresLogin(response.url,html))return null;
    return {status:'login_required',checkedAt:new Date().toISOString(),finalUrl:response.url,httpStatus:response.status,method:'public-http'};
  } catch { return null; }
}
export function collectionEligible(receipt, retryIncomplete=false) {
  if(!receipt)return true;
  return retryIncomplete && receipt.state==='incomplete' && !receipt.media?.length && !receipt.publicCheck;
}
export async function startBrandCollection(urls,{retryIncomplete=false}={}){
  const lock=await acquireAutomationLock('brand-apify-start',120000);
  if(!lock)return {busy:true};
  try{
    const unique=[...new Map(urls.filter(u=>adKey(u)&&!adKey(u).startsWith('media:')).map(u=>[adKey(u),u])).values()].slice(0,150);
    const eligible=[];
    for(const url of unique)if(collectionEligible(await store().get(key(url),{type:'json'}),retryIncomplete))eligible.push(url);
    const candidates=[];let accessRequired=0;
    const checked=await Promise.all(eligible.slice(0,3).map(async url=>({url,check:await previewAccessCheck(url)})));
    for(const {url,check} of checked){
      if(check){await store().setJSON(key(url),{url,state:'unavailable',publicCheck:check,media:[],at:check.checkedAt});accessRequired++;}
      else candidates.push(url);
    }
    if(!candidates.length)return {started:false,accessRequired,remaining:Math.max(0,eligible.length-3),reused:unique.length-eligible.length};
    const stamp=new Date().toISOString();
    // Reserve BEFORE the paid request. An uncertain start is never automatically charged again.
    await Promise.all(candidates.map(url=>store().setJSON(key(url),{url,state:'starting',at:stamp})));
    const r=await api(`acts/${ACTOR}/runs?timeout=240&memory=1024&maxItems=${candidates.length}&maxTotalChargeUsd=1`,{method:'POST',body:JSON.stringify({startUrls:candidates.map(url=>({url})),resultsLimit:1,onlyTotal:false,includeAboutPage:false,isDetailsPerAd:false})});
    if(!r.data?.id)throw unavailable('Apify não retornou recibo da coleta.','APIFY_UNAVAILABLE');
    const receipt={runId:r.data.id,datasetId:r.data.defaultDatasetId,urls:candidates,at:stamp};
    await store().setJSON('runs/'+receipt.runId+'.json',receipt);
    await Promise.all(candidates.map(url=>store().setJSON(key(url),{url,state:'running',runId:receipt.runId,at:stamp})));
    return {started:true,runId:receipt.runId,links:candidates.length,remaining:Math.max(0,eligible.length-3),accessRequired,reused:unique.length-eligible.length};
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
    const current=await store().get(key(url),{type:'json'});
    // A late response from an older run must never replace a newer recovery or access check.
    if(current?.runId!==runId || current?.publicCheck || current?.state==='ready')return;
    const state=collectionOutcome(run.status,media);
    await store().setJSON(key(url),{...current,url,runId,state,media,at:receipt.at,runStatus:run.status,
      error:state==='ready'?'':state==='incomplete'?'A coleta terminou sem concluir este link. A mídia ainda não foi avaliada individualmente.':'A Apify não recuperou mídia desse link exato. É necessário verificar o acesso à prévia ou usar o link público da biblioteca.'});
  }));
  return {status:run.status,runId,links:receipt.urls.length,available,unavailable:run.status==='SUCCEEDED'?receipt.urls.length-available:0,incomplete:run.status==='SUCCEEDED'?0:receipt.urls.length-available};
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
  if(receipt?.state!=='ready' && receipt?.publicCheck?.status==='login_required')throw unavailable('Esta prévia exige login no Facebook. É necessária uma sessão com acesso ou o arquivo original; não significa que o anúncio foi apagado.','BRAND_MEDIA_ACCESS_REQUIRED');
  if(receipt?.state==='incomplete')throw unavailable(receipt.error,'BRAND_MEDIA_INCOMPLETE');
  if(receipt?.state==='ready' && receipt.media?.length)return {media:receipt.media,source:'apify:'+receipt.runId};
  throw unavailable(receipt?.error || 'Mídia não recuperada pela Apify.');
}
