import fs from 'node:fs';
import {temporaryToken,responseJson} from './ingest_sp_nutrition.mjs';
const action=process.argv.includes('--apply')?'apply':'inspect';let token=await temporaryToken(),issued=Date.now(),offset=0;
const totals={scanned:0,changed:0,counts:{}};
while(true){
 if(Date.now()-issued>180000){token=await temporaryToken();issued=Date.now();}
 const res=await fetch('https://swipe.fegsys.com/.netlify/functions/niche-review-maintenance',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action,offset}),signal:AbortSignal.timeout(60000)});
 if(!res.ok){const error=await res.json();fs.writeFileSync('/tmp/swipe-review-conflicts.json',JSON.stringify(error),{mode:0o600});console.error(JSON.stringify({status:res.status,conflicts:error.conflicts}));throw Error('Review stopped HTTP '+res.status);}
 const d=await res.json();totals.scanned+=d.scanned;totals.changed+=d.changed;for(const[k,n]of Object.entries(d.counts))totals.counts[k]=(totals.counts[k]||0)+n;
 console.log(JSON.stringify({action,...d}));if(d.done)break;offset=d.next;
}
console.log(JSON.stringify({action,...totals}));
