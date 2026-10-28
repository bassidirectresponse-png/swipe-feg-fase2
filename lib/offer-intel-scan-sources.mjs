import {randomUUID} from 'node:crypto';
import {decodeEntities} from './offer-intel-document.mjs';
import {displayText} from './offer-intel-display.mjs';
import {SCAN_LIMITS,rootDomain,hostMatches,observedUrl} from './offer-intel-scan-extract.mjs';

export function inScanScope(value,host){const url=observedUrl(value);if(!url)return null;const u=new URL(url);return hostMatches(u.hostname,rootDomain(host))&&!/^\/cdn-cgi(?:\/|$)/i.test(u.pathname)?url:null;}
export function probePaths(host,pages=[],title='') {
  const words=['up','upsell','dn','down','downsell','obg','obrigado','thank-you','ty','vsl','vnd','oferta','pre','pos','checkout','quiz','order','special-offer','bonus','members','upgrade'];
  const brand=(title||host.split('.')[0]).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40);
  const slugs=[brand,host.split('.')[0],...pages.map(p=>new URL(p.url).pathname.split('/').filter(Boolean).at(-1)).filter(Boolean)].slice(0,6);
  return [...new Set([...words.map(w=>'/'+w),...slugs.flatMap(s=>['-2','-v2','-01'].map(v=>'/'+s+v)),
    ...words.flatMap(w=>[...slugs.slice(0,2).map(s=>'/'+s+'-'+w),...['fb','og','ig','yt','tt','2','3','v1','v2','01'].map(v=>'/'+w+'-'+v)])])].slice(0,SCAN_LIMITS.probes);
}
export async function discoverScanSources({host,origin,request,addPage,addSubdomain,pages,now=Date.now}) {
  const sources=[];
  async function source(name,run){let count=0;try{count=await run();sources.push({name,status:'succeeded',count});}catch(e){if(e?.code==='conflict')throw e;sources.push({name,status:'failed',count,error:{code:e?.code==='blocked_url'?'blocked_url':'source_failed',message:'Não foi possível concluir esta fonte pública.'}});}}
  const get=async url=>{const res=await request(url,{timeoutMs:SCAN_LIMITS.external_ms});if(res.status>=400)throw Error('HTTP');return res;};
  await source('sitemap',async()=>{
    const roots=new Set(['/sitemap_index.xml','/sitemap.xml','/wp-sitemap.xml'].map(p=>origin+p));let count=0,children=0,locs=0;
    try{const robots=(await get(origin+'/robots.txt')).text;for(const m of robots.matchAll(/^\s*Sitemap:\s*(\S+)/gim)){const u=inScanScope(m[1],host);if(u&&roots.size<13)roots.add(u);}}catch(e){if(e?.code==='conflict')throw e;}
    const visited=new Set();let successes=0;
    async function xml(url,depth){if(visited.has(url)||locs>=SCAN_LIMITS.locs)return;visited.add(url);
      const r=await get(url);successes++;const index=/<sitemapindex\b/i.test(r.text);
      for(const m of r.text.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)){
        if(locs++>=SCAN_LIMITS.locs)break;const u=inScanScope(decodeEntities(m[1].replace(/<!\[CDATA\[|\]\]>/g,'').trim()),host);if(!u)continue;
        if(index){if(depth===0&&children<SCAN_LIMITS.sitemaps){children++;try{await xml(u,1);}catch(e){if(e?.code==='conflict')throw e;}}}
        else if(addPage(u,'sitemap'))count++;
      }
    }
    for(const url of roots)try{await xml(url,0);}catch(e){if(e?.code==='conflict')throw e;}
    if(!successes)throw Error('sitemap');return count;
  });
  await source('wp',async()=>{let count=0,ok=0;
    for(const type of ['pages','posts'])try{
      const rows=JSON.parse((await get(origin+'/wp-json/wp/v2/'+type+'?per_page=100&_fields=link,title')).text);
      if(!Array.isArray(rows))throw Error('schema');ok++;
      for(const row of rows.slice(0,100)){const u=inScanScope(row.link,host);if(u&&addPage(u,'wp',{title:displayText(row.title?.rendered||row.title)}))count++;}
    }catch(e){if(e?.code==='conflict')throw e;}
    if(!ok)throw Error('wp');return count;
  });
  await Promise.all([
    source('wayback',async()=>{let count=0;const q=new URLSearchParams({url:host,matchType:'domain',output:'text',fl:'original',collapse:'urlkey',filter:'statuscode:200',limit:'1500'});
      for(const line of (await get('https://web.archive.org/cdx/search/cdx?'+q)).text.split('\n').slice(0,1500)){const u=inScanScope(line.trim(),host);if(u&&addPage(u,'wayback'))count++;}return count;}),
    source('urlscan',async()=>{let count=0;const data=JSON.parse((await get('https://urlscan.io/api/v1/search/?'+new URLSearchParams({q:'domain:'+host,size:'100'}))).text);
      if(!Array.isArray(data.results))throw Error('schema');for(const row of data.results.slice(0,100)){const u=inScanScope(row.page?.url||row.task?.url,host);if(u&&addPage(u,'urlscan'))count++;}return count;}),
    source('otx',async()=>{let count=0;const data=JSON.parse((await get('https://otx.alienvault.com/api/v1/indicators/domain/'+encodeURIComponent(host)+'/url_list?limit=100')).text);
      if(!Array.isArray(data.url_list))throw Error('schema');for(const row of data.url_list.slice(0,100)){const u=inScanScope(row.url,host);if(u&&addPage(u,'otx'))count++;}return count;}),
    source('crtsh',async()=>{let count=0;const data=JSON.parse((await get('https://crt.sh/?'+new URLSearchParams({q:'%.'+rootDomain(host),output:'json'}))).text);
      if(!Array.isArray(data))throw Error('schema');for(const row of data.slice(0,2000))for(const raw of String(row.name_value||'').split('\n')){
        const sub=raw.replace(/^\*\./,'').toLowerCase();if(/^[a-z0-9.-]+$/.test(sub)&&hostMatches(sub,rootDomain(host))&&addSubdomain(sub))count++;}return count;})
  ]);
  await source('probe',async()=>{
    const until=now()+SCAN_LIMITS.probe_ms;let blocked=0,count=0,next=0;
    const sentinelUrl=origin+'/.offer-intel-missing-'+randomUUID();
    const sentinel=await request(sentinelUrl,{timeoutMs:Math.min(8000,until-now())});
    if([403,429].includes(sentinel.status))blocked++;
    const title=html=>displayText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'');
    const sentinelTitle=title(sentinel.text),soft=sentinel.status>=200&&sentinel.status<300;
    const paths=probePaths(host,[...pages.values()],[...pages.values()].find(p=>p.title)?.title).slice(0,SCAN_LIMITS.probes-1);
    await Promise.all(Array.from({length:SCAN_LIMITS.probe_concurrency},async()=>{
      while(next<paths.length&&now()<until&&blocked<SCAN_LIMITS.blocked){const path=paths[next++];let r;
        try{r=await request(origin+path,{timeoutMs:Math.max(1,Math.min(8000,until-now()))});}catch(e){if(e?.code==='conflict')throw e;continue;}
        if([403,429].includes(r.status)){blocked++;continue;}
        if(r.status<200||r.status>=300||new URL(r.final_url).pathname!==path)continue;
        if(soft&&title(r.text)===sentinelTitle&&Math.abs(r.bytes-sentinel.bytes)<=256)continue;
        if(addPage(r.final_url,'probe',{title:title(r.text),http_status:r.status,verified:true,observation:r}))count++;
      }
    }));
    if(blocked>=SCAN_LIMITS.blocked)throw Error('access_limited');return count;
  });
  return sources;
}
