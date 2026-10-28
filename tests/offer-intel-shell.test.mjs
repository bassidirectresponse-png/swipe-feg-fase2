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
  assert.deepEqual({ ...invalid }, { q: "", oferta: "", etapa: "", url: "", tipo: "", status: "", ordem: "recentes", pagina: 1 });
  assert.equal(OI.buildPath({ area: "descobertas" }), "/inteligencia/descobertas");
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
  assert.match(html, /const OI_BACKEND_READY=false/);
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
