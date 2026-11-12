import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {mediaArchiveDue,transcriptionDue} from '../netlify/functions/_creative-integrity.mjs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('retired organic module has no section, navigation, importer or writable media endpoint',()=>{
 assert.doesNotMatch(html,/key:"organic"|organic:"swipe-organic"|Swipe Organic|buildOrganicManifest|nextOrganicNames|organicMode/);
 assert.match(html,/retired:true/);assert.match(html,/histórico foi preservado/);
 const importer=readFileSync(new URL('../netlify/functions/admin-creative-import.mjs',import.meta.url),'utf8');assert.match(importer,/body.division === "organic"/);assert.match(importer,/json\(req,410/);
 for(const file of ['admin-media-ticket','admin-creative-import'])assert.doesNotMatch(readFileSync(new URL('../netlify/functions/'+file+'.mjs',import.meta.url),'utf8'),/organic\\\/ad-feg-ed/);
});
test('historical organic records are preserved but excluded from shared collection queues',()=>{
 const data={kind:'criativo',division:'organic',sourceOfferId:'original',video:'https://example.supabase.co/storage/v1/object/public/criativos/original.mp4',transcriptionStatus:'pending',linkAnuncio:'https://fb.me/adspreview/facebook/x'};const before=structuredClone(data);
 assert.equal(transcriptionDue(data),false);assert.equal(mediaArchiveDue(data),false);assert.deepEqual(data,before);
 assert.match(html,/return"organic-archive"/);assert.match(html,/RECENT_FIRST_SECTIONS=new Set\(\["criativo"\]\)/);
});
