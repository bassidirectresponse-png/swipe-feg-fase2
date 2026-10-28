(function (root) {
  "use strict";

  var BASE = "/inteligencia";
  var AREAS = [
    { key: "descobertas", label: "Descobertas", title: "Descobertas", description: "Novos anúncios, Páginas e domínios relacionados às ofertas investigadas." },
    { key: "conexoes", label: "Conexões", title: "Conexões", description: "Relacionamento entre produtos, ofertas, anúncios e bibliotecas." },
    { key: "funis", label: "Mapa de Funis", title: "Mapa de Funis", description: "Páginas e etapas identificadas, com URL, screenshot e dados coletados." },
    { key: "historico", label: "Histórico", title: "Histórico", description: "Análises realizadas, resultados, erros e atualizações." },
    { key: "monitoramento", label: "Monitoramento", title: "Monitoramento", description: "Verificações recorrentes em uma fase posterior." }
  ];
  var SPECIAL = {
    oferta: { title: "Inteligência da oferta", description: "Resumo das investigações e descobertas de uma oferta cadastrada." },
    investigacao: { title: "Investigação", description: "Progresso e resultado de uma execução." },
    investigar: { title: "Investigar URL", description: "Analise manualmente uma URL ou domínio público." }
  };
  var AREA_KEYS = AREAS.map(function (area) { return area.key; });
  var ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
  var QUERY_VALUES = {
    tipo: ["anuncio", "pagina", "dominio"],
    status: ["novo", "confirmado", "ignorado", "revisar", "em_andamento", "concluida", "erro", "parcial"],
    ordem: ["recentes", "relevancia", "anuncios"]
  };
  var DEFAULT_ORDER = "recentes";

  function areaMeta(key) {
    for (var i = 0; i < AREAS.length; i++) if (AREAS[i].key === key) return AREAS[i];
    return SPECIAL[key] ? { key: key, label: SPECIAL[key].title, title: SPECIAL[key].title, description: SPECIAL[key].description } : null;
  }

  function cleanId(value) {
    var text = String(value == null ? "" : value);
    return ID.test(text) ? text : "";
  }

  function normalizeQuery(input) {
    var source = input && typeof input.get === "function" ? input : new URLSearchParams(String(input || ""));
    var out = { q: String(source.get("q") || "").trim().slice(0, 200), oferta: cleanId(source.get("oferta")), etapa: cleanId(source.get("etapa")), url: "", tipo: "", status: "", ordem: DEFAULT_ORDER, pagina: 1 };
    ["tipo", "status"].forEach(function (key) {
      var value = String(source.get(key) || "");
      if (QUERY_VALUES[key].indexOf(value) >= 0) out[key] = value;
    });
    var order = String(source.get("ordem") || "");
    if (QUERY_VALUES.ordem.indexOf(order) >= 0) out.ordem = order;
    var page = parseInt(source.get("pagina"), 10);
    if (Number.isFinite(page) && page > 1) out.pagina = Math.min(page, 100000);
    var url = String(source.get("url") || "").trim();
    if (isValidHttpUrl(url)) out.url = url;
    return out;
  }

  function parsePath(pathname, search) {
    var path = String(pathname || "").replace(/\/+$/, "");
    var segments = path.split("/").filter(Boolean);
    var query = normalizeQuery(search ? String(search).replace(/^\?/, "") : "");
    if (segments[0] !== "inteligencia") return { notFound: true, query: query };
    var rest = segments.slice(1);
    if (!rest.length) return { area: "descobertas", redirect: true, notFound: false, query: query };
    var head = rest[0];
    var out = { area: head, notFound: false, query: query, offerId: "", jobId: "", funnelId: "" };
    if (rest.length === 1) {
      if (AREA_KEYS.indexOf(head) >= 0 || head === "investigar") return out;
      return { notFound: true, query: query };
    }
    if (rest.length === 2) {
      var id = cleanId(rest[1]);
      if (!id) return { notFound: true, query: query };
      if (head === "oferta") { out.offerId = id; return out; }
      if (head === "investigacao") { out.jobId = id; return out; }
      if (head === "funis") { out.funnelId = id; return out; }
    }
    return { notFound: true, query: query };
  }

  function buildPath(route) {
    route = route || {};
    var area = route.area || "descobertas";
    var path = BASE + "/" + area;
    if (area === "oferta" && route.offerId) path += "/" + encodeURIComponent(route.offerId);
    else if (area === "investigacao" && route.jobId) path += "/" + encodeURIComponent(route.jobId);
    else if (area === "funis" && route.funnelId) path += "/" + encodeURIComponent(route.funnelId);
    var query = route.query ? normalizeQuery(new URLSearchParams(queryEntries(route.query))) : null;
    if (!query) return path;
    var params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (query.oferta) params.set("oferta", query.oferta);
    if (query.tipo) params.set("tipo", query.tipo);
    if (query.status) params.set("status", query.status);
    if (query.ordem !== DEFAULT_ORDER) params.set("ordem", query.ordem);
    if (query.pagina > 1) params.set("pagina", String(query.pagina));
    if (query.etapa) params.set("etapa", query.etapa);
    if (query.url) params.set("url", query.url);
    var text = params.toString();
    return text ? path + "?" + text : path;
  }

  function queryEntries(query) {
    var out = [];
    Object.keys(query).forEach(function (key) {
      var value = query[key];
      if (value !== "" && value != null) out.push([key, String(value)]);
    });
    return out;
  }

  function isValidHttpUrl(value) {
    var text = String(value == null ? "" : value).trim();
    if (!text || text.length > 2048) return false;
    var url;
    try { url = new URL(text); } catch (error) { return false; }
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (url.username || url.password) return false;
    return !!url.hostname && url.hostname.indexOf(".") > 0;
  }

  /* Estado visual de uma área: exatamente um de loading | error | empty | ready. */
  function viewState(state) {
    state = state || {};
    if (state.status === "loading") return "loading";
    if (state.status === "error") return "error";
    var items = Array.isArray(state.items) ? state.items : [];
    return items.length ? "ready" : "empty";
  }

  function areaTabs(activeArea) {
    return AREAS.map(function (area) {
      return { key: area.key, label: area.label, href: BASE + "/" + area.key, current: area.key === activeArea };
    });
  }

  root.OfferIntel = Object.freeze({
    BASE: BASE,
    AREAS: AREAS,
    areaMeta: areaMeta,
    areaTabs: areaTabs,
    parsePath: parsePath,
    buildPath: buildPath,
    normalizeQuery: normalizeQuery,
    isValidHttpUrl: isValidHttpUrl,
    viewState: viewState
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
