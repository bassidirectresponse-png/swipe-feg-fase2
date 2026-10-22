// Importação dos 11 anexos Rootvana Pulse Flow recebidos em 21/10/2026.
// --validate não grava; --apply valida e publica capa, oferta, 10 prints BM e 4 períodos.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { temporaryToken, postManifest, upload, responseJson } from "./ingest_sp_nutrition.mjs";

const BASE = "https://benchmarkinggrupofeg.site";
const SUPABASE = "https://pkvzwtstidtobpdngxnd.supabase.co";
const DATE = "2026-10-20";
const BRAND_KEY = "rootvana-pulse-flow";
const LIBRARY = "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&is_targeted_country=false&media_type=all&q=tryrootvana.com&search_type=keyword_unordered&sort_data[direction]=desc&sort_data[mode]=total_impressions";
const PAGE = "https://tryrootvana.com/pages/listicle-2";
const ADS = [
  "https://fb.me/adspreview/facebook/1UeM1RO1dqbK6ai",
  "https://fb.me/adspreview/facebook/24RB2z5S7LOwlyd",
  "https://fb.me/adspreview/facebook/1UkcmNa0tUQkJcQ",
];

export const evidence = [
  { file: "cover-rootvana-pulse-flow.png", name: "Produto · Rootvana Pulse Flow", periodKey: "cover", cover: true },
  { file: "media_1792629731055_44f0b5dd.png", name: "Campanhas · ontem · 20/10/2026", periodKey: "1d" },
  { file: "media_1792629634945_b3e0cf9c.png", name: "Campanhas · 7 dias · 14/10 a 20/10/2026", periodKey: "7d" },
  { file: "media_1792629617759_265322f9.png", name: "Anúncios · 7 dias · 14/10 a 20/10/2026", periodKey: "7d" },
  { file: "media_1792629629364_01436546.png", name: "Campanhas · 14 dias · 07/10 a 20/10/2026", periodKey: "14d" },
  { file: "media_1792629624290_4300ec5b.png", name: "Campanhas · 30 dias · 21/09 a 20/10/2026", periodKey: "30d" },
  { file: "media_1792629717149_930c9bc6.png", name: "Configuração · orçamento da campanha ($280/dia CBO)", periodKey: "settings" },
  { file: "media_1792629721983_3d25ea72.png", name: "Configuração · atribuição (7d click, 1d view)", periodKey: "settings" },
  { file: "media_1792629726500_d970568c.png", name: "Configuração · conversão e pixel (Rootvana · Purchase)", periodKey: "settings" },
  { file: "media_1792629735922_461f4501.png", name: "Configuração · programação e início", periodKey: "settings" },
  { file: "media_1792629754962_2b730571.png", name: "Configuração · público e localização (United States · 18+)", periodKey: "settings" },
];

