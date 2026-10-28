import {fetchPublicPage} from './offer-intel-url-safety.mjs';
import {createDomainExplorer,extractPublicDocument} from './offer-intel-domain.mjs';
import {classifyStep} from './offer-intel-classifier.mjs';
import {recordId,urlSeeds} from './offer-intel-records.mjs';
import {SCAN_LIMITS,extractScanPage,pixelIds,uniqueRows,rootDomain,hostMatches,domainAdsUrl,observedUrl,attr} from './offer-intel-scan-extract.mjs';
import {discoverScanSources,inScanScope} from './offer-intel-scan-sources.mjs';
import {resolveVsl} from './offer-intel-scan-media.mjs';
import {IntelError} from './offer-intel-core.mjs';

// Ad landings sometimes point at the ad platform itself (fb.com/l.php, wa.me…): those are never the offer's domain.
const PLATFORM_HOSTS=['facebook.com','fb.com','fb.me','fbcdn.net','instagram.com','messenger.com','whatsapp.com','wa.me','m.me',
  'tiktok.com','youtube.com','youtu.be','google.com','linktr.ee','bit.ly','x.com','twitter.com','pinterest.com','linkedin.com'];
export const platformHost=host=>PLATFORM_HOSTS.some(root=>hostMatches(String(host||'').toLowerCase(),root));

