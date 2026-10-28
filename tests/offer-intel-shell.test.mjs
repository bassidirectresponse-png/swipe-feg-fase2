import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const netlify = readFileSync(new URL("../netlify.toml", import.meta.url), "utf8");
const prepare = readFileSync(new URL("../scripts/prepare_public.mjs", import.meta.url), "utf8");
const context = { globalThis: {}, URL, URLSearchParams };
vm.runInNewContext(readFileSync(new URL("../lib/offer-intel.js", import.meta.url), "utf8"), context);
const OI = context.globalThis.OfferIntel;

test("rotas /inteligencia/* são interpretadas e canônicas", () => {
  assert.deepEqual({ ...OI.parsePath("/inteligencia", "") }.redirect, true);
  assert.equal(OI.parsePath("/inteligencia", "").area, "descobertas");
  for (const area of ["descobertas", "conexoes", "funis", "historico", "monitoramento", "investigar"]) {
    const route = OI.parsePath(`/inteligencia/${area}/`, "");
    assert.equal(route.area, area);
    assert.equal(route.notFound, false);
  }
  assert.equal(OI.parsePath("/inteligencia/oferta/abc-123", "").offerId, "abc-123");
  assert.equal(OI.parsePath("/inteligencia/investigacao/job_1", "").jobId, "job_1");
  assert.equal(OI.parsePath("/inteligencia/funis/f1", "?etapa=s2").query.etapa, "s2");
  for (const bad of ["/inteligencia/x", "/inteligencia/oferta", "/inteligencia/oferta/a/b", "/inteligencia/oferta/a b", "/inteligencia/conexoes/1", "/outra"]) {
    assert.equal(OI.parsePath(bad, "").notFound, true, bad);
  }
});

test("filtros da URL são validados e fazem round-trip", () => {
  const route = OI.parsePath("/inteligencia/descobertas", "?q=%20foo%20&oferta=o1&tipo=pagina&status=novo&ordem=anuncios&pagina=3");
  assert.equal(route.query.q, "foo");
  const path = OI.buildPath(route);
  assert.equal(path, "/inteligencia/descobertas?q=foo&oferta=o1&tipo=pagina&status=novo&ordem=anuncios&pagina=3");
  const invalid = OI.normalizeQuery("tipo=xss&status=<b>&ordem=zzz&pagina=-4&oferta=../x&url=javascript:alert(1)");
  assert.deepEqual({ ...invalid }, { q: "", oferta: "", etapa: "", job: "", visao: "", ref: "", investigar: false, url: "", tipo: "", status: "", ordem: "recentes", pagina: 1 });
  assert.equal(OI.buildPath({ area: "descobertas" }), "/inteligencia/descobertas");
  assert.equal(OI.buildPath({ area: "oferta", offerId: "o1", query: { ref: "admin_draft", investigar: true } }), "/inteligencia/oferta/o1?ref=admin_draft&investigar=1");
  assert.equal(OI.parsePath("/inteligencia/descobertas", "?job=j9&ref=hack&investigar=2").query.ref, "");
  assert.equal(OI.parsePath("/inteligencia/descobertas", "?job=j9").query.job, "j9");
  assert.equal(OI.buildPath({ area: "funis", funnelId: "f1", query: { etapa: "s1" } }), "/inteligencia/funis/f1?etapa=s1");
});

test("validação de URL aceita só http(s) públicas sem credenciais", () => {
  assert.equal(OI.isValidHttpUrl("https://exemplo.com/p?a=1"), true);
  for (const bad of ["", "javascript:alert(1)", "ftp://a.com", "https://user:pw@a.com", "https://localhost", "exemplo.com", "https://" + "a".repeat(2050) + ".com"]) assert.equal(OI.isValidHttpUrl(bad), false, bad);
});

test("estado visual é exclusivo: carregando, erro, vazio ou pronto", () => {
  assert.equal(OI.viewState({ status: "loading" }), "loading");
  assert.equal(OI.viewState({ status: "error" }), "error");
  assert.equal(OI.viewState({ status: "ready", items: [] }), "empty");
  assert.equal(OI.viewState({ status: "ready", items: [{}] }), "ready");
  assert.equal(OI.viewState(), "empty");
});

