import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";

const ROOT = new URL("../", import.meta.url);
const money = value => value ? `US$ ${value}` : "";
const keys = ["name","spend","roas","avgConversion","costResult","results","ctr","cpc","cpm","cpcLink","costUnique"];
function report(key,label,range,rows,totals){
  return {key,label,range,level:"Campanhas",totals,campaigns:rows.map(values=>Object.fromEntries(keys.map((field,i)=>{
    const value=values[i]||"";
    if(i===0||field==="roas"||field==="results"||field==="ctr")return[field,value];
    return[field,value?money(value):""];
  })))};
}

const reports=[
  report("7d","Últimos 7 dias","09/07/2026 a 15/07/2026",[
    ["Testing 4.0","194.929,89","0,57","81,97","144,18","1.352","1,59%","1,65","26,28","2,99","2,17"],
    ["US / maxVolume / Quiz (Long Single Emoji)","38.757,01","0,57","80,96","140,93","275","1,23%","1,81","22,35","3,13","1,98"],
    ["Testing 5.0 - CBO - AI Test","38.068,83","0,73","87,36","120,47","316","0,88%","2,49","21,93","4,04","2,85"],
    ["US / maxVolume / Quiz (Long Single Emoji) / Founder ads","34.641,27","0,57","86,65","152,60","227","2,19%","1,72","37,78","3,83","1,99"],
    ["US / maxVolume / Quiz Funnel Testing (Long)","24.933,50","0,84","91,38","108,88","229","1,10%","1,90","20,83","2,74","2,18"],
    ["US - ABO - Sandbox Testing","24.529,47","0,60","93,00","154,27","159","1,31%","2,01","26,39","4,40","2,27"],
    ["US Quiz (Short Single) - tROAS - Testing","22.354,47","0,64","93,24","146,11","153","1,00%","3,67","36,58","6,05","4,07"],
    ["Testing | Whitelisting - Incr. Attr.","21.580,05","","75,52","","","2,54%","0,73","18,44","1,80","0,83"],
    ["[UNLEASHED] - Whitelisting - 7-1-1 Max Volume - 05.01.26","19.476,20","0,61","81,87","135,25","144","1,97%","1,22","24,01","2,58","1,54"],
    ["[T-BOOSTER] - Whitelisting - 7-1-1 Max Volume - 05.01.26","15.391,76","0,48","80,52","167,30","92","3,72%","0,53","19,69","1,95","0,61"],
    ["US / maxValue / Quiz (Short Single) / June Best Ads V2","15.297,72","0,89","90,29","101,31","151","1,04%","2,55","26,60","4,67","2,87"],
    ["US / maxValue / Quiz (Short Single) / June Best Ads V1","14.585,76","0,74","81,94","111,34","131","1,21%","1,95","23,53","3,54","2,14"],
    ["Testing 1.0","13.852,47","0,49","74,47","152,22","91","1,10%","1,97","21,72","3,12","2,22"],
    ["US / maxVolume / Quiz Funnel Testing (Short)","11.439,24","0,55","93,05","170,73","67","1,30%","1,97","25,70","3,99","2,09"],
    ["US / maxVolume / Quiz (Short Single Emoji)","11.317,55","0,63","92,38","146,98","77","1,28%","1,83","23,46","3,47","2,06"],
    ["QUIZ (Short) - SCALE - 7-1-1 - Max Volume - Partnership Ads","9.637,60","0,80","88,64","110,78","87","1,35%","1,49","20,06","2,57","1,61"],
  ],{spend:money("542.266,62"),roas:"—",avgConversion:money("84,60"),costResult:"—",results:"—",ctr:"1,57%",cpc:money("1,60"),cpm:money("25,14"),cpcLink:money("3,11"),costUnique:money("2,34")}),
  report("14d","Últimos 14 dias","02/07/2026 a 15/07/2026",[
    ["Testing 4.0","406.042,09","0,57","82,00","142,87","2.842","1,68%","1,50","25,20","2,80","2,30"],
    ["US / maxVolume / Quiz (Long Single Emoji)","68.205,29","0,55","79,38","144,20","473","1,30%","1,72","22,34","3,04","1,95"],
    ["Testing 5.0 - CBO - AI Test","66.003,91","0,76","88,64","116,00","569","0,86%","2,59","22,33","4,16","3,06"],
    ["US / maxVolume / Quiz (Long Single Emoji) / Founder ads","60.138,34","0,66","86,72","132,17","455","2,22%","1,71","37,92","3,67","2,01"],
    ["US / maxVolume / Quiz Funnel Testing (Long)","47.615,30","0,83","87,66","105,81","450","1,13%","1,78","20,14","2,66","2,00"],
    ["Testing | Whitelisting - Incr. Attr.","44.062,14","","77,67","","","2,78%","0,67","18,47","1,62","0,79"],
    ["[UNLEASHED] - Whitelisting - 7-1-1 Max Volume - 05.01.26","42.107,53","0,61","82,49","135,83","310","2,33%","0,97","22,75","2,41","1,21"],
    ["US - ABO - Sandbox Testing","40.849,98","0,59","90,08","153,57","266","1,31%","2,08","27,33","4,54","2,37"],
    ["US Quiz (Short Single) - tROAS - Testing","39.589,46","0,64","91,32","141,90","279","1,01%","3,71","37,30","5,95","4,02"],
    ["[T-BOOSTER] - Whitelisting - 7-1-1 Max Volume - 05.01.26","31.093,21","0,47","82,34","173,71","179","5,06%","0,38","19,33","1,49","0,47"],
    ["Testing 1.0","29.768,64","0,55","75,92","139,11","214","1,12%","1,89","21,13","3,03","2,13"],
    ["US / maxVolume / Quiz (Short Single Emoji)","22.765,43","0,55","85,02","155,93","146","1,39%","1,63","22,74","3,18","1,88"],
    ["US / maxVolume / Quiz Funnel Testing (Short)","22.299,57","0,63","90,63","142,95","156","1,47%","1,80","26,51","3,88","1,92"],
    ["QUIZ (Short) - SCALE - 7-1-1 - Max Volume - Partnership Ads","18.758,81","0,77","87,22","113,00","166","1,46%","1,41","20,60","2,40","1,57"],
    ["US Quiz - maxValue (Short Single Emoji) - tROAS - New May","17.432,86","0,57","90,67","159,93","109","1,14%","2,85","32,45","4,92","3,21"],
    ["US / maxValue / Quiz (Short Single) / June Best Ads V2","15.297,72","0,89","90,29","101,31","151","1,04%","2,55","26,60","4,67","2,87"],
  ],{spend:money("1.038.575,45"),roas:"—",avgConversion:money("83,85"),costResult:"—",results:"—",ctr:"1,74%",cpc:money("1,41"),cpm:money("24,56"),cpcLink:money("2,84"),costUnique:money("2,29")}),
  report("1d","15 de julho","15/07/2026",[
    ["Testing 4.0","23.300,63","0,62","85,10","137,87","169","1,40%","1,83","25,65","3,10","2,11"],
    ["US / maxVolume / Quiz (Long Single Emoji)","5.545,60","0,59","89,03","149,88","37","1,09%","2,08","22,56","3,41","2,25"],
    ["Testing 5.0 - CBO - AI Test","5.066,17","0,71","96,57","136,92","37","1,25%","1,82","22,71","3,35","2,03"],
    ["US / maxVolume / Quiz (Long Single Emoji) / Founder ads","5.033,62","0,59","83,01","139,82","36","1,74%","2,18","37,81","4,58","2,48"],
    ["US / maxVolume / Quiz Funnel Testing (Long)","3.823,33","0,53","92,48","173,79","22","0,98%","2,18","21,39","3,14","2,35"],
    ["US Quiz (Short Single) - tROAS - Testing","3.747,16","0,64","95,42","149,88","25","0,79%","4,50","35,68","7,54","5,00"],
    ["US - ABO - Sandbox Testing","2.821,24","0,73","102,98","141,06","20","1,04%","2,48","25,71","4,95","2,62"],
    ["US / maxValue / Quiz (Short Single) / June Best Ads V2","2.737,56","0,82","93,90","114,07","24","0,85%","2,87","24,43","4,84","3,17"],
    ["Testing | Whitelisting - Incr. Attr.","2.396,65","","84,56","","","2,13%","0,94","20,02","2,26","1,03"],
    ["US / maxValue / Quiz (Short Single) / June Best Ads V1","2.246,02","0,56","96,90","172,77","13","0,94%","2,56","24,08","4,56","2,79"],
    ["[UNLEASHED] - Whitelisting - 7-1-1 Max Volume - 05.01.26","1.847,21","0,59","90,90","153,93","12","1,73%","1,33","22,98","2,58","1,54"],
    ["US / maxVolume / Quiz (Short Single Emoji)","1.521,89","0,49","83,31","169,10","9","1,07%","2,16","23,25","4,10","2,38"],
    ["US / maxVolume / Quiz Funnel Testing (Short)","1.404,22","0,50","100,41","200,60","7","1,03%","2,39","24,67","4,76","2,51"],
    ["Whitelisting - Quiz (Long Single) - Anthony Pettis - MaxVolume","1.305,76","0,51","74,43","145,08","9","1,08%","2,39","25,78","4,50","2,60"],
    ["US Quiz - maxValue (Short Single Emoji) - tROAS - New May","1.287,74","0,24","76,98","321,94","4","1,04%","3,42","35,45","6,02","3,71"],
    ["QUIZ (Short) - SCALE - 7-1-1 - Max Volume - Partnership Ads","1.275,41","0,61","96,98","159,43","8","1,30%","1,54","20,10","2,67","1,66"],
  ],{spend:money("68.894,38"),roas:"—",avgConversion:money("88,75"),costResult:"—",results:"—",ctr:"1,33%",cpc:money("1,90"),cpm:money("25,29"),cpcLink:money("3,39"),costUnique:money("2,36")}),
  report("30d","Últimos 30 dias","16/06/2026 a 15/07/2026",[
    ["Testing 4.0","769.754,02","0,56","81,41","145,37","5.295","1,85%","1,37","25,33","2,64","2,43"],
    ["US / maxVolume / Quiz (Long Single Emoji)","126.347,00","0,55","79,83","144,07","877","1,28%","1,73","22,08","3,15","1,97"],
    ["US / maxVolume / Quiz Funnel Testing (Long)","114.983,05","0,75","87,22","116,97","983","1,19%","1,78","21,13","2,80","2,02"],
    ["Testing | Whitelisting - Incr. Attr.","112.556,12","","77,22","","","3,73%","0,51","19,01","1,49","0,60"],
    ["US - ABO - Sandbox Testing","107.414,83","0,55","87,47","158,43","678","1,31%","2,21","28,97","4,70","2,51"],
    ["Testing 5.0 - CBO - AI Test","105.835,43","0,73","88,04","121,37","872","0,87%","2,67","23,18","4,22","3,20"],
    ["Testing 1.0","85.003,66","0,52","79,06","153,16","555","1,22%","1,88","22,90","2,95","2,20"],
    ["[UNLEASHED] - Whitelisting - 7-1-1 Max Volume - 05.01.26","77.713,69","0,66","82,56","124,94","622","2,19%","0,97","21,24","2,53","1,22"],
    ["US / maxVolume / Quiz (Long Single Emoji) / Founder ads","74.393,50","0,72","86,66","120,97","615","2,15%","1,72","36,97","3,71","2,07"],
    ["US Quiz (Short Single) - tROAS - Testing","72.787,07","0,66","91,17","139,17","523","0,97%","3,72","36,00","5,86","4,12"],
    ["[T-BOOSTER] - Whitelisting - 7-1-1 Max Volume - 05.01.26","61.086,78","0,52","78,92","152,72","400","3,40%","0,57","19,51","1,85","0,70"],
    ["US / maxVolume / Quiz Funnel Testing (Short)","57.787,26","0,59","87,85","148,55","389","1,60%","1,77","28,35","3,85","1,95"],
    ["Whitelisting - Quiz (Long Single) - Dustin Poirier - MaxVolume","57.408,42","0,45","75,80","168,85","340","2,98%","0,45","13,49","1,05","0,52"],
    ["US / maxVolume / Quiz (Short Single Emoji)","47.884,18","0,57","81,00","142,51","336","1,44%","1,56","22,55","2,99","1,84"],
    ["QUIZ (Short) - SCALE - 7-1-1 - Max Volume - Partnership Ads","45.014,32","0,70","86,18","122,99","366","1,40%","1,55","21,82","2,57","1,80"],
    ["CBO - Zombie - tCPA","40.136,13","0,54","79,20","147,56","272","2,69%","0,95","25,63","1,50","1,17"],
  ],{spend:money("2.083.660,86"),roas:"—",avgConversion:money("82,85"),costResult:"—",results:"—",ctr:"1,88%",cpc:money("1,27"),cpm:money("23,96"),cpcLink:money("2,64"),costUnique:money("2,26")}),
];

