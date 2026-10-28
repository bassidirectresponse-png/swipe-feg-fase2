import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const context = { globalThis: {}, URL, URLSearchParams, Intl };
vm.runInNewContext(readFileSync(new URL("../lib/offer-intel.js", import.meta.url), "utf8"), context);
const OI = context.globalThis.OfferIntel;
const step = (id, extra = {}) => ({ id, kind: "landing", label: id, original_url: `https://exemplo.com/${id}`, verification: "verified", ...extra });
const edge = (from, to, extra = {}) => ({ from, to, ...extra });
const j = value => JSON.parse(JSON.stringify(value));
const codes = layout => j(layout.warnings.map(w => w.code));

// Formas do contrato v1 (nota offer-intel-contratos, seção 6).

test("grafo vazio ou inválido não quebra o layout", () => {
  for (const input of [undefined, null, {}, { steps: [], edges: [] }, { steps: "x", edges: 5 }]) {
    const layout = OI.layoutFunnel(input);
    assert.deepEqual([...layout.nodes], []);
    assert.deepEqual([...layout.readingOrder], []);
    assert.equal(layout.start, "");
    assert.equal(layout.truncated, false);
  }
});

test("funil linear ocupa uma coluna por profundidade e ordem de leitura esquerda→direita", () => {
  const layout = OI.layoutFunnel({ steps: [step("c"), step("a"), step("b")], edges: [edge("a", "b"), edge("b", "c")] });
  assert.equal(layout.start, "a");
  assert.deepEqual(j(layout.nodes.map(n => [n.id, n.col, n.row])), [["a", 0, 0], ["b", 1, 0], ["c", 2, 0]]);
  assert.deepEqual([...layout.readingOrder], ["a", "b", "c"]);
  assert.equal(layout.nav.b.left, "a");
  assert.equal(layout.nav.b.right, "c");
  assert.equal(layout.stats.verified, 3);
});

test("ramificações dividem linhas e a navegação por setas percorre a coluna", () => {
  const layout = OI.layoutFunnel({ start_step_id: "s", steps: [step("s"), step("x"), step("y"), step("z")], edges: [edge("s", "x", { label: "Botão A" }), edge("s", "y"), edge("x", "z"), edge("y", "z")] });
  const byId = Object.fromEntries(layout.nodes.map(n => [n.id, n]));
  assert.deepEqual([byId.x.col, byId.y.col, byId.z.col], [1, 1, 2]);
  assert.deepEqual([byId.x.row, byId.y.row], [0, 1]);
  assert.equal(layout.nav.x.down, "y");
  assert.equal(layout.nav.y.up, "x");
  assert.deepEqual([...layout.readingOrder], ["s", "x", "y", "z"]);
  assert.equal(layout.edges.filter(e => e.back).length, 0);
  assert.equal(layout.edges[0].label, "Botão A");
});

test("ciclos e auto-ligações são marcados como retorno sem loop infinito", () => {
  const layout = OI.layoutFunnel({ steps: [step("a"), step("b"), step("c")], edges: [edge("a", "b"), edge("b", "c"), edge("c", "a"), edge("b", "b")] });
  assert.deepEqual(j(layout.edges.filter(e => e.back).map(e => `${e.from}>${e.to}`)), ["c>a", "b>b"]);
  assert.ok(codes(layout).includes("cycle_edges"));
  assert.deepEqual(j(layout.nodes.map(n => n.col)), [0, 1, 2]);
  const closed = OI.layoutFunnel({ steps: [step("a"), step("b")], edges: [edge("a", "b"), edge("b", "a")] });
  assert.equal(closed.start, "a");
  assert.equal(closed.nodes.length, 2);
});

test("etapas sem caminho ficam em colunas à parte marcadas como desconectadas", () => {
  const layout = OI.layoutFunnel({ start_step_id: "a", steps: [step("a"), step("b"), step("x"), step("y")], edges: [edge("a", "b"), edge("x", "y")] });
  const byId = Object.fromEntries(layout.nodes.map(n => [n.id, n]));
  assert.equal(byId.x.detached, true);
  assert.ok(byId.x.col > byId.b.col);
  assert.equal(byId.y.col, byId.x.col + 1);
  assert.ok(codes(layout).includes("detached_steps"));
});

