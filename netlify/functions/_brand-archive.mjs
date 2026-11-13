import { createHash } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { SUPABASE_URL, boundedBuffer, safeRemoteFetch } from './_security.mjs';
import { supabaseAdminHeaders, mergeSupabaseOfferData, shallowDataPatch } from './_supabase-admin.mjs';
import { acquireAutomationLock, releaseAutomationLock } from './_automation-lock.mjs';
import { applyArchivedMedia } from './_creative-integrity.mjs';
import { detectMedia } from '../../lib/apify-brand-archive.mjs';
import { ownedMedia, hasInsiderData, adKey, stableCreativeId, mediaOf, references, brandCreativeFields, matchCreative } from '../../lib/brand-media-archive.mjs';
import { BRAND_CREATIVE_GENERATION } from '../../lib/brand-creative-policy.mjs';

export function brandArchiveSourceKey(d) { return createHash("sha256").update(JSON.stringify([d.brandTopAds || [], d.criativos || []])).digest("hex"); }
const store = () => getStore({name:'brand-media-archive',consistency:'strong'});
async function query(params) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/offers?${new URLSearchParams(params)}`, {headers:await supabaseAdminHeaders(),signal:AbortSignal.timeout(15000)});
  if (!r.ok) throw new Error(`Leitura do acervo: HTTP ${r.status}`);
  return r.json();
}
export async function listArchiveBrands() {
  const rows = await query({select:'id,data', 'data->>kind':'in.(brandsvalidated,brandsgeneral)',limit:'500',order:'id'});
  return rows.filter(r=>hasInsiderData(r.data));
}
export async function readArchiveBrand(id) {
  const [row] = await query({id:`eq.${id}`,select:'id,data'});
  if (!row || !['brandsvalidated','brandsgeneral'].includes(row.data?.kind)) throw new Error('Marca inexistente.');
  return row;
}
export async function archiveCreatives(id) {
  return query({select:'id,data','data->>kind':'eq.criativo','data->>sourceOfferId':`eq.${id}`,order:'id',limit:'1000'});
}
export async function verifiedMedia(asset) {
  if (!ownedMedia(asset?.url)) return null;
  const key='verified/'+createHash('sha256').update(asset.url).digest('hex')+'.json';
  const previous=await store().get(key,{type:'json'});
  if (previous?.ok && Date.now()-Date.parse(previous.checkedAt)<86400000) return {...asset,...previous.asset};
  try {
    const response=await fetch(asset.url,{headers:{Range:'bytes=0-63'},signal:AbortSignal.timeout(12000),redirect:'error'});
    if (![200,206].includes(response.status)) return null;
    const reader=response.body.getReader();const first=await reader.read();await reader.cancel();
    const detected=detectMedia(Buffer.from(first.value || []));
    if (detected.type!==asset.type) return null;
    const saved={...asset,type:detected.type,checkedAt:new Date().toISOString()};
    await store().setJSON(key,{ok:true,checkedAt:saved.checkedAt,asset:saved});
    return saved;
  } catch { return null; }
}
export async function storeBrandAsset(asset, offerId) {
  if (ownedMedia(asset?.url || asset?.sourceUrl)) {
    const verified=await verifiedMedia({...asset,url:asset.url || asset.sourceUrl});
    if(verified)return verified;
    throw new Error('Arquivo armazenado indisponível.');
  }
  const response=await safeRemoteFetch(asset.sourceUrl,{allowedHostSuffixes:['facebook.com','fbcdn.net','fbsbx.com','akamaihd.net'],timeoutMs:40000});
  if(!response.ok)throw new Error(`Mídia Meta: HTTP ${response.status}`);
  const bytes=await boundedBuffer(response,120*1024*1024), detected=detectMedia(bytes);
  if(asset.type && detected.type!==asset.type)throw new Error('Tipo de mídia divergente.');
  const sha256=createHash('sha256').update(bytes).digest('hex');
  const path=`brands/offer-topads/${offerId}/${sha256}.${detected.ext}`;
  const url=`${SUPABASE_URL}/storage/v1/object/public/criativos/${path}`;
  const reused=await verifiedMedia({type:detected.type,url});if(reused)return reused;
  const uploaded=await fetch(`${SUPABASE_URL}/storage/v1/object/criativos/${path}`,{method:'POST',headers:await supabaseAdminHeaders({'Content-Type':detected.contentType,'x-upsert':'true'}),body:bytes,signal:AbortSignal.timeout(90000)});
  if(!uploaded.ok)throw new Error(`Armazenamento: HTTP ${uploaded.status}`);
  const result=await verifiedMedia({type:detected.type,url,sha256,bytes:bytes.length,quality:asset.quality || 'available'});
  if(!result)throw new Error('Falha na conferência do arquivo salvo.');
  return result;
}
async function patchCreative(row, next) {
  const patch=shallowDataPatch(row.data,next);if(!Object.keys(patch).length)return;
  await store().setJSON(`backups/${new Date().toISOString()}/${row.id}.json`,row);
  await mergeSupabaseOfferData(row.id,patch);
  row.data=next;
}
export async function reconcileBrand(id) {
  const lock=await acquireAutomationLock(`brand-archive-${id}`,120000);
  if(!lock)return {id,busy:true};
  try {
    const offer=await readArchiveBrand(id), rows=await archiveCreatives(id),fields=brandCreativeFields(offer);
    const verified=new Map();
    const candidates=[...references(offer.data).flatMap(mediaOf),...rows.filter(r=>r.data.brandCreativeGeneration===BRAND_CREATIVE_GENERATION || references(offer.data).some(ref=>adKey(r.data.linkAnuncio)===ref.key)).flatMap(r=>mediaOf(r.data))];
    const queue=[...new Map(candidates.map(m=>[m.url,m])).values()];
    await Promise.all(Array.from({length:5},async()=>{while(queue.length){const a=queue.shift(),v=await verifiedMedia(a);if(v)verified.set(v.url,v);}}));
    let created=0,updated=0;
    for(const ref of references(offer.data)) {
      let row=matchCreative(rows,id,ref);
      const ready=mediaOf({media:[...mediaOf(row?.data),...mediaOf(ref)]}).filter(m=>verified.has(m.url)).map(m=>verified.get(m.url));
      const next={...(row?.data || {}),...fields};
      next.nome ||= `${fields.marca} · ${ref.nome || ref.title || 'Anúncio'}`;
      next.nomeOriginal ||= ref.nome || ref.title || '';
      next.linkAnuncio ||= ref.link || '';
      next.period ||= ref.period || '';
      if(ready.length){
        Object.assign(next,{archivedMedia:ready,mediaArchived:true,mediaArchiveStatus:'done',mediaAttached:true,fbIngestStatus:'done',mediaArchiveError:'',mediaArchiveNextRetryAt:''});
        next.video=ready.find(m=>m.type==='video')?.url || '';
        next.print=ready.find(m=>m.type==='image')?.url || '';
        if(!row)Object.assign(next,applyArchivedMedia(next,ready.find(m=>m.type==='video') || ready[0],{source:'storage-existing'}));
      } else if(!next.mediaArchiveStatus || next.mediaArchiveStatus==='done') {
        Object.assign(next,{mediaArchiveRequired:true,mediaArchiveStatus:'pending',fbIngestStatus:'pending',mediaAttached:false});
      }
      if(row){if(Object.keys(shallowDataPatch(row.data,next)).length){await patchCreative(row,next);updated++;}}
      else {
        row={id:stableCreativeId(id,ref.key),data:next};
        const r=await fetch(`${SUPABASE_URL}/rest/v1/offers`,{method:'POST',headers:await supabaseAdminHeaders({'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates,return=minimal'}),body:JSON.stringify(row),signal:AbortSignal.timeout(12000)});
        if(!r.ok)throw new Error(`Cadastro do criativo: HTTP ${r.status}`);rows.push(row);created++;
      }
    }
    const active=rows.filter(r=>r.data.brandCreativeGeneration===BRAND_CREATIVE_GENERATION);
    // Keep historical archive entries; add only verified assets, once per URL.
    const gallery=[...(offer.data.brandArchivedAds || [])], seen=new Set(gallery.flatMap(ad=>mediaOf(ad).map(m=>m.url)));
    for(const row of active){
      const media=mediaOf(row.data).filter(m=>verified.has(m.url)&&!seen.has(m.url)).map(m=>verified.get(m.url));
      if(!media.length)continue;media.forEach(m=>seen.add(m.url));
      gallery.push({creativeId:row.id,title:row.data.nome,link:row.data.linkAnuncio || '',media,source:'linked-creative',capturedAt:new Date().toISOString()});
    }
    const topAds=(offer.data.brandTopAds || []).map(ad=>{
      const key=adKey(ad.link),row=key&&active.find(r=>adKey(r.data.linkAnuncio)===key);
      const media=mediaOf(row?.data).filter(m=>verified.has(m.url));
      return media.length?{...ad,video:media.find(m=>m.type==='video')?.url || '',img:media.find(m=>m.type==='image')?.url || '',media,ingestStatus:'done',ingestError:''}:ad;
    });
    const pending=references(offer.data).filter(ref=>!mediaOf(matchCreative(active,id,ref)?.data).some(m=>verified.has(m.url))).map(ref=>({link:ref.link,name:ref.nome || ref.title,key:ref.key}));
    const summary={verifiedFiles:verified.size,creativeCards:active.length,pendingLinks:pending.length};
    const next={...offer.data,brandArchivedAds:gallery,brandTopAds:topAds,brandArchiveSummary:summary,brandArchiveSourceKey:brandArchiveSourceKey({...offer.data,brandTopAds:topAds})};
    const patch=shallowDataPatch(offer.data,next);
    if(Object.keys(patch).length){await store().setJSON(`backups/${new Date().toISOString()}/${id}.json`,offer);await mergeSupabaseOfferData(id,patch);}
    return {id,name:fields.marca,created,updated,...summary,pending};
  } finally {await releaseAutomationLock(lock);}
}
export async function saveBrandCreativeMedia(id, assets, source) {
  const [row]=await query({id:`eq.${id}`,select:'id,data'});
  if(row?.data?.kind!=='criativo'||row.data.division!=='fegbrands'||!row.data.sourceOfferId)throw new Error('Criativo inválido.');
  const media=[];
  for(const asset of assets){const saved=await storeBrandAsset(asset,row.data.sourceOfferId);media.push(saved);}
  if(!media.length)throw new Error('Nenhuma mídia recuperada.');
  const merged=mediaOf({media:[...mediaOf(row.data),...media]});
  const next={...applyArchivedMedia(row.data,merged.find(m=>m.type==='video') || merged[0],{source}),archivedMedia:merged,mediaArchived:true};
  await patchCreative(row,next);
  await reconcileBrand(row.data.sourceOfferId);
  return {id,files:merged.length};
}
