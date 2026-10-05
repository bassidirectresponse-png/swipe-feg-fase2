// Importação sem navegador dos 11 anexos Healthy Petz recebidos em 05/10/2026.
// --validate apenas consulta o plano; --apply valida antes de qualquer escrita.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { temporaryToken, postManifest, upload, responseJson } from "./ingest_sp_nutrition.mjs";

const BASE = "https://benchmarkinggrupofeg.site";
const SUPABASE = "https://pkvzwtstidtobpdngxnd.supabase.co";
const DATE = "2026-10-05";
const BRAND_KEY = "healthy-petz";
const ADS = [
  "https://fb.me/adspreview/facebook/1W61FFNpL4BEhrH",
  "https://fb.me/adspreview/facebook/1WGi8XLnUdfd6rp",
  "https://fb.me/adspreview/facebook/1WvVOiejV5TBRaM",
];
const LIBRARY = "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&is_targeted_country=false&media_type=all&q=Healthy%2520Petz&search_type=keyword_unordered&sort_data[mode]=total_impressions&sort_data[direction]=desc";
export const evidence = [
  { file: "codex-clipboard-988d1ae9-2d3e-40c6-9099-a915d778928c.png", name: "Produto · Premium Liquid Collagen", periodKey: "cover", cover: true },
  { file: "codex-clipboard-9915399a-fdf9-41c5-ab29-de70867afcde.png", name: "Campanhas · 14 dias · 20/09 a 03/10/2026", periodKey: "14d" },
  { file: "codex-clipboard-dda7eef6-0749-49a6-9c5f-0f6ec70b2ab9.png", name: "Campanhas · ontem · 03/10/2026", periodKey: "1d" },
  { file: "codex-clipboard-28a58e11-9f90-4780-8784-23c73883798a.png", name: "Campanhas · 30 dias · 04/09 a 03/10/2026", periodKey: "30d" },
  { file: "codex-clipboard-83449334-c296-4ec4-8376-8d58aa6e4918.png", name: "Campanhas · 7 dias · 27/09 a 03/10/2026", periodKey: "7d" },
  { file: "codex-clipboard-b7ff1c39-c2e2-4015-8f53-0670c8a77b3f.png", name: "Anúncios · 7 dias · 27/09 a 03/10/2026", periodKey: "7d" },
  { file: "codex-clipboard-c6b2e1c8-2baa-4a3b-82b9-ec3fbb533e82.png", name: "Conjuntos · 7 dias · 27/09 a 03/10/2026", periodKey: "7d" },
  { file: "codex-clipboard-5cba1894-9314-4c64-a1fb-a9ea12c8bd07.png", name: "Configuração · orçamento da campanha", periodKey: "settings" },
  { file: "codex-clipboard-919fcd17-756e-4463-b214-03973dc064b8.png", name: "Configuração · conversão", periodKey: "settings" },
  { file: "codex-clipboard-0a41e8f3-382a-4df8-a404-554c1d18d4ee.png", name: "Configuração · período de exibição", periodKey: "settings" },
  { file: "codex-clipboard-46b49a14-b17a-49dd-9bf0-8d2942e3e26f.png", name: "Configuração · público", periodKey: "settings" },
];

