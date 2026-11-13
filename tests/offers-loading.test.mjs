import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import '../lib/offer-catalog.js';
const {SwipeCatalog}=globalThis;
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const fn=name=>html.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`))[0];
const pageCode=fn('loadOfferPage'),loadCode=fn('loadOffers');
function context(fetchPage){const calls=[],queries=[];let timer=0;const timers=new Map();const ctx=vm.createContext({SwipeCatalog,AbortController,console,setSync:()=>{},setTimeout:(fn,ms)=>{const id=++timer;if(ms<1000)queueMicrotask(fn);else timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),sb:{from:()=>{const q={select:value=>{queries.push(value);return q;},in:(key,value)=>{q.filter=[key,value];return q;},order:()=>q,range:(from,to)=>{q.bounds=[from,to];return q;},abortSignal:signal=>{calls.push(q.bounds);return fetchPage(...q.bounds,signal,timers,q);}};return q;}}});vm.runInContext(pageCode,ctx);return{ctx,calls,queries};}
test('transient page failure retries the same offset with a smaller limit',async()=>{let n=0;const{ctx,calls}=context(async()=>++n===1?{error:{message:'Temporary failure'},status:503}:{data:[{id:'saved'}],error:null});const r=await ctx.loadOfferPage(100,100);assert.deepEqual(calls,[[100,199],[100,149]]);assert.equal(r.pageSize,50);assert.equal(r.rows[0].id,'saved');});
test('timed-out request is aborted before retry and does not leave a hanging fetch',async()=>{let n=0,firstSignal;const{ctx,calls}=context((from,to,signal,timers)=>{if(++n>1)return Promise.resolve({data:[],error:null});firstSignal=signal;queueMicrotask(()=>[...timers.values()][0]());return new Promise(()=>{});});await ctx.loadOfferPage(0,100);assert.equal(firstSignal.aborted,true);assert.equal(calls.length,2);});
test('auth failures are not retried or presented as an empty catalog',async()=>{const{ctx,calls}=context(async()=>({error:{message:'Unauthorized'},status:401}));await assert.rejects(()=>ctx.loadOfferPage(0,100),/Unauthorized/);assert.equal(calls.length,1);});
test('list projections exclude full transcripts and analyses for every section',()=>{
 for(const scope of ['index',...Object.keys(SwipeCatalog.kinds)]){
  const keys=SwipeCatalog.columns(scope);
  for(const heavy of ['transcricao','transcricaoPt','transcricaoWords','transcricaoSegments','copy','copyVsl','copyCriativo','adAnalysis','analysis','analysisReport'])assert.ok(!keys.includes(heavy),`${scope}: ${heavy}`);
  const projected=SwipeCatalog.project({id:'1',data:{kind:'criativo',transcricao:'original',adAnalysis:{text:'full'},nome:'Card'}},scope);
  assert.equal(projected.data.transcricao,undefined);assert.equal(projected.data.nome,'Card');assert.equal(SwipeCatalog.isFull(projected),false);
 }
 assert.ok(!SwipeCatalog.columns('index').includes('print'));
 assert.ok(!SwipeCatalog.columns('index').includes('bmReports'));
});
test('section filters execute in the database with a projected select',async()=>{
 const{ctx,queries}=context(async(from,to,signal,timers,q)=>{assert.equal(q.filter[0],'data->>kind');assert.deepEqual(q.filter[1],['brandsvalidated','brandsgeneral']);return{data:[{id:'1',kind:'brandsvalidated',nomeOferta:'Brand',caption:null}]};});
 const r=await ctx.loadOfferPage(0,100,'brandsvalidated');assert.equal(r.rows[0].data.nomeOferta,'Brand');assert.ok(!('caption' in r.rows[0].data));assert.equal(queries[0],SwipeCatalog.select('brandsvalidated'));
});
test('adaptive pagination is atomic and retains the previous catalog on failure',async()=>{
 const calls=[];const ctx=vm.createContext({SwipeCatalog,Set,Map,catalogScopes:new Set(),catalogRequests:new Map(),sectionOf:r=>r.data.kind,offers:[],loadOfferPage:async(from)=>{calls.push(from);return{rows:from<50?Array.from({length:50},(_,i)=>({id:String(i),data:{kind:'criativo'},_catalogLevel:'summary'})):[{id:'50',data:{kind:'criativo'},_catalogLevel:'summary'}],pageSize:50};}});
 vm.runInContext(fn('readCatalogScope')+'\n'+fn('ensureCatalogSection'),ctx);await ctx.ensureCatalogSection('criativo');assert.deepEqual(calls,[0,50]);assert.equal(ctx.offers.length,51);
 ctx.loadOfferPage=async from=>{if(from)throw Error('offline');return{rows:[{id:'new',data:{kind:'criativo'}}],pageSize:1};};await assert.rejects(()=>ctx.ensureCatalogSection('criativo',true),/offline/);assert.equal(ctx.offers.length,51);assert.equal(ctx.catalogRequests.size,0);
});
test('first section renders without waiting for the background index or admin requests',async()=>{
 const events=[];const ctx=vm.createContext({isAdmin:true,requestedCatalogSection:()=> 'noticia',ensureCatalogSection:async section=>events.push(section),setSync:()=>{},applyRoute:()=>events.push('render'),writeCache:()=>{},loadCatalogIndex:()=>{events.push('index');return new Promise(()=>{});},loadAdminEnhancements:()=>new Promise(()=>{})});
 vm.runInContext(loadCode,ctx);assert.equal(await ctx.loadOffers(),true);assert.deepEqual(events,['noticia','render','index']);
});
test('background summaries cannot replace hydrated data or duplicate IDs',()=>{
 const full={id:'1',data:{nome:'Full',transcricao:'KEEP',adAnalysis:{complete:true}}};
 const merged=SwipeCatalog.merge([full],[{id:'1',data:{nome:'Index'},_catalogLevel:'index'},{id:'2',data:{nome:'Two'},_catalogLevel:'summary'}]);
 assert.equal(merged.length,2);assert.equal(merged[0],full);assert.equal(merged[0].data.transcricao,'KEEP');
});
function detailContext(fetchDetail){const ctx=vm.createContext({SwipeCatalog,AbortController,setTimeout,clearTimeout,offers:[{id:'1',data:{kind:'criativo'},_catalogLevel:'summary'}],offerDetailRequests:new Map(),sb:{from:()=>{const q={select:select=>{assert.equal(select,'id,created_at,data');return q;},eq:(key,id)=>{assert.equal(key,'id');q.id=id;return q;},abortSignal:()=>q,single:()=>fetchDetail(q.id)};return q;}}});ctx.itemById=id=>ctx.offers.find(row=>row.id===id);vm.runInContext(fn('ensureOfferDetail'),ctx);return ctx;}
test('details are fetched once per card and reused, preserving every persisted field',async()=>{
 let calls=0,finish;const complete={id:'1',data:{kind:'criativo',transcricao:'original',customField:'preserved',adAnalysis:{complete:true}}};
 const ctx=detailContext(()=>{calls++;return new Promise(resolve=>{finish=resolve;});});
 const a=ctx.ensureOfferDetail('1'),b=ctx.ensureOfferDetail('1');assert.equal(calls,1);finish({data:complete});assert.equal(await a,complete);assert.equal(await b,complete);assert.equal(await ctx.ensureOfferDetail('1'),complete);assert.equal(calls,1);assert.equal(ctx.offerDetailRequests.size,0);
});
test('failed detail reads leave summaries intact, clear pending request and can retry',async()=>{
 let calls=0;const ctx=detailContext(async()=>++calls===1?{error:{message:'offline'}}:{data:{id:'1',data:{transcricao:'recovered'}}});
 await assert.rejects(()=>ctx.ensureOfferDetail('1'),/offline/);assert.equal(ctx.offers[0]._catalogLevel,'summary');assert.equal(ctx.offerDetailRequests.size,0);assert.equal((await ctx.ensureOfferDetail('1')).data.transcricao,'recovered');
});
test('both save paths reject partial documents before constructing or writing a payload',async()=>{
 for(const name of ['saveForm','saveSimpleForm']){let warned=false;const ctx=vm.createContext({SwipeCatalog,requireAdmin:()=>true,editingId:'1',sEditingId:'1',itemById:()=>({id:'1',_catalogLevel:'summary'}),toast:()=>{warned=true;},sb:{from:()=>assert.fail('partial save')}});vm.runInContext(fn(name),ctx);assert.equal(await ctx[name](),false);assert.ok(warned);}
});
test('stale detail response cannot reopen a card after navigating away',async()=>{
 let finish;const elements=new Map();const ctx=vm.createContext({SwipeCatalog,detailViewRequest:0,isAdmin:true,itemById:()=>({_catalogLevel:'summary'}),ensureOfferDetail:()=>new Promise(resolve=>{finish=resolve;}),$:id=>{if(!elements.has(id))elements.set(id,{});return elements.get(id);},openOverlay:()=>{},itemSection:()=>assert.fail('stale detail rendered')});vm.runInContext(fn('openView'),ctx);const pending=ctx.openView('1');ctx.detailViewRequest++;finish({id:'1',data:{}});await pending;
});
test('Fegsys hydrates the linked manual creative without replacing its sales metrics',async()=>{
 const virtual={id:'fegsys:1',manualOfferId:'1',_catalogLevel:'summary',data:{source:'fegsys',nome:'Creative',copy:'',fegsysMetrics:{conversions:7}}};
 const ctx=detailContext(async()=>({data:{id:'1',data:{nome:'Manual',transcricao:'Saved transcript',transcricaoWords:[{word:'Saved',start:0,end:1}]}}}));
 const lookup=ctx.itemById;ctx.itemById=id=>id===virtual.id?virtual:lookup(id);ctx.brainCopyText=d=>d.transcricao||d.copy||'';
 const detail=await ctx.ensureOfferDetail('fegsys:1');assert.equal(detail.data.copy,'Saved transcript');assert.equal(detail.data.fegsysMetrics.conversions,7);assert.equal(detail.data.transcricaoWords.length,1);assert.ok(SwipeCatalog.isFull(detail));assert.equal(SwipeCatalog.group('megabrainfegsys'),'megabrain');
});
test('explicit refresh updates metadata and invalidates previously hydrated details',async()=>{
 const ctx=vm.createContext({SwipeCatalog,Set,Map,catalogScopes:new Set(['criativo']),catalogRequests:new Map(),sectionOf:r=>r.data.kind,offers:[{id:'1',data:{kind:'criativo',nome:'Old',transcricao:'outdated'}}],readCatalogScope:async()=>[{id:'1',data:{kind:'criativo',nome:'Updated'},_catalogLevel:'summary'}]});
 vm.runInContext(fn('ensureCatalogSection'),ctx);await ctx.ensureCatalogSection('criativo',true);assert.equal(ctx.offers[0].data.nome,'Updated');assert.equal(SwipeCatalog.isFull(ctx.offers[0]),false);
});
