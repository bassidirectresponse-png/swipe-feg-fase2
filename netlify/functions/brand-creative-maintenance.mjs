import {verifyGithubAutomationToken} from './_github-oidc.mjs';
import {readJson} from './_security.mjs';
import {listArchiveBrands,readArchiveBrand,archiveCreatives,reconcileBrand} from './_brand-archive.mjs';
import {references,mediaOf,matchCreative} from '../../lib/brand-media-archive.mjs';
import {startBrandCollection,brandCollectionStatus} from './_brand-apify-media.mjs';
import dispatch from './_offer-creative-archive-dispatch.mjs';
const reply=(status,body)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export function createBrandMaintenance({verify=verifyGithubAutomationToken}={}){return async req=>{
  if(req.method!=='POST')return reply(405,{ok:false});
  try{await verify(String(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,''),new Set(['brands-cli-token.yml']));}catch{return reply(401,{ok:false});}
  try{
    const body=await readJson(req,{maxBytes:2048});
    if(!body||Object.keys(body).some(k=>!['action','offerId','runId'].includes(k))||!['inspect','reconcile','collect','status','dispatch'].includes(body.action))return reply(400,{ok:false});
    if(body.offerId&&!/^[a-f0-9]{8}-[a-f0-9-]{27}$/i.test(body.offerId))return reply(400,{ok:false});
    if(body.action==='status'){
      if(!/^[A-Za-z0-9]{10,30}$/.test(body.runId||''))return reply(400,{ok:false});
      return reply(200,{ok:true,...await brandCollectionStatus(body.runId)});
    }
    if(body.action==='dispatch')return dispatch();
    if(body.action==='reconcile'){
      if(!body.offerId)return reply(400,{ok:false});
      return reply(200,{ok:true,...await reconcileBrand(body.offerId)});
    }
    const brands=body.offerId?[await readArchiveBrand(body.offerId)]:await listArchiveBrands();
    if(body.action==='inspect'){
      const out=[];for(const b of brands){const rows=await archiveCreatives(b.id);out.push({id:b.id,name:b.data.nomeMarca||b.data.nomeOferta,refs:references(b.data),summary:b.data.brandArchiveSummary,creatives:rows.map(r=>({id:r.id,data:Object.fromEntries(Object.entries(r.data).filter(([k])=>!(/transcri|analysis|copy/i.test(k))))}))});}
      return reply(200,{ok:true,brands:out});
    }
    const links=[];
    for(const b of brands){const rows=await archiveCreatives(b.id);for(const ref of references(b.data))if(!mediaOf(ref).length&&!mediaOf(matchCreative(rows,b.id,ref)?.data).length&&ref.link)links.push(ref.link);}
    return reply(202,{ok:true,...await startBrandCollection(links)});
  }catch(error){console.error('brand archive maintenance',error?.message);return reply(503,{ok:false,error:String(error?.message||'Manutenção indisponível.').slice(0,180)});}
};}
export default createBrandMaintenance();
