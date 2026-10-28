import { IntelError, UUID, hash, stableJson, actionKey, pagination, publicJob, cursorTimestamp } from "../../lib/offer-intel-core.mjs";
import { resolveReference, validateReferenceInput } from "../../lib/offer-intel-reference.mjs";
import { publicLimits, refreshBudgetUsage } from "../../lib/offer-intel-limits.mjs";
import { publicDiscovery, publicRelation, publicFunnel, publicEvidence } from "../../lib/offer-intel-public.mjs";
import { offerFunnels } from "../../lib/offer-intel-records.mjs";

const kinds={discoveries:["ad","page","domain"],relations:["same_page","same_domain","same_destination_url","similar_creative","redirect"]};
const statuses={discoveries:["new","review","confirmed","ignored"],relations:["pending","confirmed","ignored"]};
const invalid=()=>new IntelError(400,"invalid_request","Filtros ou revisão inválidos.");
const uuid=v=>{if(typeof v!=="string"||!UUID.test(v))throw new IntelError(422,"invalid_request","Identificador inválido.");return v.toLowerCase();};
export function resourceHandlers({deps,auth,readQuota,errorResponse}) {
  return Object.fromEntries(["discoveries","discovery","relations","relation","funnels","funnel","summary","evidence"].map(resource=>[resource,async req=>{
    const method=["discovery","relation"].includes(resource)?"POST":"GET",methods=method+", OPTIONS";
    const pre=deps.preflight(req,methods);if(pre)return pre;
    try {
      const user=await auth(req);
      if(req.method!==method)throw new IntelError(405,"invalid_request","Método inválido.");
      let query={resource},body;
      if(method==="POST") {
        body=await deps.readJson(req,{maxBytes:8192});
        if(!body||typeof body!=="object"||Array.isArray(body))throw invalid();
        query.id=uuid(body.id);actionKey(body.idempotency_key);
        if(!Number.isSafeInteger(body.expected_version)||body.expected_version<1||!statuses[resource==="discovery"?"discoveries":"relations"].includes(body.status)||
          (body.reason!==undefined&&(typeof body.reason!=="string"||body.reason.length>2000)))throw invalid();
      } else {
        const params=new URL(req.url).searchParams;
        if(["funnel","evidence"].includes(resource))query.id=uuid(params.get("id"));
        else {
          if(params.has("job_id")) {
            if(resource==="summary"||params.has("offer_id")||params.has("offer_ref_kind"))throw invalid();
            query.job_id=uuid(params.get("job_id"));
          } else {
            const ref=Object.fromEntries(params);validateReferenceInput(ref);
            if(!ref.offer_id||!ref.offer_ref_kind)throw invalid();
            query.reference={offer_id:ref.offer_id,offer_ref_kind:ref.offer_ref_kind};
          }
          const {limit,cursor}=pagination(params);query.limit=limit;
          query.sort=params.get("sort")||"recent";
          if(!["recent",...(resource==="discoveries"?["ads"]:[])].includes(query.sort))throw invalid();
          query.type=params.get("type")||null;query.status=params.get("status")?.split(",")||null;query.q=params.get("q")?.trim()||null;
          if((query.type&&!kinds[resource]?.includes(query.type))||(query.status&&query.status.some(s=>!statuses[resource]?.includes(s)))||(query.q&&(resource!=="discoveries"||query.q.length>200)))throw invalid();
          query.fingerprint=hash(stableJson(query));
          if(cursor&&(cursor.fingerprint!==query.fingerprint||!Number.isSafeInteger(cursor.rank)||cursor.rank<0))throw invalid();
          query.cursor=cursor;
        }
      }
      await readQuota(user);
      const services=deps.getServices();
      await refreshBudgetUsage(services);
      const limits=publicLimits(services.capabilities);
      let snapshot=null;
      if(query.reference){const ref=await resolveReference(query.reference,services.reader);query.scope=ref.scope_key;snapshot=ref.seed_snapshot;delete query.reference;}
      // Funnels are snapshots per investigation: the offer view lists one per registered product page.
      const offerMap=async()=>offerFunnels((await services.storage.read({resource:"funnels",scope:query.scope,job_id:null,limit:100,sort:"recent",type:null,status:null,q:null,cursor:null}))?.items||[],snapshot);
      if(method==="POST") {
        const review={entity_type:resource,id:query.id,status:body.status,expected_version:body.expected_version,reason:body.reason||null};
        const row=await services.storage.review({...review,actor_id:user.id,idempotency_key:body.idempotency_key,request_hash:hash(stableJson(review))});
        const detail=await services.storage.read(query);
        return deps.json(req,200,{ok:true,...(resource==="discovery"?publicDiscovery:publicRelation)({...row,evidence:detail?.evidence||[]}),limits},methods);
      }
      const result=resource==="funnels"&&snapshot?{items:await offerMap()}:await services.storage.read(query);
      if(resource==="summary"&&result?.counts&&snapshot)result.counts={...result.counts,funnels:(await offerMap()).length};
      if(!result)throw new IntelError(404,"not_found","Registro não encontrado.");
      if(resource==="summary")return deps.json(req,200,{ok:true,...result,
        active_job:result.active_job?{...publicJob(result.active_job),limits}:null,last_job:result.last_job?{...publicJob(result.last_job),limits}:null,limits},methods);
      if(resource==="funnel"||resource==="evidence")return deps.json(req,200,{ok:true,...(resource==="funnel"?publicFunnel:publicEvidence)(result),limits},methods);
      const project=resource==="discoveries"?publicDiscovery:resource==="relations"?publicRelation:r=>({id:r.id,investigation_id:r.investigation_id,title:r.title,
        origin_url:r.origin_url,final_url:r.final_url,steps_count:r.steps_count,created_at:r.created_at});
      const items=result.items.slice(0,query.limit),last=items.at(-1);
      const next_cursor=result.items.length>query.limit&&!(resource==="funnels"&&snapshot)?Buffer.from(JSON.stringify({id:last.id,created_at:cursorTimestamp(last.created_at),rank:last.rank||0,fingerprint:query.fingerprint})).toString("base64url"):null;
      return deps.json(req,200,{ok:true,items:items.map(project),next_cursor,limits},methods);
    }catch(error){return errorResponse(req,error);}
  }]));
}
