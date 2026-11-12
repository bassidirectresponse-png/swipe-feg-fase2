// Offline, evidence-only recovery of the historical review queue. No provider/network calls.
import {createHash} from 'node:crypto';
import {taxonomy} from './niche-taxonomy.mjs';
export const REVIEW_VERSION='2026-11-12.review-1';
export function decodeText(value){return String(value||'').replace(/\\u([0-9a-f]{4})/gi,(_,h)=>String.fromCharCode(parseInt(h,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&(?:amp|nbsp);/g,' ').normalize('NFKD');}
const norm=v=>taxonomy.normalize(decodeText(v));
const has=(s,t)=>(' '+s+' ').includes(' '+norm(t)+' ');
const extra={
 'Saúde masculina|Testosterona':['trt','testosterone replacement'],
 'Saúde masculina|Geral':['mens supplement','men s supplement','made for men','built for men'],
 'Saúde masculina|Libido':['erections','erection','morning wood','impotencia','sexual performance'],
 'Saúde feminina|Hormônios':['birth control','pcos','polycystic ovary','estrogen patch','hormonal imbalance'],
 'Saúde feminina|Saúde íntima':['vaginal','vagina','intimate probiotic','bacterial vaginosis'],
 'Saúde feminina|Geral':['pregnancy','gynecology','gynaecology','gynaecologist','gynecologist'],
 'Saúde Cardiovascular|Coração':['heart attack','heart failure','stroke','coronary','cardiologist','heart'],
 'Saúde Cardiovascular|Geral':['blood flow','circulation','vascular','endothelial'],
 'Saúde geral|Sono':['sleep deprivation','sleep deprived','sleep schedule','insomniac','sleep stack','sleep','sleeping','asleep','sono','dormir','melatonin','mouth tape'],
 'Saúde geral|Intestino':['gut','digestion','digestive','microbiome','constipation','probiotic','probiotics','prebiotic'],
 'Saúde geral|Imunidade':['immune','immunotherapy','vaccination','vaccine'],
 'Saúde geral|Articulações':['joints','joint','jointpain','bone density','osteopenia','osteoporosis'],
 'Saúde geral|Fígado':['liver','cirrhosis','hepatic'],
 'Saúde geral|Diabetes / açúcar no sangue':['beta cell','type 2','type 1','insulin','hyperinsulinemia','prediabetes','type 2 diabetes','type 1 diabetes'],
 'Saúde geral|Memória':['multitask','cognitive function','thinking skills','speech learning','distractions','alzheimer s','alzheimers','memory','memories','cognition','cognitive','amnesia','brain aging','brain health'],
 'Saúde geral|Visão':['retina','eyesight','vision','cataracts'],
 'Saúde geral|Audição':['hearing','deafness'],
 'Saúde geral|Geral':['lymph','lymphatic drainage','lymphathische drainage','lymphatische drainage','lymphsystem','lung','lungs','respiratory','mucus','longevity','full body wellness','oxidative stress'],
 'Nutrição/Emagrecimento|Nutrição':['supplement','supplements','multivitamin','fish oil','electrolytes','magnesium','collagen','colageno','nutrition tips','nutricionista','nutritionist','dietary','supplementation','collagen supplement','iron absorption','food nutrition','ultra processed','nutrients','nutrient','nutritious','dietitian','dietitians','dietician','vitamin c','vitamin d','vitamin b12','vitamins','protein intake','protein','carbs','carbohydrates','diet','calorie','calories','mineral deficiency','nutritional deficiency'],
 'Nutrição/Emagrecimento|Emagrecimento':['fat loss','lose fat','belly fat','body fat','losing weight','burn fat','ozempic','mounjaro','retatrutide','orforglipron'],
 'Skin Care|Antissinais':['anti aging','antiaging','collagen peptides','wrinkle','collagen skin','anti aging skin'],
 'Skin Care|Pele':['itchy skin','skin glow','skin cells'],
 'Pet|Geral':['vet','vets','veterinarian','vaccination','kidney','lung','cancer','puppy health'],
 'Pet|Nutrição':['feed','multivitamin','multi vitamin','dog food','cat food','pet nutrition','supplement','supplements','feeding','nutrients'],
 'Pet|Articulações':['joints','joint health','joint supplement'],
 'Pet|Dental':['dental care','dental calculus','dental disease','dental health'],
 'Cabelo / Unhas|Cabelo':['hair regrowth','balding','baldness','minoxidil'],
};
const context=[...taxonomy.catalog.contextTerms,'doctors','drug','drugs','damaged','protecting','fight','fighting','faster','aging','healthier','healthiest','dietary','scientists','researchers','studies','trials','treatments','therapies','medications','medication','medicine','medicines','diagnosis','diagnosed','risk','risks','diseases','screening','prevents','manage','management','improve','improves','improved','reduces','reduce','protect','protects','support','supports','supporting','levels','deficiency','deficiencies','nutrients','nutrient','hormone','hormones','hormonal','estrogen','progesterone','insulin','blood','brain','metabolism','metabolic','inflammation','inflammatory','infeccao','capsules','capsulas','softgels','gummies','gel','extract','extrato','drainage','magnesium','melatonin','supplementation','peptides','food','cholesterol','diabetes','blood pressure','deficit','cgm','advances','tecnologia','celulas','brain','muscle','capsule','sintomas','tratamentos','pesquisadores','terapia','terapias','medicamentos','sintoma','doencas','medicos','salud','tratamientos','sistema','sangre','drenaje','sintomas','gesundheit','korper','schlaf','haut','gesundes'];
const localContext={
 'Sono':['deprivation','deprived','awake','sleep schedule','better','best','rest','tired','regression','health','sleep stack','hours','hour','nights','night','trouble','falling','tired','bedtime','apnea','sleep','insomnia','sono','dormir','melatonin','research','tips'],
 'Nutrição':['stack','stacks','routine','daily','important','pharmacist','supplements','supplement','vitamins','review','water','hydration','health','medicine','nutritionist','recipe','feeding','feed','food','picky','eater','dinner','breakfast','snack','ultra processed','salt','sodium','oils','iron','absorption','protein','carbs','diet','calories','nutrients','meals','meal','food','feeding','eating','balanced','vitamin','supplements','supplement','grams','fiber','muscle','breakfast','mineral'],
 'Antissinais':['skin','collagen','wrinkle','wrinkles','retinol','serum','cream','creme','rugas','pele','oil'],
 'Pele':['skin','collagen','cream','creme','serum','retinol','pores','routine','acne','eczema','psoriasis','barrier','skincare','glow','peeling'],
 'Hidratação':['skin','cream','creme','serum','barrier','moisture','moisturizer'],
 'Menopausa':['symptoms','transition','menopause','perimenopause','postmenopause','mood','hot','flashes','hormones','hormonal','estrogen','gynaecology','gynecology','hot flashes','midlife','women','womens health'],
 'Testosterona':['men','male','decreasing','increase','decrease','trt','labs','therapy','hrt','transition','voice','transgender','ftm','hormones','levels','low','high','boost','boosting','mens health','strength','libido','testosterone'],
 'Libido':['energy','confidence','dudes','increased','increases','aumentou','reduz','aumenta','hormones','low','high','boost','desire','drive','sex','sexual','women','men','libido','erection','erections'],
 'Pressão arterial':['blood pressure','monitor','reading','readings','measure','lower','hypertension','stroke','heart','bp','salt','sodium'],
 'Colesterol':['high','vegan','plant based','ldl','hdl','cholesterol','lower','raises','statins','arteries','saturated','fat','advice','guidelines'],
 'Memória':['brain','neurons','memory','memories','aging','forget','remember','learning','consciousness','alzheimer','dementia'],
 'Coração':['heart','exercise','cardio','cardiologist','stroke','cardiac','healthiest','disease'],
 'Geral':['x ray','tests','diagnosis','cancer','vitamins','supplements','supplement','capsules','softgels','drops','drainage','mucus','breathing','cough','vet','veterinarian','dog','cat','pup','puppy','surgery','health','salud'],
 'Coceira':['allergies','allergy','scratching','itching','itchy','skin','paws','shampoo','relief'],
 'Dental':['health','care','vet','brushing','brush','teeth','dental','calculus','plaque','breath','bacteria','disease'],
 'Articulações':['joint','joints','pain','mobility','arthritis','inflammation','bones','stiffness','relief','walking'],
 'Colágeno':['chew','chews','braid','treat','treats','liquid','supplements','vitamins','colageno'],
 'Pele e pelagem':['skincare','coat','fur','skin','shampoo','allergy','allergies','shedding','itchy','grooming'],
 'Emagrecimento':['fat','weight','appetite','diet','obesity','body','belly','glp 1','calories','metabolism','lose','loss'],
};
const petTerms=[...taxonomy.catalog.petTerms,'puppy','puppies','kitten','kittens','vet','vets','veterinarian','pitbull','pitbulls','pitties','yorkie','golden retriever'];
const phraseMap=new Map();
for(const phrase of [...context,...petTerms,...Object.values(localContext).flat(),...taxonomy.catalog.groups.flatMap(g=>g.topics.flatMap(t=>t.terms)),...Object.values(extra).flat(), 'womens health','mens health','female health','dog health','pet dental health','dog supplements','joint health','gut health','skin care','sleep tips','nutrition tips','nutrition hacks','sleep problems','dog food recipe','cat food','health education']){
 const s=norm(phrase);if(s.includes(' '))phraseMap.set(s.replaceAll(' ',''),s);
}
for(const [tag,words]of Object.entries({dogsoftiktok:'dog',catsoftiktok:'cat',dogmom:'dog',catmom:'cat',dogvlog:'dog',petcare:'pet care',guthealing:'gut health',menopauseawareness:'menopause awareness',testosteronebooster:'testosterone boost',lowtestosterone:'low testosterone',petdentalhealth:'pet dental health',dentalcalculusindogs:'dental calculus dogs',kidneyfailurefromdentaldisease:'kidney failure dental disease',constipationrelief:'constipation relief',bloodsugarcontrol:'blood sugar control',heartfailure:'heart failure',chronicillness:'chronic disease',womenshealth:'womens health',femalehealth:'female health',nutritionhacks:'nutrition hacks',dogfoodtips:'dog food',dogfoodrecipe:'dog food recipe',babyfoodfordogs:'food for dogs'}))phraseMap.set(tag,words);
const tagWords=[...new Set([...context,...petTerms,...Object.values(localContext).flat(),...Object.values(extra).flat(),...taxonomy.catalog.groups.flatMap(g=>g.topics.flatMap(t=>t.terms)), 'tips','education','awareness','healthy','high','low','therapy','routine','recipe','feeding','food','meal','picker','picky','eater','feed','feedmydog','relief','journey','aging','antiaging','deprivation','deprived','regression','replacement','optimization','problems','check','immune','allergy','allergies','brain','function','talk','science','sports','whole','foods','eating','transition','postmenopause','wholefoods','best','for','insulinresistance'].map(norm))].filter(w=>w.length>2&&!w.includes(' ')).sort((a,b)=>b.length-a.length);
function expandTag(tag){const key=norm(tag).replaceAll(' ','');if(phraseMap.has(key))return phraseMap.get(key);const memo=new Map();function split(s){if(!s)return [];if(memo.has(s))return memo.get(s);for(const w of tagWords)if(s.startsWith(w)){const tail=split(s.slice(w.length));if(tail){const r=[w,...tail];memo.set(s,r);return r;}}memo.set(s,null);return null;}const words=split(key);return words?.length>1?words.join(' '):tag;}
export function expandedText(value){return decodeText(value).replace(/#([\p{L}\p{N}_]+)/gu,(all,tag)=>' '+expandTag(tag)+' ').replace(/\b([a-z]+)([A-Z][a-z]+)\b/g,'$1 $2');}
const rules=taxonomy.catalog.groups.flatMap(g=>g.topics.map(t=>({nicho:g.name,subnicho:t.name,terms:[...new Set([...t.terms,...extra[g.name+'|'+t.name]||[]].map(norm))]})));
export function classifyReviewText(raw,{product=false}={}){
 const expanded=expandedText(String(raw).replace(/@[\p{L}\p{N}_.]+/gu,'')),text=norm(expanded);
 if(!text||text.split(' ').length<3)return null;
 // Explicitly irrelevant homonyms/contexts never become health content through a tag.
 if(/\b(computer|windows|macbook|laptop|sleep mode|joint venture|red carpet|movie premiere)\b/.test(text))return null;
 const pet=petTerms.some(t=>has(text.slice(0,400),t))||/#(?:dog|cat|pet|puppy|pitbull|yorkie)/i.test(String(raw));
 const chunks=[];for(let start=0;start<text.length;start+=380)chunks.push({s:text.slice(start,start+600),start});
 const matches=[];
 for(const rule of rules){if((rule.nicho==='Pet')!==pet)continue;
  let best=null;
  for(const {s,start}of chunks){const hits=rule.terms.filter(t=>has(s,t));if(!hits.length)continue;
   const contexts=[...context,...localContext[rule.subnicho]||[],...(pet?petTerms:[])].filter(c=>has(s,c));
   const supported=hits.filter(t=>contexts.some(c=>!has(t,c)&&!has(norm(c),t)));
   if(!supported.length)continue;
   // Human "skin" and "sleep" require a second specific theme signal, not generic research words alone.
   if(rule.nicho==='Skin Care'&&rule.subnicho==='Antissinais'&&supported.every(t=>['anti aging','antiaging','collagen peptides'].includes(t))&&!['skin','pele','face','wrinkles','wrinkle','rugas','serum','cream','creme','esthetician','arrugas'].some(t=>has(s,t)))continue;
   if(rule.nicho==='Skin Care'&&supported.every(t=>['skin','pele'].includes(t))&&!localContext.Pele.some(c=>!['skin','pele'].includes(c)&&has(s,c)))continue;
   if(rule.subnicho==='Sono'&&supported.every(t=>['sleep','sleeping','asleep','sono','dormir'].includes(t))&&!localContext.Sono.some(c=>!['sleep','sono','dormir'].includes(c)&&has(s,c)))continue;
   const specific=supported.filter(t=>t.split(' ').length>1||!['skin','pele','heart','liver','joint','joints','memory','sleep','sleeping','asleep','diet','protein','calories','blood','brain','vet'].includes(t));
   const lead=supported.filter(t=>has(text.slice(0,200),t)).length;
   const score=20+(rule.nicho==='Skin Care'&&has(s,'skin')&&has(s,'collagen')?10:0)+(rule.nicho==='Pet'&&rule.subnicho==='Nutrição'?-6:0)+(specific.length?10:0)+Math.min(12,supported.length*3)+Math.min(8,contexts.length)+(lead?12:0)+(start===0?5:0)-(rule.subnicho==='Geral'?8:0);
   const evidence={...rule,score,terms:supported,context:contexts.slice(0,8),excerpt:s.slice(0,500)};
   if(!best||score>best.score)best=evidence;
  }
  if(best)matches.push(best);
 }
 matches.sort((a,b)=>b.score-a.score);
 return matches[0]||null;
}
export function recordText(d){return [d.caption||d.nome||d.nomeOferta,d.formato,d.resumo,d.descricao,d.copy,d.transcricao,d.transcricaoPt,d.nomeProduto,...(Array.isArray(d.hashtags)?[d.hashtags.map(t=>'#'+t).join(' ')]:[])].filter(v=>typeof v==='string'&&v.trim()).join('\n');}
const evidenceKeys=['kind','nome','nomeOferta','nomeMarca','marca','nomeProduto','formato','caption','resumo','descricao','copy','transcricao','transcricaoPt','hashtags','sourceOfferId','sourceOfferName','dominios','link','url','linkAnuncio'];
export function evidenceHash(d){return createHash('sha256').update(JSON.stringify(evidenceKeys.map(k=>[k,d[k]??null]))).digest('hex');}
export function directEvidence(row){const d=row.data;if(d.division==='organic'||d.kind==='organic')return null;const c=classifyReviewText(recordText(d),{product:!['noticia','tiktok'].includes(d.kind)});return c?{nicho:c.nicho,subnicho:c.subnicho,method:'stored_text',evidence:{terms:c.terms,context:c.context,excerpt:c.excerpt},sourceIds:[row.id]}:null;}
