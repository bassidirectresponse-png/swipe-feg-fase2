import test from 'node:test';
import assert from 'node:assert/strict';
import {hasInsiderData,adKey,mediaOf,stableCreativeId,matchCreative,references,ownedMedia} from '../lib/brand-media-archive.mjs';
import {exactApifyMedia} from '../netlify/functions/_brand-apify-media.mjs';
import {mediaArchiveDue} from '../netlify/functions/_creative-integrity.mjs';
import {createBrandMaintenance} from '../netlify/functions/brand-creative-maintenance.mjs';
const url='https://pkvzwtstidtobpdngxnd.supabase.co/storage/v1/object/public/criativos/brands/test.mp4';
test('Insider usa evidência real, inclusive quando bmAccess é false',()=>{
 assert.equal(hasInsiderData({bmAccess:false,bmReports:[{key:'30d'}]}),true);
 assert.equal(hasInsiderData({bmPrints:[{nome:'',img:''}]}),false);
});
test('identidade preserva preview e experiência; não associa por posição ou marca',()=>{
 const link='https://fb.me/adspreview/facebook/ABC';
 assert.equal(adKey(link+'?utm_source=x'),adKey(link));
 assert.notEqual(adKey('https://business.facebook.com/ads/experience/confirmation/?encrypted_experience_id=abc'),adKey('https://business.facebook.com/ads/experience/confirmation/?encrypted_experience_id=def'));
 const rows=[{id:'saved',data:{sourceOfferId:'brand',video:url,nome:'Ad 01'}}];
 assert.equal(matchCreative(rows,'brand',{key:adKey(link),nome:'Ad 01'}),undefined);
 assert.equal(matchCreative(rows,'other',{key:'x',video:url}),undefined);
 assert.equal(matchCreative(rows,'brand',{key:'x',video:url})?.id,'saved');
 assert.equal(stableCreativeId('brand',adKey(link)),stableCreativeId('brand',adKey(link)));
});
test('arquivado significa armazenamento do projeto, não CDN temporária ou outro tenant',()=>{
 assert.equal(ownedMedia(url),true);
 assert.equal(ownedMedia(url.replace('pkvzwtstidtobpdngxnd','evil')),false);
 assert.equal(mediaOf({video:'https://video.fbcdn.net/temp.mp4'}).length,0);
 assert.equal(mediaOf({video:url,archivedMedia:[{type:'video',url}]}).length,1);
});
test('referências repetidas são fundidas sem perder mídia do primeiro registro',()=>{
 const link='https://fb.me/adspreview/facebook/ABC';
 const refs=references({brandTopAds:[{link,video:url}],criativos:[{link,nome:'Ad'}]});
 assert.equal(refs.length,1);assert.equal(refs[0].media[0].url,url);
});
test('Apify exige identidade exata e preserva vídeo e imagem do carrossel',()=>{
 const link='https://fb.me/adspreview/facebook/ABC';
 const row={inputUrl:link,pageId:'123',adArchiveId:'456',snapshot:{cards:[{videoHdUrl:'https://v.fbcdn.net/a.mp4'},{originalImageUrl:'https://v.fbcdn.net/b.jpg'}]}};
 assert.equal(exactApifyMedia([row],link).length,2);
 assert.equal(exactApifyMedia([row],link+'X').length,0);
 assert.equal(exactApifyMedia([row],'https://facebook.com/ads/library/?id=999').length,0);
 assert.equal(exactApifyMedia([row],'https://facebook.com/ads/library/?id=456').length,2);
});
test('fonte privada não gera tentativas repetidas; CDN externo continua pendente',()=>{
 const data={kind:'criativo',division:'fegbrands',brandCreativeGeneration:'offer-topads-2026-10-07',sourceOfferId:'brand',linkAnuncio:'https://fb.me/adspreview/facebook/ABC'};
 assert.equal(mediaArchiveDue({...data,mediaArchiveStatus:'source_required'}),false);
 assert.equal(mediaArchiveDue({...data,video:'https://video.fbcdn.net/temp.mp4'}),true);
 assert.equal(mediaArchiveDue({...data,video:url}),false);
});
test('manutenção recusa acesso anônimo e campos arbitrários antes de tocar no banco',async()=>{
 let handler=createBrandMaintenance({verify:async()=>{throw Error('denied')}});
 assert.equal((await handler(new Request('https://app.test',{method:'POST',body:'{}'}))).status,401);
 handler=createBrandMaintenance({verify:async()=>({})});
 assert.equal((await handler(new Request('https://app.test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'reconcile',sql:'drop table'})}))).status,400);
});
test('reaproveita vínculo alternativo confirmado sem associar outros anúncios',()=>{
 const link='https://fb.me/adspreview/facebook/ABC';
 const row={id:'original',data:{sourceOfferId:'brand',video:url,sourceAdLinks:[link]}};
 assert.equal(matchCreative([row],'brand',{key:adKey(link)})?.id,'original');
 assert.equal(matchCreative([row],'brand',{key:adKey(link+'D')}),undefined);
});
test('timeout não comprova mídia indisponível e login não dispara cobrança recorrente',async()=>{
 const {collectionOutcome}=await import('../netlify/functions/_brand-apify-media.mjs');
 assert.equal(collectionOutcome('TIMED-OUT',[]),'incomplete');
 assert.equal(collectionOutcome('FAILED',[]),'incomplete');
 assert.equal(collectionOutcome('SUCCEEDED',[]),'unavailable');
 assert.equal(collectionOutcome('TIMED-OUT',[{sourceUrl:'https://v.fbcdn.net/a.mp4'}]),'ready');
 for(const state of ['access_required','review_required'])assert.equal(mediaArchiveDue({kind:'criativo',division:'fegbrands',brandCreativeGeneration:'offer-topads-2026-10-07',sourceOfferId:'brand',linkAnuncio:'https://fb.me/adspreview/facebook/ABC',mediaArchiveStatus:state}),false);
});
test('prévia que exige login é reconhecida antes de consulta paga, sem usar palavras isoladas',async()=>{
 const {previewRequiresLogin}=await import('../netlify/functions/_brand-apify-media.mjs');
 assert.equal(previewRequiresLogin('https://business.facebook.com/business/loginpage/?next=x'),true);
 assert.equal(previewRequiresLogin('https://facebook.com/checkpoint/123'),true);
 assert.equal(previewRequiresLogin('https://facebook.com/ads/experience/confirmation/', '<input name="email"><input name="pass">'),true);
 assert.equal(previewRequiresLogin('https://facebook.com/ads/experience/confirmation/', 'Login to learn more about our product'),false);
 assert.equal(previewRequiresLogin('https://evil.example/login/'),false);
});
test('nova tentativa é explícita e nunca recolhe mídia pronta ou prévia bloqueada por login',async()=>{
 const {collectionEligible}=await import('../netlify/functions/_brand-apify-media.mjs');
 assert.equal(collectionEligible(null),true);
 assert.equal(collectionEligible({state:'incomplete'}),false);
 assert.equal(collectionEligible({state:'incomplete'},true),true);
 assert.equal(collectionEligible({state:'ready',media:[{url}]},true),false);
 assert.equal(collectionEligible({state:'incomplete',publicCheck:{status:'login_required'}},true),false);
 assert.equal(collectionEligible({state:'running'},true),false);
});
