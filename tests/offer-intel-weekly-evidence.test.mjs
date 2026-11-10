import test from 'node:test';import assert from 'node:assert/strict';
import {observedAdAnalysis,observedProductSummary}from'../lib/offer-intel-weekly-evidence.mjs';
import {validateAnalysis,validateBullets}from'../lib/offer-intel-weekly.mjs';
test('observed analysis quotes source claims and does not invent an absent mechanism or audience',()=>{
 const ad={ad_text:'A new daily routine.',display_format:'video',days_active:14,repetitions:3,media:{observed_at:'2026-11-10T10:00:00Z'}};
 const result=observedAdAnalysis(ad);assert.ok(validateAnalysis(result));assert.match(result.gancho,/A new daily routine/);assert.match(result.mecanismo,/Não identificado/);assert.match(result.publico,/não explicitado/);assert.match(result.por_que_funciona,/não comprovam vendas/);
});
test('product windows use observed active days and explicitly label repetition as collection data',()=>{
 const rows=[{rank:1,started_at:'2026-10-01',days_active:14,repetitions:6,display_format:'image',page_id:'1'}];
 const result=observedProductSummary({ads_collected:5},rows);assert.ok(validateBullets(result,3));assert.match(result.bullets[1],/7d: #1, 7 dias/);assert.match(result.bullets[1],/30d: #1, 14 dias/);assert.match(result.bullets[1],/repetição se refere à coleta/);
});
