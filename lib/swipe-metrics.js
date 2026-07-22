(function (root) {
  "use strict";

  function dateKey(value) {
    var date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  }

  function metricNumber(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    var raw = String(value == null ? "" : value).trim();
    if (!raw) return null;
    var negative = /^-/.test(raw);
    raw = raw.replace(/[^\d.,-]/g, "");
    var lastComma = raw.lastIndexOf(","), lastDot = raw.lastIndexOf(".");
    if (lastComma > lastDot) raw = raw.replace(/\./g, "").replace(",", ".");
    else if (lastDot > lastComma) raw = raw.replace(/,/g, "");
    else raw = raw.replace(",", ".");
    var parsed = Number(raw.replace(/(?!^)-/g, ""));
    if (!Number.isFinite(parsed)) return null;
    return negative ? -Math.abs(parsed) : parsed;
  }

  function dailySpend(data) {
    var source = data && (data.spendHistory || data.gastoDiario || data.dailySpend || data.metricasDiarias);
    if (!Array.isArray(source)) return [];
    return source.map(function (row) {
      var date = dateKey(row && (row.date || row.data || row.d || row.day));
      var value = metricNumber(row && (row.spend != null ? row.spend : row.gasto != null ? row.gasto : row.amount != null ? row.amount : row.value != null ? row.value : row.n));
      return date && value != null ? { date: date, value: value } : null;
    }).filter(Boolean).sort(function (a, b) { return a.date.localeCompare(b.date); });
  }

  function spendWindow(data, days) {
    var rows = dailySpend(data), latest = rows.length ? rows[rows.length - 1].date : "";
    if (rows.length) {
      var end = new Date(latest + "T12:00:00Z"), start = new Date(end);
      start.setUTCDate(start.getUTCDate() - Math.max(1, days) + 1);
      return { value: rows.filter(function (row) { return row.date >= dateKey(start) && row.date <= latest; }).reduce(function (sum, row) { return sum + row.value; }, 0), referenceDate: latest, source: "daily" };
    }
    var reportKey = days + "d";
    var reports = Array.isArray(data && data.bmReports) ? data.bmReports : [];
    var report = reports.find(function (item) { return String(item && item.key || "").toLowerCase() === reportKey; });
    var reportValue = metricNumber(report && report.totals && report.totals.spend);
    if (reportValue != null) return { value: reportValue, referenceDate: data.bmUpdatedAt || report.range || "", source: "report" };
    var keys = days === 7 ? ["spend7d", "gasto7d", "bmSpend7d"] : days === 14 ? ["spend14d", "gasto14d", "bmSpend14d"] : ["spend30d", "gasto30d", "bmSpend30d"];
    for (var i = 0; i < keys.length; i++) {
      var fallback = metricNumber(data && data[keys[i]]);
      if (fallback != null) return { value: fallback, referenceDate: data.adsUpdatedAt || data.bmUpdatedAt || "", source: "aggregate" };
    }
    return { value: null, referenceDate: latest, source: "missing" };
  }

  function activeAds(data) {
    var history = Array.isArray(data && data.adsHistory) ? data.adsHistory.map(function (row) {
      var date = dateKey(row && (row.d || row.date));
      var value = metricNumber(row && (row.n != null ? row.n : row.value));
      return date && value != null ? { date: date, value: value } : null;
    }).filter(Boolean).sort(function (a, b) { return a.date.localeCompare(b.date); }) : [];
    if (history.length) return { value: history[history.length - 1].value, referenceDate: history[history.length - 1].date, source: "history" };
    return { value: metricNumber(data && data.numAdsAtivos), referenceDate: data && (data.adsUpdatedAt || data.adsLibraryCheckedAt) || "", source: "current" };
  }

  function offerMetric(data, sort) {
    if (sort === "active_ads") return activeAds(data);
    var days = sort === "spend_14d" ? 14 : sort === "spend_30d" ? 30 : 7;
    return spendWindow(data, days);
  }

  function compareOffers(a, b, sort, direction) {
    var av = offerMetric(a && a.data || a || {}, sort).value;
    var bv = offerMetric(b && b.data || b || {}, sort).value;
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    var delta = av - bv;
    return direction === "asc" ? delta : -delta;
  }

  root.SwipeMetrics = Object.freeze({ metricNumber: metricNumber, dailySpend: dailySpend, spendWindow: spendWindow, activeAds: activeAds, offerMetric: offerMetric, compareOffers: compareOffers });
})(typeof globalThis !== "undefined" ? globalThis : this);
