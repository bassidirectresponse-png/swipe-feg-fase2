import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { FAKE_SCAN, FAKE_REVIEW_FOLDER, FAKE_REVIEW_LIST, FAKE_REVIEW_PRODUCT } from "./offer-intel-FAKE-v2-fixtures.mjs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ctx = { URL, URLSearchParams, Intl, Date, Set, Map, Object, Array, Number, String, JSON, esc, ic: n => `<i data-ic="${n}"></i>`, window: { addEventListener() {} }, document: {},
  oiOfferById: id => id === "11111111-1111-4111-8111-111111111111" ? { id, data: { nomeOferta: "Oferta <A>" } } : null, offerPath: o => "/ofertas/" + o.id, oiOfferName: o => o.data.nomeOferta,
  oiStateHtml: (k, o) => `<div data-state="${k}">${esc(o && (o.title || o.error) || "")}</div>`, oiStatusChip: (l, s) => `<span class="oi-status--${esc(s)}">${esc(l)}</span>`,
  oiExtLink: (h, l) => h ? `<a href="${esc(h)}" target="_blank" rel="noopener noreferrer">${esc(l)}</a>` : "", displayUrlSafe: u => u, oiHostOf: u => new URL(u).hostname, oiBusy: new Set(), SEC_SHORT: { brandsvalidated: "Ofertas Brands", brandsgeneral: "Ofertas no Geral" }, activeSection: "outra", $: () => null, renderSideNav() {}, toast() {} };
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL("../lib/offer-intel.js", import.meta.url), "utf8"), ctx);
vm.runInContext(readFileSync(new URL("../lib/offer-intel-api.js", import.meta.url), "utf8"), ctx);
vm.runInContext("const OfferIntel=globalThis.OfferIntel;", ctx);
const start = html.indexOf("const OI_PAGE_KIND="), end = html.indexOf("/* Contagem desconhecida (null)");
assert.ok(start > 0 && end > start);
vm.runInContext(html.slice(start, end), ctx);
const run = code => vm.runInContext(code, ctx);

test("flags v2: Raio-X só ativa com OI_V2_READY e fica false por padrão", () => {
  assert.match(html, /const OI_V2_READY=false;/);
  assert.match(html, /function oiV2Live\(\)\{return OI_BACKEND_READY&&OI_V2_READY&&isAdmin;\}/);
});

