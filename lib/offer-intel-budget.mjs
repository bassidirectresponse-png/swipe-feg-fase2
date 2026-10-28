import { IntelError, LIMITS } from "./offer-intel-core.mjs";
/** Strong Blobs CAS, no process-memory fallback. Reservations are never refunded on ambiguous POSTs. */
export function createDailyBudget({store,now=()=>new Date()}) {
  return {async reserve(reservation) {
    const date=now(),day=date.toISOString().slice(0,10),key="apify/"+day;
    const retryAfter=Math.max(1,Math.ceil((Date.parse(day+"T00:00:00Z")+86400000-date.getTime())/1000));
    try {
      for(let attempt=0;attempt<20;attempt++) {
        const old=await store.getWithMetadata(key,{type:"json",consistency:"strong"});
        const ids=old?.data?.reservations||[];
        if(!Array.isArray(ids)||ids.some(id=>typeof id!=="string"))throw Error("invalid budget");
        if(ids.includes(reservation))return {day,daily_used:ids.length,reused:true};
        if(ids.length>=LIMITS.daily_runs)throw new IntelError(429,"daily_limit","Limite diário de coleta atingido.",true,retryAfter);
        const result=await store.setJSON(key,{reservations:[...ids,reservation]},old?.etag?{onlyIfMatch:old.etag}:{onlyIfNew:true});
        if(result.modified)return {day,daily_used:ids.length+1,reused:false};
      }
    }catch(error){if(error instanceof IntelError)throw error;}
    throw new IntelError(503,"capability_unavailable","Não foi possível reservar a coleta.",true);
  }};
}
