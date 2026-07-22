import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../lib/swipe-metrics.js", import.meta.url), "utf8");
const context = { globalThis: {} };
vm.runInNewContext(source, context);
const metrics = context.globalThis.SwipeMetrics;
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const ads = await readFile(new URL("../scripts/ads_scraper.py", import.meta.url), "utf8");
const migration = await readFile(new URL("../db/swipe-automation-hardening.sql", import.meta.url), "utf8");

test("ordenação soma janelas de calendário e deixa valores ausentes no fim", () => {
  const a = { data: { spendHistory: [
    { d: "2026-07-01", n: 100 }, { d: "2026-07-07", n: 70 }, { d: "2026-07-08", n: 80 }
  ] } };
  const b = { data: { spendHistory: [{ d: "2026-07-08", n: 20 }] } };
  const missing = { data: {} };
  assert.equal(metrics.spendWindow(a.data, 7).value, 150);
  assert.equal(metrics.spendWindow({ bmReports: [{ key: "30d", totals: { spend: "R$ 1.306.187,40" } }] }, 30).value, 1306187.4);
  assert.ok(metrics.compareOffers(a, b, "spend_7d", "desc") < 0);
  assert.ok(metrics.compareOffers(a, missing, "spend_7d", "desc") < 0);
  assert.ok(metrics.compareOffers(missing, a, "spend_7d", "desc") > 0);
});

test("anúncios ativos usam o snapshot mais recente e não a ordem original", () => {
  const result = metrics.activeAds({ numAdsAtivos: "999", adsHistory: [{ d: "2026-07-03", n: 12 }, { d: "2026-07-01", n: 5 }] });
  assert.equal(result.value, 12);
  assert.equal(result.referenceDate, "2026-07-03");
});

test("tema, nomes e cópia direta ficam disponíveis com persistência", () => {
  assert.match(html, /Swipe de Ofertas/);
  assert.match(html, /Swipe de Criativos/);
  assert.match(html, /data-theme-choice="light"/);
  assert.match(html, /localStorage\.setItem\("feg_theme"/);
  assert.match(html, /data-copy-transcript/);
  assert.match(html, /navigator\.clipboard\.writeText/);
});

test("automações expõem estados duráveis, bloqueio e retentativa", () => {
  for (const field of ["analysisStatus", "analysisAttempts", "analysisStartedAt", "analysisCompletedAt", "analysisLastError", "analysisNextRetryAt", "analysisVersion"]) assert.match(ads, new RegExp(field));
  assert.match(migration, /offers_prepare_automation_state/);
  assert.match(migration, /transcriptionStatus/);
  assert.match(migration, /security_invoker = true/);
});
