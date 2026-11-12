import test from 'node:test';import assert from 'node:assert/strict';
import plan from '../netlify/functions/_niche-review-plan.json' with {type:'json'};
import {taxonomy} from '../lib/niche-taxonomy.mjs';
import {classifyReviewText,evidenceHash,REVIEW_VERSION} from '../lib/niche-review.mjs';
import {validateContent} from '../lib/niche-ingestion.mjs';
import {createReviewMaintenance} from '../netlify/functions/niche-review-maintenance.mjs';
test('historical recovery uses compound tags and adjacent context without accepting a lone tag',()=>{
 for(const [text,n,s]of [
  ['#gynaecology #womenshealth #menopause #femalehealth','Saúde feminina','Menopausa'],
  ['Coffee contains cafestol. It raises LDL cholesterol. Research shows higher blood lipid levels.','Saúde Cardiovascular','Colesterol'],
  ['Dog supplements for #jointhealth and mobility','Pet','Articulações'],
  ['Dog dental calculus caused kidney failure. #petdentalhealth #dogsoftiktok','Pet','Dental'],
  ['collagen is good for skin','Skin Care','Pele'],
 ]){const c=classifyReviewText(text);assert.equal(c?.nicho,n,text);assert.equal(c?.subnicho,s,text);}
 for(const s of ['Libido','Skincare','Joint pain','Funny dog','Computer sleep mode review','#nutritionhacks','@MORE NUTRITION'])assert.equal(classifyReviewText(s),null,s);
});
test('fixed review plan is complete, unique, canonical and writes only classification',()=>{
 assert.equal(plan.total,1719);assert.equal(new Set(plan.records.map(r=>r.id)).size,1719);
 for(const r of plan.records){assert.match(r.hash,/^[a-f0-9]{64}$/);assert.equal(r.patch.taxonomyReview.version,REVIEW_VERSION);assert.ok(r.patch.taxonomyReview.sourceIds.includes(r.id));assert.ok(['classified','review','out_of_scope'].includes(r.patch.taxonomyStatus));if(r.patch.taxonomyStatus==='classified')assert.ok(taxonomy.topics[r.patch.nicho]?.includes(r.patch.subnicho));for(const k of Object.keys(r.patch))assert.ok(['nicho','subnicho','taxonomyStatus','taxonomyReview'].includes(k));}
});
test('reviewed feed records display approved classifications without relaxing collection validation',()=>{
 const d={kind:'noticia',nome:'stored short headline',nicho:'Saúde geral',subnicho:'Sono',taxonomyStatus:'classified',taxonomyReview:{version:REVIEW_VERSION}};
 assert.deepEqual(taxonomy.reviewedClassification(d),{nicho:'Saúde geral',subnicho:'Sono'});
 assert.equal(taxonomy.reviewedClassification({...d,taxonomyStatus:'out_of_scope'}),null);
 assert.equal(taxonomy.reviewedClassification({...d,taxonomyReview:{version:'forged'}}),undefined);
 assert.equal(validateContent({...d,nome:'Insomnia treatment study'}),false);
});
test('review maintenance verifies current evidence, backs up, atomically patches and reruns without writes',async()=>{
 const id='11111111-1111-4111-8111-111111111111';let rows=[{id,data:{kind:'tiktok',caption:'Insomnia treatment for better sleep',nicho:'Pendente de revisão',taxonomyStatus:'review',favorites:['keep'],views:18}}];
 const patch={nicho:'Saúde geral',subnicho:'Sono',taxonomyStatus:'classified',taxonomyReview:{version:REVIEW_VERSION,sourceIds:[id],method:'stored_text'}};
 const manifest={version:REVIEW_VERSION,records:[{id,hash:evidenceHash(rows[0].data),related:[],patch}]};const backup=new Map();let writes=0;
 const handler=createReviewMaintenance({manifest,verify:async()=>{},headers:async()=>({}),fetcher:async()=>Response.json(rows),store:()=>({get:async k=>backup.get(k),setJSON:async(k,v)=>backup.set(k,v)}),merge:async(key,p,fallback)=>{assert.equal(fallback,undefined);assert.ok(backup.size);writes++;rows[0].data={...rows[0].data,...p};}});
 const req=action=>new Request('https://example.com',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,offset:0})});
 let r=await handler(req('inspect')),before=await r.json();assert.equal(before.changed,1);assert.equal(writes,0);
 r=await handler(req('apply'));assert.equal(r.status,200);assert.equal(writes,1);assert.equal(rows[0].data.views,18);assert.deepEqual(rows[0].data.favorites,['keep']);
 // JSONB reorders keys: idempotence compares values, not object serialization order.
 rows[0].data.taxonomyReview={method:'stored_text',sourceIds:[id],version:REVIEW_VERSION};
 r=await handler(req('inspect'));const after=await r.json();assert.equal(after.changed,0);assert.equal(after.integrity,before.integrity);
 rows[0].data={...rows[0].data,taxonomyReview:undefined,taxonomyStatus:'review',caption:'New evidence after preparation'};
 assert.equal((await handler(req('apply'))).status,409);assert.equal(writes,1);
 const denied=createReviewMaintenance({verify:async()=>{throw Error('no');}});assert.equal((await denied(req('apply'))).status,401);
});