test("Raio-X renderiza seções, escapa texto externo e não emite href inseguro", () => {
  ctx.__st = { status: "ready", items: [ctx.OfferIntel.formatDomainScan(FAKE_SCAN)] };
  const out = run("oiDomainScanHtml({area:'dominio',query:{oferta:'o1'},scanId:'scan-1'},__st)");
  for (const t of ["Páginas do site", "Checkout", "Pixels", "Tecnologias", "VSL", "CTAs", "Assets", "Subdomínios", "Anúncios deste domínio", "Escondido", "Abrir link do m3u8"]) assert.ok(out.includes(t), t);
  assert.ok(!/<script>x/.test(out) || !out.includes("<script>x</script>"));
  assert.ok(!/href="javascript:/i.test(out));
  assert.match(out, /data-oi-copy="123456789012345"/);
  assert.match(out, /Algumas fontes falharam: Wayback Machine \(timeout\)/);
  assert.match(out, /href="\/inteligencia\/descobertas\?oferta=o1"/);
  assert.ok(!out.includes("<img"), "assets externos não carregam imagem");
  assert.ok(!out.includes("data-oi-lightbox"));
  assert.match(out, /hero\.jpg/); assert.match(out, /rel="noopener noreferrer">Abrir/);
  ctx.__tbl = run("oiDomUi.scan='scan-1';oiDxPagesHtml(__st.items[0])");
  assert.match(ctx.__tbl.count, /^5 de 5 páginas$/);
  assert.ok(!ctx.__tbl.table.includes("<script>x</script>"));
  assert.match(ctx.__tbl.table, /&lt;script&gt;x&lt;\/script&gt;/);
  run("oiDomUi.source='probe'");
  assert.match(run("oiDxPagesHtml(__st.items[0])").count, /^2 de 5 páginas$/);
  run("oiDomUi.source='wp'");
  assert.match(run("oiDxPagesHtml(__st.items[0])").count, /Nenhuma página corresponde/);
});

test("Raio-X vazio e parcial são honestos: sem números inventados", () => {
  ctx.__st = { status: "ready", items: [ctx.OfferIntel.formatDomainScan({ id: "s", host: "x.com", status: "partial" })] };
  const out = run("oiDomainScanHtml({area:'dominio',query:{}},__st)");
  assert.match(out, /Checkout não identificado/); assert.match(out, /VSL não identificada/); assert.match(out, /Nenhum pixel foi identificado/);
  assert.match(out, /Nenhum player de VSL foi identificado/);
  assert.equal(run("oiDomainScanHtml({area:'dominio',query:{}},{status:'ready',items:[]})").includes("Raio-X não encontrado"), true);
});

const OFFER_A = "11111111-1111-4111-8111-111111111111", OFFER_B = "22222222-2222-4222-8222-222222222222";
function seedCr() {
  ctx.__f = ctx.OfferIntel.formatReviewFolder(FAKE_REVIEW_FOLDER);
  ctx.__l = ctx.OfferIntel.formatReviewList(FAKE_REVIEW_LIST.items);
  ctx.__p = ctx.OfferIntel.formatReviewProduct(FAKE_REVIEW_PRODUCT(OFFER_B));
  run(`crStates["list"]={status:"ready",data:__l};crStates["folder:2026-10-28"]={status:"ready",data:__f};crStates["product:2026-10-28:${OFFER_B}"]={status:"ready",data:__p};`);
}

test("Creative Review: lista de pastas, mais recente primeiro, com status e contagens", () => {
  seedCr();
  const out = run("crListHtml()");
  assert.ok(out.indexOf("Creative Review 28/10/2026") < out.indexOf("Creative Review 21/10/2026"));
  assert.match(out, /href="\/creative-review\/2026-10-28"/); assert.match(out, /3 produtos · 30 anúncios/); assert.ok(!out.includes("— produtos") && !out.includes("— anúncios"), "desconhecido some em vez de travessão");
  assert.match(out, /data-cr-run/); assert.match(out, /Concluído/); assert.match(out, /Falhou/);
});

test("Creative Review: pasta com resumo executivo, grade de produtos e escape", () => {
  seedCr();
  const out = run("crFolderHtml({view:'folder',date:'2026-10-28'})");
  for (const t of ["Resumo executivo", "Produto Demo Alfa", "NOVO LÍDER", "Apresentar", "Imprimir / PDF", "Rodar agora", "Resumo do produto indisponível"]) assert.ok(out.includes(t), t);
  assert.match(out, /href="\/creative-review\/2026-10-28\/11111111-1111-4111-8111-111111111111"/);
  assert.match(out, /Produto Demo Gama &lt;b&gt;/); assert.ok(!out.includes("Gama <b>"));
  assert.match(out, /aria-label="Você está em"/); assert.match(out, /Creative Review 28\/10\/2026/);
  assert.equal((out.match(/class="cr-bullets"/g) || []).length, 2);
});

test("Creative Review: pasta em geração mostra progresso e não inventa resumo", () => {
  ctx.__f = ctx.OfferIntel.formatReviewFolder({ report: { review_date: "2026-11-04", status: "running", phase: "Coletando anúncios", progress: 40 }, summary: null, products: [] });
  run("crStates['folder:2026-11-04']={status:'ready',data:__f}");
  const out = run("crFolderHtml({view:'folder',date:'2026-11-04'})");
  assert.match(out, /role="progressbar"[^>]*aria-valuenow="40"/); assert.match(out, /Pasta em geração/); assert.match(out, /Analisando os produtos/);
  assert.ok(!out.includes("O resumo desta semana não está disponível"));
  assert.match(out, /data-cr-present disabled/);
});

test("Creative Review: produto com Top 10, origem da Página, breadcrumb e anterior/próximo", () => {
  seedCr();
  const out = run(`crProductHtml({view:'product',date:'2026-10-28',offerId:'${OFFER_B}'})`);
  assert.equal((out.match(/<article class="oi-wk__ad"/g) || []).length, 10);
  for (const t of ["Produto Demo Beta", "NOVO", "Subiu 4 posições", "Caiu 2 posições", "Encontrada", "Cadastrada", "Análise de IA", "Ver na Biblioteca", "← Produto anterior", "Próximo produto →"]) assert.ok(out.includes(t), t);
  assert.match(out, /href="\/creative-review\/2026-10-28\/11111111-1111-4111-8111-111111111111" rel="prev"/);
  assert.match(out, /href="\/creative-review\/2026-10-28\/33333333-3333-4333-8333-333333333333" rel="next"/);
  assert.match(out, /<a data-nav href="\/creative-review">Creative Review<\/a>/);
  assert.match(out, /Resumo do produto indisponível/); assert.match(out, /Análise de IA indisponível para este anúncio/);
});

test("Creative Review: erro, não encontrado e carregando", () => {
  run("crStates['folder:2026-01-01']={status:'error',error:'Sem conexão'}");
  assert.match(run("crFolderHtml({view:'folder',date:'2026-01-01'})"), /data-state="error"/);
  run("crStates['folder:2026-01-02']={status:'ready',data:null}");
  assert.match(run("crFolderHtml({view:'folder',date:'2026-01-02'})"), /Pasta não encontrada/);
  run("crStates['product:2026-10-28:xx']={status:'ready',data:null};crStates['folder:2026-10-28']={status:'loading'}");
  assert.match(run("crProductHtml({view:'product',date:'2026-10-28',offerId:'xx'})"), /Produto não encontrado/);
});

test("Creative Review: apresentação percorre produto a produto e anúncio a anúncio", () => {
  seedCr();
  ctx.__prods = { [OFFER_B]: ctx.__p, [OFFER_A]: ctx.OfferIntel.formatReviewProduct(FAKE_REVIEW_PRODUCT(OFFER_A)), "33333333-3333-4333-8333-333333333333": null };
  const slides = run("oiPresBuild(__f,__prods)");
  const kinds = slides.map(x => x.type).join(",");
  assert.equal(slides.length, 1 + 3 + 10 + 10 + 1, kinds);
  assert.match(kinds, /^cover,product,ad(,ad){9},product,ad/);
  assert.ok(kinds.endsWith("product,missing"));
  ctx.__s = slides;
  assert.match(run("oiPresSlideHtml(__s[0])"), /Resumo executivo/);
  assert.match(run("oiPresSlideHtml(__s[1])"), /Produto 1 de 3/);
  assert.match(run("oiPresSlideHtml(__s[2])"), /Página Demo 1/);
  assert.match(run("oiPresSlideHtml(__s[slides=__s.length-1])".replace("slides=","")), /Não foi possível carregar os anúncios/);
  const fn = html.slice(html.indexOf("function oiPresKey"), html.indexOf("function oiPresFullscreenChange"));
  for (const t of ['k==="Escape"', "ArrowRight", "ArrowLeft", 'k==="Tab"']) assert.ok(fn.includes(t), t);
  assert.match(html, /if\(opener&&opener\.isConnected\)opener\.focus\(\);/);
});

test("Rodar agora: confirmação, 1 POST por clique ativo, 409 com mensagem própria", async () => {
  const calls = [];
  ctx.confirm = () => true; ctx.toast = (m, bad) => calls.push(["toast", m, !!bad]); ctx.activeSection = "outra"; run("Object.keys(crStates).forEach(k=>delete crStates[k]);crStates.list={status:'ready',data:[{status:'succeeded'}]}");
  let n = 0, fail;
  ctx.oiApi = { runReview: () => { n++; return new Promise((res, rej) => { fail = () => rej(Object.assign(new Error("x"), { status: 409 })); }); } };
  ctx.btn = { setAttribute() {} };
  const p1 = run("crRun(btn)"); run("crRun(btn)");
  assert.equal(n, 1);
  fail(); await p1;
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [["toast", "Já existe uma execução em andamento.", true]]);
  assert.equal(run("Object.keys(crStates).length"), 0, "QA-CR-02: 409 também invalida o cache para descobrir a execução atual");
  ctx.confirm = () => false; calls.length = 0;
  await run("crRun(btn)"); assert.equal(n, 1);
});