const money = value => `US$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const decimal = value => value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const samples = [
  { key: "1d", label: "Ontem", range: "03/10/2026", spend: 50722.24, sales: 765, rows: [
    ["USA CBO", 16718.12, 275, 14073.00], ["USA BOF II CBO", 12316.85, 200, 11622.45],
    ["UK / CA / AUS CBO", 10934.74, 131, 6452.19], ["TESTING II ABO", 5739.28, 72, 3994.98],
    ["WW BOF II CBO", 4364.81, 76, 4295.82], ["TAURINE | US | SCALING CBO", 330.33, 6, 580.90],
    ["TAURINE | WW | SCALING CBO", 318.11, 5, 282.48],
  ] },
  { key: "7d", label: "Últimos 7 dias", range: "27/09/2026 a 03/10/2026", spend: 318845.13, sales: 4668, rows: [
    ["USA CBO", 105968.22, 1417, 76886.19], ["USA BOF II CBO", 87049.45, 1331, 79303.23],
    ["UK / CA / AUS CBO", 65550.08, 940, 49147.62], ["TESTING II ABO", 34325.10, 529, 29710.33],
    ["WW BOF II CBO", 23706.13, 405, 22037.75], ["TAURINE | US | SCALING CBO", 1467.25, 28, 2176.48],
    ["TAURINE | WW | SCALING CBO", 726.00, 18, 1202.51], ["TAURINE | US | TEST ABO", 52.90, 0, 0],
  ] },
  { key: "14d", label: "Últimos 14 dias", range: "20/09/2026 a 03/10/2026", spend: 644172.56, sales: 9270, rows: [
    ["USA CBO", 257635.29, 3201, 177551.25], ["USA BOF II CBO", 166237.41, 2578, 151794.63],
    ["UK / CA / AUS CBO", 130650.35, 1981, 103381.09], ["TESTING II ABO", 45035.93, 721, 40297.56],
    ["WW BOF II CBO", 40467.83, 718, 38544.83], ["TAURINE | US | SCALING CBO", 1968.06, 32, 2447.41],
    ["TAURINE | US | TEST ABO", 1451.29, 21, 1317.62], ["TAURINE | WW | SCALING CBO", 726.00, 18, 1202.51],
  ] },
  { key: "30d", label: "Últimos 30 dias", range: "04/09/2026 a 03/10/2026", spend: 1417250.00, sales: 23119, rows: [
    ["USA CBO", 684656.22, 10623, 555372.25], ["UK / CA / AUS CBO", 311061.38, 5033, 255739.69],
    ["USA BOF II CBO", 286937.95, 4920, 279641.56], ["TESTING II ABO", 69255.93, 1338, 71512.81],
    ["WW BOF II CBO", 59590.74, 1113, 59007.33], ["TAURINE | US | TEST ABO", 3053.72, 42, 2734.19],
    ["TAURINE | US | SCALING CBO", 1968.06, 32, 2447.41], ["TAURINE | WW | SCALING CBO", 726.00, 18, 1202.51],
  ] },
];
export const reports = samples.map(item => {
  const rowSpend = item.rows.reduce((sum, row) => sum + row[1], 0);
  const revenue = item.rows.reduce((sum, row) => sum + row[3], 0);
  if (item.rows.reduce((sum, row) => sum + row[2], 0) !== item.sales || Math.abs(rowSpend - item.spend) > 0.41) throw new Error(`transcrição inconsistente: ${item.key}`);
  return {
    key: `${DATE}-${item.key}`, label: `Outubro 2026 · ${item.label}`, range: item.range,
    level: "Campanhas", currency: "USD", capturedAt: DATE,
    totals: {
      spend: money(item.spend), results: `${item.sales.toLocaleString("pt-BR")} compras · conta BM`,
      roas: `≈ ${decimal(revenue / item.spend)} · calculado`,
      otherResults: "Gasto e compras da conta BM inteira, não exclusivos do Liquid Collagen. ROAS aproximado: soma dos valores de compra visíveis dividida pelo gasto total, pois a linha de total do Meta mostra traço. Há campanhas TAURINE nesta conta. Períodos sobrepostos: não somar. Anúncios e conjuntos de 7 dias repetem o mesmo período.",
    },
    campaigns: item.rows.map(([name, spend, sales, value]) => ({ name, spend: money(spend), results: `${sales.toLocaleString("pt-BR")} compras`, roas: value ? decimal(value / spend) : "—" })),
  };
});

export const makeManifest = cover => ({ batchDate: DATE, items: [{
  kind: "brandsvalidated", name: "Healthy Petz", brand: "Healthy Petz", niche: "Pet",
  format: "Premium Liquid Collagen", image: cover,
  libraries: [{ name: "Healthy Petz · Meta Ads Library", url: LIBRARY }],
  domains: [
    { name: "Advertorial · 6 reasons", offer: "http://shophealthypetz.com/pages/6-reasons" },
    { name: "Página do produto · Liquid Collagen", offer: "https://www.shophealthypetz.com/products/liquidcollagen" },
  ],
  ads: ADS.map((url, index) => ({ name: `Anúncio ${index + 1}`, url, creativeName: `Healthy Petz — Anúncio ${String(index + 1).padStart(2, "0")} — Outubro 2026`, platform: "meta" })),
}] });

async function main() {
  const root = process.env.HEALTHY_PETZ_MEDIA_ROOT;
  if (!root) throw new Error("Defina HEALTHY_PETZ_MEDIA_ROOT para a pasta dos 11 anexos originais");
  const media = await Promise.all(evidence.map(async entry => {
    const bytes = await readFile(join(root, entry.file));
    if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || bytes.length > 4 * 1024 * 1024) throw new Error(`PNG inválido ou acima de 4 MB: ${entry.file}`);
    return { ...entry, bytes, hash: createHash("sha256").update(bytes).digest("hex") };
  }));
  const coverUrl = `${SUPABASE}/storage/v1/object/public/criativos/brands/${BRAND_KEY}/cover-${media[0].hash.slice(0, 20)}.png`;
  const manifest = makeManifest(coverUrl);
  const token = await temporaryToken();
  const validation = await postManifest(token, manifest, "validate");
  if (validation.plan?.length !== 1 || validation.plan[0]?.kind !== "brandsvalidated" || validation.plan[0]?.name !== "Healthy Petz") throw new Error("plano de importação inesperado");
  console.log(JSON.stringify({ mode: "validate", plan: validation.plan, totals: validation.totals, reports: reports.map(report => ({ period: report.range, spend: report.totals.spend, sales: report.totals.results, roas: report.totals.roas })), evidence: media.length }, null, 2));
  if (!process.argv.includes("--apply")) return;

  const cover = await upload(token, media[0], media[0].bytes, "", BRAND_KEY);
  if (cover.url !== coverUrl) throw new Error("URL da capa diverge do manifesto validado");
  const applied = await postManifest(token, manifest, "apply");
  const offer = applied.applied?.find(item => item.kind === "brandsvalidated" && item.name === "Healthy Petz");
  if (!offer?.id) throw new Error("importação não retornou ID da Healthy Petz");
  const printResponses = [];
  for (const entry of media.slice(1)) printResponses.push(await upload(token, entry, entry.bytes, offer.id, BRAND_KEY));
  const patch = {
    bmReports: reports,
    bmPrints: media.slice(1).map((entry, index) => ({ nome: entry.name, periodKey: entry.periodKey, img: printResponses[index].ref })),
    brandTopAds: ADS.map((link, index) => ({ nome: `Healthy Petz · Anúncio ${index + 1}`, link, period: "2026-10", sourceDate: "05/10/2026" })),
    bmSpend7d: reports[1].totals.spend, bmSpend14d: reports[2].totals.spend, bmSpend30d: reports[3].totals.spend,
    bmRoas: reports[1].totals.roas, bmUpdatedAt: "05/10/2026",
    bmNotes: "Leitura da conta BM Healthy Petz recebida em 05/10/2026. Campanhas de ontem, 7, 14 e 30 dias encerrados em 03/10/2026. Os totais são da conta inteira e incluem campanhas TAURINE; não representam apenas Liquid Collagen. ROAS aproximado calculado pela soma do valor de compras das linhas visíveis dividida pelo gasto total, pois o ROAS de total do Meta aparece como traço. Diferença de US$ 0,40 entre a soma das linhas transcritas e o total do print de 14 dias: prevalece o total exibido. Períodos se sobrepõem e não devem ser somados; telas de anúncios e conjuntos de 7 dias são evidência, não gastos adicionais. A página 6 reasons foi fornecida pelo usuário, mas não pôde ser validada externamente neste momento.",
    offerTags: ["insider", "new", "scale"],
  };
  const updated = await responseJson(await fetch(`${BASE}/.netlify/functions/brands-cli-media`, {
    method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "x-brand-key": BRAND_KEY },
    body: JSON.stringify({ offerId: offer.id, patch }), signal: AbortSignal.timeout(60_000),
  }), "Atualização BM");
  if (updated.reports < 4 || updated.prints < 10 || updated.creatives < 3) throw new Error("verificação da BM ou dos criativos falhou");
  const checkCover = await fetch(coverUrl, { method: "HEAD", signal: AbortSignal.timeout(15_000) });
  if (!checkCover.ok) throw new Error(`capa pública indisponível (HTTP ${checkCover.status})`);
  console.log(JSON.stringify({ ok: true, offerId: offer.id, action: validation.plan[0].action, creativeCards: updated.creatives, newCreativeCards: applied.applied.filter(item => item.kind === "criativo").length, reports: updated.reports, prints: updated.prints, cover: coverUrl }, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch(error => { console.error(error.message); process.exitCode = 1; });