test("limite de 50 etapas e 120 arestas avisa o truncamento e mantém a etapa inicial", () => {
  const steps = Array.from({ length: 80 }, (_, i) => step(`s${i}`));
  const edges = Array.from({ length: 79 }, (_, i) => edge(`s${i}`, `s${i + 1}`));
  const layout = OI.layoutFunnel({ start_step_id: "s70", steps, edges });
  assert.equal(layout.nodes.length, 50);
  assert.equal(layout.start, "s70");
  assert.equal(layout.truncated, true);
  assert.deepEqual({ ...layout.warnings.find(w => w.code === "steps_truncated") }, { code: "steps_truncated", dropped: 30, limit: 50 });
  assert.match(OI.warningText(layout.warnings[0]), /50 etapas; 30 não exibidas/);

  const many = Array.from({ length: 50 }, (_, i) => step(`n${i}`));
  const dense = [];
  for (let i = 0; i < 50; i++) for (let j = 0; j < 50 && dense.length < 200; j++) if (i !== j) dense.push(edge(`n${i}`, `n${j}`));
  const capped = OI.layoutFunnel({ steps: many, edges: dense });
  assert.equal(capped.edges.length, 120);
  assert.ok(codes(capped).includes("edges_truncated"));
});

test("ids repetidos, ligações para etapas inexistentes e duplicadas são descartados com aviso", () => {
  const layout = OI.layoutFunnel({ steps: [step("a"), step("a"), step("b"), { label: "sem id" }], edges: [edge("a", "b"), edge("a", "b"), edge("a", "fantasma")] });
  assert.equal(layout.nodes.length, 2);
  assert.equal(layout.edges.length, 1);
  assert.deepEqual(codes(layout).sort(), ["duplicate_steps", "invalid_edges"]);
});

test("textos longos são cortados e URLs perigosas são removidas das etapas", () => {
  const layout = OI.layoutFunnel({ steps: [step("a", { label: "<img src=x onerror=alert(1)>" + "x".repeat(500), original_url: "javascript:alert(1)", kind: "__proto__", verification: "constructor" }), step("b", { original_url: "https://exemplo.com/" + "p".repeat(900) })], edges: [] });
  const [a, b] = layout.nodes;
  assert.ok(a.label.length <= 80);
  assert.equal(a.url, "");
  assert.equal(a.kind, "unknown");
  assert.equal(a.verification, "inferred");
  assert.ok(b.urlLabel.length <= 60);
  assert.match(b.urlLabel, /…$/);
  assert.equal(OI.escapeHtml(a.label).includes("<"), false);
});

test("formatDiscovery limita campos, sanitiza URLs e nunca afirma relação não confirmada", () => {
  const card = OI.formatDiscovery({
    id: "d1", type: "page", title: "<script>alert(1)</script>" + "T".repeat(300), page_id: "123", domain: "exemplo.com",
    url: "javascript:alert(1)", thumbnail_url: "data:text/html,x", ads_count: 1201, first_seen: "2026-10-01T12:00:00Z", last_seen: "invalida",
    source: "Apify FB Ads", status: "new", already_in_swipe: true, existing_offer_id: "o-1",
    evidence: [{ id: "e1", source: "domain_explorer", source_url: "https://exemplo.com/lp", verification: "verified", observed_at: "2026-10-02T15:30:00Z", detail: "d".repeat(1000) }]
  });
  assert.equal(card.typeLabel, "Página");
  assert.ok(card.title.length <= 100);
  assert.equal(card.url, "");
  assert.equal(card.thumbnail, "");
  assert.equal(card.adsLabel, "1.201 anúncios");
  assert.match(card.firstSeen, /01\/10\/2026/);
  assert.equal(card.lastSeen, "");
  assert.equal(card.alreadyInSwipe, true);
  assert.match(card.disclaimer, /não confirmada/);
  assert.ok(card.evidence[0].detail.length <= 240);
  assert.equal(card.evidence[0].urlLabel, "exemplo.com/lp");
  assert.equal(OI.formatDiscovery({ status: "confirmed" }).disclaimer, "");
  const empty = OI.formatDiscovery(null);
  assert.equal(empty.title, "Sem título");
  assert.equal(empty.status, "new");
  assert.equal(OI.formatDiscovery({ status: "hacked", type: "<b>" }).status, "new");
});