test("Creative Review: seção própria no menu, fora de OI_V2_READY, rota legada redireciona", () => {
  assert.match(html, /const CR_READY=true;/);
  assert.match(html, /const OI_V2_READY=false;/);
  assert.match(html, /key:"creativereview",label:"Creative Review"/);
  assert.match(html, /creativereview:"creative-review"/);
  assert.match(html, /html\+=navItem\(SECTIONS\.find\(s=>s\.key==="creativereview"\)\);html\+=navItem\(SECTIONS\.find\(s=>s\.key==="inteligencia"\)\)/);
  assert.match(html, /\^\\\/inteligencia\\\/semanal\\\/\?\$/);
  assert.match(html, /r\.section==="creativereview"\)&&!isAdmin/);
});

test("QA-CR-01: resposta de polling iniciada antes da invalidação não regride o cache", async () => {
  ctx.activeSection = "outra"; run("Object.keys(crStates).forEach(k=>delete crStates[k]);crGen=0");
  const oldMeta = ctx.OfferIntel.formatReviewList([{ review_date: "2026-10-28", status: "succeeded" }]);
  const newMeta = ctx.OfferIntel.formatReviewList([{ review_date: "2026-10-28", status: "running", progress: 10 }]);
  let resolveOld, resolveNew;
  ctx.__old = new Promise(r => { resolveOld = () => r(oldMeta); });
  ctx.__new = new Promise(r => { resolveNew = () => r(newMeta); });
  run("crStates.list={status:'ready',data:[]};crSettle('list',__old,true)");
  run("crInvalidate()");
  assert.equal(run("Object.keys(crStates).length"), 0);
  run("crSettle('list',__new,false)");
  resolveNew(); await new Promise(r => setImmediate(r));
  assert.equal(run("crStates.list.data[0].status"), "running");
  resolveOld(); await new Promise(r => setImmediate(r));
  assert.equal(run("crStates.list.data[0].status"), "running", "o poll antigo (succeeded) chegou por último e foi descartado");
  assert.equal(run("crActive({view:'list'})"), true, "polling continua agendável");
});

