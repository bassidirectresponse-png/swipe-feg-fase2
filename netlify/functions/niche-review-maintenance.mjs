import {isDeepStrictEqual} from 'node:util';
import {getStore} from '@netlify/blobs';
import plan from './_niche-review-plan.json' with {type:'json'};
import {verifyGithubAutomationToken} from './_github-oidc.mjs';
import {readJson,SUPABASE_URL} from './_security.mjs';
import {supabaseAdminHeaders,mergeSupabaseOfferData} from './_supabase-admin.mjs';
import {evidenceHash} from '../../lib/niche-review.mjs';
import {integrityHash} from './niche-taxonomy-maintenance.mjs';
const reply=(status,body)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export function createReviewMaintenance({manifest=plan,verify=verifyGithubAutomationToken,headers=supabaseAdminHeaders,merge=mergeSupabaseOfferData,store=()=>getStore({name:'niche-taxonomy-review-backups',consistency:'strong'}),fetcher=fetch}={}){
 return async req=>{
  if(req.method!=='POST')return reply(405,{ok:false});
  try{await verify(String(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,''),new Set(['brands-cli-token.yml']));}catch{return reply(401,{ok:false});}
  try{
   const body=await readJson(req,{maxBytes:1024});
   if(!body||Object.keys(body).some(k=>!['action','offset'].includes(k))||!['inspect','apply'].includes(body.action)||!Number.isInteger(body.offset)||body.offset<0||body.offset>manifest.records.length)return reply(400,{ok:false});
   const batch=manifest.records.slice(body.offset,body.offset+60);
   const ids=[...new Set(batch.flatMap(p=>[p.id,...p.related.map(r=>r.id)]))];
   const query=new URLSearchParams({select:'id,data',id:'in.('+ids.join(',')+')',order:'id'});
   const res=await fetcher(SUPABASE_URL+'/rest/v1/offers?'+query,{headers:await headers(),signal:AbortSignal.timeout(25000)});if(!res.ok)throw Error('read');
   const rows=await res.json(),byId=new Map(rows.map(r=>[r.id,r]));
   const current=batch.map(p=>byId.get(p.id)).filter(Boolean).sort((a,b)=>a.id.localeCompare(b.id));
   const conflicts=[];let changed=0;
   const pending=[];
   for(const entry of batch){
    const row=byId.get(entry.id),d=row?.data;
    const already=d?.taxonomyReview?.version===manifest.version&&Object.entries(entry.patch).every(([k,v])=>isDeepStrictEqual(d[k],v));
    // A rerun is harmless; later manual edits or newly arrived evidence must be reviewed again.
    if(already)continue;
    if(!d||d.taxonomyStatus!=='review'||d.kind==='organic'||d.division==='organic'||evidenceHash(d)!==entry.hash||(entry.patch.taxonomyReview.image&&![d.thumb,d.print,d.imagemProduto,d.img].includes(entry.patch.taxonomyReview.image.url))||entry.related.some(p=>!byId.get(p.id)||evidenceHash(byId.get(p.id).data)!==p.hash)){
     conflicts.push({id:entry.id,reason:!d?'missing_record':d.taxonomyStatus!=='review'?'classification_changed':'evidence_changed'});continue;
    }
    changed++;pending.push({row,entry});
   }
   if(conflicts.length)return reply(409,{ok:false,conflicts,offset:body.offset,...(body.action==='inspect'?{rows:rows.filter(r=>conflicts.some(c=>c.id===r.id)||batch.some(e=>e.related.some(p=>p.id===r.id)))}:{})});
   const result={ok:true,version:manifest.version,offset:body.offset,next:body.offset+batch.length,done:body.offset+batch.length>=manifest.records.length,scanned:batch.length,changed,integrity:integrityHash(current),counts:{}};
   for(const p of batch){const key=(byId.get(p.id).data.kind||'oferta')+'/'+p.patch.taxonomyStatus;result.counts[key]=(result.counts[key]||0)+1;}
   if(body.action==='apply'){
    const backup=store();
    await Promise.all(Array.from({length:6},async()=>{while(pending.length){const {row,entry}=pending.shift(),key=manifest.version+'/'+row.id+'.json';
     if(!await backup.get(key,{type:'json'}))await backup.setJSON(key,{id:row.id,before:row.data,patch:entry.patch,evidenceHash:entry.hash,related:entry.related});
     await merge(row.id,entry.patch);
    }}));
   }
   return reply(200,result);
  }catch(error){console.error('niche review',String(error.message).slice(0,100));return reply(503,{ok:false,error:'Revisão interrompida; nenhuma coleta externa foi iniciada.'});}
 };
}
export default createReviewMaintenance();
