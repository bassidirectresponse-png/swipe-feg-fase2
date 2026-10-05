// Ingestão auditável do lote Get Jacked enviado em 05/10/2026.
// Valide sem --apply antes de permitir qualquer escrita remota.
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {readFile} from "node:fs/promises";
import {join} from "node:path";
import {fileURLToPath} from "node:url";

const LINKED_ROOT=fileURLToPath(new URL("../../",import.meta.url));
const SITE="https://benchmarkinggrupofeg.site";
const SUPABASE_URL="https://pkvzwtstidtobpdngxnd.supabase.co";
const BUCKET="criativos";
const CAPTURED_AT="2026-10-05";
const LIBRARY="https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&is_targeted_country=false&media_type=all&q=get-jacked.co&search_type=keyword_unordered&sort_data[direction]=desc&sort_data[mode]=total_impressions";
const SALES_PAGE="https://get-jacked.co/products/cayenne-pepper-softgels";
const AD_LINKS=[
  "https://fb.me/adspreview/facebook/2iNpovrrxGba72l",
  "https://fb.me/adspreview/facebook/23KFo5r0l4dmfqa",
  "https://fb.me/adspreview/facebook/21BLNBEOQe7Hr6B",
];

// Nomes e arquivos correspondem 1:1 aos anexos fornecidos pelo usuário.
export const evidence=[
  {file:"codex-clipboard-b91da6af-a704-4b14-8256-2aeffdc1f9ae.png",name:"Produto · Get Jacked Cayenne Pepper",periodKey:"cover",cover:true},
  {file:"codex-clipboard-786457da-5d8b-442b-945e-6487c48d0989.png",name:"Campanhas · 30 dias · 04/09 a 03/10/2026",periodKey:"30d"},
  {file:"codex-clipboard-2c778f25-4ffa-4665-a64f-2d53f8ac773b.png",name:"Conjuntos · 7 dias · 27/09 a 03/10/2026",periodKey:"7d"},
  {file:"codex-clipboard-cfe85067-76c7-4eec-a726-376dc70c650e.png",name:"Campanhas · 7 dias · 27/09 a 03/10/2026",periodKey:"7d"},
  {file:"codex-clipboard-2da7a444-ff36-4b53-8a5b-39f01fcc737a.png",name:"Anúncios · 7 dias · 27/09 a 03/10/2026",periodKey:"7d"},
  {file:"codex-clipboard-cad23a2e-7bb4-4e4b-ace8-896b46f9c821.png",name:"Campanhas · 14 dias · 20/09 a 03/10/2026",periodKey:"14d"},
  {file:"codex-clipboard-c7c92d00-95aa-4f3a-b29c-460ba3eb0bc9.png",name:"Configuração · orçamento e início",periodKey:"settings"},
  {file:"codex-clipboard-4ef31d39-bc3d-41b0-92ca-0885701191f6.png",name:"Configuração · público e localização",periodKey:"settings"},
  {file:"codex-clipboard-be8fef04-b2c8-415e-96bb-d684093322fb.png",name:"Configuração · conversão e atribuição",periodKey:"settings"},
  {file:"codex-clipboard-8dfe36b5-8bc3-4520-bf9e-4f80a101c24d.png",name:"Configuração · orçamento da campanha",periodKey:"settings"},
  {file:"codex-clipboard-eaf2fc12-3859-4dc1-8d9d-62eaa984f208.png",name:"Configuração · público detalhado",periodKey:"settings"},
];