const money = value => `US$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const decimal = value => value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = value => `${decimal(value)}%`;

const samples = [
  {
    key: "1d", label: "Ontem", range: "20/10/2026",
    spend: 451.87, roas: 1.14, aov: 64.19, ctr: 2.47, cpm: 77.11, cpcLink: 3.12, sales: 8,
    rows: [
      ["PULSE FLOW US", 271.19, 5, 1.22, 65.94, 2.85, 92.05, 3.23],
      ["PULSE FLOW BIG 4", 180.68, 3, 1.02, 61.27, 2.09, 62.00, 2.96],
    ],
  },
  {
    key: "7d", label: "Últimos 7 dias", range: "14/10/2026 a 20/10/2026",
    spend: 3284.91, roas: 0.75, aov: 65.21, ctr: 2.40, cpm: 83.20, cpcLink: 3.47, sales: 38,
    rows: [
      ["PULSE FLOW US", 2227.94, 24, 0.74, 69.11, 2.43, 97.37, 4.01],
      ["PULSE FLOW BIG 4", 1056.97, 14, 0.77, 58.50, 2.36, 63.68, 2.70],
    ],
  },
  {
    key: "14d", label: "Últimos 14 dias", range: "07/10/2026 a 20/10/2026",
    spend: 7106.86, roas: 0.62, aov: 66.46, ctr: 3.24, cpm: 11.38, cpcLink: 0.35, sales: 66,
    rows: [
      ["PULSE FLOW US", 4811.68, 39, 0.56, 68.80, 2.30, 92.55, 4.02],
      ["PULSE FLOW BIG 4", 1650.47, 25, 0.95, 62.99, 2.32, 57.98, 2.50],
      ["PULSE FLOW ww", 644.71, 2, 0.20, 64.17, 3.38, 1.18, 0.04],
    ],
  },
  {
    key: "30d", label: "Últimos 30 dias", range: "21/09/2026 a 20/10/2026",
    spend: 12635.42, roas: 0.71, aov: 76.18, ctr: 2.87, cpm: 10.10, cpcLink: 0.35, sales: 118,
    rows: [
      ["PULSE FLOW US", 6560.47, 61, 0.64, 69.29, 2.20, 82.08, 3.73],
      ["PULSE FLOW BIG 4", 2886.44, 33, 0.72, 63.39, 2.25, 48.87, 2.18],
      ["PULSE FLOW ww", 1535.35, 10, 0.52, 80.36, 2.97, 1.46, 0.05],
      ["NAC CBO WW", 869.29, 14, 2.15, 133.31, 2.67, 18.27, 0.68],
      ["Spanish static 21/9/26", 704.43, 0, null, null, 2.28, 79.49, 3.49],
      ["l carnitine ww cbo", 72.74, 0, null, null, 2.71, 61.59, 2.27],
      ["NAC CBO US", 6.70, 0, null, null, 2.17, 145.65, 6.70],
    ],
  },
];

export const reports = samples.map(item => {
  const rowSpend = item.rows.reduce((sum, row) => sum + row[1], 0);
  const rowSales = item.rows.reduce((sum, row) => sum + row[2], 0);
  if (Math.abs(rowSpend - item.spend) > 0.01 || rowSales !== item.sales) {
    throw new Error(`transcrição inconsistente: ${item.key}`);
  }
  return {
    key: `${DATE}-${item.key}`,
    label: `Outubro 2026 · ${item.label}`,
    range: item.range,
    level: "Campanhas",
    currency: "USD",
    capturedAt: DATE,
    totals: {
      spend: money(item.spend),
      roas: decimal(item.roas),
      results: `${item.sales.toLocaleString("pt-BR")} compras`,
      costResult: `≈ ${money(item.spend / item.sales)}`,
      avgConversion: money(item.aov),
      cpm: money(item.cpm),
      ctr: pct(item.ctr),
      cpcLink: money(item.cpcLink),
      otherResults: "Totais consolidados diretamente da linha 'Results from 8 campaigns' do Ads Manager em USD. O recorte de 30 dias inclui campanhas secundárias da conta Rootvana (NAC CBO WW, Spanish static e L-Carnitine); nos recortes de ontem, 7 e 14 dias 100% do gasto pertence às campanhas PULSE FLOW. Períodos se sobrepõem e não devem ser somados. O print de anúncios de 7 dias (485 ads, US$ 3.117,64, 37 compras) documenta o mesmo período das campanhas de 7 dias.",
    },
    metricSources: {
      spend: "Total da BM",
      roas: "Total da BM",
      costResult: "CPA calculado pelo gasto e compras totais da BM",
      avgConversion: "Total da BM (Purchases conversion value · Average)",
      cpm: "Total da BM",
      ctr: "Total da BM (CTR link click-through rate)",
      cpcLink: "Total da BM (CPC cost per link click)",
    },
    campaigns: item.rows.map(([name, spend, sales, roas, aov, ctr, cpm, cpcLink]) => ({
      name,
      spend: money(spend),
      results: sales > 0 ? `${sales.toLocaleString("pt-BR")} compras` : "—",
      roas: roas != null ? decimal(roas) : "—",
      costResult: sales > 0 ? `≈ ${money(spend / sales)}` : "—",
      avgConversion: aov != null ? money(aov) : "—",
      ctr: ctr != null ? pct(ctr) : "—",
      cpm: cpm != null ? money(cpm) : "—",
      cpcLink: cpcLink != null ? money(cpcLink) : "—",
    })),
  };
});

export const makeManifest = cover => ({
  batchDate: DATE,
  items: [{
    kind: "brandsvalidated",
    name: "Pulse Flow",
    brand: "Rootvana",
    niche: "SUPPLEMENTS",
    format: "Supports Healthy Blood Flow & Vitality · 60 Capsules",
    image: cover,
    offerTags: ["insider", "new", "scale"],
    createCreativeCards: false,
    libraries: [{ name: "Funil Winner", url: LIBRARY }],
    domains: [{ name: "Listicle 2 · Pulse Flow", offer: PAGE }],
    ads: ADS.map((url, index) => ({
      name: `Pulse Flow · Anúncio ${index + 1}`,
      url,
      creativeName: `Rootvana Pulse Flow — Anúncio ${String(index + 1).padStart(2, "0")} — Outubro 2026`,
      platform: "meta",
    })),
  }],
});

async function main() {
  const root = process.env.ROOTVANA_MEDIA_ROOT;
  if (!root) throw new Error("Defina ROOTVANA_MEDIA_ROOT para a pasta dos 11 anexos originais");
  const media = await Promise.all(evidence.map(async entry => {
    const bytes = await readFile(join(root, entry.file));
    if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || bytes.length > 4 * 1024 * 1024) {
      throw new Error(`PNG inválido ou acima de 4 MB: ${entry.file}`);
    }
    return { ...entry, bytes, hash: createHash("sha256").update(bytes).digest("hex") };
  }));
  if (new Set(media.map(entry => entry.hash)).size !== media.length) {
    throw new Error("há print duplicado no lote Rootvana Pulse Flow");
  }
  const coverUrl = `${SUPABASE}/storage/v1/object/public/criativos/brands/${BRAND_KEY}/cover-${media[0].hash.slice(0, 20)}.png`;
  const manifest = makeManifest(coverUrl);
  const token = await temporaryToken();
  const validation = await postManifest(token, manifest, "validate");
  if (validation.plan?.length !== 1 || validation.plan[0]?.kind !== "brandsvalidated" || validation.plan[0]?.name !== "Pulse Flow") {
    throw new Error("plano de importação inesperado");
  }
  console.log(JSON.stringify({
    mode: "validate",
    plan: validation.plan,
    totals: validation.totals,
    reports: reports.map(report => ({
      period: report.range,
      spend: report.totals.spend,
      sales: report.totals.results,
      roas: report.totals.roas,
      cpa: report.totals.costResult,
      aov: report.totals.avgConversion,
    })),
    evidence: media.length,
  }, null, 2));
  if (!process.argv.includes("--apply")) return;

  const cover = await upload(token, media[0], media[0].bytes, "", BRAND_KEY);
  if (cover.url !== coverUrl) throw new Error("URL da capa diverge do manifesto validado");
  const applied = await postManifest(token, manifest, "apply");
  const offer = applied.applied?.find(item => item.kind === "brandsvalidated" && item.name === "Pulse Flow");
  if (!offer?.id) throw new Error("importação não retornou ID de Pulse Flow");
  const printResponses = [];
  for (const entry of media.slice(1)) printResponses.push(await upload(token, entry, entry.bytes, offer.id, BRAND_KEY));
  const patch = {
    bmReports: reports,
    bmPrints: media.slice(1).map((entry, index) => ({ nome: entry.name, periodKey: entry.periodKey, img: printResponses[index].ref })),
    brandTopAds: ADS.map((link, index) => ({ nome: `Rootvana Pulse Flow · Anúncio ${index + 1}`, link, period: "2026-10", sourceDate: "20/10/2026" })),
    bmSpend7d: reports[1].totals.spend,
    bmSpend14d: reports[2].totals.spend,
    bmSpend30d: reports[3].totals.spend,
    bmRoas: reports[1].totals.roas,
    bmUpdatedAt: "20/10/2026",
    bmNotes: "BM Rootvana em USD recebida em 21/10/2026, com recortes de ontem (20/10/2026), 7, 14 e 30 dias encerrados em 20/10/2026. Todos os indicadores (Gasto, ROAS, CPA, AOV, CPM, CTR link e CPC link) constam na linha consolidada 'Results from 8 campaigns'. Nos recortes de 1, 7 e 14 dias 100% do gasto está nas campanhas PULSE FLOW (US, BIG 4 e WW); no recorte de 30 dias há também gasto residual em NAC CBO WW, Spanish static e L-Carnitine. O print de anúncios de 7 dias (485 anúncios, US$ 3.117,64, ROAS 0,77, 37 compras, destacando LISTICLE 2 #1 e #2) documenta o mesmo período e não é somado novamente. Configuração validada: CBO US$ 280/dia (Highest volume), pixel/dataset Rootvana (Purchase, 7d click / 1d view), Advantage+ audience Estados Unidos 18+.",
    offerTags: ["insider", "new", "scale"],
  };
  const updated = await responseJson(await fetch(`${BASE}/.netlify/functions/brands-cli-media`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "x-brand-key": BRAND_KEY },
    body: JSON.stringify({ offerId: offer.id, patch }),
    signal: AbortSignal.timeout(60_000),
  }), "Atualização BM");
  if (updated.reports < 4 || updated.prints < 10 || updated.creatives < 3) throw new Error("verificação da BM ou dos criativos falhou");
  const checkCover = await fetch(coverUrl, { method: "HEAD", signal: AbortSignal.timeout(15_000) });
  if (!checkCover.ok) throw new Error(`capa pública indisponível (HTTP ${checkCover.status})`);
  console.log(JSON.stringify({
    ok: true,
    offerId: offer.id,
    action: validation.plan[0].action,
    creativeCards: updated.creatives,
    newCreativeCards: applied.applied.filter(item => item.kind === "criativo").length,
    reports: updated.reports,
    prints: updated.prints,
    cover: coverUrl,
  }, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