test("formatConnection e formatJob normalizam valores desconhecidos", () => {
  const link = OI.formatConnection({ id: "c1", from: { key: "offer:o1", kind: "offer", id: "o1", label: "Oferta" }, to: { key: "meta:page:1", kind: "page", id: "p1", label: "<b>Página</b>" }, relation_type: "same_domain", evidence: [{}, {}], status: "confirmed", version: 3 });
  assert.equal(link.relationLabel, "Mesmo domínio observado");
  assert.equal(link.version, 3);
  assert.equal(link.disclaimer, "");
  assert.equal(link.evidenceCount, 2);
  assert.equal(link.statusLabel, "Confirmada");
  assert.equal(OI.formatConnection({ relation_type: "x" }).relationLabel, "Relação a revisar");
  assert.match(OI.formatConnection({ status: "pending" }).disclaimer, /não prova/);

  const job = OI.formatJob({ id: "j1", offer_id: "o1", status: "running", phase: "collect_ads", progress: 75, progress_detail: { done: 3, total: 4 }, counts: { discoveries: 5 }, sources: [{ name: "screenshot", status: "unavailable", result_count: 0 }, { name: "apify", status: "failed", error: { code: "provider_error", message: "x".repeat(500) } }], started_at: "2026-10-27T12:00:00Z", finished_at: "2026-10-27T12:02:05Z", error: { code: "E", message: "m".repeat(500), retryable: true } });
  assert.equal(job.phaseLabel, "Coletando anúncios");
  assert.equal(job.progressDone, 3);
  assert.equal(job.counts.discoveries, 5);
  assert.equal(job.sources[0].statusLabel, "Indisponível nesta versão");
  assert.ok(job.sources[1].error.message.length <= 160);
  assert.equal(job.progressPercent, 75);
  assert.equal(job.active, true);
  assert.equal(job.duration, "2 min 5 s");
  assert.ok(job.error.message.length <= 240);
  assert.equal(OI.formatJob({ status: "succeeded" }).progressPercent, 100);
  assert.equal(OI.formatJob({ status: "???", progress: 900 }).progressPercent, 100);
  assert.equal(OI.formatJob({ status: "???" }).status, "queued");
  assert.equal(OI.formatJob(undefined).error, null);
});

test("o index.html usa os formatadores só sobre respostas da API e não embute dados de demonstração", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /const OI_BACKEND_READY=(true|false);/);
  assert.doesNotMatch(html, /FIXTURE|DADOS DE DEMONSTRA|OI_MOCK/);
  assert.match(html, /\.map\(OfferIntel\.formatDiscovery\)/);
});

test("etapas do funil seguem a forma v1: final_url, captura indisponível e tecnologias", () => {
  const layout = OI.layoutFunnel({ steps: [step("a", { final_url: "https://exemplo.com/final", http_status: 200, technologies: [{ name: "Shopify" }, "<b>x</b>"], screenshot_url: null, screenshot_status: "unavailable" }), step("b", { verification: "inaccessible", inaccessible_reason: "Exige login", screenshot_status: "unavailable" })], edges: [edge("a", "b", { kind: "redirect", verification: "verified" })] });
  const [a, b] = layout.nodes;
  assert.equal(a.finalUrlLabel, "exemplo.com/final");
  assert.equal(a.httpStatus, 200);
  assert.deepEqual(j(a.technologies), ["Shopify", "<b>x</b>"]);
  assert.equal(a.screenshotLabel, "Captura indisponível nesta versão");
  assert.equal(b.verificationLabel, "Inacessível");
  assert.equal(b.inaccessibleReason, "Exige login");
  assert.equal(layout.edges[0].kind, "redirect");
});