const adLinks=[
  "https://business.facebook.com/ads/experience/confirmation/?is_responsive=0&encrypted_experience_id=Q8DfBAIyQJEDQn4Tc3NUH3OAEFTnYrJ7ogmuy7K0AE5csV_QilRVc5xZGoVgRYq0q9Iidm_vITZN3MLPRg",
  "https://business.facebook.com/ads/experience/confirmation/?is_responsive=0&encrypted_experience_id=Q8DfBAKiTun6TJ6_eZ6Qwbx_9SIp5znyVw3SYoeSlqzESfXRIq1oVfUh-qgAYOO44sKRpYKNSgv5IjSXAA",
  "https://business.facebook.com/ads/experience/confirmation/?is_responsive=0&encrypted_experience_id=Q8DfBAI7c5WNXW8pqL2XHuggd2ut7zfcsE2_P09cZ-G1xAZ7hh3HUz4u0ScUSStGPJ97AyyKHtRsgHMtdQ",
  "https://business.facebook.com/ads/experience/confirmation/?is_responsive=0&encrypted_experience_id=Q8DfBAIt87IbbB0h5vxMc1N5EbBSY16EAsGceBBuKMAMYWObQ20C1RiWBvt54EEOWi7_j5ODkwhhG19KYg",
  "https://business.facebook.com/ads/experience/confirmation/?is_responsive=0&encrypted_experience_id=Q8DfBAJcRodR5vggCuSzQr78skAcCoCGdVU7bYLr4cuLorvH1Jzuj13_4u0g9BYM5-HMHoyqqAyS5ga4yQ",
];
const exactMedia=[
  "/assets/primal-viking/top-ad-01.mp4",
  "/assets/primal-viking/top-ad-02.jpg",
  "/assets/primal-viking/top-ad-03.mp4",
  "/assets/primal-viking/top-ad-04.jpg",
  "/assets/primal-viking/top-ad-05.mp4",
];
const printNames=[
  "Desempenho · campanhas · últimos 30 dias",
  "Desempenho · campanhas · últimos 14 dias",
  "Desempenho · campanhas · 15/07/2026",
  "Desempenho · conjuntos · últimos 7 dias",
  "Configuração · público e localização",
  "Configuração · campanha e orçamento",
  "Configuração · conversão, pixel e evento",
  "Configuração · orçamento e início",
  "Desempenho · campanhas · últimos 7 dias",
  "Desempenho · anúncios · últimos 7 dias",
];
function makeData(previous={}){
  const previousAds=Array.isArray(previous.brandTopAds)?previous.brandTopAds:[];
  const brandTopAds=adLinks.map((link,i)=>{
    const old=previousAds.find(x=>x.link===link)||{};
    const keptVideo=String(old.video||"").includes("/storage/v1/object/public/")?old.video:(exactMedia[i]?.endsWith(".mp4")?exactMedia[i]:"");
    const keptImage=String(old.img||"").includes("/storage/v1/object/public/")?old.img:(exactMedia[i]&&!exactMedia[i].endsWith(".mp4")?exactMedia[i]:"");
    return {...old,nome:`Primal Viking · Top Ad ${String(i+1).padStart(2,"0")}`,link,img:keptImage,video:keptVideo,ingestStatus:keptVideo||keptImage?"done":"link_only",ingestError:"",ingestSource:"Link exato enviado",downloadedAt:keptVideo||keptImage?old.downloadedAt||"17/07/2026":""};
  });
  return {...previous,
    kind:"brandsvalidated",tipoTrafego:"meta",nomeOferta:"Primal Viking",nomeMarca:"Primal Viking",nicho:"Emagrecimento",
    formato:"Suplemento em cápsulas · órgãos de rena e ervas árticas",numAdsAtivos:"2400",adsLibraryApprox:true,adsLibraryCheckedAt:"17/07/2026",
    imagemProduto:"/assets/primal-viking/product.jpg",
    bibliotecas:[{nome:"Primal Viking · Meta Ads Library",link:"https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&search_type=page&sort_data[direction]=desc&sort_data[mode]=total_impressions&source=page-transparency-widget&view_all_page_id=765890836605406"}],
    dominios:[{nome:"Emoji Quiz · Reindeer Long",linkDominio:"https://primalviking.com/pages/emoji-quiz-reindeer-long",views:"",viewsPeriod:"",linkCheckout:"",backRedirect:"",printPV:"",printCheckout:""}],
    brandTopAds,
    bmSpend7d:money("542.266,62"),bmSpend14d:money("1.038.575,45"),bmAvgConversion:money("84,60"),bmCpc:money("1,60"),bmCpcLink:money("3,11"),bmCpm:money("25,14"),bmCtr:"1,57%",bmCostUnique:money("2,34"),bmCostIc:"Não exibido no print",bmRoas:"— (múltiplas conversões)",bmUpdatedAt:"15/07/2026",bmNotes:"",bmReports:reports,
    bmPrints:printNames.map((nome,i)=>({nome,img:`/assets/primal-viking/print-${String(i+1).padStart(2,"0")}.jpeg`})),
    brandSemrush1m:previous.brandSemrush1m||"",brandSemrush3m:previous.brandSemrush3m||"",
    funil:"Meta Ads → quiz longo → oferta Primal Viking → checkout",comentario:"",
  };
}

