import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const workflow=readFileSync(new URL("../.github/workflows/ads-ativos.yml",import.meta.url),"utf8");
const scraper=readFileSync(new URL("../scripts/ads_scraper.py",import.meta.url),"utf8");
const logo=readFileSync(new URL("../assets/feg-mark-3d.svg",import.meta.url),"utf8");

function extracted(name){
  const source=html.match(new RegExp(`function ${name}\\([^\\n]*?\\)\\{[^\\n]*\\}`))?.[0];
  assert.ok(source,`Função ${name} não encontrada`);
  return source;
}

test("Escala e Potencial são mutuamente exclusivos sem perder Insider",()=>{
  const defs={insider:1,new:1,potential:1,scale:1};
  const normalize=new Function("OFFER_TAGS",`${extracted("normalizeTagSelection")};return normalizeTagSelection;`)(defs);
  const tagsOf=new Function("OFFER_TAGS",`${extracted("offerTagsOf")};return offerTagsOf;`)(defs);
  assert.deepEqual(normalize(["insider","potential","scale","scale"]),["insider","scale"]);
  assert.deepEqual(tagsOf({kind:"brandsvalidated",offerTags:["potential","scale"]}),["insider","scale"]);
  assert.deepEqual(tagsOf({kind:"brandsvalidated",offerTags:["new"]}),["insider","new"]);
  assert.deepEqual(tagsOf({kind:"brandsvalidated",bmAccess:false,offerTags:["new","potential"]}),["new","potential"]);
});

test("Ofertas oferecem ranking por gasto e vendas e filtro de tag no painel",()=>{
  assert.match(html,/\["spend_7d","Maior gasto · 7 dias"\]/);
  assert.match(html,/\["sales_7d","Mais vendas · 7 dias"\]/);
  assert.match(html,/id="offerTagFilter"/);
  assert.match(html,/data-edit-tags=/);
  assert.match(html,/id="tagEditorOptions"/);
  assert.match(html,/data-tag-choice=/);
  assert.doesNotMatch(html,/data-tag-editor=/);
  assert.doesNotMatch(html,/data-save-inline-tags=/);
  assert.doesNotMatch(html,/@keyframes tag-in/);
});

test("Logo vetorial preserva monograma e respeita movimento reduzido",()=>{
  assert.match(logo,/<svg /);
  assert.match(logo,/Monograma Grupo FEG/);
  assert.match(html,/class="login-atmosphere__trace"/);
  assert.match(html,/class="login-atmosphere__trace-line" pathLength="1000"/);
  assert.match(html,/@keyframes login-mark-trace/);
  assert.match(html,/@media\(prefers-reduced-motion:reduce\)\{\.login-atmosphere__trace\{display:none\}\}/);
  assert.doesNotMatch(html,/\.login-logo-wrap\{[^}]*overflow:hidden/);
});

test("Leitura de bibliotecas está agendada duas vezes ao dia e preserva histórico",()=>{
  assert.match(workflow,/cron: "0 11 \* \* \*"/);
  assert.match(workflow,/cron: "0 23 \* \* \*"/);
  assert.match(workflow,/run: python -u scripts\/ads_scraper\.py/);
  assert.match(scraper,/data\["adsHistory"\] = update_history\(data, total, now\)/);
});
