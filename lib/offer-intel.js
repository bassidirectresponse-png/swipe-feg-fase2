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
    status: ["novo", "confirmado", "ignorado", "revisar", "pendente", "em_andamento", "concluida", "erro", "parcial"],
    visao: ["lista", "mapa"],
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
    var out = { q: String(source.get("q") || "").trim().slice(0, 200), oferta: cleanId(source.get("oferta")), etapa: cleanId(source.get("etapa")), job: cleanId(source.get("job")), visao: "", ref: source.get("ref") === "admin_draft" ? "admin_draft" : "", investigar: source.get("investigar") === "1", url: "", tipo: "", status: "", ordem: DEFAULT_ORDER, pagina: 1 };
    ["tipo", "status"].forEach(function (key) {
      var value = String(source.get(key) || "");
      if (QUERY_VALUES[key].indexOf(value) >= 0) out[key] = value;
    });
    var view = String(source.get("visao") || "");
    if (QUERY_VALUES.visao.indexOf(view) >= 0) out.visao = view;
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
    if (query.job) params.set("job", query.job);
    if (query.visao) params.set("visao", query.visao);
    if (query.ref) params.set("ref", query.ref);
    if (query.investigar) params.set("investigar", "1");
    if (query.url) params.set("url", query.url);
    var text = params.toString();
    return text ? path + "?" + text : path;
  }

  function queryEntries(query) {
    var out = [];
    Object.keys(query).forEach(function (key) {
      var value = query[key];
      if (value !== "" && value != null && value !== false) out.push([key, value === true ? "1" : String(value)]);
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

  /* ---------- Texto e URL seguros ----------
     Os formatadores devolvem texto puro e URLs http(s) validadas; quem monta o HTML
     deve passar tudo por escapeHtml (esc() no index.html). */
  var MAX_STEPS = 50;
  var MAX_EDGES = 120;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function cleanText(value, max) {
    var text = String(value == null ? "" : value).replace(/[\u0000-\u001f\u007f-\u009f‪-‮⁦-⁩]+/g, " ").replace(/\s+/g, " ").trim();
    if (max && text.length > max) text = text.slice(0, Math.max(0, max - 1)).replace(/\s+$/, "") + "…";
    return text;
  }

  function safeUrl(value) {
    var text = String(value == null ? "" : value).trim();
    return isValidHttpUrl(text) ? text : "";
  }

  function displayUrl(value, max) {
    var url = safeUrl(value);
    if (!url) return "";
    var parsed = new URL(url);
    var path = parsed.pathname === "/" ? "" : parsed.pathname;
    return cleanText(parsed.hostname.replace(/^www\./, "") + path + parsed.search, max || 60);
  }

  function formatDateTime(value, withTime) {
    var time = Date.parse(value);
    if (!Number.isFinite(time)) return "";
    try {
      var options = { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" };
      if (withTime) { options.hour = "2-digit"; options.minute = "2-digit"; options.hour12 = false; }
      return new Intl.DateTimeFormat("pt-BR", options).format(new Date(time));
    } catch (error) { return ""; }
  }

  function formatDuration(startedAt, finishedAt) {
    var start = Date.parse(startedAt), end = Date.parse(finishedAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return "";
    var seconds = Math.round((end - start) / 1000);
    if (seconds < 60) return seconds + " s";
    var minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + " min" + (seconds % 60 ? " " + (seconds % 60) + " s" : "");
    return Math.floor(minutes / 60) + " h" + (minutes % 60 ? " " + (minutes % 60) + " min" : "");
  }

  function toCount(value) {
    if (value == null || value === "" || typeof value === "boolean") return null;
    var n = Number(value);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
  }

  function pick(map, key, fallback) {
    return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : fallback;
  }

  /* ---------- Layout do Mapa de Funis ----------
     Contrato v1 (nota offer-intel-contratos, seção 6): funnel.steps[{id,kind,label,title,original_url,final_url,
     http_status,verification,inaccessible_reason,technologies,screenshot_url,screenshot_status}],
     funnel.edges[{from,to,kind,label,verification}] (from/to = ids de etapas), funnel.start_step_id. */
  var STEP_TYPES = { landing: "Landing page", presell: "Presell", quiz: "Quiz", vsl: "VSL", sales: "Página comercial", checkout: "Checkout", upsell: "Upsell", unknown: "Etapa não classificada" };
  var UNAVAILABLE_CAPTURE = "Captura indisponível nesta versão";
  var VERIFICATION = {
    verified: { label: "Verificada", icon: "✓" },
    inferred: { label: "Inferida", icon: "◇" },
    inaccessible: { label: "Inacessível", icon: "⛔" }
  };

  /* Decisão de layout (aprovada pelo Maestro): em vez de BFS por menor distância, o ciclo é detectado por DFS
     (aresta para nó ainda na pilha = retorno) e as colunas seguem o caminho mais longo no grafo sem as arestas
     de retorno. Assim um DAG (ex.: a→b, a→c, b→c) nunca gera ligação lateral nem falso ciclo. */
  function layoutFunnel(funnel) {
    funnel = funnel || {};
    var warnings = [];
    var rawSteps = Array.isArray(funnel.steps) ? funnel.steps : [];
    var rawEdges = Array.isArray(funnel.edges) ? funnel.edges : [];
    var startWanted = cleanId(funnel.start_step_id);

    var valid = [], seen = Object.create(null), duplicates = 0;
    rawSteps.forEach(function (step) {
      var id = cleanId(step && step.id);
      if (!id) return;
      if (seen[id]) { duplicates++; return; }
      seen[id] = true;
      valid.push(step);
    });
    if (duplicates) warnings.push({ code: "duplicate_steps", count: duplicates });

    var kept = valid;
    if (valid.length > MAX_STEPS) {
      kept = valid.slice(0, MAX_STEPS);
      if (startWanted && !kept.some(function (s) { return s.id === startWanted; })) {
        var wanted = valid.filter(function (s) { return s.id === startWanted; })[0];
        if (wanted) kept[MAX_STEPS - 1] = wanted;
      }
      warnings.push({ code: "steps_truncated", dropped: valid.length - MAX_STEPS, limit: MAX_STEPS });
    }
    var byId = Object.create(null);
    kept.forEach(function (step) { byId[step.id] = step; });

    var edges = [], invalid = 0, dropped = 0, pairs = Object.create(null);
    rawEdges.forEach(function (edge) {
      var from = cleanId(edge && edge.from), to = cleanId(edge && edge.to);
      if (!from || !to || !byId[from] || !byId[to]) { invalid++; return; }
      var key = from + "\u0000" + to;
      if (pairs[key]) return;
      pairs[key] = true;
      if (edges.length >= MAX_EDGES) { dropped++; return; }
      edges.push({ from: from, to: to, label: cleanText(edge.label, 60), kind: cleanText(edge.kind, 30), verification: pick(VERIFICATION, edge.verification, null) ? edge.verification : "inferred" });
    });
    if (invalid) warnings.push({ code: "invalid_edges", count: invalid });
    if (dropped) warnings.push({ code: "edges_truncated", dropped: dropped, limit: MAX_EDGES });

    var out = Object.create(null), incoming = Object.create(null);
    kept.forEach(function (step) { out[step.id] = []; incoming[step.id] = 0; });
    edges.forEach(function (edge) { edge.back = false; out[edge.from].push(edge); incoming[edge.to]++; });

    var start = byId[startWanted] ? startWanted : "";
    if (!start) kept.some(function (step) { if (!incoming[step.id]) { start = step.id; return true; } return false; });
    if (!start && kept.length) start = kept[0].id;

    /* Ciclo de verdade = aresta para um nó ainda na pilha da busca em profundidade.
       Arestas laterais/cruzadas de um DAG não são ciclos. */
    var state = Object.create(null), groupOf = Object.create(null), groups = [], depth = Object.create(null), order = [];
    function dfs(id, group) {
      state[id] = 1; groupOf[id] = group; group.nodes.push(id);
      out[id].forEach(function (edge) {
        if (state[edge.to] === 1) { edge.back = true; return; }
        if (state[edge.to] === undefined) dfs(edge.to, group);
      });
      state[id] = 2; group.post.push(id);
    }
    var roots = start ? [start] : [];
    kept.forEach(function (step) { roots.push(step.id); });
    roots.forEach(function (id) {
      if (state[id] !== undefined) return;
      var group = { nodes: [], post: [] };
      groups.push(group); dfs(id, group);
    });

    /* Camadas por caminho mais longo (sem as arestas de ciclo): DAGs não geram ligações laterais. */
    var base = 0, detachedCount = 0;
    groups.forEach(function (group, index) {
      group.nodes.forEach(function (id) { depth[id] = base; });
      group.post.slice().reverse().forEach(function (id) {
        out[id].forEach(function (edge) {
          if (!edge.back && groupOf[edge.to] === group && depth[edge.to] < depth[id] + 1) depth[edge.to] = depth[id] + 1;
        });
      });
      var max = base;
      group.nodes.forEach(function (id) { if (depth[id] > max) max = depth[id]; order.push({ id: id, detached: index > 0 }); });
      base = max + 1;
      if (index > 0) detachedCount += group.nodes.length;
    });
    if (detachedCount) warnings.push({ code: "detached_steps", count: detachedCount });

    var backEdges = 0;
    edges.forEach(function (edge) {
      edge.lateral = !edge.back && depth[edge.to] <= depth[edge.from];
      if (edge.back) backEdges++;
    });
    if (backEdges) warnings.push({ code: "cycle_edges", count: backEdges });

    var columns = [], nodes = [], info = Object.create(null);
    order.forEach(function (entry, index) {
      var step = byId[entry.id], col = depth[entry.id];
      while (columns.length <= col) columns.push([]);
      var verification = pick(VERIFICATION, step.verification, null) ? step.verification : "inferred";
      var node = {
        id: step.id, col: col, row: columns[col].length, order: index, detached: entry.detached,
        kind: pick(STEP_TYPES, step.kind, null) ? step.kind : "unknown",
        kindLabel: pick(STEP_TYPES, step.kind, STEP_TYPES.unknown),
        label: cleanText(step.label || step.title, 80) || pick(STEP_TYPES, step.kind, STEP_TYPES.unknown),
        title: cleanText(step.title, 120),
        url: safeUrl(step.original_url), urlLabel: displayUrl(step.original_url, 60),
        finalUrl: safeUrl(step.final_url), finalUrlLabel: displayUrl(step.final_url, 60),
        httpStatus: toCount(step.http_status), inaccessibleReason: cleanText(step.inaccessible_reason, 160),
        technologies: (Array.isArray(step.technologies) ? step.technologies : []).slice(0, 12).map(function (t) { return cleanText(t && t.name || t, 40); }).filter(Boolean),
        redirects: (Array.isArray(step.redirects) ? step.redirects : []).slice(0, 5).map(function (r) { return displayUrl(r && r.url || r, 80); }).filter(Boolean),
        observedAt: formatDateTime(step.observed_at, true),
        screenshotUrl: safeUrl(step.screenshot_url), screenshotStatus: cleanText(step.screenshot_status, 30),
        screenshotLabel: step.screenshot_url ? "" : (step.screenshot_status === "unavailable" || !step.screenshot_status ? UNAVAILABLE_CAPTURE : "Captura não disponível"),
        verification: verification, verificationLabel: VERIFICATION[verification].label, verificationIcon: VERIFICATION[verification].icon
      };
      columns[col].push(node.id);
      nodes.push(node); info[node.id] = node;
    });

    var readingOrder = nodes.slice().sort(function (a, b) { return a.col - b.col || a.row - b.row; }).map(function (n) { return n.id; });
    var nav = Object.create(null);
    nodes.forEach(function (node) {
      var column = columns[node.col];
      var parent = edges.filter(function (e) { return e.to === node.id && !e.back && depth[e.from] < depth[e.to]; })[0];
      var child = edges.filter(function (e) { return e.from === node.id && !e.back && depth[e.to] > depth[e.from]; })[0];
      nav[node.id] = {
        left: parent ? parent.from : "", right: child ? child.to : "",
        up: node.row > 0 ? column[node.row - 1] : "", down: node.row < column.length - 1 ? column[node.row + 1] : ""
      };
    });

    var stats = { steps: nodes.length, edges: edges.length, verified: 0, inferred: 0, inaccessible: 0 };
    nodes.forEach(function (n) { stats[n.verification]++; });
    return { nodes: nodes, edges: edges, columns: columns, start: start, readingOrder: readingOrder, nav: nav, warnings: warnings, stats: stats, truncated: warnings.some(function (w) { return /_truncated$/.test(w.code); }) };
  }

  function warningText(warning) {
    var map = {
      steps_truncated: function (w) { return "Mostrando " + w.limit + " etapas; " + w.dropped + " não exibida" + (w.dropped === 1 ? "" : "s") + "."; },
      edges_truncated: function (w) { return "Mostrando " + w.limit + " ligações; " + w.dropped + " não exibida" + (w.dropped === 1 ? "" : "s") + "."; },
      invalid_edges: function (w) { return w.count + " ligação(ões) ignorada(s) por apontar para etapa inexistente."; },
      duplicate_steps: function (w) { return w.count + " etapa(s) repetida(s) ignorada(s)."; },
      cycle_edges: function (w) { return w.count + " ligação(ões) de retorno (ciclo) marcada(s)."; },
      detached_steps: function (w) { return w.count + " etapa(s) sem caminho a partir da etapa inicial."; }
    };
    return map[warning.code] ? map[warning.code](warning) : "";
  }

  /* ---------- Formatadores de cards (contrato v1, seção 6) ---------- */
  var DISCOVERY_TYPES = { ad: "Anúncio", page: "Página", domain: "Domínio" };
  var DISCOVERY_STATUS = { "new": "Novo", confirmed: "Confirmado", ignored: "Ignorado", review: "Em revisão" };
  var RELATIONS = { same_page: "Mesma Página observada", same_domain: "Mesmo domínio observado", same_destination_url: "Mesma URL de destino", similar_creative: "Criativo semelhante", redirect: "Redirecionamento" };
  var RELATION_STATUS = { pending: "Pendente", confirmed: "Confirmada", ignored: "Ignorada" };
  var JOB_STATUS = { queued: "Na fila", running: "Em andamento", partial: "Parcial", succeeded: "Concluída", failed: "Com erro", cancelled: "Cancelada" };
  var JOB_PHASES = { validation: "Validando", collect_ads: "Coletando anúncios", explore_domains: "Explorando domínios", classify: "Classificando", persist: "Salvando resultados", done: "Concluída" };
  var SOURCE_NAMES = { apify: "Biblioteca de anúncios", domain_explorer: "Explorador de domínios", screenshot: "Captura de tela" };
  var SOURCE_STATUS = { pending: "Pendente", running: "Em andamento", succeeded: "Concluída", failed: "Falhou", skipped: "Ignorada", unavailable: "Indisponível nesta versão" };
  var VERIFICATION_EVIDENCE = { verified: "Verificada", inferred: "Inferida", inaccessible: "Inacessível" };

  function formatEvidence(list) {
    return (Array.isArray(list) ? list : []).slice(0, 20).map(function (item) {
      item = item || {};
      return { id: cleanId(item.id), source: cleanText(item.source, 60), url: safeUrl(item.source_url), urlLabel: displayUrl(item.source_url, 60), verification: pick(VERIFICATION_EVIDENCE, item.verification, null) ? item.verification : "inferred", verificationLabel: pick(VERIFICATION_EVIDENCE, item.verification, VERIFICATION_EVIDENCE.inferred), observedAt: formatDateTime(item.observed_at, true), detail: cleanText(item.detail, 240) };
    });
  }

  function formatDiscovery(raw) {
    raw = raw || {};
    var type = pick(DISCOVERY_TYPES, raw.type, null) ? raw.type : "";
    var status = pick(DISCOVERY_STATUS, raw.status, null) ? raw.status : "new";
    var url = safeUrl(raw.url), ads = toCount(raw.ads_count);
    var title = cleanText(raw.title || raw.page_name || raw.domain, 100) || displayUrl(url, 100) || "Sem título";
    return {
      id: cleanId(raw.id), type: type, typeLabel: type ? DISCOVERY_TYPES[type] : "Item",
      title: title,
      subtitle: cleanText([raw.page_id ? "Page ID " + cleanText(raw.page_id, 40) : "", cleanText(raw.domain, 80)].filter(Boolean).join(" · "), 140),
      url: url, urlLabel: displayUrl(url, 60), thumbnail: safeUrl(raw.thumbnail_url),
      adsCount: ads, adsLabel: ads == null ? "" : ads.toLocaleString("pt-BR") + (ads === 1 ? " anúncio" : " anúncios"),
      firstSeen: formatDateTime(raw.first_seen), lastSeen: formatDateTime(raw.last_seen),
      source: cleanText(raw.source, 60), evidence: formatEvidence(raw.evidence), evidenceCount: Array.isArray(raw.evidence) ? raw.evidence.length : 0,
      status: status, statusLabel: DISCOVERY_STATUS[status],
      version: toCount(raw.version), identityKey: cleanText(raw.identity_key, 120),
      alreadyInSwipe: raw.already_in_swipe === true, existingOfferId: cleanId(raw.existing_offer_id),
      existingMatches: (Array.isArray(raw.existing_matches) ? raw.existing_matches : []).slice(0, 10).map(function (m) { m = m || {}; return { refKind: m.ref_kind === "admin_draft" ? "admin_draft" : "offer", refId: cleanId(m.ref_id), label: cleanText(m.label, 100) }; }),
      disclaimer: status === "confirmed" ? "" : "Sugerido por similaridade — relação não confirmada."
    };
  }

  function formatEndpoint(raw) {
    raw = raw || {};
    return { key: cleanText(raw.key, 120), kind: cleanText(raw.kind, 30), id: cleanId(raw.id), label: cleanText(raw.label, 100) || "Sem nome" };
  }

  function formatConnection(raw) {
    raw = raw || {};
    var status = pick(RELATION_STATUS, raw.status, null) ? raw.status : "pending";
    var relation = pick(RELATIONS, raw.relation_type, null) ? raw.relation_type : "";
    return {
      id: cleanId(raw.id), from: formatEndpoint(raw.from), to: formatEndpoint(raw.to),
      relation: relation, relationLabel: relation ? RELATIONS[relation] : "Relação a revisar",
      version: toCount(raw.version), reason: cleanText(raw.reason, 240),
      evidence: formatEvidence(raw.evidence), evidenceCount: Array.isArray(raw.evidence) ? raw.evidence.length : 0,
      status: status, statusLabel: RELATION_STATUS[status],
      disclaimer: status === "confirmed" ? "" : "Semelhança observada; não prova que pertencem ao mesmo anunciante."
    };
  }

  function formatJob(raw) {
    raw = raw || {};
    var status = pick(JOB_STATUS, raw.status, null) ? raw.status : "queued";
    var detail = raw.progress_detail || {};
    var percent = Number(raw.progress);
    percent = Number.isFinite(percent) ? Math.max(0, Math.min(100, Math.round(percent))) : (status === "succeeded" ? 100 : 0);
    var error = raw.error && typeof raw.error === "object" ? { code: cleanText(raw.error.code, 40), message: cleanText(raw.error.message, 240), retryable: raw.error.retryable === true } : null;
    var counts = raw.counts || {};
    return {
      id: cleanId(raw.id), offerId: cleanId(raw.offer_id), offerRefKind: raw.offer_ref_kind === "admin_draft" ? "admin_draft" : "offer",
      seedUrl: safeUrl(raw.seed_url), seedUrlLabel: displayUrl(raw.seed_url, 60),
      status: status, statusLabel: JOB_STATUS[status],
      active: status === "queued" || status === "running",
      terminal: status === "succeeded" || status === "partial" || status === "failed" || status === "cancelled",
      phase: pick(JOB_PHASES, raw.phase, null) ? raw.phase : "", phaseLabel: pick(JOB_PHASES, raw.phase, ""),
      progressPercent: percent, progressDone: toCount(detail.done), progressTotal: toCount(detail.total),
      counts: { discoveries: toCount(counts.discoveries) || 0, relations: toCount(counts.relations) || 0, funnels: toCount(counts.funnels) || 0, steps: toCount(counts.steps) || 0 },
      createdAt: formatDateTime(raw.created_at, true), startedAt: formatDateTime(raw.started_at, true), finishedAt: formatDateTime(raw.finished_at, true),
      nextRetryAt: formatDateTime(raw.next_retry_at, true),
      duration: formatDuration(raw.started_at, raw.finished_at), error: error,
      sources: (Array.isArray(raw.sources) ? raw.sources : []).slice(0, 20).map(function (src) {
        src = src || {};
        var st = pick(SOURCE_STATUS, src.status, null) ? src.status : "pending";
        return { name: pick(SOURCE_NAMES, src.name, cleanText(src.name, 60)), status: st, statusLabel: SOURCE_STATUS[st], resultCount: toCount(src.result_count), error: src.error && typeof src.error === "object" ? { code: cleanText(src.error.code, 40), message: cleanText(src.error.message, 160) } : null };
      })
    };
  }

  function formatFunnelSummary(raw) {
    raw = raw || {};
    return {
      id: cleanId(raw.id), investigationId: cleanId(raw.investigation_id), title: cleanText(raw.title, 100) || displayUrl(raw.origin_url, 100) || "Funil sem título",
      originUrl: safeUrl(raw.origin_url), originLabel: displayUrl(raw.origin_url, 60), finalUrl: safeUrl(raw.final_url), finalLabel: displayUrl(raw.final_url, 60),
      stepsCount: toCount(raw.steps_count), createdAt: formatDateTime(raw.created_at)
    };
  }

  /* Limites do servidor (seção 8b da nota): todos os campos são opcionais. */
  function formatLimits(limits, now) {
    limits = limits && typeof limits === "object" ? limits : {};
    var apify = limits.apify && typeof limits.apify === "object" ? limits.apify : {};
    var domain = limits.domain_explorer && typeof limits.domain_explorer === "object" ? limits.domain_explorer : {};
    var lines = [];
    var apifyAvailable = typeof apify.available === "boolean" ? apify.available : null;
    if (apifyAvailable === false) lines.push("Coleta de anúncios indisponível");
    else {
      var max = toCount(apify.daily_max_runs), used = toCount(apify.daily_used);
      if (max != null) lines.push(used == null ? "Limite de " + max + " coletas de anúncios por dia" : used + " de " + max + " coletas de anúncios hoje");
      var hours = toCount(apify.cooldown_hours);
      if (hours) lines.push("Intervalo mínimo de " + hours + " h entre coletas da mesma oferta");
      var until = Date.parse(apify.cooldown_until);
      if (Number.isFinite(until) && until > (now == null ? Date.now() : now)) lines.push("Próxima coleta desta oferta após " + formatDateTime(apify.cooldown_until, true));
      var queries = toCount(apify.max_queries), results = toCount(apify.results_per_query);
      if (queries && results) lines.push("Até " + queries + " consultas e " + results + " resultados por consulta");
    }
    var pages = toCount(domain.max_pages), depth = toCount(domain.max_depth);
    if (domain.available === false) lines.push("Exploração de domínios indisponível");
    else if (pages) lines.push("Exploração de domínios: até " + pages + " páginas" + (depth ? ", profundidade " + depth : ""));
    return { apifyAvailable: apifyAvailable, lines: lines, screenshotUnavailable: !limits.screenshot || limits.screenshot.available !== true };
  }

  root.OfferIntel = Object.freeze({
    formatFunnelSummary: formatFunnelSummary,
    formatLimits: formatLimits,
    MAX_STEPS: MAX_STEPS,
    MAX_EDGES: MAX_EDGES,
    escapeHtml: escapeHtml,
    cleanText: cleanText,
    safeUrl: safeUrl,
    displayUrl: displayUrl,
    layoutFunnel: layoutFunnel,
    warningText: warningText,
    formatDiscovery: formatDiscovery,
    formatConnection: formatConnection,
    formatJob: formatJob,
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
