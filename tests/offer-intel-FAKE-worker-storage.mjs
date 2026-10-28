import { IntelError } from "../lib/offer-intel-core.mjs";
// Identified in-memory FAKE; no application imports this module.
export function createFAKEWorkerStorage(job) {
  const records=Object.fromEntries(["discoveries","relations","funnels","steps","edges","evidence","providers"].map(k=>[k,new Map()]));
  let live=true;
  const fence=p=>{if(!live||p.job_id!==job.id||p.lease_token!==job.lease_token)throw new IntelError(409,"conflict","Lease inválido.");};
  const counts=()=>({discoveries:records.discoveries.size,relations:records.relations.size,funnels:records.funnels.size,steps:records.steps.size});
  return {records,cancel:()=>{live=false;},
    async workerState(p){fence(p);return {counts:counts(),evidence:[...records.evidence.values()],providers:[...records.providers.values()]};},
    async persist(p){fence(p);
      for(const [table,rows] of Object.entries(p.batch))for(const row of rows) {
        const old=records[table].get(row.id);
        if(table==="steps"&&old&&old.verification!=="inferred"&&row.verification==="inferred")continue;
        records[table].set(row.id,{...old,...structuredClone(row),...(table==="discoveries"?{status:old?.status||"new",version:old?.version||1}:{})});
      }
      return counts();
    },
    async provider(p){fence(p);let r=records.providers.get(p.query_key);
      if(!r){r={query_key:p.query_key,state:"reserved",request:p.request,created_at:new Date().toISOString()};records.providers.set(p.query_key,r);}
      if(p.patch){if(p.expected_state!==r.state)throw new IntelError(409,"conflict","CAS inválido.");Object.assign(r,structuredClone(p.patch));}
      return structuredClone(r);
    },
  };
}
