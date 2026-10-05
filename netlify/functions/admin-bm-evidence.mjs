import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import {resolve} from "node:path";
import {getStore} from "@netlify/blobs";
import {authenticate, bearerToken, corsHeaders, isAdmin, json, preflight, SUPABASE_ANON_KEY, SUPABASE_URL, trustedOrigin} from "./_security.mjs";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BLOB_REF=/^blob:([0-9a-f-]{36}):([0-9a-f]{64}):(jpeg|png|webp)$/i;
const LEGACY_REF=/^legacy:(ultima-peak|primal-viking|ancestral-supplements|mars-men|joymode)\/print-(0[1-9]|10)\.(jpeg|b64)$/;
const MAX_IMAGE_BYTES=4*1024*1024;

function contentType(bytes){
  if(bytes[0]===0xff&&bytes[1]===0xd8&&bytes.at(-2)===0xff&&bytes.at(-1)===0xd9)return"image/jpeg";
  if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return"image/png";
  if(bytes.toString("ascii",0,4)==="RIFF"&&bytes.toString("ascii",8,12)==="WEBP")return"image/webp";
  return"";
}

export default async req=>{
  const options=preflight(req,"GET, POST, OPTIONS");if(options)return options;
  if(!["GET","POST"].includes(req.method))return json(req,405,{ok:false,error:"método inválido"},"GET, POST, OPTIONS");
  if(!trustedOrigin(req))return json(req,403,{ok:false,error:"origem não autorizada"},"GET, POST, OPTIONS");
  const user=await authenticate(req);
  if(!user)return json(req,401,{ok:false,error:"sessão não reconhecida"},"GET, POST, OPTIONS");
  if(req.method==="POST"&&!isAdmin(user))return json(req,403,{ok:false,error:"acesso restrito ao administrador"},"GET, POST, OPTIONS");
  try{
    if(req.method==="POST"){
      const offerId=String(req.headers.get("x-offer-id")||"");
      if(!UUID.test(offerId))return json(req,400,{ok:false,error:"oferta inválida"},"GET, POST, OPTIONS");
      if(Number(req.headers.get("content-length")||0)>MAX_IMAGE_BYTES)return json(req,413,{ok:false,error:"imagem acima de 4 MB"},"GET, POST, OPTIONS");
      const bytes=Buffer.from(await req.arrayBuffer());
      if(!bytes.length||bytes.length>MAX_IMAGE_BYTES)return json(req,413,{ok:false,error:"imagem vazia ou acima de 4 MB"},"GET, POST, OPTIONS");
      const mime=contentType(bytes);
      if(!mime)return json(req,415,{ok:false,error:"envie JPEG, PNG ou WebP válido"},"GET, POST, OPTIONS");
      const type=mime.split("/")[1],hash=createHash("sha256").update(bytes).digest("hex"),key=`${offerId}/${hash}.${type}`;
      const store=getStore({name:"admin-bm-evidence",consistency:"strong"});
      await store.set(key,new Blob([bytes],{type:mime}),{metadata:{mime,offerId}});
      return json(req,200,{ok:true,ref:`blob:${offerId}:${hash}:${type}`},"GET, POST, OPTIONS");
    }
    const ref=String(new URL(req.url).searchParams.get("ref")||"");
    const blob=BLOB_REF.exec(ref),legacy=LEGACY_REF.exec(ref);
    if(!blob&&!legacy)return json(req,400,{ok:false,error:"referência inválida"},"GET, POST, OPTIONS");
    if(!isAdmin(user)){
      const suffix=blob?`&id=eq.${encodeURIComponent(blob[1])}`:"&data->>kind=eq.brandsvalidated&limit=1000";
      const visible=await fetch(`${SUPABASE_URL}/rest/v1/offers?select=data${suffix}`,{
        headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${bearerToken(req)}`},signal:AbortSignal.timeout(10_000),
      });
      if(!visible.ok)return json(req,503,{ok:false,error:"não foi possível conferir publicação"},"GET, POST, OPTIONS");
      const rows=await visible.json();
      if(!Array.isArray(rows)||!rows.some(row=>row.data?.kind==="brandsvalidated"&&Array.isArray(row.data?.bmPrints)&&row.data.bmPrints.some(print=>print?.img===`admin-bm:${ref}`||print?.img===`/assets/${legacy?.[1]}/print-${legacy?.[2]}.${legacy?.[3]}`))){
        return json(req,403,{ok:false,error:"print ainda não publicado"},"GET, POST, OPTIONS");
      }
    }
    let bytes,mime;
    if(blob){
      const [,offerId,hash,type]=blob;if(!UUID.test(offerId))return json(req,400,{ok:false,error:"oferta inválida"},"GET, POST, OPTIONS");
      const value=await getStore({name:"admin-bm-evidence",consistency:"strong"}).get(`${offerId}/${hash}.${type}`,{type:"arrayBuffer"});
      if(!value)return json(req,404,{ok:false,error:"print não encontrado"},"GET, POST, OPTIONS");
      bytes=Buffer.from(value);mime=`image/${type}`;
    }else{
      const file=`${legacy[1]}/print-${legacy[2]}.${legacy[3]}`;
      const raw=await readFile(resolve(process.cwd(),"assets",file));
      bytes=legacy[3]==="b64"?Buffer.from(raw.toString("utf8").trim(),"base64"):raw;
      mime="image/jpeg";
    }
    return new Response(bytes,{status:200,headers:{...corsHeaders(req,"GET, POST, OPTIONS"),"Content-Type":mime,"Content-Disposition":"inline","Cache-Control":"private, no-store"}});
  }catch(error){
    if(error&&error.code==="ENOENT")return json(req,404,{ok:false,error:"print não encontrado"},"GET, POST, OPTIONS");
    console.error("admin-bm-evidence",error);
    return json(req,500,{ok:false,error:"não foi possível acessar o print"},"GET, POST, OPTIONS");
  }
};
