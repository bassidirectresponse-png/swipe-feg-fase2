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
  assert.match(html,/body\.admin-preview \.view-grid\{grid-template-columns:minmax\(0,1fr\) 330px/);
});

test("galeria usa somente os prints do produto e mantém as setas do lightbox no mesmo grupo",()=>{
  const periodSource=html.match(/function bmPrintPeriod\(print\)\{[\s\S]*?\n\}/)?.[0];
  const gallerySource=html.match(/function bmEvidenceHtml\(d,id\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(periodSource&&gallerySource);
  const render=new Function(`const esc=value=>String(value).replaceAll('"','&quot;');${periodSource};${gallerySource};return bmEvidenceHtml;`)();
  const output=render({bmPrints:[{nome:"Produto A · últimos 7 dias",img:"/a.jpg"},{nome:"Produto A · últimos 14 dias",img:"/b.jpg"},{nome:"sem imagem",img:""}]},"produto-a");
  assert.match(output,/data-lightbox-group="bm-produto-a"/);
  assert.match(output,/Últimos 7 dias/);
  assert.match(output,/Últimos 14 dias/);
  assert.doesNotMatch(output,/sem imagem/);
  assert.doesNotMatch(output,/produto-b/);
});
