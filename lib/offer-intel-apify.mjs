import { IntelError, LIMITS, hash, stableJson, identityKey, normalizeUrl } from "./offer-intel-core.mjs";
import { extractOfferSearchTargets, buildMetaPageLibraryUrl, buildCostControlledApifyInput } from "./apify-offer-discovery.mjs";
import { safePublicUrl } from "./offer-intel-public.mjs";
import { recordId, evidence, knownDomainMatches } from "./offer-intel-records.mjs";

export const APIFY_ACTOR="apify~facebook-ads-scraper";
const fail=message=>new IntelError(502,"provider_error",message,true);
const providerId=value=>{if(typeof value!=="string"||!/^\w{1,100}$/.test(value))throw fail("Identificador do provedor inválido.");return value;};
const metaId=value=>typeof value==="string"&&/^\d{1,40}$/.test(value)?value:null;
const label=(value,max=500)=>typeof value==="string"?value.slice(0,max):null;
export function apifyPlan(job) {
  const targets=extractOfferSearchTargets(job.seed_snapshot?.data||{}, {maxQueries:LIMITS.max_queries});
  const urls=[...new Set([...targets.existingPageIds.map(id=>buildMetaPageLibraryUrl(id)),...targets.searchUrls])].filter(Boolean).slice(0,LIMITS.max_queries);
  if(!urls.length)return null;
  return {...buildCostControlledApifyInput(urls,{maxQueries:LIMITS.max_queries,resultsLimit:LIMITS.results_per_query}),knownPages:targets.existingPageIds};
}
export function apifyRecords(job,items,runId,knownPages,observed) {
  const discoveries=new Map(),relations=new Map(),proofs=new Map();
  const add=(type,id,data)=>{
    const key=identityKey(type,id),entity=recordId(job.scope_key,type,key);
    discoveries.set(key,{id:entity,type,identity_key:key,data:{...data,source:"apify",ads_count:null}});
    const e=evidence(job,"apify:"+key,{discovery_id:entity,source:"apify",source_url:data.url,provider_run_id:runId,verification:"verified",
      payload:{detail:"Registro público retornado pela biblioteca Meta. Associação de página/anúncio observada; não prova propriedade comum."}},observed);
    proofs.set(e.evidence_key,e);return {key,id:entity};
  };
  for(const row of items.slice(0,LIMITS.max_queries*LIMITS.results_per_query)) {
    const ad=metaId(row.adArchiveId??row.ad_archive_id),page=metaId(row.pageId??row.page_id??row.snapshot?.pageId??row.snapshot?.page_id);
    if(!ad&&!page)continue;
    const snapshot=row.snapshot||{},page_name=label(row.pageName??row.page_name??snapshot.pageName??snapshot.page_name,300);
    let link=null;
    try {link=normalizeUrl(snapshot.linkUrl??snapshot.link_url??row.linkUrl).url;}catch{/* Unusable remote URL does not discard valid Meta identity. */}
    const thumbnail=safePublicUrl(snapshot.images?.[0]?.originalImageUrl??snapshot.images?.[0]?.original_image_url);
    let adEntity,pageEntity;
    if(ad)adEntity=add("ad",ad,{title:label(snapshot.title)||page_name,page_id:page,page_name,url:"https://www.facebook.com/ads/library/?id="+ad,
      thumbnail_url:thumbnail,domain:link?new URL(link).hostname:null});
    if(page)pageEntity=add("page",page,{title:page_name,page_id:page,page_name,url:buildMetaPageLibraryUrl(page),thumbnail_url:null,
      ...(knownPages.includes(page)&&job.offer_id?{existing_matches:[{ref_kind:job.offer_ref_kind,ref_id:job.offer_id,label:page_name}]}:{})});
    if(adEntity&&pageEntity) {
      const id=recordId(job.scope_key,adEntity.key,pageEntity.key,"same_page");
      relations.set(id,{id,from_key:adEntity.key,to_key:pageEntity.key,relation_type:"same_page",reason:"Anúncio retornado com este Page ID na biblioteca pública."});
      proofs.set("relation:"+id,evidence(job,"relation:"+id,{relation_id:id,source:"apify",source_url:"https://www.facebook.com/ads/library/?id="+ad,
        provider_run_id:runId,verification:"verified",payload:{detail:"Page ID "+page+" observado no anúncio "+ad+"."}},observed));
    }
    if(link) {
      const domain=normalizeUrl(link).hostname;
      add("domain",domain,{title:domain,domain,url:link,existing_matches:knownDomainMatches(job,domain)});
    }
  }
  return {discoveries:[...discoveries.values()],relations:[...relations.values()],evidence:[...proofs.values()]};
}
/** Real adapter. Tests inject a clearly named FAKE fetch and Blobs/storage implementation.
 * Run API has no documented start idempotency parameter. The unique User-Agent is recorded
 * in Run.meta.userAgent (https://docs.apify.com/api/v2/actors-runs-post). Reconcile via GETs;
 * missing/ambiguous matches remain unknown and NEVER trigger a second charged POST.
 */