test("formatLimits mostra só o que vier e desabilita a coleta quando indisponível", () => {
  const now = Date.parse("2026-10-27T12:00:00Z");
  const full = OI.formatLimits({ apify: { available: true, daily_max_runs: 15, daily_used: 4, cooldown_hours: 6, cooldown_until: "2026-10-27T18:00:00Z", max_queries: 2, results_per_query: 15 }, domain_explorer: { available: true, max_pages: 20, max_depth: 2 }, screenshot: { available: false, reason: "x" } }, now);
  assert.equal(full.apifyAvailable, true);
  assert.deepEqual(j(full.lines), ["4 de 15 coletas de anúncios hoje", "Intervalo mínimo de 6 h entre coletas da mesma oferta", "Próxima coleta desta oferta após 27/10/2026, 15:00", "Até 2 consultas e 15 resultados por consulta", "Exploração de domínios: até 20 páginas, profundidade 2"]);
  assert.equal(full.screenshotUnavailable, true);
  const off = OI.formatLimits({ apify: { available: false } }, now);
  assert.equal(off.apifyAvailable, false);
  assert.deepEqual(j(off.lines), ["Coleta de anúncios indisponível"]);
  const past = OI.formatLimits({ apify: { available: true, cooldown_until: "2026-10-27T10:00:00Z" } }, now);
  assert.equal(past.lines.some(l => /Próxima coleta/.test(l)), false);
  for (const bad of [undefined, null, "x", { apify: "x" }]) assert.deepEqual(j(OI.formatLimits(bad).lines), []);
});

test("formatFunnelSummary limita texto e sanitiza URLs", () => {
  const f = OI.formatFunnelSummary({ id: "f1", investigation_id: "j1", title: "T".repeat(300), origin_url: "javascript:x", final_url: "https://a.com/p", steps_count: "7", created_at: "2026-10-27T12:00:00Z" });
  assert.ok(f.title.length <= 100);
  assert.equal(f.originUrl, "");
  assert.equal(f.finalLabel, "a.com/p");
  assert.equal(f.stepsCount, 7);
  assert.equal(OI.formatFunnelSummary(null).title, "Funil sem título");
});

test("etapas trazem redirecionamentos e data de observação seguros", () => {
  const layout = OI.layoutFunnel({ steps: [step("a", { redirects: [{ url: "https://r.com/1" }, "javascript:x", "https://r.com/2"], observed_at: "2026-10-27T12:00:00Z" })], edges: [] });
  assert.deepEqual(j(layout.nodes[0].redirects), ["r.com/1", "r.com/2"]);
  assert.match(layout.nodes[0].observedAt, /27\/10\/2026/);
});

// Regressões do QA independente (QA-01..QA-04).
test("QA-01: a referência admin_draft sobrevive ao parse/build e à troca de área", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const route = OI.parsePath(`/inteligencia/oferta/${id}`, "?ref=admin_draft");
  assert.equal(route.query.ref, "admin_draft");
  assert.equal(OI.buildPath(route), `/inteligencia/oferta/${id}?ref=admin_draft`);
  const next = OI.parsePath("/inteligencia/descobertas", `?oferta=${id}&ref=admin_draft&q=x`);
  assert.equal(OI.buildPath(next), `/inteligencia/descobertas?q=x&oferta=${id}&ref=admin_draft`);
  assert.equal(OI.buildPath({ area: "historico", query: { oferta: id, ref: next.query.ref } }), `/inteligencia/historico?oferta=${id}&ref=admin_draft`);
  assert.equal(OI.parsePath("/inteligencia/descobertas", "?ref=offer").query.ref, "");
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /OfferIntel\.scopeOf\(route,\{jobOfferId:jobOffer,offerRefKind:refKind\}\)/);
  assert.match(html, /query:\{oferta:scope\.oferta,ref:scope\.ref,job:/);
});

test("QA-02: DAG com arestas laterais não alega ciclo; ciclo real continua marcado", () => {
  const dag = OI.layoutFunnel({ steps: [step("a"), step("b"), step("c")], edges: [edge("a", "b"), edge("a", "c"), edge("b", "c")] });
  assert.equal(codes(dag).includes("cycle_edges"), false);
  assert.equal(dag.edges.some(e => e.back), false);
  assert.deepEqual(j(dag.nodes.map(n => [n.id, n.col])), [["a", 0], ["b", 1], ["c", 2]]);
  assert.equal(dag.edges.some(e => e.lateral), false);
  const diamond = OI.layoutFunnel({ steps: [step("s"), step("x"), step("y"), step("z")], edges: [edge("s", "x"), edge("s", "y"), edge("x", "y"), edge("y", "z")] });
  assert.equal(codes(diamond).includes("cycle_edges"), false);
  const cross = OI.layoutFunnel({ start_step_id: "a", steps: [step("a"), step("b"), step("c")], edges: [edge("a", "b"), edge("a", "c"), edge("c", "b"), edge("b", "c")] });
  assert.equal(cross.edges.filter(e => e.back).length, 1);
  assert.ok(codes(cross).includes("cycle_edges"));
});

