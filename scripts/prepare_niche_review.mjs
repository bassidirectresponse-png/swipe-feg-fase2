// Reproducible preparation from local snapshots only; this script never fetches a source.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {taxonomy} from '../lib/niche-taxonomy.mjs';
import {REVIEW_VERSION,directEvidence,evidenceHash} from '../lib/niche-review.mjs';
import {editorialGroups,productGroups,excludedGroups,imageGroups,imageExcluded} from './niche_review_overrides.mjs';
const input=process.argv[2]||'/tmp/swipe-taxonomy-review-source.json';
const rows=JSON.parse(fs.readFileSync(input)).rows,all=new Map(rows.map(r=>[r.id,r]));
const targets=rows.filter(r=>r.data.taxonomyStatus==='review'||taxonomy.migrationPatch(r.data)?.taxonomyStatus==='review');
const decisions=new Map(targets.map(row=>[row.id,directEvidence(row)]));
function resolve(prefix){const list=targets.filter(r=>r.id.startsWith(prefix));if(list.length!==1)throw Error('Ambiguous/missing ID '+prefix);return list[0];}
for(const [nicho,subnicho,reason,ids] of [...editorialGroups,...productGroups])for(const prefix of ids.split(' ')){
 const row=resolve(prefix);decisions.set(row.id,{nicho,subnicho,method:'saved_evidence_review',reason,sourceIds:[row.id]});
}
for(const [reason,ids]of excludedGroups)for(const prefix of ids.split(' '))decisions.set(resolve(prefix).id,{status:'out_of_scope',method:'saved_evidence_review',reason,sourceIds:[resolve(prefix).id]});
const imageEvidence=new Map(JSON.parse(fs.readFileSync('/tmp/swipe-review-images.json')).map(e=>[e.id,e]));
for(const [nicho,subnicho,reason,ids]of imageGroups)for(const prefix of ids.split(' ')){
 const row=resolve(prefix),image=imageEvidence.get(row.id);if(!image)throw Error('Missing saved image '+prefix);
 decisions.set(row.id,{nicho,subnicho,method:'saved_image_review',reason,sourceIds:[row.id],image:{url:image.url,sha256:image.sha256}});
}
for(const [reason,ids]of imageExcluded)for(const prefix of ids.split(' ')){
 const row=resolve(prefix),image=imageEvidence.get(row.id);if(!image)throw Error('Missing saved image '+prefix);
 decisions.set(row.id,{status:'out_of_scope',method:'saved_image_review',reason,sourceIds:[row.id],image:{url:image.url,sha256:image.sha256}});
}
const productRows=rows.filter(r=>['oferta','brandsvalidated','brandsgeneral'].includes(r.data.kind||'oferta'));
const key=s=>taxonomy.normalize(s);const parentClass=r=>{const result=decisions.get(r.id);if(result?.nicho)return result;const m=taxonomy.migrationPatch(r.data);return m?.taxonomyStatus==='classified'?m:r.data.taxonomyStatus==='classified'?r.data:null;};
for(const row of targets){if(decisions.get(row.id)||!['criativo','presell'].includes(row.data.kind))continue;
 const d=row.data;let parent=d.sourceOfferId?all.get(d.sourceOfferId):null;
 if(!parent&&d.marca){const candidates=productRows.filter(p=>[p.data.nomeMarca,p.data.nomeOferta].filter(Boolean).some(n=>key(n)===key(d.marca)));if(candidates.length===1)parent=candidates[0];}
 const p=parent&&parentClass(parent);if(p?.nicho&&taxonomy.topics[p.nicho]?.includes(p.subnicho))decisions.set(row.id,{nicho:p.nicho,subnicho:p.subnicho,method:'linked_product',reason:'Identidade/vínculo exato com produto cadastrado; classificação comprovada no produto.',sourceIds:[row.id,parent.id],related:[{id:parent.id,hash:evidenceHash(parent.data)}]});
}
const cached=JSON.parse(fs.readFileSync('/tmp/swipe-review-cached-2026-11-11.json'));
const cachedCriteria={'619d0e28':/oregano/i,'aae43a35':/garlic/i,'cb417139':/testosterone/i,'f2f2faf8':/blood sugar/i,'f5197a64':/l.carnitine/i,'d9a86663':/astaxanthin/i,'f9785ac8':/astaxanthin/i};
const host=url=>{try{return new URL(url).hostname.replace(/^www\./,'');}catch{return '';}};
for(const [prefix,pattern]of Object.entries(cachedCriteria)){
 const row=resolve(prefix),domains=(row.data.dominios||[]).map(d=>host(d.linkDominio)).filter(Boolean);
 const evidence=cached.ads.filter(ad=>ad.offer_id===row.id&&pattern.test(ad.ad_text||'')&&domains.some(h=>host(ad.landing_url)===h||host(ad.landing_url).endsWith('.'+h))).slice(0,2);
 if(!evidence.length)throw Error('Missing exact-domain cached ad for '+prefix);
 decisions.get(row.id).cachedAds=evidence.map(ad=>({id:ad.id,reportId:ad.report_id,offerId:row.id,landingUrl:ad.landing_url,textHash:createHash('sha256').update(ad.ad_text).digest('hex')}));
}
const plan=targets.map(row=>{
 const d=decisions.get(row.id);const status=d?.status|| (d?.nicho?'classified':'review');
 const review={version:REVIEW_VERSION,method:d?.method||'insufficient_saved_evidence',reason:d?.reason|| (d?'Tema e contexto corroborados no texto já salvo.':'Texto/metadados salvos não permitem determinar um nicho/subnicho com segurança.'),sourceIds:d?.sourceIds||[row.id]};
 if(d?.image)review.image=d.image;
 if(d?.cachedAds)review.cachedAds=d.cachedAds;
 if(d?.evidence)review.signals={terms:d.evidence.terms,context:[...new Set(d.evidence.context)]};
 return {id:row.id,hash:evidenceHash(row.data),related:d?.related||[],patch:{taxonomyStatus:status,...(status==='classified'?{nicho:d.nicho,subnicho:d.subnicho}:status==='out_of_scope'?{nicho:'',subnicho:''}:{}),taxonomyReview:review}};
});
const count={};for(const row of plan){const k=(all.get(row.id).data.kind||'oferta')+'/'+row.patch.taxonomyStatus;count[k]=(count[k]||0)+1;}
fs.writeFileSync('netlify/functions/_niche-review-plan.json',JSON.stringify({version:REVIEW_VERSION,total:plan.length,records:plan},null,1)+'\n');
fs.writeFileSync('/tmp/swipe-review-remaining.json',JSON.stringify(targets.filter(r=>plan.find(p=>p.id===r.id).patch.taxonomyStatus==='review')),{mode:0o600});
console.log(count);console.log('Remaining',plan.filter(p=>p.patch.taxonomyStatus==='review').length);
