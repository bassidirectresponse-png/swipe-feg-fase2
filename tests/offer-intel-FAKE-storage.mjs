// FAKE ONLY: executable contract model for RPC semantics; not a PostgreSQL integration test.
// Every transition below is synchronous before returning a Promise: one atomic transaction.
import { randomUUID } from "node:crypto";
import { IntelError, encodeCursor } from "../lib/offer-intel-core.mjs";
export function createFAKEStorage({now=()=>Date.now()}={}) {
  const jobs=new Map(),requests=new Map(),dispatches=new Map(),entities=new Map(),events=[];
  const clone=x=>structuredClone(x),iso=()=>new Date(now()).toISOString();
  const fail=code=>{throw new IntelError({not_found:404,conflict:409,job_active:409,cooldown:429,rate_limited:429,credentials_missing:503}[code]||400,code,"FAKE: "+code,code==="rate_limited"||code==="cooldown",code==="cooldown"?21600:60);};
  function prior(p,kind) {
    const r=requests.get(p.actor_id+":"+p.idempotency_key);
    if(r&&(r.hash!==p.request_hash||r.kind!==kind)) fail("conflict");
    return r;
  }
  function remember(p,kind,job,nonce) {
    requests.set(p.actor_id+":"+p.idempotency_key,{hash:p.request_hash,kind,job_id:job.id,nonce});
  }
  function dispatch(id) {
    const nonce=randomUUID();dispatches.set(nonce,{job_id:id,expires:now()+300000,used:false});return nonce;
  }
  function availableNonce(j) {
    if(j.status!=="queued")return null;
    return [...dispatches].find(([,d])=>d.job_id===j.id&&!d.used&&d.expires>now())?.[0]||dispatch(j.id);
  }
  const api={
    jobs,requests,dispatches,entities,events,
    async create(p) {
      const old=prior(p,"create");
      if(old)return {job:clone(jobs.get(old.job_id)),nonce:availableNonce(jobs.get(old.job_id)),reused:true};
      let j=[...jobs.values()].find(j=>j.scope_key===p.scope_key&&["queued","running"].includes(j.status)),nonce=null,reused=!!j;
      if(j) nonce=availableNonce(j);
      else {
        if(p.options.collect_ads&&!p.apify_available)fail("credentials_missing");
        if([...jobs.values()].some(j=>j.scope_key===p.scope_key&&Date.parse(j.created_at)>now()-21600000))fail("cooldown");
        if([...jobs.values()].filter(j=>j.created_by===p.actor_id&&Date.parse(j.created_at)>now()-3600000).length>=15)fail("rate_limited");
        j={...clone(p),id:randomUUID(),created_by:p.actor_id,status:"queued",phase:"validation",progress:0,progress_detail:{done:0,total:0},counts:{discoveries:0,relations:0,funnels:0,steps:0},attempt:0,
          created_at:iso(),updated_at:iso(),started_at:null,finished_at:null,next_retry_at:null,error:null,lease_token:null,lease_until:null};
        jobs.set(j.id,j);nonce=dispatch(j.id);
      }
      remember(p,"create",j,nonce);return {job:clone(j),nonce,reused};
    },
    async action(p) {
      const old=prior(p,p.action);
      if(old)return {job:clone(jobs.get(old.job_id)),nonce:p.action==="retry"?availableNonce(jobs.get(old.job_id)):null,reused:true};
      const j=jobs.get(p.job_id);if(!j)fail("not_found");
      let nonce=null;
      if(p.action==="cancel") {
        if(["queued","running"].includes(j.status))Object.assign(j,{status:"cancelled",phase:"done",finished_at:iso(),cancel_requested_at:iso(),lease_token:null,lease_until:null,updated_at:iso()});
      } else {
        if(j.status==="running"&&Date.parse(j.lease_until)>now())fail("job_active");
        if(["succeeded","cancelled"].includes(j.status)||(["failed","partial"].includes(j.status)&&!j.error?.retryable)||j.attempt>=3)fail("conflict");
        if(Date.parse(j.next_retry_at)>now())fail("rate_limited");
        if([...jobs.values()].some(other=>other.id!==j.id&&other.scope_key===j.scope_key&&["queued","running"].includes(other.status)))fail("job_active");
        for(const d of dispatches.values())if(d.job_id===j.id)d.used=true;
        j.sources=j.sources.map(s=>["failed","running"].includes(s.status)?{name:s.name,status:"pending",result_count:0}:s);
        Object.assign(j,{status:"queued",error:null,finished_at:null,lease_token:null,lease_until:null,updated_at:iso()});
        nonce=dispatch(j.id);
      }
      remember(p,p.action,j,nonce);return {job:clone(j),nonce,reused:false};
    },
    async get(id){return clone(jobs.get(id)||null);},
    async list({scope,status,limit,cursor}){
      let rows=[...jobs.values()].filter(j=>(!scope||j.scope_key===scope)&&(!status||status.includes(j.status)));
      rows.sort((a,b)=>b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id));
      if(cursor)rows=rows.filter(j=>j.created_at<cursor.created_at||(j.created_at===cursor.created_at&&j.id<cursor.id));
      const items=rows.slice(0,limit);
      return {items:clone(items),next_cursor:rows.length>limit?encodeCursor(items.at(-1)):null};
    },
    async claim({job_id,nonce}){
      const j=jobs.get(job_id),d=dispatches.get(nonce);
      if(!j||!["queued","running"].includes(j.status)||j.cancel_requested_at||Date.parse(j.next_retry_at)>now()||Date.parse(j.lease_until)>now()||j.attempt>=3)return null;
      if(!d||d.job_id!==job_id||d.used||d.expires<=now())return null;
      d.used=true;Object.assign(j,{status:"running",attempt:j.attempt+1,lease_token:randomUUID(),lease_until:new Date(now()+120000).toISOString(),started_at:j.started_at||iso(),updated_at:iso()});return clone(j);
    },
    async checkpoint({job_id,lease_token,patch}){
      const j=jobs.get(job_id);
      if(!j||j.status!=="running"||j.lease_token!==lease_token||Date.parse(j.lease_until)<=now()||j.cancel_requested_at)fail("conflict");
      if(patch.status&&!["running","succeeded","partial","failed"].includes(patch.status))fail("invalid_request");
      Object.assign(j,clone(patch),{updated_at:iso()});
      if(j.status==="running")j.lease_until=new Date(now()+120000).toISOString();
      else Object.assign(j,{finished_at:iso(),lease_until:null,lease_token:null});
      return clone(j);
    },
    async review(p){
      const old=prior(p,"review");if(old)return clone(old.result);
      const row=entities.get(p.id);if(!row)fail("not_found");
      if(row.version!==p.expected_version)fail("conflict");
      const allowed=p.entity_type==="discovery"?["new","confirmed","ignored","review"]:["pending","confirmed","ignored"];
      if(!allowed.includes(p.status))fail("invalid_request");
      events.push({id:randomUUID(),from_status:row.status,to_status:p.status});
      Object.assign(row,{status:p.status,version:row.version+1,reviewed_by:p.actor_id});
      requests.set(p.actor_id+":"+p.idempotency_key,{kind:"review",hash:p.request_hash,result:clone(row)});
      return clone(row);
    },
  };
  return api;
}
