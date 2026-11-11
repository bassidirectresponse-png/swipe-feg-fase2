import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPeriodRanking,withPeriodStorage} from '../lib/offer-intel-weekly-periods.mjs';
import {publicAd} from '../lib/offer-intel-weekly.mjs';
const product={offer_id:'one',sources:[{kind:'page',page_id:'123456',key:'page:123456'}]};
const ad=(id,days,repetitions=1,observed='2026-11-11T12:00:00Z')=>({ad_archive_id:id,page_id:'123456',ad_text:'Unique '+id,headline:'Unique '+id,started_at:new Date(Date.parse('2026-11-11T12:00:00Z')-days*86400000).toISOString(),observed_at:observed,days_active:days,collation_count:repetitions,thumb_url:'https://scontent.fbcdn.net/unique-image-'+id+'.jpg',display_format:'image'});
test('new windows examine the full pool, keep cumulative boundaries and reject stale observations',()=>{
 const ads=[...Array.from({length:15},(_,i)=>ad(String(1000+i),100+i,30)),ad('2000',3,7),ad('2001',10,8),ad('2002',22,9),ad('2003',40,100,'2026-09-01T12:00:00Z')];
 const rows=buildPeriodRanking({ads,products:[product],reviewDate:'2026-11-11'});
 const ids=days=>rows.filter(r=>r.period_ranks['new_'+days]).map(r=>r.ad_archive_id).sort();
 assert.deepEqual(ids(7),['2000']);assert.deepEqual(ids(14),['2000','2001']);assert.deepEqual(ids(30),['2000','2001','2002']);
 assert.ok(!rows.some(r=>r.ad_archive_id==='2003'));
 assert.ok(rows.find(r=>r.ad_archive_id==='2000').rank>10,'new creative was outside general Top 10');
});
test('supplemental writes serialize, preserve general ranking and fail closed on an expired lease',async()=>{
 let blob=null,expired=false;const base={listAds:async()=>[{id:'db',offer_id:'one',ad_archive_id:'1000',rank:1}],checkpoint:async()=>{if(expired)throw Error('conflict');},saveAd:async()=>{throw Error('unexpected SQL');}};
 const store={get:async()=>blob,setJSON:async(_,v)=>{await new Promise(r=>setTimeout(r,2));blob=structuredClone(v);}};
 const storage=withPeriodStorage(base,store),f={report_id:'report',lease_token:'lease'};
 await storage.savePeriodRanking({...f,rows:[{offer_id:'one',ad_archive_id:'1000',period_ranks:{new_7:1}},{offer_id:'one',ad_archive_id:'2000',rank:11,period_ranks:{new_14:1}}]});
 let rows=await storage.listAds('report');assert.equal(rows.length,2);assert.equal(rows[0].general_rank,1);assert.equal(rows[1].general_rank,null);
 await Promise.all([storage.saveAd({...f,id:rows[1].id,patch:{analysis:{saved:true}}}),storage.saveAd({...f,id:rows[1].id,patch:{media:{archived:true}}})]);
 rows=await storage.listAds('report');assert.deepEqual(rows[1].analysis,{saved:true});assert.deepEqual(rows[1].media,{archived:true});
 expired=true;await assert.rejects(storage.saveAd({...f,id:rows[1].id,patch:{analysis:null}}),/conflict/);
 assert.deepEqual((await storage.listAds('report'))[1].analysis,{saved:true});
});
test('historical evidence never exposes active window metrics or arbitrary ranking fields',()=>{
 const row=publicAd({ad_archive_id:'123456',historical:true,rank:1,general_rank:null,period_ranks:{new_7:2,token:'secret'},media:{},started_at:'2026-01-01',days_active:10});
 assert.deepEqual(row.window_metrics,{});assert.deepEqual(row.period_ranks,{new_7:2});assert.equal(row.general_rank,null);
});
