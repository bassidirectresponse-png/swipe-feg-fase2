import test from "node:test";
import assert from "node:assert/strict";
import { updateBrandReportSummaries } from "../lib/brand-summary-update.mjs";

test("correção de resumo preserva campanhas, períodos, gasto e indicadores não alterados", () => {
  const reports = [{ key: "7d", totals: { spend: "US$ 100,00", roas: "2,00" }, campaigns: [{ name: "Campanha" }] }, { key: "30d", totals: {} }];
  const updated = updateBrandReportSummaries(reports, [{ key: "7d", totals: { ctr: "2,50%" }, metricSources: { ctr: "Total legível no print de 7 dias" } }]);
  assert.equal(updated[0].totals.spend, reports[0].totals.spend);
  assert.equal(updated[0].totals.roas, reports[0].totals.roas);
  assert.equal(updated[0].campaigns, reports[0].campaigns);
  assert.equal(updated[1], reports[1]);
  assert.equal(reports[0].totals.ctr, undefined);
  assert.equal(updated[0].metricSources.ctr, "Total legível no print de 7 dias");
});

test("correção rejeita período inexistente, campos extras e indicador sem origem", () => {
  const reports = [{ key: "7d", totals: {} }], totals = { ctr: "2,50%" }, metricSources = { ctr: "print" };
  assert.throws(() => updateBrandReportSummaries(reports, [{ key: "14d", totals, metricSources }]), /período ausente/);
  assert.throws(() => updateBrandReportSummaries(reports, [{ key: "7d", totals }]), /fonte/);
  assert.throws(() => updateBrandReportSummaries(reports, [{ key: "7d", totals: { nomeOferta: "outro" }, metricSources }]), /indicador inválido/);
  assert.throws(() => updateBrandReportSummaries(reports, [{ key: "7d", totals, metricSources, campaigns: [] }]), /não autorizado/);
});