if(process.argv.includes("--emit-seed")){console.log(JSON.stringify(makeData()));process.exit(0);}

const html=await fs.readFile(new URL("index.html",ROOT),"utf8");
const SUPABASE_URL=html.match(/const DEFAULT_URL="([^"]+)"/)?.[1];
const ANON=html.match(/const DEFAULT_KEY="([^"]+)"/)?.[1];
if(!SUPABASE_URL||!ANON)throw new Error("Configuração do Supabase não encontrada no index.html");
function netlifySecret(name){try{return execFileSync("npx",["netlify","env:get",name,"--context","production"],{encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim();}catch{return"";}}
const SERVICE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||(process.env.CI?"":netlifySecret("SUPABASE_SERVICE_ROLE_KEY"));
const API_KEY=SERVICE_KEY||process.env.SUPABASE_ANON_KEY||ANON;
let AUTH_TOKEN=API_KEY;
if(!SERVICE_KEY&&process.env.SUPABASE_BOT_EMAIL&&process.env.SUPABASE_BOT_PASSWORD){
  const login=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:"POST",headers:{apikey:ANON,"Content-Type":"application/json"},body:JSON.stringify({email:process.env.SUPABASE_BOT_EMAIL,password:process.env.SUPABASE_BOT_PASSWORD})});
  if(!login.ok)throw new Error(`Login do bot falhou: ${login.status}`);AUTH_TOKEN=(await login.json()).access_token;
}
const headers={apikey:API_KEY,Authorization:`Bearer ${AUTH_TOKEN}`,"Content-Type":"application/json"};
async function persistExactMedia(data){
  for(let i=0;i<data.brandTopAds.length;i++){
    const ad=data.brandTopAds[i],source=ad.video||ad.img||"";
    if(!source.startsWith("/assets/primal-viking/"))continue;
    const ext=source.split(".").pop().toLowerCase(),isVideo=ext==="mp4",contentType=isVideo?"video/mp4":ext==="png"?"image/png":ext==="webp"?"image/webp":"image/jpeg";
    const objectPath=`brands/primal-viking/top-ad-${String(i+1).padStart(2,"0")}.${ext}`;
    const body=await fs.readFile(new URL(`.${source}`,ROOT));
    const upload=await fetch(`${SUPABASE_URL}/storage/v1/object/criativos/${objectPath}`,{method:"POST",headers:{apikey:API_KEY,Authorization:`Bearer ${AUTH_TOKEN}`,"Content-Type":contentType,"x-upsert":"true"},body});
    if(!upload.ok)throw new Error(`Storage Primal Viking ${i+1}: ${upload.status} ${(await upload.text()).slice(0,200)}`);
    const stored=`${SUPABASE_URL}/storage/v1/object/public/criativos/${objectPath}`;
    if(isVideo){ad.video=stored;ad.img="";}else{ad.img=stored;ad.video="";}
  }
}
const query=new URL(`${SUPABASE_URL}/rest/v1/offers`);query.searchParams.set("select","id,data");query.searchParams.set("data->>kind","eq.brandsvalidated");
const existingRows=await fetch(query,{headers}).then(async r=>r.ok?r.json():Promise.reject(new Error(await r.text())));
const existing=existingRows.find(row=>String(row.data?.nomeOferta||"").trim().toLowerCase()==="primal viking");
const data=makeData(existing?.data||{});
await persistExactMedia(data);
const endpoint=existing?`${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(existing.id)}`:`${SUPABASE_URL}/rest/v1/offers`;
const response=await fetch(endpoint,{method:existing?"PATCH":"POST",headers:{...headers,Prefer:"return=representation"},body:JSON.stringify({data})});
if(!response.ok)throw new Error(`Supabase ${response.status}: ${(await response.text()).slice(0,300)}`);
const rows=await response.json();
console.log(JSON.stringify({ok:true,action:existing?"updated":"inserted",id:rows[0]?.id||existing?.id,prints:data.bmPrints.length,reports:reports.length,campaigns:reports.reduce((n,r)=>n+r.campaigns.length,0),topAds:data.brandTopAds.length,adsAtivos:"≈ 2.400"}));
