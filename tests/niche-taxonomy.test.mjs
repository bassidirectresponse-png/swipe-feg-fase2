import test from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {taxonomy} from '../lib/niche-taxonomy.mjs';
import {validRow} from '../netlify/functions/github-news-ingest.mjs';
import {unseenRows} from '../lib/niche-ingestion.mjs';
const cases=[
 ['New study finds joint pain treatment benefits','Saúde geral','Articulações'],
 ['Tratamento para dor articular melhora sintomas','Saúde geral','Articulações'],
 ['Rutina de cuidado de la piel para acne','Skin Care','Acne'],
 ['Skincare routine with moisturizer and retinol','Skin Care','Pele'],
 ['Hautpflege mit Retinol fur gesunde Haut','Skin Care','Pele'],
 ['New research on vaginal microbiome health','Saúde feminina','Saúde íntima'],
 ['Libido symptoms and sexual treatment','Libido / Saúde sexual','Libido'],
 ['Insomnia treatment for better sleep quality','Saúde geral','Sono'],
 ['Dog itching treatment for healthy skin','Pet','Coceira'],
 ['Veterinary dental care for dogs','Pet','Dental'],
 ['Human joint pain study and therapy','Saúde geral','Articulações'],
 ['Weight loss treatment benefits','Nutrição/Emagrecimento','Emagrecimento'],
 ['Movie star beauty red carpet',null],['Funny cat video',null],['Joint venture market news',null],['Skincare',null],['Libido',null],['Joint pain',null],['Dog',null],['Dental',null],['Computer sleep mode review',null]
];
test('classification requires topic and context, preserves languages, isolates pets',()=>{for(const [text,nicho,subnicho]of cases){const c=taxonomy.classify(text);assert.equal(c?.nicho||null,nicho,text);if(nicho)assert.equal(c.subnicho,subnicho,text);}});
test('Python collector and JS gateway agree on all classification decisions',()=>{const out=execFileSync('python3',['-c',"import sys,json;sys.path.insert(0,'scripts');from niche_taxonomy import classify;print(json.dumps([classify(s) for s in json.load(sys.stdin)]))"],{input:JSON.stringify(cases.map(c=>c[0])),encoding:'utf8'});assert.deepEqual(JSON.parse(out),cases.map(c=>taxonomy.classify(c[0])));});
test('migration preserves IDs, source references, metrics and ambiguous evidence; second run no-op',()=>{
 const rows=[['Saúde íntima / libido','Saúde íntima','Saúde feminina','Saúde íntima'],['Saúde íntima / libido','Libido','Libido / Saúde sexual','Libido'],['Saúde íntima / libido','Saúde sexual','Libido / Saúde sexual','Saúde sexual'],['Sono/ Beleza','Sono','Saúde geral','Sono'],['Sono/ Beleza','Pele','Skin Care','Pele'],['Saúde Geral/Nutrição','Nutrição','Nutrição/Emagrecimento','Nutrição'],['Saúde Geral/Nutrição','joint pain','Saúde geral','Articulações']];
 for(const [nicho,subnicho,n,t]of rows){const d={kind:'oferta',nicho,subnicho,sourceOfferId:'same-id',favorites:['user'],video:'stored.mp4',bmSpend30d:'real',bibliotecas:[{link:'real'}]};const next={...d,...taxonomy.migrationPatch(d)};assert.equal(next.nicho,n);assert.equal(next.subnicho,t);for(const key of ['sourceOfferId','favorites','video','bmSpend30d','bibliotecas'])assert.deepEqual(next[key],d[key]);assert.equal(taxonomy.migrationPatch(next),null);assert.equal(d.nicho,nicho);}
 const pending=taxonomy.migrationPatch({kind:'oferta',nicho:'Sono/ Beleza',subnicho:'Beleza',nome:'A product'});assert.equal(pending.taxonomyStatus,'review');assert.deepEqual(pending.taxonomyOriginal,{nicho:'Sono/ Beleza',subnicho:'Beleza'});
 assert.equal(taxonomy.migrationPatch({kind:'criativo',division:'organic',nicho:'Pet'}),null);
});
test('ingestion cannot accept valid labels attached to unrelated content',()=>{const data={kind:'noticia',nicho:'Skin Care',subnicho:'Pele',nome:'Skincare routine with moisturizer',resumo:'',fonte:'ScienceDaily',categoria:'portal',topic:'portais-rss',link:'https://www.sciencedaily.com/releases/valid.htm'};assert.equal(validRow({data}),true);assert.equal(validRow({data:{...data,nome:'Movie star red carpet'}}),false);assert.equal(validRow({data:{...data,nicho:'Pet'}}),false);});
test('dedup preserves original sources and refuses a second URL with tracking parameters',async()=>{const d={kind:'noticia',link:'https://example.com/a?utm_source=old'};const fetcher=async()=>Response.json([{id:'old',data:d}]);const rows=[{data:{...d,link:'https://example.com/a?utm_source=new'}},{data:{...d,link:'https://example.com/b'}}];const out=await unseenRows(rows,'https://db.test',{},fetcher);assert.equal(out.length,1);assert.equal(out[0].data.link,'https://example.com/b');await assert.rejects(()=>unseenRows(rows,'https://db.test',{},async()=>new Response('',{status:503})));});
test('closed catalog has distinct groups, topics, all required subjects and retained niches',()=>{assert.equal(new Set(taxonomy.names).size,taxonomy.names.length);for(const topics of Object.values(taxonomy.topics))assert.equal(new Set(topics).size,topics.length);for(const name of ['Sono','Rins','Fígado','Fungos','Zumbido','Memória','Visão','Audição'])assert.ok(taxonomy.topics['Saúde geral'].includes(name));for(const name of ['Coceira','Dental'])assert.ok(taxonomy.topics.Pet.includes(name));assert.ok(!taxonomy.topics['Libido / Saúde sexual'].includes('Saúde íntima'));});

