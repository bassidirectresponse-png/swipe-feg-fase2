// Importação sem navegador de Tryclover recebida em 05/10/2026.
// Dois prints TEM ADS 01 em R$ não têm vínculo comprovado e ficam fora do lote;
// um print de 14 dias é duplicata binária e também não é importado.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { temporaryToken, postManifest, upload, responseJson } from "./ingest_sp_nutrition.mjs";

const BASE = "https://benchmarkinggrupofeg.site";
const SUPABASE = "https://pkvzwtstidtobpdngxnd.supabase.co";
const DATE = "2026-10-05";
const BRAND_KEY = "tryclover";
const ADS = [
  "https://fb.me/adspreview/facebook/1VGrOpQHPHWhE2y",
  "https://fb.me/adspreview/facebook/1T9CmplQb8fVa56",
  "https://fb.me/adspreview/facebook/1RNdCWWfXAfEGxu",
];
export const evidence = [
  { file: "codex-clipboard-524e58ae-98a9-4326-ae97-bb2be610bbb2.png", name: "Produto · Premium Liquid Collagen", periodKey: "cover", cover: true },
  { file: "codex-clipboard-72bfdd47-8590-44f3-acc8-5e5903d917f6.png", name: "Configuração · anúncio e rastreamento", periodKey: "settings" },
  { file: "codex-clipboard-fed52289-4e0b-4a6b-8d41-41252cb8d1f3.png", name: "Campanhas · ontem · 01/10/2026", periodKey: "1d" },
  { file: "codex-clipboard-9c0eddb1-7c64-4691-8385-070459ef4d08.png", name: "Configuração · conversão", periodKey: "settings" },
  { file: "codex-clipboard-45d0e4d0-e027-413b-a47d-80259ab33f39.png", name: "Configuração · público", periodKey: "settings" },
  { file: "codex-clipboard-34dcffcf-8fe4-48bf-94a8-f8ab2638967f.png", name: "Anúncios · 7 dias · 25/09 a 01/10/2026", periodKey: "7d" },
  { file: "codex-clipboard-fb23629c-b5fa-4a59-aaf1-d0bddddceb15.png", name: "Campanhas · 14 dias · 18/09 a 01/10/2026", periodKey: "14d" },
  { file: "codex-clipboard-c86e3578-511c-49fc-be5c-fca0ddbef8f0.png", name: "Histórico · lances de conjuntos", periodKey: "settings" },
  { file: "codex-clipboard-a588a67f-28e7-444c-b856-2a2116069d21.png", name: "Configuração · período de exibição", periodKey: "settings" },
  { file: "codex-clipboard-d010ca1e-06a4-4485-a643-8f99ff9462e0.png", name: "Campanhas · 7 dias · 25/09 a 01/10/2026", periodKey: "7d" },
  { file: "codex-clipboard-ca22a37b-eb6e-4624-9c32-7692e564a0ca.png", name: "Histórico · orçamento da campanha", periodKey: "settings" },
  { file: "codex-clipboard-4fe41e67-521b-41d9-8099-21baf65d96e0.png", name: "Conjuntos · 7 dias · 25/09 a 01/10/2026", periodKey: "7d" },
  { file: "codex-clipboard-cc874f7b-9295-4b2e-a4fb-495de28aad7d.png", name: "Configuração · orçamento da campanha", periodKey: "settings" },
  { file: "codex-clipboard-236d1aaf-8251-41a5-a8b0-16fb90fa3b27.png", name: "Campanhas · 30 dias · 02/09 a 01/10/2026", periodKey: "30d" },
];