test("a casca integra rota, sidebar admin-only, abas e estados sem dados falsos", () => {
  assert.match(html, /<script src="\/lib\/offer-intel\.js"><\/script>/);
  assert.match(html, /\(ADMIN_SECTIONS\.has\(r\.section\)\|\|r\.section==="inteligencia"\)&&!isAdmin/);
  assert.match(html, /inteligencia:"inteligencia"\}/);
  assert.match(html, /if\(section==="inteligencia"\)\{const oi=OfferIntel\.parsePath/);
  assert.match(html, /if\(activeSection==="inteligencia"\)\{renderOfferIntel\(\);return;\}/);
  assert.match(html, /if\(key==="brandsvalidated"&&isAdmin\)html\+=navItem\(SECTIONS\.find\(s=>s\.key==="inteligencia"\)\)/);
  assert.match(html, /aria-label="Áreas de Inteligência de Ofertas"/);
  assert.match(html, /aria-current="page"/);
  assert.match(html, /const OI_BACKEND_READY=(true|false)/);
  assert.match(html, /role="alert"/);
  assert.match(html, /Fase posterior/);
  assert.doesNotMatch(html, /OI_MOCK|DADOS DE DEMONSTRA/);
});

test("o arquivo da lib é publicado e coberto pela CSP script-src 'self'", () => {
  assert.match(prepare, /copyTree\("lib",path=>path\.endsWith\("\.js"\)\)/);
  const policy = netlify.match(/Content-Security-Policy = "([^"]+)"/)?.[1] || "";
  assert.match(policy.match(/script-src[^;]+/)?.[0] || "", /'self'/);
  assert.match(netlify, /from = "\/\*"\s+to = "\/index\.html"\s+status = 200/);
});

test("Investigar oferta aparece no modal, no MVP de bibliotecas e nos cards, só para admin", () => {
  assert.match(html, /<a class="btn btn--outline btn--sm" id="viewInvestigateBtn" data-admin-only data-nav/);
  assert.match(html, /inv\.hidden=!isAdmin\|\|!OI_OFFER_SECTIONS\.has\(section\)/);
  assert.match(html, /\$\{oiInvestigateLink\(itemById\(id\),"btn"\)\}/);
  assert.equal([...html.matchAll(/oiInvestigateLink\(o,"oi-qlink"\)/g)].length, 2);
  assert.match(html, /if\(!isAdmin\|\|!o\|\|!OI_OFFER_SECTIONS\.has\(sectionOf\(o\)\)\)return"";/);
});

test("painel de início: capture_screenshots desabilitado, chave de idempotência e vínculo offer_ref_kind", () => {
  assert.match(html, /id="oiOptShot" disabled/);
  assert.match(html, /Captura indisponível nesta versão/);
  assert.match(html, /oiRefKindOf\(o\)==="admin_draft"\?"admin_draft":"offer"|o&&o\.adminPrivate\?"admin_draft":"offer"/);
  assert.match(html, /ctx\.key=oiApi\.newKey\(\)/);
  assert.match(html, /<div class="overlay" id="oiStartOverlay"><div class="confirm-box oi-start" role="dialog" aria-modal="true"/);
});

