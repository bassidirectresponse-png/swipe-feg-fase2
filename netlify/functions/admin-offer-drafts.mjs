import {getStore} from "@netlify/blobs";
import {authenticate,isAdmin,json,preflight,readJson,trustedOrigin} from "./_security.mjs";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const METHODS="GET, POST, OPTIONS";

export default async request=>{
  const options=preflight(request,METHODS);if(options)return options;
  if(!["GET","POST"].includes(request.method))return json(request,405,{ok:false,error:"método inválido"},METHODS);
  if(!trustedOrigin(request))return json(request,403,{ok:false,error:"origem não autorizada"},METHODS);
  const user=await authenticate(request);
  if(!user)return json(request,401,{ok:false,error:"sessão não reconhecida"},METHODS);
  if(!isAdmin(user))return json(request,403,{ok:false,error:"acesso restrito ao administrador"},METHODS);
  try{
    const store=getStore({name:"admin-offer-drafts",consistency:"strong"});
    if(request.method==="GET"){
      const drafts=[];
      for await(const page of store.list({prefix:"offers/",paginate:true})){
        for(const blob of page.blobs){
          if(!/^offers\/[0-9a-f-]{36}\.json$/i.test(blob.key))continue;
          const draft=await store.get(blob.key,{type:"json"});
          if(draft&&UUID.test(String(draft.target_offer_id||"")))drafts.push(draft);
        }
      }
      return json(request,200,{ok:true,drafts},METHODS);
    }
    const body=await readJson(request,{maxBytes:256*1024}),offerId=String(body?.target_offer_id||"");
    if(!UUID.test(offerId)||!body?.data_patch||typeof body.data_patch!=="object"||Array.isArray(body.data_patch))return json(request,400,{ok:false,error:"rascunho inválido"},METHODS);
    const newOffer=body.new_offer===true;
    if(newOffer&&(body.data_patch.kind!=="brandsvalidated"||!String(body.data_patch.nomeOferta||"").trim()||!String(body.data_patch.nicho||"").trim()))return json(request,400,{ok:false,error:"nova oferta privada precisa de produto, nicho e tipo Brands"},METHODS);
    const label=String(body.label||"Oferta Brands").slice(0,160);
    const draft={target_offer_id:offerId,label,new_offer:newOffer,data_patch:body.data_patch,updated_at:new Date().toISOString(),updated_by:String(user.email||"admin")};
    await store.setJSON(`offers/${offerId}.json`,draft);
    return json(request,200,{ok:true,draft},METHODS);
  }catch(error){
    if(error?.status)return json(request,error.status,{ok:false,error:error.message},METHODS);
    console.error("admin-offer-drafts",error);
    return json(request,500,{ok:false,error:"não foi possível acessar o rascunho"},METHODS);
  }
};
