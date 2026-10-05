import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("média móvel do gráfico usa somente leituras reais, sem inventar uma segunda série", () => {
  const source = html.match(/function adsRollingAverage\(hist,windowSize=7\)\{[\s\S]*?\n\}(?=\nfunction adsChartPointLabel)/)?.[0];
  assert.ok(source);
  const average = new Function(`${source};return adsRollingAverage;`)();
  assert.deepEqual(average([{ n: 10 }, { n: 20 }, { n: 30 }, { n: 40 }], 3), [10, 15, 20, 30]);
});

test("gráfico de anúncios mantém altura legível, histórico completo e navegação por teclado", () => {
  assert.match(html, /const w=1080,h=380/);
  assert.match(html, /\.adschart\{display:block;width:100%;min-width:700px;height:auto/);
  assert.match(html, /Média móvel · 7 leituras/);
  assert.match(html, /data-ads-points="\$\{esc\(JSON\.stringify\(coords\)\)\}"/);
  assert.match(html, /function wireAdsChart\(root\)/);
  assert.match(html, /wireAdsChart\(\$\("#viewBody"\)\)/);
  assert.match(html, /ArrowLeft","ArrowRight","Home","End/);
  assert.doesNotMatch(html, /const w=Math\.max\(720,pts\.length\*28\)/);
});
