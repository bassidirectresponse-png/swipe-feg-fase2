import {createHash} from 'node:crypto';
import {getStore} from '@netlify/blobs';
import {verifyGithubAutomationToken} from './_github-oidc.mjs';
import {readJson,SUPABASE_URL} from './_security.mjs';
import {supabaseAdminHeaders,mergeSupabaseOfferData} from './_supabase-admin.mjs';
import {taxonomy} from '../../lib/niche-taxonomy.mjs';
const reply=(status,body)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const TAXONOMY_FIELDS=new Set(['nicho','subnicho','taxonomyOriginal','taxonomyVersion','taxonomyStatus']);
// Compare all IDs and all non-taxonomy values before/after, including nested links and metrics.
export function integrityHash(rows){
 const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
 return createHash('sha256').update(JSON.stringify(stable(rows.map(r=>({id:r.id,data:Object.fromEntries(Object.entries(r.data||{}).filter(([k])=>!TAXONOMY_FIELDS.has(k)))}))))).digest('hex');
}
const UUID=/^[0-9a-f-]{36}$/i;
// A fixed, versioned data migration. No caller-supplied patches, deletion or arbitrary queries.
export function createTaxonomyMaintenance({verify=verifyGithubAutomationToken,headers=supabaseAdminHeaders,merge=mergeSupabaseOfferData,store=()=>getStore({name:'niche-taxonomy-backups',consistency:'strong'}),fetcher=fetch}={}){
 return async req=>{
  if(req.method!=='POST')return reply(405,{ok:false});
  try{await verify(String(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,''),new Set(['brands-cli-token.yml']));}catch{return reply(401,{ok:false,error:'Não autorizado'});}
  try{
   const body=await readJson(req,{maxBytes:1024});
   if(!body||!['inspect','apply'].includes(body.action)||Object.keys(body).some(k=>!['action','after'].includes(k))||(body.after&&!UUID.test(body.after)))return reply(400,{ok:false,error:'Ação inválida'});
   const h=await headers();const query=new URLSearchParams({select:'id,data',order:'id',limit:'80'});if(body.after)query.set('id','gt.'+body.after);
   const r=await fetcher(`${SUPABASE_URL}/rest/v1/offers?${query}`,{headers:h,signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('catalog-read');
   const rows=await r.json(),result={ok:true,version:taxonomy.version,scanned:rows.length,integrity:integrityHash(rows),changed:0,review:0,archived:0,counts:{},sample:[],after:rows.at(-1)?.id||body.after||null,done:rows.length<80};
   const backup=body.action==='apply'?store():null;
   const writes=[];
   for(const row of rows){
    if(row.data?.division==='organic'||row.data?.kind==='organic')result.archived++;
    const patch=taxonomy.migrationPatch(row.data),next=patch?{...row.data,...patch}:row.data;
    if(next?.taxonomyStatus==='review')result.review++;
    const key=[next.kind||'oferta',next.nicho||'',next.subnicho||''].join(' / ');result.counts[key]=(result.counts[key]||0)+1;
    if(!patch)continue;result.changed++;
    if(result.sample.length<8)result.sample.push({id:row.id,name:row.data.nomeOferta||row.data.nome,from:[row.data.nicho,row.data.subnicho],to:[patch.nicho,patch.subnicho],status:patch.taxonomyStatus});
    if(backup)writes.push(async()=>{
     const key=taxonomy.version+'/'+row.id+'.json';
     if(!await backup.get(key,{type:'json'}))await backup.setJSON(key,{id:row.id,before:row.data,patch,version:taxonomy.version});
     // Require the atomic merge RPC: never fall back to replacing the complete JSON.
     await merge(row.id,patch);
    });
   }
   await Promise.all(Array.from({length:6},async()=>{while(writes.length)await writes.shift()();}));
   return reply(200,result);
  }catch(error){console.error('niche migration',String(error?.message||error).slice(0,160));return reply(503,{ok:false,error:'Migração interrompida; pode ser retomada sem duplicação.'});}
 };
}
export default createTaxonomyMaintenance();
