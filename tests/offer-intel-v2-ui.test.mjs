import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { FAKE_SCAN, FAKE_WEEKLY, FAKE_WEEKLY_LIST } from "./offer-intel-FAKE-v2-fixtures.mjs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ctx = { URL, URLSearchParams, Intl, Date, Set, Map, Object, Array, Number, String, JSON, esc, ic: n => `<i data-ic="${n}"></i>`, window: { addEventListener() {} }, document: {},
  oiOfferById: id => id === "11111111-1111-4111-8111-111111111111" ? { id, data: { nomeOferta: "Oferta <A>" } } : null, offerPath: o => "/ofertas/" + o.id, oiOfferName: o => o.data.nomeOferta,
  oiStateHtml: (k, o) => `<div data-state="${k}">${esc(o && (o.title || o.error) || "")}</div>`, oiStatusChip: (l, s) => `<span class="oi-status--${esc(s)}">${esc(l)}</span>`,
  oiExtLink: (h, l) => h ? `<a href="${esc(h)}" target="_blank" rel="noopener noreferrer">${esc(l)}</a>` : "", displayUrlSafe: u => u, oiHostOf: u => new URL(u).hostname, oiBusy: new Set() };
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL("../lib/offer-intel.js", import.meta.url), "utf8"), ctx);
vm.runInContext(readFileSync(new URL("../lib/offer-intel-api.js", import.meta.url), "utf8"), ctx);
vm.runInContext("const OfferIntel=globalThis.OfferIntel;", ctx);
const start = html.indexOf("const OI_PAGE_KIND="), end = html.indexOf("/* Contagem desconhecida (null)");
assert.ok(start > 0 && end > start);
vm.runInContext(html.slice(start, end), ctx);
const run = code => vm.runInContext(code, ctx);

test("flags v2: tela só ativa com OI_V2_READY e fica false por padrão", () => {
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

test("Semanal: cabeçalho, resumo, abas, selos, oferta vinculada e análise expansível", () => {
  const rep = ctx.OfferIntel.formatWeeklyReport(FAKE_WEEKLY);
  ctx.__st = { status: "ready", items: [rep], data: { weeks: ctx.OfferIntel.formatWeeklyList(FAKE_WEEKLY_LIST.items) } };
  const out = run("oiWeeklyHtml({area:'semanal',query:{}},__st)");
  for (const t of ["Semana de 27/10/2026", "Resumo executivo", "Páginas cadastradas", "Encontradas", "NOVO", "Subiu 4 posições", "Caiu 2 posições", "Análise de IA", "Ver na Biblioteca", "Rodar agora", "Apresentar", "Imprimir / PDF", "US$ 12,40"]) assert.ok(out.includes(t), t);
  assert.equal((out.match(/<article class="oi-wk__ad"/g) || []).length, 20);
  assert.match(out, /href="\/ofertas\/11111111-1111-4111-8111-111111111111"/);
  assert.match(out, /Oferta: Oferta &lt;A&gt;/);
  assert.match(out, /id="oiWkPanel-discovered"[^>]*hidden/);
  assert.match(out, /Análise de IA indisponível para este anúncio/);
});

test("Semanal: relatório em execução, vazio e semana inexistente", () => {
  const running = ctx.OfferIntel.formatWeeklyReport({ report: { status: "running", week_start: "2026-11-03" } });
  ctx.__st = { status: "ready", items: [running], data: { weeks: [] } };
  const out = run("oiWeeklyHtml({area:'semanal',query:{}},__st)");
  assert.match(out, /Relatório em execução/); assert.match(out, /role="status"/);
  assert.match(run("oiWeeklyHtml({area:'semanal',query:{}},{status:'ready',items:[],data:{weeks:[]}})"), /Nenhum relatório semanal ainda/);
  assert.match(run("oiWeeklyHtml({area:'semanal',query:{}},{status:'ready',items:[],data:{weeks:[],weekNotFound:true}})"), /Semana não encontrada/);
  assert.match(run("oiWeeklyHtml({area:'semanal',query:{}},{status:'error',items:[],error:'Falhou'})"), /data-state="error"/);
});

test("Apresentação: capa + 20 slides, sem aviso de rodar e Escape/setas/foco no código", () => {
  const rep = ctx.OfferIntel.formatWeeklyReport(FAKE_WEEKLY);
  ctx.__rep = rep;
  assert.equal(run("oiPresSlides(__rep).length"), 21);
  assert.match(run("oiPresSlideHtml(oiPresSlides(__rep)[0],__rep)"), /Resumo executivo/);
  assert.match(run("oiPresSlideHtml(oiPresSlides(__rep)[1],__rep)"), /Página Demo 1/);
  const fn = html.slice(html.indexOf("function oiPresKey"), html.indexOf("function oiPresFullscreenChange"));
  assert.match(fn, /k==="Escape"/); assert.match(fn, /ArrowRight/); assert.match(fn, /ArrowLeft/); assert.match(fn, /k==="Tab"/);
  assert.match(html, /if\(opener&&opener\.isConnected\)opener\.focus\(\);/);
  assert.match(html, /fullscreenchange/);
});

test("Rodar agora: confirmação, 1 POST por clique ativo, 409 com mensagem própria", async () => {
  const calls = [];
  ctx.confirm = () => true; ctx.toast = (m, bad) => calls.push(["toast", m, !!bad]); ctx.activeSection = "outra"; ctx.oiStates = { semanal: {} };
  let n = 0, resolve;
  ctx.oiApi = { runWeekly: () => { n++; return new Promise((res, rej) => { resolve = () => rej(Object.assign(new Error("x"), { status: 409 })); }); } };
  ctx.btn = { setAttribute() {} };
  const p1 = run("oiWeeklyRun(btn)"); run("oiWeeklyRun(btn)");
  assert.equal(n, 1);
  resolve(); await p1;
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [["toast", "Já existe uma execução em andamento para esta semana.", true]]);
  ctx.confirm = () => false; calls.length = 0;
  await run("oiWeeklyRun(btn)"); assert.equal(n, 1);
});
