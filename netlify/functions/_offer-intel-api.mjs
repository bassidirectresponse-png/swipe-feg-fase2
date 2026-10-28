import { authenticate, isAdmin, trustedOrigin, preflight, json, readJson, rateLimit } from "./_security.mjs";
import { IntelError, UUID, LIMITS, hash, stableJson, normalizeOptions, actionKey, publicJob, pagination } from "../../lib/offer-intel-core.mjs";
import { resolveReference, validateReferenceInput } from "../../lib/offer-intel-reference.mjs";
import { publicLimits, refreshBudgetUsage } from "../../lib/offer-intel-limits.mjs";
import { verifyDispatch } from "../../lib/offer-intel-dispatch.mjs";
import { intelRuntime } from "./_offer-intel-runtime.mjs";
import { resourceHandlers } from "./_offer-intel-read-api.mjs";

const METHODS="GET, POST, OPTIONS";
function objectBody(body) {
  if(!body||typeof body!=="object"||Array.isArray(body)) throw new IntelError(400,"invalid_request","Objeto JSON obrigatório.");
  return body;
}
const statusSet=new Set(["queued","running","partial","succeeded","failed","cancelled"]);
const cleanUuid=value=>{
  if(typeof value!=="string"||!UUID.test(value)) throw new IntelError(422,"invalid_request","Identificador inválido.");
  return value.toLowerCase();
};
function statusFilter(value) {
  if(!value) return null;
  const statuses=value==="active"?["queued","running"]:value.split(",").map(s=>s.trim());
  if(statuses.some(s=>!statusSet.has(s))) throw new IntelError(400,"invalid_request","Status inválido.");
  return [...new Set(statuses)];
}
function sourcesFor(options) {
  return [
    {name:"apify",status:options.collect_ads?"pending":"skipped",result_count:0},
    {name:"domain_explorer",status:options.explore_domains?"pending":"skipped",result_count:0},
    {name:"screenshot",status:options.capture_screenshots?"unavailable":"skipped",result_count:0,
      ...(options.capture_screenshots?{error:{code:"capability_unavailable",message:"Captura indisponível nesta versão"}}:{})},
  ];
}
export function createIntelHandlers(overrides={}) {
  const deps={authenticate,isAdmin,trustedOrigin,preflight,json,readJson,rateLimit,getServices:intelRuntime,...overrides};
  function errorResponse(req,error) {
    const known=error instanceof IntelError;
    const status=known?error.status:([400,413,415].includes(error?.status)?error.status:503);
    const body={ok:false,code:known?error.code:(status===503?"capability_unavailable":"invalid_request"),
      error:known?error.message:(status===503?"Serviço de inteligência indisponível.":"Requisição inválida."),
      retryable:known?error.retryable:status===503,
      ...(error?.limits?{limits:error.limits}:{}),
      ...(error?.retryAfter?{retry_after:Math.ceil(error.retryAfter)}:{})};
    const res=deps.json(req,status,body,METHODS);
    if(status===429) {body.retry_after ||= 60; res.headers.set("Retry-After",String(body.retry_after)); return new Response(JSON.stringify(body),{status,headers:res.headers});}
    return res;
  }
  async function auth(req) {
    if(!["GET","POST"].includes(req.method)) throw new IntelError(405,"invalid_request","Método inválido.");
    if(!deps.trustedOrigin(req)) throw new IntelError(403,"forbidden","Origem não autorizada.");
    const user=await deps.authenticate(req);
    if(!user) throw new IntelError(401,"session_expired","Sessão expirada.");
    if(!deps.isAdmin(user)) throw new IntelError(403,"forbidden","Acesso restrito ao administrador.");
    return user;
  }
  async function readQuota(user) {
    const quota=await deps.rateLimit("offer-intel-read",user.id,{limit:180,windowMs:60000});
    if(!quota.allowed) throw new IntelError(429,"rate_limited","Consultas demais; aguarde.",true,quota.retryAfter);
  }
  async function dispatchResult(services,result) {
    if(result.nonce&&result.job.status==="queued") await services.dispatch(result.job.id,result.nonce);
  }
  async function investigations(req) {
    const options=deps.preflight(req,METHODS); if(options) return options;
    try {
      const user=await auth(req);
      if(req.method==="POST") {
        const body=objectBody(await deps.readJson(req,{maxBytes:16384}));
        validateReferenceInput(body);
        const key=actionKey(body.idempotency_key), opts=normalizeOptions(body.options);
        const services=deps.getServices();
        const ref=await resolveReference(body,services.reader);
        if(ref.seed_url) await services.validateUrl(ref.seed_url);
        await refreshBudgetUsage(services);
        const request_hash=hash(stableJson({scope:ref.scope_key,url:ref.seed_url,options:opts}));
        const limits=publicLimits(services.capabilities);
        let result;
        try {
          result=await services.storage.create({...ref,actor_id:user.id,idempotency_key:key,request_hash,options:opts,limits,sources:sourcesFor(opts),apify_available:limits.apify.available});
        } catch(error) {
          if(error?.code==="credentials_missing") error.limits=limits;
          throw error;
        }
        await dispatchResult(services,result);
        return deps.json(req,202,{ok:true,job_id:result.job.id,status:result.job.status,reused:result.reused,limits:publicLimits(services.capabilities,result.job.created_at)},METHODS);
      }
      await readQuota(user);
      const services=deps.getServices();
      const params=new URL(req.url).searchParams, page=pagination(params);
      const status=statusFilter(params.get("status"));
      let scope;
      if(params.has("offer_id")||params.has("offer_ref_kind")||params.has("url")) {
        const ref=await resolveReference(Object.fromEntries(params),services.reader); scope=ref.scope_key;
      }
      const result=await services.storage.list({...page,scope,status});
      await refreshBudgetUsage(services);
      return deps.json(req,200,{ok:true,items:result.items.map(row=>({...publicJob(row),limits:publicLimits(services.capabilities,row.created_at)})),next_cursor:result.next_cursor,limits:publicLimits(services.capabilities)},METHODS);
    } catch(error) {return errorResponse(req,error);}
  }
  async function job(req) {
    const options=deps.preflight(req,METHODS); if(options) return options;
    try {
      const user=await auth(req);
      if(req.method==="GET") {
        const id=cleanUuid(new URL(req.url).searchParams.get("job_id"));
        await readQuota(user);
        const services=deps.getServices();
        const row=await services.storage.get(id);
        if(!row) throw new IntelError(404,"not_found","Investigação não encontrada.");
        await refreshBudgetUsage(services);
        return deps.json(req,200,{ok:true,...publicJob(row),limits:publicLimits(services.capabilities,row.created_at)},METHODS);
      }
      const body=objectBody(await deps.readJson(req,{maxBytes:8192}));
      const job_id=cleanUuid(body.job_id),key=actionKey(body.idempotency_key);
      if(!["retry","cancel"].includes(body.action)) throw new IntelError(400,"invalid_request","Ação inválida.");
      const services=deps.getServices();
      const result=await services.storage.action({actor_id:user.id,job_id,action:body.action,idempotency_key:key,request_hash:hash(stableJson({job_id,action:body.action}))});
      await refreshBudgetUsage(services);
      await dispatchResult(services,result);
      return deps.json(req,body.action==="retry"?202:200,{ok:true,...publicJob(result.job),limits:publicLimits(services.capabilities,result.job.created_at),reused:result.reused},METHODS);
    } catch(error) {return errorResponse(req,error);}
  }
  async function background(req) {
    try {
      if(req.method!=="POST") throw new IntelError(405,"invalid_request","Método inválido.");
      const services=deps.getServices();
      if(+req.headers.get("content-length")>4096) throw new IntelError(413,"invalid_request","Corpo excede o limite.");
      const raw=await req.text();
      if(Buffer.byteLength(raw)>4096) throw new IntelError(413,"invalid_request","Corpo excede o limite.");
      const signed=verifyDispatch(raw,req.headers,services.secret);
      if(!signed) throw new IntelError(403,"forbidden","Assinatura interna inválida.");
      let row=await services.storage.claim(signed);
      if(!row) return deps.json(req,202,{ok:true},METHODS);
      const token=row.lease_token;
      const deadline=Date.now()+12*60*1000;
      const checkpoint=async patch=>{
        row=await services.storage.checkpoint({job_id:row.id,lease_token:token,patch}); return row;
      };
      try {
        // Validate saved origin again before any future provider call. No data supplied by dispatcher.
        await resolveReference({...(row.offer_id?{offer_id:row.offer_id,offer_ref_kind:row.offer_ref_kind}:{}),...(row.seed_url?{url:row.seed_url}:{})},services.reader);
        if(row.seed_url) await services.validateUrl(row.seed_url);
        const sources=row.sources.map(s=>({...s})),counts={...row.counts};
        const tasks=sources.filter(s=>s.status==="pending");
        let done=0;
        for(const source of tasks) {
          source.status="running";
          await checkpoint({phase:source.name==="apify"?"collect_ads":"explore_domains",progress:Math.round(done/Math.max(1,tasks.length)*80),sources});
          let result;
          try {result=await services.collectors[source.name].run(row,{checkpoint,deadline});}
          catch(error) {
            if(error?.code==="conflict")throw error;
            result={status:"failed",result_count:0,counts:row.counts,counts_mode:"absolute",
              error:{code:error instanceof IntelError?error.code:"provider_error",message:error instanceof IntelError?error.message:"Falha ao consultar a fonte."},retryable:true};
          }
          source.status=result.status;
          source.result_count=result.result_count||0;
          if(result.error) source.error=result.error; else delete source.error;
          // Only adapters that persisted their own auxiliary records may report durable counts.
          for(const key of Object.keys(counts)) counts[key]=result.counts_mode==="absolute"?(Number(result.counts?.[key])||0):counts[key]+(Number(result.counts?.[key])||0);
          done++;
          await checkpoint({sources,counts,progress_detail:{done,total:tasks.length},progress:Math.round(done/Math.max(1,tasks.length)*90)});
        }
        const incomplete=sources.some(s=>["failed","unavailable"].includes(s.status));
        const useful=Object.values(counts).some(n=>n>0);
        const retryable=sources.some(s=>s.status==="failed");
        await checkpoint({status:incomplete?(useful?"partial":"failed"):"succeeded",phase:"done",progress:100,sources,counts,
          error:incomplete?{code:retryable?"provider_error":"capability_unavailable",message:retryable?"Uma ou mais fontes falharam.":"Fontes solicitadas indisponíveis nesta entrega.",retryable}:null});
      } catch(error) {
        if(error?.code==="conflict") return deps.json(req,202,{ok:true},METHODS); // cancellation/lease fencing
        await checkpoint({status:"failed",phase:"done",error:{code:error instanceof IntelError?error.code:"provider_error",message:error instanceof IntelError?error.message:"Falha no processamento.",retryable:error instanceof IntelError?error.retryable:true}}).catch(()=>{});
      }
      return deps.json(req,202,{ok:true},METHODS);
    } catch(error) {return errorResponse(req,error);}
  }
  return {investigations,job,background,...resourceHandlers({deps,auth,readQuota,errorResponse})};
}