// Valores de compras são os da coluna "Valor dos resultados" nas telas de Campanhas.
// As telas de Conjuntos e Anúncios são visões da mesma janela de 7 dias: não somá-las.
const campaign=(name,spend,sales,revenue,roas)=>({name,spend,sales,revenue,roas});
const seven=[
  campaign("SCALE CC",10450.42,100,6224.45,"0,60"),
  campaign("BOF BIG-5",5702.19,72,4729.98,"0,83"),
  campaign("TOF UK",3475.37,26,1690.10,"0,49"),
  campaign("TOF AU",3094.37,27,1997.95,"0,65"),
  campaign("TOF US",2914.03,22,1745.82,"0,60"),
  campaign("TRYBE UGC",304.17,2,179.70,"0,59"),
];
const fourteen=[
  campaign("SCALE CC",15931.73,164,10529.08,"0,66"),
  campaign("BOF BIG-5",13901.99,162,10737.19,"0,77"),
  campaign("TOF US",6396.86,45,3240.65,"0,51"),
  campaign("TOF UK",3475.37,26,1690.10,"0,49"),
  campaign("TOF AU",3094.37,27,1997.95,"0,65"),
  campaign("TRYBE UGC",499.87,3,242.55,"0,49"),
  campaign("CBO AUSTRALIA",175.39,null,null,null),
];
const thirty=[
  campaign("SCALE CC",42429.29,383,25141.84,"0,59"),
  campaign("BOF BIG-5",36554.96,393,25902.41,"0,71"),
  campaign("TOF US",14468.61,90,5910.80,"0,41"),
  campaign("TOF UK",3475.37,26,1690.10,"0,49"),
  campaign("TOF AU",3094.37,27,1997.95,"0,65"),
  campaign("TRYBE UGC",499.87,3,242.55,"0,49"),
  campaign("CBO AUSTRALIA",175.39,null,null,null),
];

