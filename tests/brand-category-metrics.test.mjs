import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";

const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");

test("Ofertas Brands usam três categorias sem alterar Radar e Notícias",()=>{
  assert.match(html,/const BRAND_CATEGORIES=\["SUPPLEMENTS","PET","SKIN CARE"\]/);
  assert.match(html,/const RADAR_NICHES=\[\.\.\.BRAND_NICHE_ORDER,"Pet"\]/);
  assert.match(html,/const ordered=activeSection==="brandsvalidated"\?BRAND_CATEGORIES/);
  assert.match(html,/const requested=r\.q\.get\("sort"\)\|\|\(activeSection==="brandsvalidated"\?"spend_7d":"active_ads"\)/);
  assert.doesNotMatch(html,/if\(offerSort==="spend_7d"\|\|offerSort==="sales_7d"\)return `<div class="brandhub/);
});

test("produtos antigos entram em Supplements ou Pet sem perder nicho original",()=>{
  const categoryFn=html.slice(html.indexOf("function insiderCategoryOf("),html.indexOf("/* A estrutura por nicho/produto"));
  const context={isAdmin:false,BRAND_CATEGORIES:["SUPPLEMENTS","PET","SKIN CARE"]};
  runInNewContext(`${categoryFn};globalThis.category=insiderCategoryOf;`,context);
  assert.equal(context.category({data:{nomeOferta:"Astaxanthin",nicho:"Saúde feminina"}}),"SUPPLEMENTS");
  assert.equal(context.category({data:{nomeOferta:"Taurine",nomeMarca:"KittySupps",nicho:"Pet"}}),"PET");
  assert.equal(context.category({data:{nomeOferta:"Serum",brandCategory:"SKIN CARE",nicho:"Saúde feminina"}}),"SKIN CARE");
});

test("resumo BM prioriza total e identifica média e campanha de origem",()=>{
  const helpers=html.slice(html.indexOf("function bmHasValue("),html.indexOf("function bmReportDisplayTotals("));
  const summary=html.slice(html.indexOf("const BM_CARD_FIELDS="),html.indexOf("function bmReportMetric("));
  const context={};runInNewContext(`${helpers}${summary};globalThis.summary=bmSummaryMetric;globalThis.fields=BM_CARD_FIELDS;`,context);
  const report={currency:"USD",totals:{spend:"US$ 1.000,00",roas:"2,20"},campaigns:[
    {spend:"US$ 600,00",costResult:"US$ 30,00",cpm:"US$ 10,00"},
    {spend:"US$ 400,00",costResult:"US$ 40,00",cpm:"US$ 20,00"},
  ]};
  assert.deepEqual([...context.fields.map(([label])=>label)],["Gasto","ROAS","CPA","AOV","CPM","CTR link","CPC link"]);
  assert.equal(context.summary(report,"spend").source,"Total da BM");
  assert.equal(context.summary(report,"costResult").value,"≈ US$ 33,33");
  assert.match(context.summary(report,"costResult").source,/Média agregada/);
  assert.equal(context.summary({...report,totals:{cpc:"US$ 1,25"}},"cpcLink").value,"US$ 1,25");
  assert.equal(context.summary({...report,totals:{cpc:"US$ 1,25",cpcLink:"US$ 2,00"}},"cpcLink").value,"US$ 2,00");
  assert.equal(context.summary(report,"cpm").value,"≈ US$ 12,50");
  assert.equal(context.summary({...report,campaigns:report.campaigns.slice(0,1)},"costResult").source,"Campanha de maior gasto com dado disponível");
  assert.equal(context.summary(report,"avgConversion").value,"—");
  const purchases={currency:"USD",totals:{spend:"US$ 1.000,00",results:"20 compras"},campaigns:[]};
  assert.equal(context.summary(purchases,"costResult").value,"≈ US$ 50,00");
  assert.equal(context.summary({...purchases,totals:{spend:"US$ 1.000,00",results:"≥ 20 compras · parcial"}},"costResult").value,"—");
});

test("sem BM permanece no final, inclusive quando outra BM não tem janela de 7 dias",()=>{
  const sorting=html.slice(html.indexOf("function offerSortFn("),html.indexOf("const RECENT_FIRST_SECTIONS="));
  const context={activeSection:"brandsvalidated",offerSort:"spend_7d",offerDirection:"desc",isAdmin:false,bmNumeric:value=>value==null?null:Number(value),offerSortMetric:o=>({value:o.data.spend??null})};
  runInNewContext(`${sorting};globalThis.compare=offerSortFn;`,context);
  const withBm={id:"a",data:{bmReports:[{label:"Ontem"}]}},withoutBm={id:"b",data:{bmAccess:false},created_at:"2026-10-07"};
  assert.ok(context.compare(withBm,withoutBm)<0);
  assert.ok(context.compare(withoutBm,withBm)>0);
  const sorted=[withoutBm,withBm,{id:"c",data:{bmReports:[{}],spend:10}},{id:"d",data:{bmReports:[{}],spend:20}}].sort(context.compare);
  assert.deepEqual(sorted.map(o=>o.id),["d","c","a","b"]);
});
