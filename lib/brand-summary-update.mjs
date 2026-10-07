const METRICS = new Set(["spend", "roas", "costResult", "avgConversion", "cpm", "ctr", "cpcLink"]);

// Sparse evidence-based corrections: keep every other report and campaign intact.
export function updateBrandReportSummaries(reports, updates) {
  if (!Array.isArray(reports) || !Array.isArray(updates) || !updates.length || updates.length > 4) throw new Error("resumos inválidos");
  const keys = new Set();
  for (const update of updates) {
    if (!update || typeof update !== "object" || Object.keys(update).some(key => !["key", "totals", "metricSources"].includes(key))) throw new Error("campo de resumo não autorizado");
    if (!reports.some(report => report.key === update.key) || keys.has(update.key)) throw new Error("período ausente ou repetido");
    keys.add(update.key);
    if (!update.totals || typeof update.totals !== "object" || Array.isArray(update.totals) || !Object.keys(update.totals).length) throw new Error("indicadores ausentes");
    for (const [key, value] of Object.entries(update.totals)) {
      if (!METRICS.has(key) || typeof value !== "string" || !/\d/.test(value) || value.length > 100) throw new Error("indicador inválido");
      if (typeof update.metricSources?.[key] !== "string" || !update.metricSources[key].trim() || update.metricSources[key].length > 300) throw new Error("fonte do indicador ausente");
    }
    if (Object.keys(update.metricSources || {}).some(key => !Object.hasOwn(update.totals, key))) throw new Error("fonte sem indicador");
  }
  return reports.map(report => {
    const update = updates.find(item => item.key === report.key);
    return update ? { ...report, totals: { ...report.totals, ...update.totals }, metricSources: { ...report.metricSources, ...update.metricSources } } : report;
  });
}