test('maintenance backs up before merging, only patches taxonomy, and resumes idempotently',async()=>{
 const {createTaxonomyMaintenance}=await import('../netlify/functions/niche-taxonomy-maintenance.mjs');
 let rows=[{id:'11111111-1111-4111-8111-111111111111',data:{kind:'oferta',nicho:'Sono/ Beleza',subnicho:'Sono',references:['same'],favorites:['same'],numAdsAtivos:15}}];const backups=new Map(),merges=[];
 const handler=createTaxonomyMaintenance({verify:async()=>{},headers:async()=>({}),fetcher:async()=>Response.json(rows),store:()=>({get:async k=>backups.get(k),setJSON:async(k,v)=>backups.set(k,v)}),merge:async(id,p,fallback)=>{assert.equal(fallback,undefined);assert.ok(backups.size);merges.push(p);rows=rows.map(r=>r.id===id?{...r,data:{...r.data,...p}}:r);}});
 const req=action=>new Request('https://example.com',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})});
 let r=await handler(req('inspect'));assert.equal((await r.json()).changed,1);assert.equal(merges.length,0);
 r=await handler(req('apply'));assert.equal(r.status,200);assert.equal((await r.json()).changed,1);assert.deepEqual(rows[0].data.references,['same']);assert.deepEqual(rows[0].data.favorites,['same']);assert.equal(rows[0].data.numAdsAtivos,15);
 r=await handler(req('apply'));assert.equal((await r.json()).changed,0);assert.equal(merges.length,1);
 const denied=createTaxonomyMaintenance({verify:async()=>{throw Error('denied');}});assert.equal((await denied(req('apply'))).status,401);
});

test('Skin Care headline is not displaced by a secondary cholesterol mention',()=>{
 const text='Common supplement could help fight psoriasis, scientists discover. A study examines psoriasis treatment and cholesterol benefits.';
 assert.equal(taxonomy.classify(text).nicho,'Skin Care');
});


test('manual imports normalize legacy groups and retain ambiguous classification evidence',async()=>{
 const {normalizeTaxonomy}=await import('../netlify/functions/manual-ingest-n8n.mjs');
 const d={kind:'oferta',nomeOferta:'Example',nicho:'Sono/ Beleza',subnicho:'Sono',bibliotecas:[{link:'original'}]};
 const next=normalizeTaxonomy(d);assert.equal(next.nicho,'Saúde geral');assert.equal(next.subnicho,'Sono');assert.deepEqual(next.bibliotecas,d.bibliotecas);
 const pending=normalizeTaxonomy({...d,nicho:'Unknown',subnicho:''});assert.equal(pending.taxonomyStatus,'review');assert.equal(pending.taxonomyOriginal.nicho,'Unknown');
 const updated=normalizeTaxonomy({...next,nicho:'Pet',subnicho:'Dental'});assert.equal(updated.nicho,'Pet');assert.equal(updated.subnicho,'Dental');
});
test('migration fingerprints ignore only taxonomy and detect altered links or deleted IDs',async()=>{
 const {integrityHash}=await import('../netlify/functions/niche-taxonomy-maintenance.mjs');
 const rows=[{id:'one',data:{nicho:'Sono/ Beleza',subnicho:'Sono',favorites:['u'],links:['original']}}];
 assert.equal(integrityHash(rows),integrityHash(rows.map(r=>({...r,data:{...r.data,...taxonomy.migrationPatch(r.data)}}))));
 assert.notEqual(integrityHash(rows),integrityHash([]));
 assert.notEqual(integrityHash(rows),integrityHash([{...rows[0],data:{...rows[0].data,links:['changed']}}]));
});
