import { IntelError, encodeCursor } from "./offer-intel-core.mjs";

/** Storage contract:
 * create(input)->{job,reused,nonce}; action(input)->same; get(id)->job|null;
 * list({scope,status,limit,cursor})->{items,next_cursor}; claim({job_id,nonce})->job|null;
 * checkpoint({job_id,lease_token,patch})->job; review(input)->entity.
 * Atomicity lives in SQL RPCs, NOT read-then-write JavaScript. Only test code provides a FAKE.
 */
export function createSupabaseStorage({ url, serviceKey, fetcher = fetch }) {
  if (!serviceKey) throw new IntelError(503,"credentials_missing","Credencial interna não configurada.");
  const base = new URL("/rest/v1/", url);
  async function request(path, method = "GET", body) {
    const res = await fetcher(new URL(path, base), {
      method, headers: { apikey:serviceKey, Authorization:"Bearer "+serviceKey, "Content-Type":"application/json" },
      ...(body ? { body:JSON.stringify(body) } : {}), signal:AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      const detail = await res.json().catch(()=>({}));
      const code = detail.message;
      const statuses = { conflict:409, job_active:409, not_found:404, cooldown:429, rate_limited:429, daily_limit:429, invalid_request:400, credentials_missing:503 };
      if (statuses[code]) throw new IntelError(statuses[code],code,
        code==="credentials_missing" ? "Coleta Apify não configurada nesta entrega." : code==="cooldown" ? "Aguarde o intervalo entre investigações." : "Operação não permitida no estado atual.",
        statuses[code]===429, statuses[code]===429 ? Math.max(1,Number(detail.details)||60) : undefined);
      throw new IntelError(503,"capability_unavailable","Armazenamento de inteligência indisponível.",true);
    }
    return res.json();
  }
  const rpc = (name,p) => request("rpc/offer_intel_"+name,"POST",{p});
  return {
    create: p=>rpc("create",p), action:p=>rpc("action",p), claim:p=>rpc("claim",p),
    checkpoint:p=>rpc("checkpoint",p), review:p=>rpc("review",p), read:p=>rpc("read",p),
    persist:p=>rpc("persist",p), workerState:p=>rpc("worker_state",p), provider:p=>rpc("provider",p),
    budgetReserve:p=>rpc("budget_reserve",p), budgetUsage:()=>rpc("budget_usage",{}),
    async get(id) {
      const query=new URLSearchParams({ id:"eq."+id, select:"*", limit:"1" });
      return (await request("offer_intel_investigations?"+query))[0] || null;
    },
    async list({scope,status,limit,cursor}) {
      const q=new URLSearchParams({ select:"*", order:"created_at.desc,id.desc", limit:String(limit+1) });
      if(scope) q.set("scope_key","eq."+scope);
      if(status?.length) q.set("status","in.("+status.join(",")+")");
      if(cursor) q.set("or","(created_at.lt."+cursor.created_at+",and(created_at.eq."+cursor.created_at+",id.lt."+cursor.id+"))");
      const rows=await request("offer_intel_investigations?"+q), more=rows.length>limit, items=rows.slice(0,limit);
      return {items,next_cursor:more?encodeCursor(items.at(-1)):null};
    },
  };
}