test("QA-03: ids herdados do prototype não quebram o layout", () => {
  const bad = OI.layoutFunnel({ steps: [{ id: "a" }], edges: [{ from: "constructor", to: "a" }, { from: "a", to: "__proto__" }, { from: "toString", to: "hasOwnProperty" }] });
  assert.equal(bad.nodes.length, 1);
  assert.equal(bad.edges.length, 0);
  assert.deepEqual(j(bad.warnings), [{ code: "invalid_edges", count: 3 }]);
  const odd = OI.layoutFunnel({ steps: [step("constructor"), step("valueOf"), step("toString"), step("__proto__")], edges: [edge("constructor", "valueOf"), edge("valueOf", "toString")] });
  assert.deepEqual(j(odd.nodes.map(n => [n.id, n.col])), [["constructor", 0], ["valueOf", 1], ["toString", 2]]);
  assert.equal(odd.nav.constructor.right, "valueOf");
});

test("QA-04: contagem ausente não vira zero", () => {
  assert.equal(OI.formatDiscovery({ ads_count: null }).adsLabel, "");
  assert.equal(OI.formatDiscovery({ ads_count: "" }).adsCount, null);
  assert.equal(OI.formatDiscovery({ ads_count: false }).adsLabel, "");
  assert.equal(OI.formatDiscovery({ ads_count: 0 }).adsLabel, "0 anúncios");
  assert.equal(OI.formatDiscovery({ ads_count: "12" }).adsLabel, "12 anúncios");
  assert.equal(OI.formatFunnelSummary({ id: "f" }).stepsCount, null);
  assert.equal(OI.formatFunnelSummary({ id: "f", steps_count: 0 }).stepsCount, 0);
  assert.equal(OI.layoutFunnel({ steps: [step("a", { http_status: null })] }).nodes[0].httpStatus, null);
  assert.equal(j(OI.formatLimits({ apify: { available: true, daily_max_runs: 15 } }).lines)[0], "Limite de 15 coletas de anúncios por dia");
  assert.equal(OI.formatJob({ progress_detail: {} }).progressDone, null);
});

test("QA-01 (reaberto): scopeOf mantém oferta e tipo da referência ao trocar de área", () => {
  const id = "22222222-2222-4222-8222-222222222222";
  const hub = OI.parsePath(`/inteligencia/oferta/${id}`, "?ref=admin_draft");
  assert.deepEqual(j(OI.scopeOf(hub)), { oferta: id, ref: "admin_draft", job: "" });
  assert.equal(OI.buildPath({ area: "conexoes", query: OI.scopeOf(hub) }), `/inteligencia/conexoes?oferta=${id}&ref=admin_draft`);
  assert.deepEqual(j(OI.scopeOf(OI.parsePath(`/inteligencia/oferta/${id}`, ""))), { oferta: id, ref: "", job: "" });
  const filtered = OI.parsePath("/inteligencia/descobertas", `?oferta=${id}&ref=admin_draft&job=j9`);
  assert.deepEqual(j(OI.scopeOf(filtered)), { oferta: id, ref: "admin_draft", job: "" });
  const jobPage = OI.parsePath("/inteligencia/investigacao/j9", "");
  assert.deepEqual(j(OI.scopeOf(jobPage, { jobOfferId: id, offerRefKind: "admin_draft" })), { oferta: id, ref: "admin_draft", job: "" });
  assert.deepEqual(j(OI.scopeOf(jobPage, {})), { oferta: "", ref: "", job: "j9" });
  assert.deepEqual(j(OI.scopeOf(jobPage, { offerRefKind: "admin_draft" })), { oferta: "", ref: "", job: "j9" });
  assert.deepEqual(j(OI.scopeOf(undefined)), { oferta: "", ref: "", job: "" });
});

