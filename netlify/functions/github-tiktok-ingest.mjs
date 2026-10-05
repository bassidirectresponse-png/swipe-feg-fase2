import {SUPABASE_URL} from "./_security.mjs";
import {supabaseAdminAuth} from "./_supabase-admin.mjs";
import {verifyGithubAutomationToken} from "./_github-oidc.mjs";

const GENERATION="offers-topics-2026-10-05";
const NICHES=new Set(["Saúde masculina","Saúde feminina","Saúde Cardiovascular","Saúde íntima / libido","Sono/ Beleza","Saúde Geral/Nutrição","Pet"]);
const TOPICS={"Saúde masculina":["Testosterona","Libido","Próstata","Geral"],"Saúde feminina":["Menopausa","Hormônios","Geral"],"Saúde Cardiovascular":["Coração","Pressão arterial","Colesterol","Geral"],"Saúde íntima / libido":["Libido","Saúde sexual","Saúde íntima","Geral"],"Sono/ Beleza":["Sono","Pele","Beleza","Geral"],"Saúde Geral/Nutrição":["Nutrição","Intestino","Imunidade","Articulações","Geral"],"Pet":["Articulações","Pele e pelagem","Nutrição","Colágeno","Geral"]};
const MAX_ROWS=400,MAX_BYTES=2*1024*1024;
const json=(status,body)=>Response.json(body,{status,headers:{"Cache-Control":"no-store","Content-Type":"application/json; charset=utf-8"}});

export default async function handler(request){
  if(request.method!=="POST")return json(405,{ok:false,error:"método não permitido"});
  const bearer=String(request.headers.get("authorization")||"").match(/^Bearer (.+)$/i)?.[1]||"";
  try{
    const claims=await verifyGithubAutomationToken(bearer);
    if(!String(claims.workflow_ref||"").includes("/.github/workflows/tiktok-mining.yml@"))return json(403,{ok:false,error:"workflow não permitido"});
  }catch{return json(401,{ok:false,error:"automação não autorizada"});}
  if(!String(request.headers.get("content-type")||"").startsWith("application/json"))return json(415,{ok:false,error:"JSON obrigatório"});
  if(Number(request.headers.get("content-length")||0)>MAX_BYTES)return json(413,{ok:false,error:"lote excede o limite"});
  let rows;
  try{const raw=await request.text();if(Buffer.byteLength(raw,"utf8")>MAX_BYTES)return json(413,{ok:false,error:"lote excede o limite"});rows=JSON.parse(raw);}
  catch{return json(400,{ok:false,error:"JSON inválido"});}
  if(rows?.action==="reset"){
    if(rows.confirm!=="DELETE_ALL_TIKTOK")return json(400,{ok:false,error:"confirmação de limpeza inválida"});
    try{
      const admin=await supabaseAdminAuth();
      if(admin.mode!=="service_role")return json(503,{ok:false,error:"credencial de serviço indisponível"});
      const response=await fetch(`${SUPABASE_URL}/rest/v1/offers?data->>kind=eq.tiktok`,{method:"DELETE",headers:{apikey:admin.apikey,Authorization:`Bearer ${admin.token}`,Prefer:"return=minimal"},signal:AbortSignal.timeout(25_000)});
      if(!response.ok){console.error("github-tiktok-ingest reset",response.status);return json(502,{ok:false,error:"limpeza do Radar falhou"});}
      return json(200,{ok:true,reset:true,scope:"kind=tiktok"});
    }catch(error){console.error("github-tiktok-ingest reset",String(error?.message||error).slice(0,160));return json(503,{ok:false,error:"limpeza temporariamente indisponível"});}
  }
  if(!Array.isArray(rows)||!rows.length||rows.length>MAX_ROWS)return json(400,{ok:false,error:"lote inválido"});
  const seen=new Set();
  for(const row of rows){
    const id=String(row?.videoId||"");
    if(row?.kind!=="tiktok"||row.radarGeneration!==GENERATION||!NICHES.has(row.nicho)||!TOPICS[row.nicho].includes(row.subnicho)||row.isAd||!/^[0-9]{10,25}$/.test(id)||seen.has(id)||!/^https:\/\/(?:www\.)?tiktok\.com\//.test(String(row.url||"")))return json(400,{ok:false,error:"vídeo ou nicho inválido"});
    seen.add(id);
  }
  try{
    const admin=await supabaseAdminAuth();
    if(admin.mode!=="service_role")return json(503,{ok:false,error:"credencial de serviço indisponível"});
    const response=await fetch(`${SUPABASE_URL}/rest/v1/offers`,{
      method:"POST",
      headers:{apikey:admin.apikey,Authorization:`Bearer ${admin.token}`,"Content-Type":"application/json",Prefer:"return=minimal"},
      body:JSON.stringify(rows.map(data=>({data}))),
      signal:AbortSignal.timeout(25_000),
    });
    if(!response.ok){console.error("github-tiktok-ingest Supabase",response.status);return json(502,{ok:false,error:"gravação dos vídeos falhou"});}
    return json(200,{ok:true,inserted:rows.length,generation:GENERATION});
  }catch(error){console.error("github-tiktok-ingest",String(error?.message||error).slice(0,160));return json(503,{ok:false,error:"ingestão temporariamente indisponível"});}
}
