import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fetchPublicPage} from '../lib/offer-intel-url-safety.mjs';
import {extractScanPage,extractCtas,pixelIds,SCAN_LIMITS} from '../lib/offer-intel-scan-extract.mjs';
import {discoverScanSources,probePaths} from '../lib/offer-intel-scan-sources.mjs';
import {resolveVsl} from '../lib/offer-intel-scan-media.mjs';
import {createDomainScansCollector} from '../lib/offer-intel-domain-scans.mjs';
import {publicDomainScan} from '../lib/offer-intel-scan-public.mjs';
import {createFAKEWorkerStorage} from './offer-intel-FAKE-worker-storage.mjs';
import {createIntelHandlers} from '../netlify/functions/_offer-intel-api.mjs';
const root='https://brand.example',acc='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',mid='bbbbbbbbbbbbbbbbbbbbbbbb';
test('QA-R6-B03 cached crawler preserves the same investigation scan observations',async()=>{
 const j={id:randomUUID(),lease_token:randomUUID(),scope_key:'offer:FAKE',seed_url:root,seed_snapshot:{}};
 const storage=createFAKEWorkerStorage(j),calls=[];
 const fetchPage=FAKEPage(u=>u.href===root+'/'?{body:'<title>Brand</title><main><a href="/special-page">Discover offer</a></main>'}:u.href===root+'/special-page'?{body:'<title>Special offer</title><script>fbq("init","123456789");</script><img src="/special.jpg">'}:{status:404},calls);
 const collector=createDomainScansCollector({storage,fetchPage});
 await collector.run(j);
 const first=structuredClone([...storage.records.scans.values()][0]);
 assert.equal(first.data.pages.find(p=>p.url===root+'/special-page').verified,true);
 assert.ok(first.data.pixels.some(p=>p.id==='123456789'));
 await collector.run(j);
 const second=[...storage.records.scans.values()][0];
 assert.deepEqual(second.data.pixels,first.data.pixels);
 assert.deepEqual(second.data.assets,first.data.assets);
 assert.deepEqual(second.data.pages.find(p=>p.url===root+'/special-page'),first.data.pages.find(p=>p.url===root+'/special-page'));
 assert.equal(calls.filter(c=>c.url===root+'/special-page').length,1);
 assert.equal(calls.filter(c=>c.url===root+'/').length,1);
 const before=calls.length;
 storage.scanRead=async()=>{throw Error('FAKE read unavailable');};
 await assert.rejects(()=>collector.run(j),/FAKE read unavailable/);
 assert.equal(calls.length,before);assert.deepEqual([...storage.records.scans.values()][0],second);
});
test('QA-R6-B04 prose, commented scripts and JSON are not pixel installations',()=>{
 const prose='<p>Manual: exemplo G-AAAA1234 e GTM-EXAMPLE, não instalados.</p>';
 assert.deepEqual(extractScanPage(prose,root).pixels,[]);
 assert.deepEqual(extractScanPage(prose+'<!-- <script>fbq("init","123");</script> --><script type="application/ld+json">{"example":"G-AAAA1234"}</script><script src="https://googletagmanager.com.evil.example/gtm.js?id=GTM-EXAMPLE"></script>',root).pixels,[]);
 const installed=extractScanPage(prose+'<script>fbq("init","123");gtag("config","G-INSTALLED");</script><script src="https://www.googletagmanager.com/gtm.js?id=GTM-REAL"></script>',root).pixels;
 assert.deepEqual(installed.map(p=>p.id),['123','G-INSTALLED','GTM-REAL']);
});
const html=`<title>Brand Offer</title><h1>Brand</h1><a href="https://pay.hotmart.com/O123">Buy</a><a href="https://hotmart.com.evil.example/">No</a>
<script>fbq('init','111');fbq('init','222');ttq.load('TIKTOK123');gtag('config','G-AAAA');gtag('config','G-BBBB');</script>
<script src="/pixels.js"></script><script src="https://www.googletagmanager.com/gtm.js?id=GTM-ABCD"></script>
<script src="https://scripts.converteai.net/${acc}/players/player123/player.js"></script>
<div class="elementor-hidden delay" data-show-on="90"><a href="https://pay.kiwify.com.br/123">Buy now</a></div>
<div data-settings='{"_animation_delay":120000}'><smartplayer-anchor-button data-href="/checkout">Continue</smartplayer-anchor-button></div>
<img src="/image.jpg" srcset="/image2.jpg 2x"><video poster="/poster.jpg" src="/video.mp4"></video>`;
function FAKEPage(routes,calls=[]){return (url,options={})=>fetchPublicPage(url,{...options,lookup:async host=>[{address:host==='private.brand.example'?'127.0.0.1':'8.8.8.8',family:4}],transport:async(u,_ips,opts)=>{
 calls.push({url:u.href,...opts});const r=routes(u);return {status:r.status??200,headers:r.headers||{'content-type':'text/html'},body:Buffer.from(r.body||''),truncated:false};
}});}
test('R6 anchored checkout/tech, all pixel IDs, hidden CTA timing and bounded assets',()=>{
 const data=extractScanPage(html,root);
 assert.ok(data.checkout.some(x=>x.platform==='Hotmart'));assert.ok(!data.checkout.some(x=>x.url.includes('evil')));
 assert.deepEqual(data.pixels.filter(p=>p.type==='meta').map(p=>p.id),['111','222']);assert.equal(data.pixels.filter(p=>p.type==='ga4').length,2);
 assert.ok(data.tech.some(t=>t.name==='VTurb'));assert.equal(data.vsl.find(v=>v.provider==='vturb').pitch_s,90);
 assert.equal(data.ctas.find(c=>c.href==='https://pay.kiwify.com.br/123').hidden,true);
 assert.equal(data.ctas.find(c=>c.href===root+'/checkout').show_on_s,120);
 assert.equal(extractCtas('<button data-hide-on="20">Close offer</button>',root)[0].text,'Close offer');
 const assets=extractScanPage(Array.from({length:90},(_,i)=>`<img src="/${i}.jpg">`).join(''),root);assert.equal(assets.assets.images.length,60);
 assert.equal(extractScanPage('<script src="https://converteai.net.evil.example/player.js"></script>',root).tech.length,0);
});
test('R6 VTurb player JS resolves HLS best bandwidth and EXTINF duration with SSRF on every hop',async()=>{
 const calls=[],fetchPage=FAKEPage(u=>u.pathname.endsWith('player.js')?{body:`var media="${acc}/${mid}/main.m3u8"`}:u.pathname.endsWith('main.m3u8')?{body:'#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=100,RESOLUTION=640x360\nlow.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=900,RESOLUTION=1920x1080\nhigh.m3u8'}:{body:'#EXTM3U\n#EXTINF:10.5,\na.ts\n#EXTINF:20,\nb.ts\n#EXT-X-ENDLIST'},calls);
 const request=async(u,o)=>{const r=await fetchPage(u,o);return {...r,text:r.body.toString()};};
 const result=await resolveVsl(extractScanPage(html,root).vsl.find(v=>v.provider==='vturb'),request);
 assert.equal(result.duration_s,30.5);assert.equal(result.height,1080);assert.equal(result.pitch_s,90);assert.equal(calls.length,3);
 assert.ok(calls.every(c=>c.maxBytes===512*1024));
 const unsafe=async(u,o)=>{const r=await FAKEPage(()=>({status:302,headers:{location:'http://169.254.169.254/'}}))(u,o);return {...r,text:r.body.toString()};};
 await assert.rejects(()=>resolveVsl({provider:'hls',media_url:'https://cdn.example/main.m3u8'},unsafe),e=>e.code==='blocked_url');
});
test('R6 sitemap depth/children/loc caps, WP and all OSINT sources preserve unverified provenance',async()=>{
 const pages=new Map(),subs=new Set(),calls=[];
 const request=async(url,opts)=>{calls.push({url,opts});const u=new URL(url);let text='',status=200;
 if(u.pathname==='/robots.txt')text='Sitemap: '+root+'/sitemap_index.xml';
 else if(u.pathname==='/sitemap_index.xml')text='<sitemapindex>'+Array.from({length:15},(_,i)=>`<loc>${root}/child${i}.xml</loc>`).join('')+'</sitemapindex>';
 else if(/child\d+/.test(u.pathname))text='<urlset>'+Array.from({length:300},(_,i)=>`<loc>${root}/${u.pathname.slice(1)}-${i}</loc>`).join('')+'</urlset>';
 else if(u.pathname.includes('wp-json'))text=JSON.stringify([{link:root+'/wp',title:{rendered:'WordPress'}}]);
 else if(u.hostname==='web.archive.org')text=root+'/old\nhttps://evil.example/';
 else if(u.hostname==='urlscan.io')text=JSON.stringify({results:[{page:{url:root+'/scan'}}]});
 else if(u.hostname==='otx.alienvault.com')text=JSON.stringify({url_list:[{url:root+'/otx'}]});
 else if(u.hostname==='crt.sh')text=JSON.stringify([{name_value:'*.sub.brand.example\nevil.example'}]);
 else status=404;
 return {text,status,bytes:text.length,final_url:url};};
 const sources=await discoverScanSources({host:'brand.example',origin:root,request,pages,addSubdomain:h=>{subs.add(h);return true;},addPage:(url,source)=>{const old=pages.get(url);pages.set(url,{url,sources:[...(old?.sources||[]),source]});return !old;}});
 assert.ok(calls.filter(c=>/child\d+\.xml$/.test(c.url)).length<=10);assert.ok([...pages.values()].filter(p=>p.sources.includes('sitemap')).length<=2000);
 assert.ok(sources.every(s=>s.status==='succeeded'));assert.ok(subs.has('sub.brand.example'));assert.ok(!subs.has('evil.example'));
 for(const name of ['wayback','urlscan','otx','wp'])assert.ok([...pages.values()].some(p=>p.sources.includes(name)));
 assert.ok(calls.filter(c=>!c.url.startsWith(root)).every(c=>c.opts.timeoutMs===8000));
});
test('R6 OSINT failures independent, soft404 sentinel rejects clones/redirects, block responses stop probes',async()=>{
 for(const mode of ['soft','block']){
  const calls=[],accepted=[],pages=new Map();let inflight=0,max=0;
  const request=async(url)=>{calls.push(url);const u=new URL(url);if(!url.startsWith(root))throw Error('FAKE external outage');
   if(u.pathname==='/robots.txt'||/xml|wp-json/.test(u.pathname))return {status:404,text:'',bytes:0,final_url:url};
   inflight++;max=Math.max(max,inflight);await Promise.resolve();inflight--;
   if(mode==='block')return {status:403,text:'blocked',bytes:7,final_url:url};
   const genuine=u.pathname==='/upsell',redirect=u.pathname==='/dn';return {status:200,text:genuine?'<title>Upsell</title>':'<title>Missing</title>',bytes:1000,final_url:redirect?root+'/':url};};
  const sources=await discoverScanSources({host:'brand.example',origin:root,request,pages,addSubdomain:()=>false,addPage:u=>{accepted.push(u);return true;}});
  assert.ok(sources.filter(s=>['wayback','urlscan','otx','crtsh'].includes(s.name)).every(s=>s.status==='failed'));
  const probes=calls.filter(u=>u.startsWith(root)&&!(/xml|wp-json|robots/.test(u)));assert.ok(probes.length<=121);assert.ok(max<=4);
  if(mode==='soft')assert.deepEqual(accepted,[root+'/upsell']);else {assert.ok(probes.length<=12);assert.equal(accepted.length,0);}
 }
});
test('R6 collector uses real SSRF transport validation for pages/sources/scripts and persists safe scan snapshots',async()=>{
 const calls=[],j={id:randomUUID(),lease_token:randomUUID(),scope_key:'offer:FAKE',seed_url:root,seed_snapshot:{}};
 const storage=createFAKEWorkerStorage(j),page=FAKEPage(u=>{
  if(u.hostname==='brand.example'&&u.pathname==='/')return {body:html};
  if(u.pathname==='/pixels.js')return {body:"fbq('init','333');"};
  if(u.hostname==='www.googletagmanager.com')return {body:"fbq('init','444');"};
  if(u.hostname==='web.archive.org')return {body:root+'/archive\nhttp://127.0.0.1/'};
  if(u.hostname==='urlscan.io')return {body:'{"results":[]}'};
  if(u.hostname==='otx.alienvault.com')return {body:'{"url_list":[]}'};
  if(u.hostname==='crt.sh')return {body:'[]'};
  if(u.pathname.endsWith('player.js'))return {body:`'${acc}/${mid}/main.m3u8'`};
  if(u.pathname.endsWith('.m3u8'))return {body:'#EXTM3U\n#EXTINF:20,\nx.ts\n#EXT-X-ENDLIST'};
  return {status:404};
 },calls);
 await createDomainScansCollector({storage,fetchPage:page}).run(j);
 assert.equal(storage.records.scans.size,1);const scan=publicDomainScan([...storage.records.scans.values()][0]);
 assert.ok(scan.pixels.some(p=>p.id==='444'));assert.ok(scan.pages.length<=400);assert.equal(scan.pages.find(p=>p.url===root+'/archive').verified,false);
 assert.ok(scan.ads_library.domain_search_url.includes('total_impressions'));assert.ok(!JSON.stringify(scan).includes('player_url'));
 assert.ok(calls.length<=220);assert.ok(!calls.some(c=>c.url.includes('127.0.0.1')));
 for(const host of ['web.archive.org','urlscan.io','otx.alienvault.com','crt.sh','www.googletagmanager.com','scripts.converteai.net','cdn.converteai.net']){
  let hit=false;await assert.rejects(()=>fetchPublicPage('https://'+host+'/',{lookup:async()=>[{address:'10.0.0.1',family:4}],transport:async()=>{hit=true;}}),e=>e.code==='blocked_url');assert.equal(hit,false);
 }
});
test('R6 scan handlers enforce real admin auth/UUID/scope and public allowlist',async()=>{
 const id=randomUUID(),row={id,host:'brand.example',registrable:'brand.example',status:'succeeded',created_at:new Date().toISOString(),sources:[],data:{pages:[{url:root,verified:true,sources:['link'],html:'PRIVATE'}],vsl:[{provider:'vturb',player_url:'PRIVATE',media_url:'https://cdn.example/v?apiKey=PRIVATE'}],secret:'PRIVATE'}};
 for(const [auth,admin,quota,expected] of [[null,true,true,401],[{id},false,true,403],[{id},true,false,429],[{id},true,true,200]]) {
  let reads=0;const h=createIntelHandlers({authenticate:async()=>auth,isAdmin:()=>admin,rateLimit:async()=>({allowed:quota}),getServices:()=>({capabilities:{},storage:{scanRead:async q=>{reads++;return q.id?row:{items:[row]};}}})});
  for(const name of ['domain-scan','domain-scans']){const r=await h[name](new Request('https://benchmarkinggrupofeg.site/?'+(name==='domain-scan'?'id=':'job_id=')+id));assert.equal(r.status,expected);if(expected===200)assert.ok(!(await r.text()).includes('PRIVATE'));}
  if(expected!==200)assert.equal(reads,0);
 }
});
test('R6 all pixel families, no generic Bing ti false positive, and no CDN checkout',()=>{
 const source=`fbq('init','1');ttq.load('TT123');gtag('config','G-ABCD');GTM-AAAA;AW-123;
 _tfa.push({id: 234});obApi('obAdvId','345');pintrk('load','456');snaptr('init','snap-id');
 var uetq=[];var o={ti:'567'};hjid:678;clarity('init','clarity123');`;
 assert.equal(new Set(pixelIds(source,root).map(p=>p.type)).size,12);
 assert.equal(pixelIds('var x={ti:123};',root).length,0);
 const data=extractScanPage('<script src="https://js.stripe.com/v3"></script><script src="https://cdn.shopify.com/theme.js"></script><a href="/cart">Cart</a>',root);
 assert.deepEqual(data.checkout.map(c=>c.platform),['Shopify']);
});
test('R6 probe byte sentinel boundary, 429 stop, and 25-second budget',async()=>{
 for(const mode of ['bytes','429','deadline']){
  let tick=0,probes=0;const accepted=[];
  const request=async url=>{
   if(!url.startsWith(root))throw Error('FAKE');const u=new URL(url);
   if(/robots|xml|wp-json/.test(u.pathname))return {status:404,text:'',bytes:0,final_url:url};
   probes++;if(mode==='deadline')tick+=10000;
   const sentinel=u.pathname.includes('missing');return {status:mode==='429'?429:200,text:'<title>Same</title>',bytes:sentinel?1000:u.pathname==='/up'?1256:1257,final_url:url};
  };
  await discoverScanSources({host:'brand.example',origin:root,request,pages:new Map(),now:()=>tick,addSubdomain:()=>false,addPage:u=>{accepted.push(u);return true;}});
  if(mode==='bytes'){assert.ok(!accepted.includes(root+'/up'));assert.ok(accepted.includes(root+'/upsell'));assert.ok(probes<=120);}
  if(mode==='429')assert.ok(probes<=12);
  if(mode==='deadline')assert.ok(probes<=4);
 }
});
test('R6 cancelled scans never write snapshots or continue network; MP4 bounded mvhd metadata',async()=>{
 const j={id:randomUUID(),lease_token:randomUUID(),scope_key:'offer:FAKE',seed_url:root,seed_snapshot:{}};
 const storage=createFAKEWorkerStorage(j);let calls=0;
 await assert.rejects(()=>createDomainScansCollector({storage,fetchPage:async url=>{calls++;storage.cancel();return {status:200,headers:{},final_url:url,redirects:[],body:Buffer.from('<title>Public</title>')};}}).run(j),e=>e.code==='conflict');
 assert.equal(calls,1);assert.equal(storage.records.scans.size,0);
 const body=Buffer.alloc(48);body.write('mvhd',4);body.writeUInt32BE(1000,20);body.writeUInt32BE(90000,24);
 const result=await resolveVsl({provider:'mp4',media_url:'https://cdn.example/video.mp4'},async(_u,o)=>{assert.equal(o.maxBytes,512*1024);return {body};});
 assert.equal(result.duration_s,90);
});
test('R6 listed pages and same-site scripts are capped; title/h1/site-name radicals include acronyms',async()=>{
 assert.ok(probePaths('brand.example',[],['Herbal Health']).includes('/hh-v2'));
 const j={id:randomUUID(),lease_token:randomUUID(),scope_key:'offer:FAKE',seed_url:root,seed_snapshot:{}};
 const storage=createFAKEWorkerStorage(j),calls=[];
 const page=FAKEPage(u=>{
  if(u.href===root+'/')return {body:'<title>Brand</title>'+Array.from({length:12},(_,i)=>`<script src="/s${i}.js"></script>`).join('')};
  if(u.hostname==='web.archive.org')return {body:Array.from({length:1500},(_,i)=>root+'/p'+i).join('\n')};
  if(/\/s\d+\.js/.test(u.pathname))return {body:"fbq('init','111');"};
  return {status:404};
 },calls);
 await createDomainScansCollector({storage,fetchPage:page}).run(j);
 const row=[...storage.records.scans.values()][0];assert.equal(row.data.pages.length,400);
 const scripts=calls.filter(c=>/\/s\d+\.js$/.test(c.url));assert.equal(scripts.length,6);assert.ok(scripts.every(c=>c.maxBytes===512*1024));
});

test("ad-platform hosts are never scanned as offer domains", async () => {
  const { platformHost } = await import("../lib/offer-intel-domain-scans.mjs");
  for (const h of ["fb.com", "l.facebook.com", "www.instagram.com", "wa.me", "youtu.be"]) assert.equal(platformHost(h), true, h);
  for (const h of ["astavin.co", "shop.ultimapeak.com", "notfacebook.com"]) assert.equal(platformHost(h), false, h);
});

test("Apify landings on the ad platform itself do not become domain discoveries", async () => {
  const { apifyRecords } = await import("../lib/offer-intel-apify.mjs");
  const job = { id: "j", scope_key: "offer:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", offer_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", offer_ref_kind: "offer", seed_snapshot: { data: {} } };
  const items = [{ adArchiveId: "111", pageId: "222", snapshot: { linkUrl: "https://fb.com/some-page" } },
    { adArchiveId: "333", pageId: "222", snapshot: { linkUrl: "https://astavin.co/products/x" } }];
  const out = apifyRecords(job, items, "run", [], new Date().toISOString());
  const domains = out.discoveries.filter(d => d.type === "domain").map(d => d.data.domain);
  assert.deepEqual(domains, ["astavin.co"]);
});