test("bandeja, polling e revisão com expected_version tratam 409 recarregando", () => {
  assert.match(html, /id="oiTray" data-nav href="\/inteligencia\/historico" hidden aria-live="polite"/);
  assert.match(html, /activeMs:3000,idleMs:15000/);
  assert.match(html, /isHidden:\(\)=>document\.hidden/);
  assert.match(html, /localStorage\.setItem\(OI_JOBS_KEY/);
  assert.match(html, /oiApi\.setDiscoveryStatus\(id,status,item\.version\)/);
  assert.match(html, /if\(error\.status===409\)\{delete oiStates\.descobertas;\}/);
  assert.match(html, /role="progressbar"/);
});

test("Conexões e Mapa de Funis: ações com expected_version, mapa sem biblioteca, lista mobile e deep link de etapa", () => {
  assert.match(html, /oiApi\.setRelationStatus\(id,status,item\.version\)/);
  assert.match(html, /if\(error\.status===409\)delete oiStates\.conexoes/);
  assert.match(html, /data-oi-rel-act="\$\{s\}"[^>]*aria-pressed=/);
  assert.match(html, /em_andamento:"active"/);
  assert.match(html, /oiApi\.getFunnel\(route\.funnelId\)/);
  assert.match(html, /OfferIntel\.layoutFunnel\(r\)/);
  assert.match(html, /@media\(max-width:980px\)\{\.oi-fmap\{display:none;\}\.oi-flist\{display:block;\}/);
  assert.match(html, /aria-current="step"/);
  assert.match(html, /new ResizeObserver\(draw\)/);
  assert.match(html, /oiStepHref\(route,n\.id\)/);
  assert.match(html, /OfferIntel\.formatLimits\(r\.limits\)/);
  assert.match(html, /Coleta de anúncios indisponível/);
  assert.doesNotMatch(html, /r\.job\|\|r|r\.discovery\|\|r/);
});

test("QA-01/QA-05: abas e sidebar usam o escopo completo; um único listener de clique; ações com trava", () => {
  assert.match(html, /function oiAreaHref\(areaKey,scope\)/);
  assert.match(html, /href="\$\{esc\(oiAreaHref\(a\.key,scope\)\)\}"/);
  assert.match(html, /href="\$\{esc\(oiAreaHref\(t\.key,navScope\)\)\}"/);
  assert.doesNotMatch(html, /area\.addEventListener\("click",event=>/);
  assert.equal([...html.matchAll(/addEventListener\("click",oiOnClick\)/g)].length, 1);
  assert.match(html, /if\(!oiClickBound\)\{oiClickBound=true;/);
  assert.match(html, /const lock=id\+":"\+action;\n\s+if\(oiBusy\.has\(lock\)\)return;/);
  assert.match(html, /\$\("#oiStartOverlay"\)\.classList\.contains\("open"\)\)return;/);
  assert.match(html, /if\(!ctx\|\|oiStarting\)return;/);
});

test("QA-07: foco estável por ação+id entre renders; botões ocupados usam aria-disabled", () => {
  assert.match(html, /function oiFocusKey\(area\)/);
  assert.match(html, /function oiRestoreFocus\(area,key\)/);
  for (const key of ["act:", "rel:", "job:"]) assert.ok(html.includes("`" + key.slice(0, -1) + ":${"), key);
  assert.match(html, /oiRestoreFocus\(area,focusKey\)/);
  assert.doesNotMatch(html, /d\.busy\?" disabled"|r\.busy\?" disabled"|loadingMore\?" disabled"/);
  assert.match(html, /oiBusy\.add\(lock\);button\.setAttribute\("aria-disabled","true"\)/);
  assert.match(html, /if\(typing\)\{oiDirty=true;return;\}/);
});

test("cancelar investigação avisa que uma coleta já aceita pelo provedor pode continuar", () => {
  assert.match(html, /Uma coleta de anúncios já enviada ao provedor pode continuar até terminar e consumir a cota do dia\./);
  assert.match(html, /Novas etapas não serão iniciadas/);
});

test("Rodada 5: cabeçalho de contexto, ofertas investigadas, cards por tipo, aviso único e visão por Página", () => {
  assert.match(html, /function oiContextHtml\(route\)/);
  assert.match(html, /\$\{oiContextHtml\(route\)\}<div class="oi-bar">/);
  assert.match(html, /Investigar novamente/);
  assert.match(html, /Abrir ficha/);
  assert.match(html, /function oiOverviewHtml\(route\)/);
  assert.match(html, /oiApi\.listInvestigations\(\{\},\{cursor,limit:100\}\)/);
  assert.match(html, /OfferIntel\.groupInvestigationsByOffer\(jobs\)/);
  for (const fn of ["oiAdCard", "oiPageCard", "oiDomainCard"]) assert.match(html, new RegExp(`function ${fn}\\(`));
  for (const label of ["Ver na Biblioteca", "Abrir destino", "Ver anúncios da Página", "Ver funil", "Abrir site"]) assert.ok(html.includes(label), label);
  assert.match(html, /Ativo desde /);
  assert.match(html, /data-oi-copy=/);
  assert.equal([...html.matchAll(/Sugerido por similaridade — a semelhança não prova/g)].length, 1);
  assert.doesNotMatch(html, /oi-dcard__url/);
  assert.match(html, /OfferIntel\.groupByPage\(shown\)/);
  assert.match(html, /OfferIntel\.filterDiscoveries\(st\.items,/);
  assert.match(html, /for\(let page=0;page<5;page\+\+\)/);
  assert.match(html, /\["confirmed","ignored","review"\]\.map\(s=>`<button type="button" class="btn btn--sm \$\{cls\[s\]\}/);
  assert.match(html, /confirmed:"btn--accent",ignored:"btn--ghost",review:"btn--outline"/);
  assert.match(html, /function oiCount\(value\)/);
});

test("QA-UI-R5-01/02: retry recarrega 'Todas as ofertas' e universo parcial é sinalizado em todos os ramos", () => {
  assert.match(html, /retry\.addEventListener\("click",\(\)=>\{delete oiStates\[route\.area\];oiInvalidateIntel\(\);renderOfferIntel\(\);\}\)/);
  assert.match(html, /function oiInvalidateIntel\(\)\{oiTodas\.status="idle";/);
  assert.match(html, /Universo parcial: só as primeiras 500 descobertas/);
  assert.match(html, /if\(!shown\.length\)return filters\+jobChip\+partial\+oiStateHtml\(/);
  assert.match(html, /return filters\+jobChip\+partial\+banner\+body;/);
  assert.match(html, /Universo parcial: só as 300 investigações mais recentes/);
  assert.match(html, /oiTodas\.truncated=!!cursor/);
  assert.match(html, /more=oiStates\.descobertas\.truncated\?"\+":""/);
});

test("QA-UI-R5-03: invalidação por geração — nunca perdida durante um GET em voo, sem GET concorrente nem loop", async () => {
  const start = html.indexOf("const oiCtxCache=Object.create(null);");
  const end = html.indexOf("function oiContextHtml(route){");
  const source = html.slice(start, end);
  assert.ok(start > 0 && end > start);
  const pending = [];
  const context = {
    OI_BACKEND_READY: true, OI_SUMMARY_LIVE: true, activeSection: "inteligencia",
    oiRoute: { area: "descobertas", query: {} }, oiTodas: { status: "ready" },
    oiNavScope: () => ({ oferta: "o1", ref: "" }),
    oiApi: { summary: () => new Promise(resolve => pending.push(resolve)) },
    renderCalls: 0, Promise, Object, String
  };
  context.renderOfferIntel = () => { context.renderCalls++; context.oiEnsureCtx(context.oiRoute); };
  vm.runInNewContext(`${source}\nthis.ensure=oiEnsureCtx;this.invalidate=oiInvalidateCtx;this.cache=oiCtxCache;`, context);
  const tick = () => new Promise(resolve => setImmediate(resolve));
  const route = context.oiRoute;
  context.ensure(route); context.ensure(route);
  assert.equal(pending.length, 1, "primeira carga: um GET só, mesmo com renders repetidos");
  context.invalidate();
  context.ensure(route);
  assert.equal(pending.length, 1, "invalidação durante a primeira carga não abre GET concorrente");
  pending[0]({ counts: { new: 2 } }); await tick();
  assert.equal(pending.length, 2, "ao concluir, um follow-up porque a geração mudou");
  context.invalidate();
  context.ensure(route);
  assert.equal(pending.length, 2, "segunda mutação com GET em voo não duplica");
  pending[1]({ counts: { new: 1 } }); await tick();
  assert.equal(pending.length, 3, "a invalidação posterior não é perdida: mais um refetch");
  pending[2]({ counts: { new: 0 } }); await tick();
  assert.equal(pending.length, 3, "sem nova mutação, nenhum loop");
  assert.equal(context.cache["offer:o1"].summary.counts.new, 0);
  context.ensure(route); context.ensure(route);
  assert.equal(pending.length, 3);
  assert.match(html, /st\.items\[i\]=OfferIntel\.formatDiscovery\(r\);\n\s+oiInvalidateCtx\(\);/);
  assert.match(html, /st\.items\[i\]=OfferIntel\.formatConnection\(r\);oiInvalidateCtx\(\);/);
  assert.match(html, /if\(job\.active\)oiTrack\(id\);\n\s+oiInvalidateIntel\(\);/);
  assert.doesNotMatch(html, /\.stale/);
});
