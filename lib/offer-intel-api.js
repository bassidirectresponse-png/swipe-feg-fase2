(function (root) {
  "use strict";

  /* Camada de cliente das Functions offer-intel-* (contrato v1, nota offer-intel-contratos, seções 4–5).
     Sem acesso a globais do navegador: fetch, token, timers e UUID são injetados, o que a torna testável. */
  var BASE = "/.netlify/functions/";

  var BY_CODE = {
    session_expired: "Sua sessão expirou. Entre novamente para continuar.",
    forbidden: "Você não tem permissão para usar a Inteligência de Ofertas.",
    conflict: "Este item foi alterado por outra pessoa ou entra em conflito com outra solicitação. Os dados foram atualizados.",
    job_active: "Já existe uma investigação em andamento para esta oferta.",
    invalid_url: "URL inválida. Informe uma URL http(s) completa.",
    blocked_url: "Esta URL não pode ser analisada: o endereço é bloqueado por segurança.",
    offer_not_found: "Oferta não encontrada. Salve a oferta antes de investigar.",
    rate_limited: "Muitas solicitações em pouco tempo.",
    cooldown: "Esta oferta foi investigada há pouco. Aguarde o intervalo mínimo para repetir.",
    daily_limit: "O limite diário de investigações foi atingido.",
    provider_error: "A fonte de dados externa falhou. Tente novamente mais tarde.",
    capability_unavailable: "Este recurso não está disponível nesta versão.",
    credentials_missing: "A integração não está configurada no servidor. Avise o administrador."
  };
  var BY_STATUS = {
    400: "Pedido inválido.",
    401: BY_CODE.session_expired,
    403: BY_CODE.forbidden,
    404: "Item não encontrado.",
    409: BY_CODE.conflict,
    413: "O conteúdo enviado é grande demais.",
    422: "Os dados enviados não puderam ser processados.",
    429: BY_CODE.rate_limited,
    502: BY_CODE.provider_error,
    503: BY_CODE.capability_unavailable
  };
  var NETWORK = "Sem conexão com o servidor. Verifique a internet e tente novamente.";

  function formatRetryAfter(seconds) {
    var n = Math.ceil(Number(seconds));
    if (!Number.isFinite(n) || n <= 0) return "";
    if (n < 60) return " Tente novamente em " + n + " s.";
    if (n < 3600) return " Tente novamente em " + Math.ceil(n / 60) + " min.";
    return " Tente novamente em " + Math.ceil(n / 3600) + " h.";
  }

  function ApiError(status, code, message, retryable, retryAfter) {
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.message = message;
    this.retryable = !!retryable;
    this.retryAfter = retryAfter || 0;
  }
  ApiError.prototype = Object.create(Error.prototype);
  ApiError.prototype.constructor = ApiError;

  function describeError(status, body, headerRetryAfter) {
    body = body && typeof body === "object" ? body : {};
    var code = typeof body.code === "string" ? body.code.slice(0, 40) : "";
    if (!code) code = { 401: "session_expired", 403: "forbidden", 404: "not_found", 409: "conflict" }[status] || "";
    var retryAfter = Number(body.retry_after);
    if (!Number.isFinite(retryAfter) || retryAfter < 0) retryAfter = Number(headerRetryAfter);
    if (!Number.isFinite(retryAfter) || retryAfter < 0) retryAfter = 0;
    var base = Object.prototype.hasOwnProperty.call(BY_CODE, code) ? BY_CODE[code]
      : Object.prototype.hasOwnProperty.call(BY_STATUS, status) ? BY_STATUS[status]
      : status >= 500 ? "Erro no servidor. Tente novamente em instantes."
      : "Não foi possível concluir a solicitação.";
    var message = base + (status === 429 ? formatRetryAfter(retryAfter) : "");
    return new ApiError(status, code || ("http_" + status), message, body.retryable === true || status === 429 || status === 503 || status >= 500, retryAfter);
  }

  function queryString(query) {
    var params = new URLSearchParams();
    Object.keys(query || {}).forEach(function (key) {
      var value = query[key];
      if (value !== "" && value != null && value !== false) params.set(key, String(value));
    });
    var text = params.toString();
    return text ? "?" + text : "";
  }

  function randomKey() {
    var c = root.crypto;
    if (c && typeof c.randomUUID === "function") return c.randomUUID();
    var out = "";
    for (var i = 0; i < 32; i++) out += Math.floor(Math.random() * 16).toString(16);
    return out;
  }

  function createClient(options) {
    var fetchFn = options.fetch, getToken = options.getToken, refreshToken = options.refreshToken, newKey = options.newKey || randomKey;

    async function request(method, name, query, body) {
      var token = await getToken();
      if (!token) throw describeError(401, { code: "session_expired" });
      var refreshed = false;
      for (;;) {
        var response;
        try {
          response = await fetchFn(BASE + name + (method === "GET" ? queryString(query) : ""), {
            method: method, cache: "no-store",
            headers: Object.assign({ Authorization: "Bearer " + token }, body ? { "Content-Type": "application/json" } : {}),
            body: body ? JSON.stringify(body) : undefined
          });
        } catch (error) {
          throw new ApiError(0, "network", NETWORK, true, 0);
        }
        if (response.status === 401 && !refreshed && typeof refreshToken === "function") {
          refreshed = true;
          var fresh = await refreshToken();
          if (fresh) { token = fresh; continue; }
        }
        var payload = null;
        try { payload = await response.json(); } catch (error) { payload = null; }
        if (!response.ok || !payload || payload.ok === false) {
          var header = response.headers && typeof response.headers.get === "function" ? response.headers.get("Retry-After") : null;
          throw describeError(response.status, payload, header);
        }
        return payload;
      }
    }

    var get = function (name, query) { return request("GET", name, query); };
    var post = function (name, body) { return request("POST", name, null, body); };
    function listQuery(scope, extra) { return Object.assign({ job_id: scope.jobId, offer_id: scope.offerId, offer_ref_kind: scope.offerId ? (scope.offerRefKind || "offer") : "" }, extra); }

    return {
      newKey: newKey,
      startInvestigation: function (input) {
        var body = { idempotency_key: input.idempotencyKey || newKey(), options: { collect_ads: input.options.collect_ads === true, explore_domains: input.options.explore_domains === true, capture_screenshots: false } };
        if (input.url) body.url = input.url;
        if (input.offerId) { body.offer_id = input.offerId; body.offer_ref_kind = input.offerRefKind === "admin_draft" ? "admin_draft" : "offer"; }
        return post("offer-intel-investigations", body);
      },
      listInvestigations: function (scope, f) { f = f || {}; return get("offer-intel-investigations", Object.assign(listQuery(scope), { url: scope.url, status: f.status, cursor: f.cursor, limit: f.limit })); },
      getJob: function (jobId) { return get("offer-intel-job", { job_id: jobId }); },
      jobAction: function (jobId, action) { return post("offer-intel-job", { job_id: jobId, action: action, idempotency_key: newKey() }); },
      listDiscoveries: function (scope, f) { f = f || {}; return get("offer-intel-discoveries", listQuery(scope, { type: f.type, status: f.status, q: f.q, sort: f.sort, cursor: f.cursor, limit: f.limit })); },
      setDiscoveryStatus: function (id, status, expectedVersion, reason) { return post("offer-intel-discovery", { id: id, status: status, expected_version: expectedVersion, idempotency_key: newKey(), reason: reason || undefined }); },
      listRelations: function (scope, f) { f = f || {}; return get("offer-intel-relations", listQuery(scope, { type: f.type, status: f.status, cursor: f.cursor, limit: f.limit })); },
      setRelationStatus: function (id, status, expectedVersion, reason) { return post("offer-intel-relation", { id: id, status: status, expected_version: expectedVersion, idempotency_key: newKey(), reason: reason || undefined }); },
      listFunnels: function (scope, f) { f = f || {}; return get("offer-intel-funnels", listQuery(scope, { cursor: f.cursor })); },
      getFunnel: function (id) { return get("offer-intel-funnel", { id: id }); },
      summary: function (offerId, offerRefKind) { return get("offer-intel-summary", { offer_id: offerId, offer_ref_kind: offerRefKind || "offer" }); },
      evidence: function (id) { return get("offer-intel-evidence", { id: id }); },
      /* Contrato v2 (seção 10): Raio-X do domínio e relatório semanal. */
      listDomainScans: function (scope) { return get("offer-intel-domain-scans", listQuery(scope)); },
      getDomainScan: function (id) { return get("offer-intel-domain-scan", { id: id }); },
      listWeekly: function () { return get("offer-intel-weekly"); },
      getWeekly: function (week) { return get("offer-intel-weekly", { week: week || "latest" }); },
      runWeekly: function () { return post("offer-intel-weekly", { action: "run" }); }
    };
  }

  /* Polling: intervalo curto com job em execução, longo quando ocioso, pausado com a aba oculta. */
  function createPoller(options) {
    var timer = null, stopped = true, inflight = false;
    function schedule() {
      if (stopped || timer != null || inflight || options.isHidden() || !options.hasWork()) return;
      timer = options.setTimer(run, options.isActive() ? options.activeMs : options.idleMs);
    }
    async function run() {
      timer = null;
      if (stopped || options.isHidden()) return;
      inflight = true;
      try { await options.tick(); } catch (error) { /* a próxima rodada tenta de novo */ }
      inflight = false;
      schedule();
    }
    return {
      start: function () { stopped = false; schedule(); },
      stop: function () { stopped = true; if (timer != null) { options.clearTimer(timer); timer = null; } },
      /* Aba voltou a ficar visível, ou há novo trabalho: roda já. */
      kick: function () { if (stopped || inflight) return; if (timer != null) { options.clearTimer(timer); timer = null; } run(); },
      schedule: schedule
    };
  }

  root.OfferIntelApi = Object.freeze({ BASE: BASE, ApiError: ApiError, describeError: describeError, createClient: createClient, createPoller: createPoller, formatRetryAfter: formatRetryAfter });
})(typeof globalThis !== "undefined" ? globalThis : this);