test("QA-06: ?ref=admin_draft explícito vale para oferta já publicada em summary, hub e início", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const withRef = OI.parsePath(`/inteligencia/oferta/${id}`, "?ref=admin_draft&investigar=1");
  const plain = OI.parsePath(`/inteligencia/oferta/${id}`, "");
  assert.equal(OI.refKindFor(withRef, false), "admin_draft");
  assert.equal(OI.refKindFor(plain, false), "offer");
  assert.equal(OI.refKindFor(plain, true), "admin_draft");
  assert.equal(OI.refKindFor(undefined, false), "offer");
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /oiApi\.summary\(route\.offerId,oiRouteRef\(route,o\)\)/);
  assert.match(html, /refKind:oiRouteRef\(oiRoute,o\)/);
  assert.match(html, /refKind:oiRouteRef\(route,o\)\}\),0\)/);
  assert.match(html, /ref=oiRouteRef\(route,offer\)==="admin_draft"/);
  assert.doesNotMatch(html, /refKind:oiRefKindOf\(o\)/);
});

// Rodada 5: campos de exibição da seção 8e, contadores, filtros, visão por Página e histórico por oferta.
const ad = (id, extra = {}) => ({ id, type: "ad", title: `Anúncio ${id}`, page_id: "111", page_name: "Alfa", status: "new", version: 1, ...extra });

test("8e: campos de exibição do anúncio, página e domínio; ausentes não são inventados", () => {
  const full = OI.formatDiscovery(ad("a1", { ad_text: "  Texto <b>forte</b>\n com quebra ".padEnd(700, "x"), landing_url: "https://alfa.com/lp?x=1", cta_text: "Saiba mais", started_at: "2026-10-05T15:00:00Z", platforms: ["facebook", "instagram", "x", "facebook"], display_format: "video", page_picture_url: "https://scontent-gru1-1.xx.fbcdn.net/p.jpg", url: "https://www.facebook.com/ads/library/?id=1" }));
  assert.ok(full.adText.length <= 500);
  assert.equal(full.landingDomain, "alfa.com");
  assert.equal(full.landingUrl, "https://alfa.com/lp?x=1");
  assert.equal(full.ctaText, "Saiba mais");
  assert.match(full.startedAt, /05\/10\/2026/);
  assert.deepEqual(j(full.platforms.map(p => p.short)), ["FB", "IG"]);
  assert.equal(full.displayFormat, "Vídeo");
  assert.equal(full.cardStatusLabel, "Não confirmado");
  const old = OI.formatDiscovery(ad("a2"));
  assert.equal(old.adText, "");
  assert.equal(old.startedAt, "");
  assert.deepEqual(j(old.platforms), []);
  assert.equal(old.pagePicture, "");
  assert.equal(old.adsFound, null);
  assert.equal(old.funnelId, "");
  const bad = OI.formatDiscovery(ad("a3", { landing_url: "javascript:alert(1)", page_picture_url: "data:x", platforms: "facebook", display_format: "__proto__" }));
  assert.equal(bad.landingUrl, "");
  assert.equal(bad.pagePicture, "");
  assert.deepEqual(j(bad.platforms), []);
  assert.equal(bad.displayFormat, "");
  assert.equal(OI.formatDiscovery({ type: "domain", id: "d", funnel_id: "f1", domain: "alfa.com" }).funnelId, "f1");
  assert.equal(OI.formatDiscovery({ type: "page", id: "p", ads_found: 0 }).adsFound, 0);
  assert.deepEqual(j(["new", "review", "confirmed", "ignored"].map(s => OI.formatDiscovery({ status: s }).cardStatusLabel)), ["Não confirmado", "Em revisão", "Confirmado", "Ignorado"]);
});

