import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const mediaSource=html.slice(html.indexOf('function brandAdMedia('),html.indexOf('function brandCard('));
test('Top ad mostra todos os arquivos distintos com player sob demanda dentro do produto',()=>{
 const ctx=vm.createContext({topAdDisplayName:()=> 'Anúncio 1',esc:s=>s,shotView:(n,u)=>`<img src="${u}">`,linkbtn:()=>''});
 vm.runInContext(mediaSource,ctx);
 const ad={link:'https://fb.me/adspreview/facebook/ABC',video:'a.mp4',img:'a.jpg',media:[{type:'video',url:'a.mp4',etag:'same',bytes:100},{type:'video',url:'alias.mp4',etag:'same',bytes:100},{type:'image',url:'a.jpg'},{type:'video',url:'b.mp4'}]};
 const rendered=ctx.brandTopAdHtml(ad,0);
 assert.equal((rendered.match(/<video /g)||[]).length,2);
 assert.equal((rendered.match(/<img /g)||[]).length,1);
 assert.equal((rendered.match(/preload="none"/g)||[]).length,2);
 assert.ok(rendered.includes('data-product-top-ad="1"'));
 assert.ok(rendered.includes('Mídia salva no Swipe'));
 assert.ok(!rendered.includes('alias.mp4'));
});
test('sincronização de Brands cria apenas Top ads e reutiliza a mídia anexada',async()=>{
 const created=[],ctx=vm.createContext({ensureCatalogSection:async()=>{},offers:[{id:"other",data:{kind:"criativo",sourceOfferId:"other-brand",linkAnuncio:"top"}}],canonicalCreativeUrl:x=>x,isFbUrl:()=>true,nextCreativeName:()=> 'Ad',BRAND_CREATIVE_GENERATION:'current',setTimeout:()=>{throw Error('não deve iniciar coleta');},sb:{from:()=>({insert:row=>({select:async()=>{created.push(row);return{data:[{id:String(created.length),...row}]};}})})}});
 vm.runInContext(mediaSource+html.slice(html.indexOf('async function syncOfferCreatives('),html.indexOf('async function runAdminOfferBatch(')),ctx);
 const row={id:'brand',data:{kind:'brandsvalidated',nomeMarca:'Marca',nomeOferta:'Produto',brandTopAds:[{link:'top',video:'saved.mp4'}],criativos:[{link:'extra'}],taboolaAds:[{link:'extra-native'}]}};
 await ctx.syncOfferCreatives(row);await ctx.syncOfferCreatives(row);
 assert.equal(created.length,1);assert.equal(created[0].data.linkAnuncio,'top');
 assert.equal(created[0].data.sourceOfferId,'brand');assert.equal(created[0].data.marca,'Marca');
 assert.equal(created[0].data.video,'saved.mp4');assert.equal(created[0].data.mediaArchiveStatus,'done');
});