export function createDomainScansCollector({storage,fetchPage=fetchPublicPage,clock=Date.now}) {
  return {async run(job,{checkpoint=async()=>{},deadline=clock()+10*60*1000}={}) {
    deadline=Math.min(deadline,clock()+10*60*1000)-15000;
    const hosts=new Map();let requests=0;
    const state=host=>{
      if(!hosts.has(host)&&hosts.size<20)hosts.set(host,{host,pages:new Map(),subdomains:new Set(),brands:new Set(),signals:{checkout:[],pixels:[],tech:[],vsl:[],ctas:[],assets:{images:[],videos:[]}},scripts:new Map()});
      return hosts.get(host);
    };
    function mergeSignals(s,signals){for(const key of ['checkout','pixels','tech','vsl','ctas'])s.signals[key]=uniqueRows([...s.signals[key],...signals[key]]).slice(0,key==='pixels'?500:400);
      for(const key of ['images','videos'])s.signals.assets[key]=uniqueRows([...s.signals.assets[key],...signals.assets[key]],r=>r.url).slice(0,SCAN_LIMITS.assets);
    }
    function observe(s,url,source,response,html){
      const doc=extractPublicDocument(html,url),classification=classifyStep({url,title:doc.title,text:doc.text,html,http_status:response.status,inaccessible_reason:doc.inaccessible_reason});
      for(const value of [doc.title,doc.h1,...[...html.matchAll(/<meta\b[^>]{0,8192}>/gi)].filter(m=>attr(m[0],'property')==='og:site_name').map(m=>attr(m[0],'content'))])if(value&&s.brands.size<8)s.brands.add(value);
      const old=s.pages.get(url);if(!old&&s.pages.size>=SCAN_LIMITS.pages)return false;
      const contentType=response.headers?.['content-type'];
      const verified=response.status>=200&&response.status<300&&(!contentType||/text\/html|application\/xhtml\+xml/i.test(contentType))&&classification.verification!=='inaccessible';
      s.pages.set(url,{url,title:doc.title,kind:classification.kind,http_status:response.status,verified,sources:[...new Set([...(old?.sources||[]),source])]});
      if(verified){const signals=extractScanPage(html,url);mergeSignals(s,signals);for(const script of signals.scripts){const u=new URL(script);
        if((hostMatches(u.hostname,rootDomain(s.host))||(u.hostname==='www.googletagmanager.com'&&u.pathname==='/gtm.js'&&/^GTM-[A-Z0-9]+$/.test(u.searchParams.get('id')||'')))&&s.scripts.size<SCAN_LIMITS.scripts)s.scripts.set(script,url);}
        for(const link of doc.links)add(s,link,'link');
      }
      return true;
    }
    function add(s,url,source,extra={}){url=inScanScope(url,s.host);if(!url)return false;
      const old=s.pages.get(url);if(!old&&s.pages.size>=SCAN_LIMITS.pages)return false;
      if(extra.observation)return observe(s,url,source,extra.observation,extra.observation.text);
      s.pages.set(url,{url,title:extra.title||old?.title||null,kind:old?.kind||'unknown',http_status:old?.http_status??null,verified:old?.verified||false,sources:[...new Set([...(old?.sources||[]),source])]});return !old;
    }
    const fence={job_id:job.id,lease_token:job.lease_token};
    const saved=await storage.workerState(fence);
    for(const url of [...urlSeeds(job),...saved.evidence.filter(e=>e.source==='apify'&&e.evidence_key.startsWith('apify:domain:')).map(e=>e.source_url)]) {
      const valid=observedUrl(url);if(valid&&!platformHost(new URL(valid).hostname)){const s=state(new URL(valid).hostname);if(s)add(s,valid,'link');}
    }
    const onObservation=({response,html})=>{const host=new URL(response.final_url).hostname;
      if(![...hosts.keys()].some(seed=>hostMatches(host,rootDomain(seed))))return;
      const s=state(host);if(s)observe(s,response.final_url,'link',response,html);};
    // Existing durable evidence/funnels remain authoritative and are not overwritten by scans.
    const base=await createDomainExplorer({storage,fetchPage,onObservation}).run(job,{checkpoint,deadline:Math.min(deadline,clock()+180000)});
    let completed=0,partial=false;
    for(const s of hosts.values()) {
      const origin='https://'+s.host;let hostRequests=0;
      const request=async(url,options={})=>{
        if(clock()>=deadline||requests>=600||hostRequests>=200)throw new IntelError(503,'scan_limit','Orçamento do scan atingido.',true);
        await checkpoint({});requests++;hostRequests++;
        const res=await fetchPage(url,{...options,maxBytes:Math.min(options.maxBytes||2*1024*1024,2*1024*1024),timeoutMs:Math.max(1,Math.min(options.timeoutMs||8000,deadline-clock()))});
        if(res.status>=400&&options.requireSuccess)throw Error('source_http');
        return {...res,text:new TextDecoder().decode(res.body,{stream:!!res.truncated}),bytes:res.body.length};
      };
      const sources=[{name:'link',status:'succeeded',count:[...s.pages.values()].filter(p=>p.verified).length}];
      if(![...s.pages.values()].some(p=>p.verified)&&clock()<deadline)try{const r=await request([...s.pages.keys()][0]||origin);observe(s,r.final_url,'link',r,r.text);}catch(e){if(e?.code==='conflict')throw e;sources[0].status='failed';}
      sources.push(...await discoverScanSources({host:s.host,origin,request,addPage:(...args)=>add(s,...args),addSubdomain:host=>{if(s.subdomains.size>=400)return false;const n=s.subdomains.size;s.subdomains.add(host);return n!==s.subdomains.size;},pages:s.pages,brands:[...s.brands],now:clock}));
      let scriptCount=0,scriptFailed=false;
      for(const [url,page_url] of s.scripts)try{const r=await request(url,{maxBytes:SCAN_LIMITS.script_bytes,requireSuccess:true});s.signals.pixels=uniqueRows([...s.signals.pixels,...pixelIds(r.text,page_url)]).slice(0,500);scriptCount++;}catch(e){if(e?.code==='conflict')throw e;scriptFailed=true;}
      sources.push({name:'scripts',status:scriptFailed?'failed':'succeeded',count:scriptCount});
      let mediaCount=0,mediaFailed=false;
      for(let i=0;i<Math.min(8,s.signals.vsl.length);i++)try{s.signals.vsl[i]=await resolveVsl(s.signals.vsl[i],(u,o)=>request(u,{...o,requireSuccess:true}));mediaCount++;}catch(e){if(e?.code==='conflict')throw e;mediaFailed=true;}
      sources.push({name:'vsl',status:mediaFailed?'failed':'succeeded',count:mediaCount});
      const status=sources.some(x=>x.status==='failed')?'partial':'succeeded';partial ||= status==='partial';
      await storage.scanPersist({...fence,scan:{id:recordId(job.id,'scan',s.host),host:s.host,registrable:rootDomain(s.host),status,sources,
        data:{pages:[...s.pages.values()],subdomains:[...s.subdomains],...s.signals,ads_library:{domain_search_url:domainAdsUrl(s.host)}}}});
      completed++;
    }
    return {...base,...(completed?{status:'succeeded',error:partial?{code:'scan_sources_incomplete',message:'Raio-X salvo; algumas fontes públicas não responderam ou atingiram o orçamento.'}:base.error}:{}),result_count:base.result_count};
  }};
}
