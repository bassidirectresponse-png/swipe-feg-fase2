import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");

test("prints são agrupados pelo período explícito, sem inventar datas",()=>{
  const source=html.match(/function bmPrintPeriod\(print\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(source);
  const bmPrintPeriod=new Function(`${source};return bmPrintPeriod;`)();
  assert.deepEqual(bmPrintPeriod({nome:"Desempenho · campanhas · últimos 7 dias"}),["7d","Últimos 7 dias"]);
  assert.deepEqual(bmPrintPeriod({nome:"Desempenho · campanhas · 15/07/2026"}),["date-15/07/2026","Leitura de 15/07/2026"]);
  assert.deepEqual(bmPrintPeriod({nome:"Configuração · campanha e orçamento"}),["settings","Configuração da BM"]);
  assert.deepEqual(bmPrintPeriod({nome:"Print sem metadata"}),["other","Período não identificado"]);
});

test("galeria de evidências e métricas ficam restritas ao admin",()=>{
  assert.match(html,/isAdmin\?bmEvidenceHtml\(d,id\):""/);
  assert.match(html,/body\.admin-preview \.bm-evidence/);
  assert.match(html,/Última leitura da BM ·/);
  assert.match(html,/data-lightbox-group="bm-/);
  assert.match(html,/body\.admin-preview \.view-grid\{grid-template-columns:minmax\(0,1fr\) minmax\(240px,330px\)/);
});

test("galeria usa somente os prints do produto e mantém as setas do lightbox no mesmo grupo",()=>{
  const periodSource=html.match(/function bmPrintPeriod\(print\)\{[\s\S]*?\n\}/)?.[0];
  const refSource=html.match(/function bmEvidenceRef\(img\)\{[\s\S]*?\n\}/)?.[0];
  const gallerySource=html.match(/function bmEvidenceHtml\(d,id\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(periodSource&&refSource&&gallerySource);
  const render=new Function(`const esc=value=>String(value).replaceAll('"','&quot;');${periodSource};${refSource};${gallerySource};return bmEvidenceHtml;`)();
  const output=render({bmPrints:[{nome:"Produto A · últimos 7 dias",img:"/a.jpg"},{nome:"Produto A · últimos 14 dias",img:"/b.jpg"},{nome:"sem imagem",img:""}]},"produto-a");
  assert.match(output,/data-lightbox-group="bm-produto-a"/);
  assert.match(output,/Últimos 7 dias/);
  assert.match(output,/Últimos 14 dias/);
  assert.doesNotMatch(output,/sem imagem/);
  assert.doesNotMatch(output,/produto-b/);
});

test("vendas e ROAS calculados só viram total quando as campanhas cobrem todo o gasto",()=>{
  const snippets=[html.match(/function bmHasValue\([^\n]+/)?.[0],...["bmNumeric","bmReportDisplayTotals"].map(name=>html.match(new RegExp(`function ${name}\\([^)]*\\)\\{[\\s\\S]*?\\n\\}`))?.[0])];
  assert.ok(snippets.every(Boolean));
  const display=new Function(`${snippets.join("\n")};return bmReportDisplayTotals;`)();
  const full=display({totals:{spend:"US$ 300,00",results:"—",roas:"—"},campaigns:[{spend:"US$ 100,00",results:"2 compras",roas:"2,00"},{spend:"US$ 200,00",results:"3 compras",roas:"1,00"}]});
  assert.equal(full.results,"5 compras");assert.equal(full.roas,"≈ 1,33");assert.equal(full.partial,false);
  const partial=display({totals:{spend:"US$ 500,00",results:"—",roas:"—"},campaigns:[{spend:"US$ 100,00",results:"2 compras",roas:"2,00"},{spend:"US$ 200,00",results:"3 compras",roas:"1,00"}]});
  assert.equal(partial.results,"5 compras · parcial");assert.equal(partial.roas,"≈ 1,33 · parcial");assert.equal(partial.partial,true);
  const missingMetric=display({totals:{spend:"US$ 300,00",results:"—",roas:"—"},campaigns:[{spend:"US$ 100,00",results:"2 compras",roas:"2,00"},{spend:"US$ 200,00",results:"",roas:""}]});
  assert.equal(missingMetric.results,"2 compras · parcial");assert.equal(missingMetric.roas,"≈ 2,00 · parcial");assert.equal(missingMetric.partial,true);
});