test("QA-CR-01: erro tardio de requisição antiga também é descartado", async () => {
  run("Object.keys(crStates).forEach(k=>delete crStates[k]);crGen=0");
  let failOld; ctx.__o = new Promise((_, rej) => { failOld = () => rej(new Error("tarde")); });
  run("crSettle('folder:2026-10-28',__o,false)"); run("crInvalidate()");
  ctx.__n = Promise.resolve({ meta: { active: false }, products: [], summary: [] });
  run("crSettle('folder:2026-10-28',__n,false)"); await new Promise(r => setImmediate(r));
  failOld(); await new Promise(r => setImmediate(r));
  assert.equal(run("crStates['folder:2026-10-28'].status"), "ready");
});

test("Cabeçalho da pasta omite o total de anúncios quando desconhecido e soma quando os produtos trazem", () => {
  const f = ctx.OfferIntel.formatReviewFolder({ report: { review_date: "2026-12-02", status: "succeeded" }, summary: null, products: [{ offer_id: "a1", offer_name: "A" }] });
  run("crStates['folder:2026-12-02']={status:'ready',data:null}"); ctx.__f = f; run("crStates['folder:2026-12-02']={status:'ready',data:__f}");
  const out = run("crFolderHtml({view:'folder',date:'2026-12-02'})");
  assert.ok(!out.includes("— anúncios")); assert.match(out, /1 produtos/);
  ctx.__g = ctx.OfferIntel.formatReviewFolder({ report: { review_date: "2026-12-09", status: "succeeded" }, products: [{ offer_id: "a1", ads_collected: 10 }, { offer_id: "a2" }] });
  run("crStates['folder:2026-12-09']={status:'ready',data:__g}");
  const partial = run("crFolderHtml({view:'folder',date:'2026-12-09'})");
  assert.match(partial, /2 produtos/); assert.ok(!/2 produtos · \d+ anúncios/.test(partial), "QA-CR-03: total incompleto não é somado nem vira 0");
  ctx.__h = ctx.OfferIntel.formatReviewFolder({ report: { review_date: "2026-12-16", status: "succeeded" }, products: [{ offer_id: "a1", ads_collected: 0 }] });
  run("crStates['folder:2026-12-16']={status:'ready',data:__h}");
  assert.match(run("crFolderHtml({view:'folder',date:'2026-12-16'})"), /1 produtos · 0 anúncios/, "zero conhecido continua zero");
  seedCr();
  assert.match(run("crFolderHtml({view:'folder',date:'2026-10-28'})"), /3 produtos · 148 anúncios/);
});
