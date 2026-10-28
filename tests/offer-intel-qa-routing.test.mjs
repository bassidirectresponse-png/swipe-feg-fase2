// Behavioral review tests. DOM/services below are explicitly FAKE.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const lib = fs.readFileSync(new URL("../lib/offer-intel.js", import.meta.url), "utf8");
const fn = name => {
  const start = html.indexOf("function " + name + "(");
  assert.ok(start >= 0, name);
  const end = html.indexOf("\n}", start);
  return html.slice(start, end + 2);
};
function FAKE_context(extra = {}) {
  const c = { URL, URLSearchParams, Intl, ...extra };
  vm.createContext(c); vm.runInContext(lib, c);
  return c;
}
function FAKE_parser(path, search = "") {
  const c = FAKE_context({
    location: { pathname: path, search },
    PATH2SEC: { inteligencia: "inteligencia", "radar-tiktok": "tiktok", ofertas: "oferta", "swipe-organic": "organic", transcritor: "transcritor", atualizacoes: "updates" },
    NICHE_SECTIONS: new Set(["tiktok", "oferta"]), FLAT_DETAIL_SECTIONS: new Set(["organic", "transcritor"]),
    nicheFromSlug: (_, slug) => slug === "todos" ? "" : slug === "pet" ? "Pet" : null
  });
  vm.runInContext(fn("parseLocation"), c); return c.parseLocation();
}
test("QA route behavior keeps legacy Radar, offers and flat/legacy Organic details", () => {
  for (const [path, section, id] of [
    ["/radar-tiktok/pet/video1", "tiktok", "video1"], ["/ofertas/todos/offer1", "oferta", "offer1"],
    ["/swipe-organic/item1", "organic", "item1"], ["/swipe-organic/todos/item1", "organic", "item1"],
    ["/transcritor/tr1", "transcritor", "tr1"]
  ]) {
    const result = FAKE_parser(path, "?q=pet");
    assert.equal(result.notFound, false); assert.equal(result.section, section);
    assert.equal(result.id, id); assert.equal(result.q.get("q"), "pet");
  }
  assert.equal(FAKE_parser("/inteligencia/funis/f1").oi.funnelId, "f1");
  assert.equal(FAKE_parser("/inteligencia/inexistente").notFound, true);
});
test("QA applyRoute denies non-admin before changing section, drawing or fetching", () => {
  for (const section of ["inteligencia", "updates"]) {
    const calls = [];
    const c = FAKE_context({
      routeReady: true, location: { pathname: "/inteligencia/descobertas" },
      parseLocation: () => ({ section, notFound: false }), ADMIN_SECTIONS: new Set(["updates"]), isAdmin: false,
      activeSection: "tiktok", renderNotFound: message => calls.push(message),
      renderGrid: () => assert.fail("must not render protected area"), fetch: () => assert.fail("must not fetch")
    });
    vm.runInContext(fn("applyRoute"), c); c.applyRoute();
    assert.equal(c.activeSection, "tiktok"); assert.equal(calls.length, 1); assert.match(calls[0], /administrativo/);
  }
});
test("QA renderOfferIntel has an independent non-admin gate", () => {
  let denied = false;
  const c = FAKE_context({ $: () => ({}), isAdmin: false, renderNotFound: () => { denied = true; } });
  vm.runInContext(fn("renderOfferIntel"), c); c.renderOfferIntel(); assert.equal(denied, true);
});
test("QA shell error text is escaped and announced accessibly", () => {
  const c = FAKE_context(); c.esc = c.OfferIntel.escapeHtml;
  vm.runInContext(fn("oiStateHtml"), c);
  const result = c.oiStateHtml("error", { errorTitle: '<img src=x onerror="alert(1)">', error: "<script>alert(1)</script>" });
  assert.doesNotMatch(result, /<script|<img/); assert.match(result, /&lt;script&gt;/);
  assert.match(result, /role="alert"/); assert.match(result, /type="button"/);
  const loading = c.oiStateHtml("loading");
  assert.match(loading, /role="status"/); assert.match(loading, /aria-busy="true"/);
});
