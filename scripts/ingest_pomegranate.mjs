// Importação sem navegador dos dez anexos Pomegranate/Auniva recebidos em 05/10/2026.
// --validate não grava; --apply valida e só então publica.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { temporaryToken, postManifest, upload, responseJson } from "./ingest_sp_nutrition.mjs";

const BASE = "https://benchmarkinggrupofeg.site";
const SUPABASE = "https://pkvzwtstidtobpdngxnd.supabase.co";
const DATE = "2026-10-05";
const BRAND_KEY = "pomegranate";
const ADS = [
  "https://fb.me/adspreview/facebook/2bS4LcAOWAojzqT",
  "https://fb.me/adspreview/facebook/1Wn3KsVl17DR7ps",
  "https://fb.me/adspreview/facebook/2uBpK1jhZqk6Oib",
];
export const evidence = [
  { file: "codex-clipboard-5c92ec61-f6d4-426f-91e6-571b5a84473d.png", name: "Produto · Auniva Pomegranate Organic Extract", periodKey: "cover", cover: true },
  { file: "codex-clipboard-4a21de83-8008-4538-87bd-ec79718119a1.png", name: "Campanhas · 30 dias · 03/09 a 02/10/2026", periodKey: "30d" },
  { file: "codex-clipboard-5caf9800-1d55-4621-92ab-54755ab82908.png", name: "Anúncios · 7 dias · 26/09 a 02/10/2026", periodKey: "7d" },
  { file: "codex-clipboard-ec384bee-ff16-4f8d-9eb4-77ab7ffbff63.png", name: "Conjuntos · 7 dias · 26/09 a 02/10/2026", periodKey: "7d" },
  { file: "codex-clipboard-2a108406-cf5f-4b67-94a8-2bed504d51ef.png", name: "Campanhas · 14 dias · 19/09 a 02/10/2026", periodKey: "14d" },
  { file: "codex-clipboard-3b54dfd3-aa31-4484-9b33-5b408cb1becd.png", name: "Campanhas · 7 dias · 26/09 a 02/10/2026", periodKey: "7d" },
  { file: "codex-clipboard-1dc05758-884f-4101-85cd-38aea1442e47.png", name: "Configuração · conversão", periodKey: "settings" },
  { file: "codex-clipboard-8be52e02-307b-4ba1-8d77-dd7fa49004b7.png", name: "Configuração · público", periodKey: "settings" },
  { file: "codex-clipboard-e428146a-665f-4b3d-8984-23f4a9a76120.png", name: "Configuração · orçamento da campanha", periodKey: "settings" },
  { file: "codex-clipboard-2b77c51e-6bed-4f07-bbdd-e1e0611a8ac6.png", name: "Configuração · período de exibição", periodKey: "settings" },
];