const money = value => `US$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const decimal = value => value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const samples = [
  { key: "1d", label: "Ontem", range: "01/10/2026", spend: 6373.99, sales: 176, rows: [
    ["TEST 2 VIDEO + STATIC CBO", 6097.07, 172, 10892.71],
    ["Abo testing campaign", 257.94, 4, 223.33],
    ["Graveyard campaign", 18.98, 0, 0],
  ] },
  { key: "7d", label: "Últimos 7 dias", range: "25/09/2026 a 01/10/2026", spend: 45419.50, sales: 1302, rows: [
    ["TEST 2 VIDEO + STATIC CBO", 42772.11, 1259, 79914.67],
    ["Abo testing campaign", 2335.11, 40, 2393.39],
    ["Graveyard campaign", 312.28, 3, 160.62],
  ] },
  { key: "14d", label: "Últimos 14 dias", range: "18/09/2026 a 01/10/2026", spend: 83271.79, sales: 1952, rows: [
    ["TEST 2 VIDEO + STATIC CBO", 74292.55, 1825, 110800.78],
    ["Abo testing campaign", 8583.78, 121, 7085.82],
    ["Graveyard campaign", 395.46, 6, 350.54],
  ] },
  { key: "30d", label: "Últimos 30 dias", range: "02/09/2026 a 01/10/2026", spend: 145577.51, sales: 3153, rows: [
    ["TEST 2 VIDEO + STATIC CBO", 132017.79, 2945, 171585.82],
    ["Abo testing campaign", 12868.74, 194, 11090.19],
    ["Graveyard campaign", 690.98, 14, 838.53],
  ] },
];
export const reports = samples.map(item => {
  const rowSpend = item.rows.reduce((sum, row) => sum + row[1], 0);
  const revenue = item.rows.reduce((sum, row) => sum + row[3], 0);
  if (Math.abs(rowSpend - item.spend) > 0.01 || item.rows.reduce((sum, row) => sum + row[2], 0) !== item.sales) throw new Error(`transcrição inconsistente: ${item.key}`);
  return {
    key: `${DATE}-${item.key}`, label: `Outubro 2026 · ${item.label}`, range: item.range,
    level: "Campanhas", currency: "USD", capturedAt: DATE,
    totals: {
      spend: money(item.spend), results: `${item.sales.toLocaleString("pt-BR")} compras · conta BM`,
      roas: `≈ ${decimal(revenue / item.spend)} · calculado`,
      otherResults: "As três campanhas cobrem o gasto total do print; compras somadas das linhas visíveis. O ROAS de total do Meta aparece como traço, então o valor aproximado é a soma dos valores de compra dividida pelo gasto. Não somar períodos sobrepostos nem telas de anúncios/conjuntos com campanhas. Apenas a conta BM Tryclover em US$ foi usada; os prints TEM ADS 01 em R$ não foram vinculados.",
    },
    campaigns: item.rows.map(([name, spend, sales, value]) => ({ name, spend: money(spend), results: `${sales.toLocaleString("pt-BR")} compras`, roas: value ? decimal(value / spend) : "—" })),
  };
});

export const makeManifest = cover => ({ batchDate: DATE, items: [{
  kind: "brandsvalidated", name: "Tryclover", brand: "Tryclover", niche: "Pet",
  format: "Premium Liquid Collagen · 60 mL", image: cover,
  domains: [{ name: "Página do produto · Collagen", offer: "https://tryclover.co/products/collagen" }],
  ads: ADS.map((url, index) => ({ name: `Anúncio ${index + 1}`, url, creativeName: `Tryclover — Anúncio ${String(index + 1).padStart(2, "0")} — Outubro 2026`, platform: "meta" })),
}] });

async function main() {
  const root = process.env.TRYCLOVER_MEDIA_ROOT;
  if (!root) throw new Error("Defina TRYCLOVER_MEDIA_ROOT para a pasta dos anexos originais");
  const media = await Promise.all(evidence.map(async entry => {
    const bytes = await readFile(join(root, entry.file));
    if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || bytes.length > 4 * 1024 * 1024) throw new Error(`PNG inválido ou acima de 4 MB: ${entry.file}`);
    return { ...entry, bytes, hash: createHash("sha256").update(bytes).digest("hex") };
  }));
  if (new Set(media.map(entry => entry.hash)).size !== media.length) throw new Error("há print duplicado no lote Tryclover");
  const coverUrl = `${SUPABASE}/storage/v1/object/public/criativos/brands/${BRAND_KEY}/cover-${media[0].hash.slice(0, 20)}.png`;
  const manifest = makeManifest(coverUrl);
  const token = await temporaryToken();
  const validation = await postManifest(token, manifest, "validate");
  if (validation.plan?.length !== 1 || validation.plan[0]?.kind !== "brandsvalidated" || validation.plan[0]?.name !== "Tryclover") throw new Error("plano de importação inesperado");
  console.log(JSON.stringify({ mode: "validate", plan: validation.plan, totals: validation.totals, reports: reports.map(report => ({ period: report.range, spend: report.totals.spend, sales: report.totals.results, roas: report.totals.roas })), evidence: media.length }, null, 2));
  if (!process.argv.includes("--apply")) return;

  const cover = await upload(token, media[0], media[0].bytes, "", BRAND_KEY);
  if (cover.url !== coverUrl) throw new Error("URL da capa diverge do manifesto validado");
  const applied = await postManifest(token, manifest, "apply");
  const offer = applied.applied?.find(item => item.kind === "brandsvalidated" && item.name === "Tryclover");
  if (!offer?.id) throw new Error("importação não retornou ID de Tryclover");
  const printResponses = [];
  for (const entry of media.slice(1)) printResponses.push(await upload(token, entry, entry.bytes, offer.id, BRAND_KEY));
  const patch = {
    bmReports: reports,
    bmPrints: media.slice(1).map((entry, index) => ({ nome: entry.name, periodKey: entry.periodKey, img: printResponses[index].ref })),
    brandTopAds: ADS.map((link, index) => ({ nome: `Tryclover · Anúncio ${index + 1}`, link, period: "2026-10", sourceDate: "05/10/2026" })),
    bmSpend7d: reports[1].totals.spend, bmSpend14d: reports[2].totals.spend, bmSpend30d: reports[3].totals.spend,
    bmRoas: reports[1].totals.roas, bmUpdatedAt: "05/10/2026",
    bmNotes: "BM Tryclover em USD recebida em 05/10/2026, com recortes de ontem, 7, 14 e 30 dias encerrados em 01/10/2026. Gasto e compras das três campanhas cobrem o total gasto mostrado; ROAS aproximado calculado do valor de compra somado, pois o Meta deixa o total em branco. Os períodos se sobrepõem; anúncios e conjuntos de 7 dias não são somados novamente. Dois prints da conta TEM ADS 01 em R$ não têm vínculo demonstrado com Tryclover e foram excluídos. Um print de 14 dias duplicado byte a byte também foi excluído. O anúncio em edição com erro de veiculação é evidência de configuração, não prova de anúncio ativo. Os 2.682 anúncios do Ads Manager não foram usados como contagem de anúncios ativos públicos.",
    offerTags: ["insider", "new", "scale"],
  };
  const updated = await responseJson(await fetch(`${BASE}/.netlify/functions/brands-cli-media`, {
    method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "x-brand-key": BRAND_KEY },
    body: JSON.stringify({ offerId: offer.id, patch }), signal: AbortSignal.timeout(60_000),
  }), "Atualização BM");
  if (updated.reports < 4 || updated.prints < 13 || updated.creatives < 3) throw new Error("verificação da BM ou dos criativos falhou");
  const checkCover = await fetch(coverUrl, { method: "HEAD", signal: AbortSignal.timeout(15_000) });
  if (!checkCover.ok) throw new Error(`capa pública indisponível (HTTP ${checkCover.status})`);
  console.log(JSON.stringify({ ok: true, offerId: offer.id, action: validation.plan[0].action, creativeCards: updated.creatives, newCreativeCards: applied.applied.filter(item => item.kind === "criativo").length, reports: updated.reports, prints: updated.prints, cover: coverUrl }, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch(error => { console.error(error.message); process.exitCode = 1; });