const money=n=>`US$ ${n.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const sumMoney=rows=>Math.round(rows.reduce((sum,row)=>sum+Math.round(row.spend*100),0))/100;
const sumRevenue=rows=>Math.round(rows.reduce((sum,row)=>sum+Math.round((row.revenue||0)*100),0))/100;
const sumSales=rows=>rows.reduce((sum,row)=>sum+(row.sales||0),0);
const two=n=>n.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
const makeReport=(window,range,rows,expectedSpend,expectedSales,avgConversion,ctr,cpc,cpm)=>{
  const spend=sumMoney(rows),revenue=sumRevenue(rows),sales=sumSales(rows);
  if(Math.abs(spend-expectedSpend)>.001||sales!==expectedSales)throw new Error(`Totais do período ${window} divergem do print`);
  return {
    key:`2026-10-05-${window}`,label:`Outubro 2026 · Últimos ${window.replace("d","")} dias`,range,level:"Campanhas",currency:"USD",capturedAt:CAPTURED_AT,
    totals:{spend:money(spend),results:`${sales.toLocaleString("pt-BR")} compras · BM`,roas:`≈ ${two(revenue/spend)} · BM`,avgConversion:money(avgConversion),ctr,cpc:money(cpc),cpm:money(cpm),otherResults:`Valor de compras visível: ${money(revenue)}. ROAS calculado sobre o gasto total da conta; não comprova atribuição exclusiva ao produto.`},
    campaigns:rows.map(row=>({name:row.name,spend:money(row.spend),roas:row.roas||"—",results:row.sales==null?"—":`${row.sales} compras`,revenue:row.revenue==null?"—":money(row.revenue)})),
  };
};

export const reports=[
  makeReport("7d","27/09/2026 a 03/10/2026",seven,25940.55,249,66.54,"2,50%",2.48,61.86),
  makeReport("14d","20/09/2026 a 03/10/2026",fourteen,43475.58,427,66.60,"2,54%",2.24,56.88),
  makeReport("30d","04/09/2026 a 03/10/2026",thirty,100697.86,922,66.04,"2,85%",2.03,57.68),
];

export const makeManifest=coverUrl=>({batchDate:CAPTURED_AT,items:[{
  kind:"brandsvalidated",name:"Get Jacked",brand:"Get Jacked",niche:"Saúde Masculina",format:"Cayenne Pepper · softgels de pimenta-caiena",image:coverUrl,
  libraries:[{name:"Get Jacked · Meta Ads Library",url:LIBRARY}],
  domains:[{name:"Get Jacked · Cayenne Pepper",offer:SALES_PAGE}],
  ads:AD_LINKS.map((url,index)=>({name:`Anúncio ${index+1}`,url,creativeName:`Get Jacked — Anúncio ${String(index+1).padStart(2,"0")} — Outubro 2026`,platform:"meta"})),
}]});

function secret(name){
  const value=String(process.env[name]||execFileSync("npx",["netlify","env:get",name,"--context","production"],{cwd:LINKED_ROOT,encoding:"utf8",stdio:["ignore","pipe","pipe"],timeout:20_000})).trim();
  if(!value||/redact|encrypt|hidden|sensitive|\*{3,}/i.test(value))throw new Error(`Credencial ${name} indisponível: a CLI da Netlify retorna apenas um valor mascarado; configure a variável real no ambiente`);
  return value;
}
const sha=bytes=>createHash("sha256").update(bytes).digest("hex").slice(0,20);
const publicUrl=path=>`${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
const parseResponse=async(response,label)=>{
  const payload=await response.json().catch(()=>({}));
  if(!response.ok||payload.ok===false)throw new Error(`${label}: ${response.status} ${String(payload.error||payload.message||"").slice(0,160)}`);
  return payload;
};

async function main(){
  const mediaRoot=process.env.GET_JACKED_MEDIA_ROOT;
  if(!mediaRoot)throw new Error("Defina GET_JACKED_MEDIA_ROOT para os 11 anexos originais");
  const media=await Promise.all(evidence.map(async entry=>{
    const bytes=await readFile(join(mediaRoot,entry.file));
    if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error(`PNG inválido: ${entry.file}`);
    if(bytes.length>4*1024*1024)throw new Error(`Print acima de 4 MB: ${entry.file}`);
    const path=`brands/get-jacked/${entry.cover?"product-cover":"bm/"+entry.periodKey}-${sha(bytes)}.png`;
    return {...entry,bytes,path,url:publicUrl(path)};
  }));
  const manifest=makeManifest(media[0].url),endpoint=`${SITE}/.netlify/functions/manual-ingest-n8n`;
  const ingestSecret=secret("N8N_MANUAL_INGEST_SECRET");
  const post=async mode=>parseResponse(await fetch(endpoint,{method:"POST",headers:{Authorization:`Bearer ${ingestSecret}`,"Content-Type":"application/json"},body:JSON.stringify({...manifest,mode}),signal:AbortSignal.timeout(40_000)}),`Ingestão ${mode}`);
  const validation=await post("validate");
  if(validation.mode!=="validate"||validation.plan?.length!==1||validation.plan[0]?.kind!=="brandsvalidated"||validation.plan[0]?.name!=="Get Jacked")throw new Error("Plano de ingestão inesperado");
  console.log(JSON.stringify({mode:"validate",plan:validation.plan,totals:validation.totals,reports:reports.map(r=>({range:r.range,spend:r.totals.spend,sales:r.totals.results,roas:r.totals.roas})),evidence:media.length},null,2));
  if(!process.argv.includes("--apply"))return;

  const serviceKey=secret("SUPABASE_SERVICE_ROLE_KEY");
  const auth={apikey:serviceKey,Authorization:`Bearer ${serviceKey}`};
  const probe=await fetch(`${SUPABASE_URL}/rest/v1/offers?select=id&limit=1`,{headers:auth,signal:AbortSignal.timeout(15_000)});
  if(!probe.ok)throw new Error(`Credencial de armazenamento recusada (${probe.status}); importação não iniciada`);
  for(const entry of media){
    const response=await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${entry.path}`,{method:"POST",headers:{...auth,"Content-Type":"image/png","x-upsert":"true"},body:entry.bytes,signal:AbortSignal.timeout(40_000)});
    if(!response.ok)throw new Error(`Upload ${entry.name}: ${response.status} ${(await response.text()).slice(0,120)}`);
  }
  const applied=await post("apply");
  const offer=applied.applied?.find(item=>item.kind==="brandsvalidated"&&item.name==="Get Jacked");
  if(!offer?.id)throw new Error("O endpoint não retornou o ID do card Get Jacked");
  const readUrl=`${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(offer.id)}&select=id,data`;
  const before=await parseResponse(await fetch(readUrl,{headers:auth,signal:AbortSignal.timeout(15_000)}),"Leitura do card");
  if(before.length!==1)throw new Error("Card criado não encontrado para conferência");
  const previous=before[0].data||{},isNew=validation.plan[0].action==="create";
  const bmPrints=media.slice(1).map(entry=>({nome:entry.name,periodKey:entry.periodKey,img:entry.url}));
  const mergeBy=(current,incoming,key)=>[...incoming,...(Array.isArray(current)?current:[]).filter(item=>!incoming.some(next=>next[key]===item[key]))];
  const data={...previous,
    kind:"brandsvalidated",nomeOferta:"Get Jacked",nomeMarca:"Get Jacked",nicho:"Saúde Masculina",tipoTrafego:"meta",formato:"Cayenne Pepper · softgels de pimenta-caiena",imagemProduto:media[0].url,
    bmReports:mergeBy(previous.bmReports,reports,"key"),bmPrints:mergeBy(previous.bmPrints,bmPrints,"img"),
    brandTopAds:mergeBy(previous.brandTopAds,AD_LINKS.map((link,index)=>({nome:`Get Jacked · Anúncio ${index+1}`,link,period:"2026-10",sourceDate:"05/10/2026"})),"link"),
    bmSpend7d:reports[0].totals.spend,bmSpend14d:reports[1].totals.spend,bmSpend30d:reports[2].totals.spend,bmRoas:reports[0].totals.roas,bmUpdatedAt:"05/10/2026",
    bmNotes:"Leitura da conta BM USD HKT recebida em 05/10/2026, com períodos encerrados em 03/10/2026. As telas mostram campanhas e conjuntos que podem abranger outras marcas ou produtos. Vendas e ROAS calculados são da conta neste recorte, não resultado comprovadamente exclusivo do Get Jacked Cayenne Pepper. Telas de campanhas, conjuntos e anúncios do mesmo período não foram somadas entre si. ROAS estimado pela soma dos valores de compras visíveis dividida pelo gasto total; a BM exibe traço no total por múltiplas conversões.",
    offerTags:isNew?["insider","new"]:Array.isArray(previous.offerTags)?previous.offerTags:["insider"],
  };
  const saved=await parseResponse(await fetch(`${readUrl}`,{method:"PATCH",headers:{...auth,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({data}),signal:AbortSignal.timeout(20_000)}),"Atualização da BM");
  const row=saved[0];
  if(row?.id!==offer.id||row.data?.bmReports?.length<3||row.data?.bmPrints?.length<10||row.data?.brandTopAds?.length<3||row.data?.nicho!=="Saúde Masculina")throw new Error("Conferência pós-gravação incompleta");
  const publicCheck=await Promise.all([media[0],media[1]].map(async entry=>({name:entry.name,status:(await fetch(entry.url,{method:"HEAD",signal:AbortSignal.timeout(15_000)})).status})));
  if(publicCheck.some(item=>item.status!==200))throw new Error(`Mídia publicada não acessível: ${JSON.stringify(publicCheck)}`);
  console.log(JSON.stringify({ok:true,mode:"apply",offerId:offer.id,action:validation.plan[0].action,creativeCards:applied.applied.filter(item=>item.kind==="criativo").length,reports:row.data.bmReports.length,prints:row.data.bmPrints.length,topAds:row.data.brandTopAds.length,cover:row.data.imagemProduto},null,2));
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])main().catch(error=>{console.error(error.message);process.exitCode=1});
