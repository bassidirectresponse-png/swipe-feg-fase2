// Uses the existing repository-bound temporary OIDC session. Defaults to inspection.
import {temporaryToken,responseJson} from './ingest_sp_nutrition.mjs';
const action=process.argv.includes('--apply')?'apply':'inspect';
let token=await temporaryToken(),issued=Date.now(),after=null;
const totals={scanned:0,changed:0,review:0,archived:0,counts:{}};
do{
 if(Date.now()-issued>180000){token=await temporaryToken();issued=Date.now();}
 const d=await responseJson(await fetch('https://swipe.fegsys.com/.netlify/functions/niche-taxonomy-maintenance',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action,after}),signal:AbortSignal.timeout(60000)}),'taxonomy');
 for(const k of ['scanned','changed','review','archived'])totals[k]+=d[k];
 for(const [k,v]of Object.entries(d.counts))totals.counts[k]=(totals.counts[k]||0)+v;
 console.log(JSON.stringify({action,scanned:totals.scanned,changed:d.changed,review:d.review,after:d.after,sample:d.sample}));
 after=d.done?null:d.after;
}while(after);
console.log(JSON.stringify({action,...totals}));