test("contadores, filtros, busca e ordenação no cliente", () => {
  const items = [
    ad("a1", { started_at: "2026-10-01T00:00:00Z", ad_text: "Compre agora a oferta" }),
    ad("a2", { started_at: "2026-10-09T00:00:00Z", status: "confirmed", ads_count: 3 }),
    { id: "p1", type: "page", title: "Alfa", page_id: "111", status: "review", ads_found: 9 },
    { id: "d1", type: "domain", title: "alfa.com", domain: "alfa.com", status: "ignored" }
  ].map(OI.formatDiscovery);
  assert.deepEqual(j(OI.countDiscoveries(items)), { ad: 2, page: 1, domain: 1, pending: 2, total: 4 });
  assert.deepEqual(j(OI.filterDiscoveries(items, { tipo: "anuncio" }).map(d => d.id)), ["a2", "a1"]);
  assert.deepEqual(j(OI.filterDiscoveries(items, { status: "pendente" }).map(d => d.id)).sort(), ["a1", "p1"]);
  assert.deepEqual(j(OI.filterDiscoveries(items, { status: "confirmado" }).map(d => d.id)), ["a2"]);
  assert.deepEqual(j(OI.filterDiscoveries(items, { q: "COMPRE" }).map(d => d.id)), ["a1"]);
  assert.deepEqual(j(OI.filterDiscoveries(items, { ordem: "anuncios" }).map(d => d.id)), ["p1", "a2", "a1", "d1"]);
  assert.deepEqual(j(OI.filterDiscoveries(items, { tipo: "xx", status: "yy" }).map(d => d.id)).length, 4);
  assert.deepEqual(j(OI.countDiscoveries(undefined)), { ad: 0, page: 0, domain: 0, pending: 0, total: 0 });
});

test("visão Por Página agrupa anúncios sob a Página e separa domínios e itens sem Página", () => {
  const items = [
    ad("a1"), ad("a2"), ad("a3", { page_id: "222", page_name: "Beta" }), ad("a4", { page_id: "", page_name: "" }),
    { id: "p1", type: "page", title: "Alfa", page_id: "111", ads_found: 2, status: "new", page_picture_url: "https://scontent.xx.fbcdn.net/a.jpg" },
    { id: "d1", type: "domain", title: "alfa.com", domain: "alfa.com", status: "new" }
  ].map(OI.formatDiscovery);
  const { groups, loose } = OI.groupByPage(items);
  assert.deepEqual(j(groups.map(g => [g.name, g.ads.length, !!g.page, !!g.picture])), [["Alfa", 2, true, true], ["Beta", 1, false, false]]);
  assert.deepEqual(j(loose.map(d => d.id)), ["a4", "d1"]);
  assert.deepEqual(j(OI.groupByPage(undefined)), { groups: [], loose: [] });
});

test("histórico agrupado por oferta com a investigação mais recente primeiro", () => {
  const jobs = [
    { id: "j3", offer_id: "11111111-1111-4111-8111-111111111111", offer_ref_kind: "offer", status: "succeeded", counts: { discoveries: 24, funnels: 2 } },
    { id: "j2", offer_id: "22222222-2222-4222-8222-222222222222", offer_ref_kind: "admin_draft", status: "failed" },
    { id: "j1", offer_id: "11111111-1111-4111-8111-111111111111", offer_ref_kind: "offer", status: "failed" },
    { id: "j0", seed_url: "https://exemplo.com/", status: "queued" }
  ].map(OI.formatJob);
  const groups = OI.groupInvestigationsByOffer(jobs);
  assert.deepEqual(j(groups.map(g => [g.offerId.slice(0, 2), g.jobsCount, g.latest.id])), [["11", 2, "j3"], ["22", 1, "j2"], ["", 1, "j0"]]);
  assert.equal(groups[0].latest.counts.discoveries, 24);
  assert.equal(groups[2].seedUrlLabel, "exemplo.com");
  assert.deepEqual(j(OI.groupInvestigationsByOffer(undefined)), []);
});

test("limits: cooldown ativo é sinalizado sem bloquear as demais fontes", () => {
  const now = Date.parse("2026-10-28T00:00:00Z");
  const lim = OI.formatLimits({ apify: { available: true, cooldown_until: "2026-10-28T06:00:00Z" } }, now);
  assert.equal(lim.apifyCoolingDown, true);
  assert.match(lim.apifyCooldownLabel, /28\/10\/2026/);
  assert.equal(OI.formatLimits({ apify: { available: true, cooldown_until: "2026-10-27T06:00:00Z" } }, now).apifyCoolingDown, false);
});