const money = value => `US$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const samples = [
  { key: "7d", label: "Últimos 7 dias", range: "26/09/2026 a 02/10/2026", spend: 1034166.98, rows: [
    ["LFS CBO 2", 471877.53, 5836], ["Video CBO", 110971.07, 1413],
    ["LFS II CBO", 87760.84, 900], ["Video ABO", 84898.61, 1034],
    ["LFS CBO 2 - CC", 62054.18, 783],
  ] },
  { key: "14d", label: "Últimos 14 dias", range: "19/09/2026 a 02/10/2026", spend: 2132668.94, rows: [
    ["LFS CBO 2", 938640.04, 12381], ["Video CBO", 275717.33, 3444],
    ["LFS II CBO", 239996.98, 2521], ["Video ABO", 151933.10, 1906],
    ["LFS CBO 2 - CC", 88189.35, 1147],
  ] },
  { key: "30d", label: "Últimos 30 dias", range: "03/09/2026 a 02/10/2026", spend: 3192872.17, rows: [
    ["LFS CBO 2", 1019948.32, 13634], ["LFS II CBO", 674687.65, 7318],
    ["Video CBO", 534274.05, 6110], ["Video ABO", 205197.80, 2611],
    ["LFS II ABO", 158209.13, 1865],
  ] },
];
export const reports = samples.map(item => ({
  key: `${DATE}-${item.key}`, label: `Outubro 2026 · ${item.label}`, range: item.range,
  level: "Campanhas", currency: "USD", capturedAt: DATE,
  totals: {
    spend: money(item.spend),
    results: `≥ ${item.rows.reduce((sum, row) => sum + row[2], 0).toLocaleString("pt-BR")} compras · amostra de 5 campanhas`,
    roas: "Não informado",
    otherResults: "Gasto total da conta BM no período. Compras são somente a soma das cinco maiores campanhas de compra transcritas, não o total da conta. O Meta deixa ROAS e resultados consolidados em branco porque há campanhas com objetivos diferentes (Purchase POM, alcance e impressões). Não estimar ROAS nem atribuir estes dados apenas a uma página do produto. Períodos sobrepostos: não somar. Anúncios e conjuntos de 7 dias repetem o mesmo período.",
  },
  campaigns: item.rows.map(([name, spend, sales]) => ({ name, spend: money(spend), results: `${sales.toLocaleString("pt-BR")} Purchase POM`, roas: "Não informado" })),
}));

export const makeManifest = cover => ({ batchDate: DATE, items: [{
  kind: "brandsvalidated", name: "Pomegranate", brand: "Auniva", niche: "Saúde Geral/Nutrição",
  format: "Organic Pomegranate Extract · 60 cápsulas", image: cover,
  libraries: [{ name: "Auniva · página Facebook", url: "https://www.facebook.com/profile.php?id=61586352600860#" }],
  domains: [
    { name: "Pomegranate · página 11", offer: "https://auniva.co/products/pomegranate-11" },
    { name: "Pomegranate · página 89", offer: "https://auniva.co/products/pomegranate-89" },
  ],
  ads: ADS.map((url, index) => ({ name: `Anúncio ${index + 1}`, url, creativeName: `Auniva Pomegranate — Anúncio ${String(index + 1).padStart(2, "0")} — Outubro 2026`, platform: "meta" })),
}] });

async function main() {
  const root = process.env.POMEGRANATE_MEDIA_ROOT;
  if (!root) throw new Error("Defina POMEGRANATE_MEDIA_ROOT para a pasta dos dez anexos originais");
  const media = await Promise.all(evidence.map(async entry => {
    const bytes = await readFile(join(root, entry.file));
    if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || bytes.length > 4 * 1024 * 1024) throw new Error(`PNG inválido ou acima de 4 MB: ${entry.file}`);
    return { ...entry, bytes, hash: createHash("sha256").update(bytes).digest("hex") };
  }));
  const coverUrl = `${SUPABASE}/storage/v1/object/public/criativos/brands/${BRAND_KEY}/cover-${media[0].hash.slice(0, 20)}.png`;
  const manifest = makeManifest(coverUrl);
  const token = await temporaryToken();
  const validation = await postManifest(token, manifest, "validate");
  if (validation.plan?.length !== 1 || validation.plan[0]?.kind !== "brandsvalidated" || validation.plan[0]?.name !== "Pomegranate") throw new Error("plano de importação inesperado");
  console.log(JSON.stringify({ mode: "validate", plan: validation.plan, totals: validation.totals, reports: reports.map(report => ({ period: report.range, spend: report.totals.spend, sales: report.totals.results, roas: report.totals.roas })), evidence: media.length }, null, 2));
  if (!process.argv.includes("--apply")) return;

  const cover = await upload(token, media[0], media[0].bytes, "", BRAND_KEY);
  if (cover.url !== coverUrl) throw new Error("URL da capa diverge do manifesto validado");
  const applied = await postManifest(token, manifest, "apply");
  const offer = applied.applied?.find(item => item.kind === "brandsvalidated" && item.name === "Pomegranate");
  if (!offer?.id) throw new Error("importação não retornou ID de Pomegranate");
  const printResponses = [];
  for (const entry of media.slice(1)) printResponses.push(await upload(token, entry, entry.bytes, offer.id, BRAND_KEY));
  const patch = {
    bmReports: reports,
    bmPrints: media.slice(1).map((entry, index) => ({ nome: entry.name, periodKey: entry.periodKey, img: printResponses[index].ref })),
    brandTopAds: ADS.map((link, index) => ({ nome: `Auniva Pomegranate · Anúncio ${index + 1}`, link, period: "2026-10", sourceDate: "05/10/2026" })),
    bmSpend7d: reports[0].totals.spend, bmSpend14d: reports[1].totals.spend, bmSpend30d: reports[2].totals.spend,
    bmRoas: "Não informado", bmUpdatedAt: "05/10/2026",
    bmNotes: "BM AUN-POM-28 recebida em 05/10/2026; recortes de 7, 14 e 30 dias encerrados em 02/10/2026. O gasto é o total exibido da conta. O Meta não apresenta ROAS ou compras totais, pois as campanhas têm objetivos mistos, inclusive alcance e impressões. As compras nos relatórios são limites inferiores das cinco maiores campanhas de compra visíveis. Não confundir 11.809 anúncios na tela do Ads Manager com anúncios ativos da biblioteca pública. As telas de anúncios e conjuntos repetem o recorte de 7 dias e não foram adicionadas aos totais. Páginas e perfil do Facebook foram preservados como enviados pelo usuário, sem verificação externa de conteúdo.",
    offerTags: ["insider", "new", "scale"],
  };
  const updated = await responseJson(await fetch(`${BASE}/.netlify/functions/brands-cli-media`, {
    method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "x-brand-key": BRAND_KEY },
    body: JSON.stringify({ offerId: offer.id, patch }), signal: AbortSignal.timeout(60_000),
  }), "Atualização BM");
  if (updated.reports < 3 || updated.prints < 9 || updated.creatives < 3) throw new Error("verificação da BM ou dos criativos falhou");
  const checkCover = await fetch(coverUrl, { method: "HEAD", signal: AbortSignal.timeout(15_000) });
  if (!checkCover.ok) throw new Error(`capa pública indisponível (HTTP ${checkCover.status})`);
  console.log(JSON.stringify({ ok: true, offerId: offer.id, action: validation.plan[0].action, creativeCards: updated.creatives, newCreativeCards: applied.applied.filter(item => item.kind === "criativo").length, reports: updated.reports, prints: updated.prints, cover: coverUrl }, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch(error => { console.error(error.message); process.exitCode = 1; });
