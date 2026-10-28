import { LIMITS, normalizeUrl, hash } from "./offer-intel-core.mjs";
import { fetchPublicPage } from "./offer-intel-url-safety.mjs";
import { classifyStep } from "./offer-intel-classifier.mjs";
import { documentSignals, CONTENT_LINK_LIMIT, nonFunnelPage } from "./offer-intel-document.mjs";
import { recordId, evidence, urlSeeds, knownDomainMatches } from "./offer-intel-records.mjs";

export function extractPublicDocument(html,url) {
  const doc=documentSignals(html,url);
  let path="";try{path=new URL(url).pathname;}catch{}
  const loginPath=/(?:^|\/)(?:account\/login|login|password)\/?$/i.test(path);
  const loginHeading=/^(?:log\s?in|sign in|customer login|entrar(?: na conta)?|acessar conta)(?:\s*[|–—:-].*)?$/i;
  const commercial=/\b(add to cart|buy now|shop now|subscribe|adicionar ao carrinho|comprar agora)\b/i.test(doc.text)||
    /<form\b[^>]*\saction\s*=\s*["'][^"']*\/cart\/add/i.test(doc.forms);
  const passwordForm=/<input\b[^>]*\stype\s*=\s*["']?password(?:["'\s>])/i.test(doc.forms);
  const restricted=loginPath||loginHeading.test(doc.title)||loginHeading.test(doc.h1)||(passwordForm&&!commercial)?"login":
    /captcha|verify you are human|checking your browser|just a moment/i.test(doc.title+" "+doc.text.slice(0,2000))?"captcha":null;
  const technologies=[];
  for(const [label,pattern] of [["WordPress",/wp-content\//i],["Shopify",/cdn\.shopify\.com/i],["VTurb",/vturb|smartplayer/i],["Vimeo",/player\.vimeo\.com/i],["Wistia",/wistia/i],["Hotmart",/hotmart\.com/i],["Kiwify",/kiwify\.com/i]])
    if(pattern.test(html))technologies.push(label);
  return {...doc,technologies,inaccessible_reason:restricted};
}
function step(job,funnel,url,observed,extra={}) {
  const normalized=normalizeUrl(url);
  return {id:recordId(funnel,normalized.key),funnel_id:funnel,url_key:normalized.key,original_url:normalized.url,final_url:null,
    title:null,label:null,kind:"unknown",verification:"inferred",classification_basis:{version:1,signals:[],method:"unvisited_link"},
    technologies:[],redirects:[],http_status:null,inaccessible_reason:null,screenshot_status:"unavailable",observed_at:observed,...extra};
}
/** Only public GETs through pinned DNS. fetchPage is dependency injection for local FAKE HTTP tests. */
export function createDomainExplorer({storage,fetchPage=fetchPublicPage,now=()=>new Date().toISOString()}) {
  return {async run(job,{checkpoint=async()=>{},deadline=Date.now()+12*60*1000}={}) {
    const fence={job_id:job.id,lease_token:job.lease_token},saved=await storage.workerState(fence);
    const completed=new Map(saved.evidence.filter(e=>{
      if(e.source!=="domain_explorer"||!e.payload?.checkpoint)return false;
      const reason=e.payload.inaccessible_reason||e.payload.detail;
      return !(e.verification==="inaccessible"&&/^(http_(408|425|429|5\d\d)|timeout|fetch_failed|response_too_large)$/.test(reason));
    }).map(e=>[e.evidence_key,e]));
    const discovered=saved.evidence.filter(e=>e.source==="apify"&&e.evidence_key.startsWith("apify:domain:")).flatMap(e=>{
      try{return [normalizeUrl(e.source_url).url];}catch{return [];}
    });
    const seeds=[...new Set([...urlSeeds(job),...discovered])].slice(0,LIMITS.max_pages);
    const queue=seeds.map(url=>({url,root:url,depth:0})),seen=new Set(queue.map(x=>x.root+"|"+x.url));
    let visited=0,failed=0,interrupted=false,counts=saved.counts;
    while(queue.length&&visited<LIMITS.max_pages) {
      if(Date.now()>deadline-60000){interrupted=true;break;} // Leave time to checkpoint before the runtime ceiling.
      const batch=queue.splice(0,Math.min(LIMITS.concurrency,LIMITS.max_pages-visited));
      const observations=await Promise.all(batch.map(async item=>{
        const key="domain:"+hash(item.root+"|"+item.url),old=completed.get(key);
        if(old)return {item,key,old};
        try {
          const response=await fetchPage(item.url);
          // Streaming decode retains an unfinished UTF-8 suffix instead of inventing U+FFFD.
          const html=new TextDecoder("utf-8").decode(response.body,{stream:!!response.truncated});
          const doc=extractPublicDocument(html,response.final_url);
          const type=response.headers["content-type"]||"";
          if(response.status>=400)doc.inaccessible_reason="http_"+response.status;
          else if(type&&!/text\/html|application\/xhtml\+xml/i.test(type))doc.inaccessible_reason="unsupported_content_type";
          const classification=classifyStep({url:response.final_url,title:doc.title,text:doc.text,html,http_status:response.status,inaccessible_reason:doc.inaccessible_reason});
          return {item,key,response,doc,classification,content_hash:hash(html)};
        }catch(error){
          if(error?.code==="conflict")throw error;
          return {item,key,response:{final_url:null,redirects:error?.redirects||[],status:null},doc:{title:null,links:[],technologies:[]},
            classification:classifyStep({inaccessible_reason:error?.code==="blocked_url"?"blocked_url":error?.code==="response_too_large"?"response_too_large":/Tempo limite|abort|timeout/i.test(error?.message||"")?"timeout":"fetch_failed"})};
        }
      }));
      for(const observation of observations) {
        const {item,key,old}=observation;visited++;
        const links=(old?.payload.links||observation.doc.links).filter(url=>!nonFunnelPage(url)).slice(0,CONTENT_LINK_LIMIT);
        const inaccessible=old?old.verification==="inaccessible":observation.classification.verification==="inaccessible";
        if(inaccessible)failed++;
        const children=[],targets=[];
        if(!inaccessible)for(const url of links) {
          const identity=item.root+"|"+url;
          if(!seen.has(identity)&&item.depth<LIMITS.max_depth&&seen.size<LIMITS.max_pages){
            seen.add(identity);const child={url,root:item.root,depth:item.depth+1};queue.push(child);children.push(child);
          }
          // Fetch admission and graph adjacency are independent: cycles/convergence
          // must survive even at the depth/page ceiling, without enqueuing twice.
          if(seen.has(identity))targets.push(url);
        }
        const observed=now(),funnel=recordId(job.id,"funnel",normalizeUrl(item.root).key);
        const currentId=recordId(funnel,normalizeUrl(item.url).key);
        const edges=targets.map(url=>{
          const to=recordId(funnel,normalizeUrl(url).key);return {id:recordId(funnel,currentId,to,"link"),funnel_id:funnel,from_step_id:currentId,to_step_id:to,kind:"link",verification:"verified"};
        });
        if(old){
          // Rebuild adjacency from durable observations too, without another HTTP GET.
          counts=await storage.persist({...fence,batch:{steps:children.map(c=>step(job,funnel,c.url,observed)),edges}});
          await checkpoint({counts,progress_detail:{done:visited,total:seen.size}});continue;
        }
        const current=step(job,funnel,item.url,observed,{final_url:observation.response.final_url,title:observation.doc.title,label:observation.doc.title,
          technologies:observation.doc.technologies,redirects:observation.response.redirects,http_status:observation.response.status,...observation.classification});
        const steps=[current,...children.map(c=>step(job,funnel,c.url,observed))];
        const relations=[],relationEvidence=[];
        // Redirect intermediate steps make each observed hop explicit in the graph.
        for(const redirect of observation.response.redirects) {
          try {normalizeUrl(redirect.from);normalizeUrl(redirect.to);}catch{continue;}
          const from=step(job,funnel,redirect.from,observed),to=step(job,funnel,redirect.to,observed,
            redirect.to===observation.response.final_url?{final_url:redirect.to,title:observation.doc.title,label:observation.doc.title,
              technologies:observation.doc.technologies,http_status:observation.response.status,...observation.classification}:{final_url:redirect.to});
          if(inaccessible&&redirect===observation.response.redirects.at(-1))Object.assign(to,observation.classification,{final_url:null});
          if(!steps.some(s=>s.id===from.id))steps.push(from);
          if(!steps.some(s=>s.id===to.id))steps.push(to);
          edges.push({id:recordId(funnel,from.id,to.id,"redirect"),funnel_id:funnel,from_step_id:from.id,to_step_id:to.id,kind:"redirect",verification:"verified"});
          const from_key="url:"+normalizeUrl(redirect.from).key,to_key="url:"+normalizeUrl(redirect.to).key,id=recordId(job.scope_key,from_key,to_key,"redirect");
          relations.push({id,from_key,to_key,relation_type:"redirect",reason:"Redirecionamento HTTP observado; não prova propriedade comum."});
          relationEvidence.push(evidence(job,"redirect:"+hash(redirect.from+"|"+redirect.to),{relation_id:id,source:"domain_explorer",source_url:redirect.from,
            verification:"verified",payload:{detail:"HTTP "+redirect.status+" redirecionou para "+redirect.to}},observed));
        }
        const domain=new URL(item.url).hostname,discoveryId=recordId(job.scope_key,"domain","domain:"+domain);
        const records={relations,funnels:[{id:funnel,entry_key:normalizeUrl(item.root).key,title:item.depth===0?observation.doc.title:null,
          start_step_id:recordId(funnel,normalizeUrl(item.root).key)}],steps,edges,
          discoveries:[{id:discoveryId,type:"domain",identity_key:"domain:"+domain,data:{title:domain,domain,url:item.url,source:"domain_explorer",existing_matches:knownDomainMatches(job,domain)}}],
          evidence:[evidence(job,key,{source:"domain_explorer",source_url:item.url,step_id:current.id,discovery_id:discoveryId,
            verification:current.verification,content_hash:observation.content_hash||null,
            payload:{checkpoint:true,root:item.root,depth:item.depth,links,inaccessible_reason:current.inaccessible_reason,
              truncated:!!observation.response.truncated,warnings:observation.response.truncated?["html_truncated"]:[],
              detail:current.inaccessible_reason||(observation.response.truncated?"html_truncated: prefixo HTML observado até o teto de bytes; classificação limitada aos sinais presentes.":"Documento HTTP público observado; classificação baseada nos sinais registrados.")}},observed),...relationEvidence]};
        counts=await storage.persist({...fence,batch:records});
        await checkpoint({counts,progress_detail:{done:visited,total:seen.size}});
      }
    }
    const sourceFailed=interrupted||(visited>0&&failed===visited);
    return {status:sourceFailed?"failed":"succeeded",result_count:visited,counts,counts_mode:"absolute",
      ...(sourceFailed?{error:{code:"provider_error",message:interrupted?"Exploração interrompida pelo prazo do worker.":"Nenhuma página pôde ser consultada."}}:
        failed?{error:{code:"pages_inaccessible",message:"Aviso: "+failed+" de "+visited+" páginas ficaram inacessíveis; as demais foram processadas."}}:{})};
  }};
}
