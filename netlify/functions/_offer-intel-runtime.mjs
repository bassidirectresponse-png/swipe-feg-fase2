import { getStore } from "@netlify/blobs";
import { SUPABASE_URL } from "./_security.mjs";
import { automationSigningSecret } from "./_supabase-admin.mjs";
import { createSupabaseStorage } from "../../lib/offer-intel-storage.mjs";
import { createReferenceReader } from "../../lib/offer-intel-reference.mjs";
import { resolvePublicUrl } from "../../lib/offer-intel-url-safety.mjs";
import { signedDispatch } from "../../lib/offer-intel-dispatch.mjs";
import { unavailableCollectors } from "../../lib/offer-intel-collectors.mjs";
import { IntelError } from "../../lib/offer-intel-core.mjs";
import { createDomainExplorer } from "../../lib/offer-intel-domain.mjs";

export function intelRuntime() {
  const serviceKey=String(process.env.SUPABASE_SERVICE_ROLE_KEY||"").trim();
  const secret=automationSigningSecret();
  // No bot fallback: only service_role can write the auxiliary schema.
  const storage=createSupabaseStorage({url:SUPABASE_URL,serviceKey});
  const reader=createReferenceReader({
    supabaseUrl:SUPABASE_URL,serviceKey,
    readDraft:async id=>{
      try {return await getStore({name:"admin-offer-drafts",consistency:"strong"}).get("offers/"+id+".json",{type:"json"});}
      catch {throw new IntelError(503,"capability_unavailable","Não foi possível validar o rascunho.",true);}
    },
  });
  return {
    storage,reader,secret,collectors:{...unavailableCollectors,domain_explorer:createDomainExplorer({storage})},validateUrl:resolvePublicUrl,
    // B2 exposes orchestration only. A token alone does not enable an unimplemented adapter.
    capabilities: { apify: false, domain_explorer: true },
    async dispatch(jobId,nonce) {
      const origin=new URL(process.env.URL||"https://benchmarkinggrupofeg.site").origin;
      const signed=signedDispatch(jobId,nonce,secret);
      const response=await fetch(origin+"/.netlify/functions/offer-intel-background",{
        method:"POST",...signed,signal:AbortSignal.timeout(10000),
      });
      if(!response.ok) throw new IntelError(503,"capability_unavailable","Não foi possível iniciar o processamento.",true);
    },
  };
}