export function createApifyCollector({storage,budget,token,fetcher=fetch,now=()=>new Date().toISOString()}) {
  async function api(path,{method="GET",body,userAgent}={}) {
    const response=await fetcher("https://api.apify.com/v2/"+path,{method,redirect:"error",
      headers:{Authorization:"Bearer "+token,"Content-Type":"application/json","User-Agent":userAgent||"SwipeFEG-OfferIntel/1"},
      ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw fail("Provedor de anúncios retornou erro HTTP "+response.status+".");
    // Limit JSON bytes as well as requested dataset items.
    const reader=response.body.getReader(),chunks=[];let size=0;
    for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;
      if(size>4*1024*1024){await reader.cancel();throw fail("Resposta do provedor excede o limite.");}chunks.push(Buffer.from(value));}
    try{return JSON.parse(Buffer.concat(chunks).toString("utf8"));}catch{throw fail("Resposta inválida do provedor.");}
  }
  return {async run(job,{checkpoint=async()=>{},deadline=Date.now()+12*60*1000}={}) {
    const timeRemaining=()=>{if(Date.now()>deadline-60000)throw fail("Prazo do worker atingido; retome a execução existente.");};
    timeRemaining();
    if(!token)throw new IntelError(503,"credentials_missing","Coleta Apify não configurada.");
    const plan=apifyPlan(job);
    if(!plan)return {status:"succeeded",result_count:0,counts:(await storage.workerState({job_id:job.id,lease_token:job.lease_token})).counts,counts_mode:"absolute"};
    const query_key=hash(stableJson(plan.actorInput)),reservation=hash(job.id+":"+query_key),marker="SwipeFEG-OfferIntel/1 reservation/"+reservation;
    const fence={job_id:job.id,lease_token:job.lease_token,query_key};
    let saved=await storage.provider({...fence,request:{input:plan.actorInput,marker}}),run;
    const save=async patch=>{saved=await storage.provider({...fence,expected_state:saved.state,patch});return saved;};
    if(saved.state==="reserved") {
      const reserved=await budget.reserve(reservation);
      await save({state:"starting",usage:reserved});
      // No automatic POST retry, including network error or failure to save its response.
      try {
        const result=await api("acts/"+APIFY_ACTOR+"/runs?timeout="+plan.runOptions.timeoutSecs+"&memory="+plan.runOptions.memoryMbytes+"&maxItems="+plan.runOptions.maxItems+"&restartOnError=false",
          {method:"POST",body:plan.actorInput,userAgent:marker});
        run=result.data;providerId(run?.id);
        await save({state:"running",provider_run_id:run.id,dataset_id:run.defaultDatasetId?providerId(run.defaultDatasetId):null});
      }catch(error){
        if(error?.code==="conflict")throw error;
        await save({state:"unknown"}).catch(()=>{});
        throw fail("Início da coleta incerto; a próxima tentativa fará apenas reconciliação.");
      }
    } else if(["starting","unknown"].includes(saved.state)&&!saved.provider_run_id) {
      if(saved.state==="starting")await save({state:"unknown"});
      const recent=await api("acts/"+APIFY_ACTOR+"/runs?desc=true&limit=100");
      const candidates=[];
      // Bounded inspection: uncertain/incomplete results are left unknown, never restarted.
      for(const item of (recent.data?.items||[]).slice(0,10)) {
        timeRemaining();
        if(Date.parse(item.startedAt)<Date.parse(saved.created_at)-60000)continue;
        await checkpoint({});
        const detail=(await api("actor-runs/"+providerId(item.id))).data;
        if(detail?.meta?.userAgent===marker)candidates.push(detail);
      }
      if(candidates.length!==1)throw fail("Execução incerta; não houve correspondência única na reconciliação.");
      run=candidates[0];await save({state:"running",provider_run_id:providerId(run.id),dataset_id:run.defaultDatasetId?providerId(run.defaultDatasetId):null});
    }
    if(!saved.provider_run_id)throw fail("Execução sem identificador recuperável.");
    if(saved.state==="failed"||saved.state==="cancelled")throw fail("Execução anterior terminou sem sucesso; nenhuma nova cobrança foi iniciada.");
    for(let poll=0;poll<8;poll++) {
      timeRemaining();
      await checkpoint({});
      if(!run||!["SUCCEEDED","FAILED","ABORTED","TIMED-OUT"].includes(run.status))
        run=(await api("actor-runs/"+providerId(saved.provider_run_id)+"?waitForFinish=20")).data;
      if(run?.status==="SUCCEEDED")break;
      if(["FAILED","ABORTED","TIMED-OUT"].includes(run?.status)){await save({state:"failed"});throw fail("A execução do provedor terminou sem sucesso.");}
      run=null;
    }
    if(run?.status!=="SUCCEEDED")throw fail("Coleta ainda em andamento; a tentativa seguinte retomará o mesmo run.");
    const dataset=providerId(run.defaultDatasetId||saved.dataset_id);
    // Persist identity/state before fetching data. A crash can only re-read this same dataset.
    await save({state:"succeeded",dataset_id:dataset});
    const items=await api("datasets/"+dataset+"/items?clean=true&limit="+plan.runOptions.maxItems);
    if(!Array.isArray(items))throw fail("Dataset inválido.");
    const records=apifyRecords(job,items,saved.provider_run_id,plan.knownPages,now());
    const counts=await storage.persist({...fence,batch:records});
    await checkpoint({counts});
    return {status:"succeeded",result_count:records.discoveries.length,counts,counts_mode:"absolute"};
  }};
}
