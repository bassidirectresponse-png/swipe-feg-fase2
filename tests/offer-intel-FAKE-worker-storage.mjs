import { IntelError } from "../lib/offer-intel-core.mjs";
// Identified in-memory FAKE; no application imports this module.
export function createFAKEWorkerStorage(job) {
  const records=Object.fromEntries(["discoveries","relations","funnels","steps","edges","evidence","providers","scans"].map(k=>[k,new Map()]));
  let live=true;
  const fence=p=>{if(!live||p.job_id!==job.id||p.lease_token!==job.lease_token)throw new IntelError(409,"conflict","Lease inválido.");};
  const counts=()=>({discoveries:records.discoveries.size,relations:records.relations.size,funnels:records.funnels.size,steps:records.steps.size});
  return {records,cancel:()=>{live=false;},
    async scanPersist(p){fence(p);const row={...structuredClone(p.scan),investigation_id:job.id,scope_key:job.scope_key,created_at:new Date().toISOString()};records.scans.set(row.id,row);return row;},
    async workerState(p){fence(p);return {counts:counts(),evidence:[...records.evidence.values()],providers:[...records.providers.values()]};},
    async persist(p){fence(p);
      for(const [table,rows] of Object.entries(p.batch))for(const row of rows) {
        const old=records[table].get(row.id);
        if(table==="steps"&&old&&row.classification_basis?.method==="unvisited_link")continue;
        records[table].set(row.id,{...old,...structuredClone(row),...(table==="discoveries"?{scope_key:job.scope_key,data:{...old?.data,...structuredClone(row.data)},status:old?.status||"new",version:old?.version||1}:{}),
          ...(table==="funnels"?{scope_key:job.scope_key,created_at:old?.created_at||job.created_at||new Date().toISOString()}: {})});
      }
      // FAKE of migration 005: exact scope counts and latest entry-domain funnel.
      for(const d of records.discoveries.values())if(d.scope_key===job.scope_key) {
        if(d.type==='page'&&d.data.page_id)d.data.ads_found=[...records.discoveries.values()].filter(a=>a.scope_key===job.scope_key&&a.type==='ad'&&a.data.page_id===d.data.page_id).length;
        if(d.type==='domain') {
          const funnels=[...records.funnels.values()].filter(f=>{
            if(f.scope_key!==job.scope_key)return false;
            const s=records.steps.get(f.start_step_id);
            return [s?.original_url,s?.final_url].some(url=>{try{return new URL(url).hostname===d.data.domain;}catch{return false;}});
          }).sort((a,b)=>b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id));
          if(funnels[0])d.data.funnel_id=funnels[0].id;
        }
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
