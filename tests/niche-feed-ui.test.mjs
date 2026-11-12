import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {taxonomy} from '../lib/niche-taxonomy.mjs';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const code=html.slice(html.indexOf('function feedTopicOptionsHtml('),html.indexOf('function renderSubFilter('));
for(const section of ['tiktok','noticia'])test(`${section}: changing a focused niche immediately enables and resets its dependent subniche`,()=>{
 const handlers={};const niche={addEventListener:(name,fn)=>handlers.niche=fn},topic={disabled:true,innerHTML:'',value:'old',addEventListener:(name,fn)=>handlers.topic=fn},author={value:'old-author'};
 const el={querySelector:s=>({'[data-feed-niche]':niche,'[data-feed-topic]':topic,'#tiktokAuthorFilter':author})[s]};
 const ctx=vm.createContext({RADAR_TOPICS:taxonomy.topics,RADAR_NICHES:taxonomy.names,esc:s=>s,sameNiche:(a,b)=>a===b,activeSection:section,activeNiche:'',newsSubniche:'old',tiktokSubniche:'old',tiktokAuthor:'old-author',navigate:()=>{},currentPath:()=>'/filtered'});
 vm.runInContext(code,ctx);ctx.wireFeedFilters(el);
 handlers.niche({target:{value:'Skin Care'}});
 assert.equal(topic.disabled,false);assert.match(topic.innerHTML,/>Antissinais</);assert.doesNotMatch(topic.innerHTML,/>Sono</);assert.equal(topic.value,'');assert.equal(author.value,'');
 handlers.topic({target:{value:'Antissinais'}});assert.equal(ctx[section==='noticia'?'newsSubniche':'tiktokSubniche'],'Antissinais');
 handlers.niche({target:{value:'Pet'}});assert.match(topic.innerHTML,/>Coceira</);assert.match(topic.innerHTML,/>Dental</);assert.doesNotMatch(topic.innerHTML,/>Antissinais</);assert.equal(ctx.newsSubniche,'');assert.equal(ctx.tiktokSubniche,'');
 handlers.niche({target:{value:''}});assert.equal(topic.disabled,true);assert.equal(topic.innerHTML,'<option value="">Todos os subnichos</option>');
});
