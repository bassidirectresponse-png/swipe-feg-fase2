import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const docs=readFileSync(new URL("../docs/insider-offer-standard.md",import.meta.url),"utf8");

test("Insider mantém a taxonomia e as atribuições aprovadas para todos os leitores",()=>{
  for(const niche of ["Saúde masculina","Saúde feminina","Saúde Cardiovascular","Saúde íntima / libido","Sono/ Beleza","Saúde Geral/Nutrição"])assert.ok(html.includes(niche));
  for(const product of ["Ultima Peak","Primal Viking","Mars Men Boost","JOYMODE HARD+","Ancestral Supplements"])assert.ok(html.includes(product));
  assert.match(html,/function insiderOverride\(o\)\{if\(!o\|\|sectionOf\(o\)!=="brandsvalidated"\)/);
  assert.match(html,/function isInsiderAdminArea\(\)\{return activeSection==="brandsvalidated";\}/);
  assert.match(html,/function renderAdminInsider\(items\)/);
  assert.match(html,/if\(isInsiderAdminArea\(\)\)\{\s*area\.innerHTML=renderAdminInsider\(list\)/);
  assert.doesNotMatch(html,/isUltimaPeakPilotArea|ULTIMA_PEAK_PILOT_BRAND/);
});

test("Insider mostra capa limpa sem lightbox e preserva o histórico de ads no detalhe",()=>{
  assert.match(html,/clean=validated/);
  assert.match(html,/media:clean&&d\.imagemProduto\?`<div class="cmedia">/);
  assert.match(html,/adsHistOf\(d\)/);
  assert.match(html,/Ads ativos · evolução diária/);
  assert.match(html,/const reportsHtml=interactiveInsider\?brandReportsHtml\(d,id\):brandReportsStaticHtml\(d\)/);
  assert.match(html,/const bmCore=interactiveInsider/);
  assert.match(docs,/não a foto ampliada/);
});

test("cards Brands ocupam a mesma altura sem cortar métricas variáveis",()=>{
  assert.match(html,/\.brandhub--insider \.brandhub-products\{align-items:stretch;grid-auto-rows:1fr;\}/);
  assert.match(html,/\.brandhub--insider \.brand-card--clean\{height:100%;min-height:620px;align-self:stretch;\}/);
  assert.match(html,/\.brand-card--clean \.brand-metrics--snapshot\{min-height:0;grid-template-rows:none;\}/);
  assert.match(html,/\.brand-card--clean \.card__actions\{min-height:72px;align-content:flex-start;\}/);
  assert.doesNotMatch(html,/\.grid>\.brand-card--clean\{height:auto;align-self:start/);
});

test("Top ads usam data real registrada, nunca um intervalo inferido",()=>{
  const source=html.match(/function topAdDisplayName\(ad,index\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(source);
  const topAdDisplayName=new Function(`${source};return topAdDisplayName;`)();
  assert.equal(topAdDisplayName({downloadedAt:"17/07/2026"},0),"Anúncio 1 — Julho 2026 — registrado em 17/07/2026");
  assert.equal(topAdDisplayName({period:"2026-09",sourceDate:"18/09/2026",bmRange:"12/09/2026 a 18/09/2026"},1),"Anúncio 2 — Setembro 2026 — 12/09/2026 a 18/09/2026");
  assert.equal(topAdDisplayName({},2),"Anúncio 3 — Período não informado — datas a confirmar");
});
