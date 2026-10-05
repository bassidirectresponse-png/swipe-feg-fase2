// Importação dos 11 anexos Auniva AMLA recebidos em 05/10/2026.
// --validate não grava; --apply valida e só então publica.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { temporaryToken, postManifest, upload, responseJson } from "./ingest_sp_nutrition.mjs";

const BASE = "https://benchmarkinggrupofeg.site";
const SUPABASE = "https://pkvzwtstidtobpdngxnd.supabase.co";
const DATE = "2026-10-05";
const BRAND_KEY = "auniva-amla";
const ADS = [
  "https://fb.me/adspreview/facebook/yTb44R3m4NqXJDN",
  "https://fb.me/adspreview/facebook/1WjAskTKW1aSR7b",
  "https://fb.me/adspreview/facebook/qvYjaUqiMSuiCl5",
];
export const evidence = [
  { file: "codex-clipboard-dedd375e-b305-4c1d-af09-e34118943810.png", name: "Produto · Auniva AMLA Superfruit Extract", periodKey: "cover", cover: true },
  { file: "codex-clipboard-b5014273-8099-4cb7-b160-e0a7c7cac7f1.png", name: "Campanhas · ontem · 01/10/2026", periodKey: "1d" },
  { file: "codex-clipboard-83f28a09-ac47-4677-9777-0390382ab398.png", name: "Campanhas · 30 dias · 02/09 a 01/10/2026", periodKey: "30d" },
  { file: "codex-clipboard-ed62b671-4f39-4bc5-b241-0f1297c0e84c.png", name: "Anúncios · 7 dias · 25/09 a 01/10/2026", periodKey: "7d" },
  { file: "codex-clipboard-c06693fe-4230-41a9-8bd1-f58c427afeb0.png", name: "Campanhas · 14 dias · 18/09 a 01/10/2026", periodKey: "14d" },
  { file: "codex-clipboard-28922d2b-3074-4e30-85a2-6b79ee102be8.png", name: "Configuração · público", periodKey: "settings" },
  { file: "codex-clipboard-6cf3b841-1dc5-4b8f-af2b-d69d3cd7d1bf.png", name: "Configuração · orçamento da campanha", periodKey: "settings" },
  { file: "codex-clipboard-72eea63a-23d1-4069-9d2f-b5d3c8e992c8.png", name: "Configuração · conversão", periodKey: "settings" },
  { file: "codex-clipboard-3b1ab0dd-8818-4e1f-ac0b-38e7cd63be03.png", name: "Configuração · período de exibição", periodKey: "settings" },
  { file: "codex-clipboard-cafc5a59-1244-4160-8388-203c04e6cb53.png", name: "Campanhas · 7 dias · 25/09 a 01/10/2026", periodKey: "7d" },
  { file: "codex-clipboard-bec32348-1e0b-42fa-bb29-08cc2c0e99a9.png", name: "Conjuntos · 7 dias · 25/09 a 01/10/2026", periodKey: "7d" },
];

const money = value => `US$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const periods = [
  { key: "1d", label: "Ontem", range: "01/10/2026", spend: 11809.10 },
  { key: "7d", label: "Últimos 7 dias", range: "25/09/2026 a 01/10/2026", spend: 244470.57 },
  { key: "14d", label: "Últimos 14 dias", range: "18/09/2026 a 01/10/2026", spend: 629357.27 },
  { key: "30d", label: "Últimos 30 dias", range: "02/09/2026 a 01/10/2026", spend: 1589837.19 },
];
export const reports = periods.map(period => ({
  key: `${DATE}-${period.key}`, label: `Outubro 2026 · ${period.label}`, range: period.range,
  level: "Campanhas", currency: "USD", capturedAt: DATE,
  totals: {
    spend: money(period.spend), results: "Múltiplas conversões · total de compras não informado", roas: "Não informado",
    otherResults: "Gasto total exibido da conta BM AUN-AML-8, não exclusivo do produto AMLA. A linha consolidada do Meta deixa compras e ROAS em branco por reunir campanhas com objetivos diferentes. Períodos se sobrepõem e não devem ser somados. Telas de anúncios e conjuntos de 7 dias documentam o mesmo recorte, sem gasto adicional.",
  },
  campaigns: [],
}));

export const makeManifest = cover => ({ batchDate: DATE, items: [{
  kind: "brandsvalidated", name: "AMLA", brand: "Auniva", niche: "Saúde Cardiovascular",
  format: "Amla Superfruit Extract · 60 cápsulas", image: cover,
  domains: [{ name: "AMLA · página do produto", offer: "https://auniva.co/products/amla-74" }],
  ads: ADS.map((url, index) => ({ name: `Anúncio ${index + 1}`, url, creativeName: `Auniva AMLA — Anúncio ${String(index + 1).padStart(2, "0")} — Outubro 2026`, platform: "meta" })),
}] });

async function main() {
  const root = process.env.AUNIVA_AMLA_MEDIA_ROOT;
  if (!root) throw new Error("Defina AUNIVA_AMLA_MEDIA_ROOT para a pasta dos 11 anexos originais");
  const media = await Promise.all(evidence.map(async entry => {
    const bytes = await readFile(join(root, entry.file));
    if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || bytes.length > 4 * 1024 * 1024) throw new Error(`PNG inválido ou acima de 4 MB: ${entry.file}`);
    return { ...entry, bytes, hash: createHash("sha256").update(bytes).digest("hex") };
  }));
  const coverUrl = `${SUPABASE}/storage/v1/object/public/criativos/brands/${BRAND_KEY}/cover-${media[0].hash.slice(0, 20)}.png`;
  const manifest = makeManifest(coverUrl);
  const token = await temporaryToken();
  const validation = await postManifest(token, manifest, "validate");
  if (validation.plan?.length !== 1 || validation.plan[0]?.kind !== "brandsvalidated" || validation.plan[0]?.name !== "AMLA") throw new Error("plano de importação inesperado");
  console.log(JSON.stringify({ mode: "validate", plan: validation.plan, totals: validation.totals, reports: reports.map(report => ({ period: report.range, spend: report.totals.spend, roas: report.totals.roas })), evidence: media.length }, null, 2));
  if (!process.argv.includes("--apply")) return;

  const cover = await upload(token, media[0], media[0].bytes, "", BRAND_KEY);
  if (cover.url !== coverUrl) throw new Error("URL da capa diverge do manifesto validado");
  const applied = await postManifest(token, manifest, "apply");
  const offer = applied.applied?.find(item => item.kind === "brandsvalidated" && item.name === "AMLA");
  if (!offer?.id) throw new Error("importação não retornou ID de AMLA");
  const printResponses = [];
  for (const entry of media.slice(1)) printResponses.push(await upload(token, entry, entry.bytes, offer.id, BRAND_KEY));
  const patch = {
    bmReports: reports,
    bmPrints: media.slice(1).map((entry, index) => ({ nome: entry.name, periodKey: entry.periodKey, img: printResponses[index].ref })),
    brandTopAds: ADS.map((link, index) => ({ nome: `Auniva AMLA · Anúncio ${index + 1}`, link, period: "2026-10", sourceDate: "05/10/2026" })),
    bmSpend7d: reports[1].totals.spend, bmSpend14d: reports[2].totals.spend, bmSpend30d: reports[3].totals.spend,
    bmRoas: "Não informado", bmUpdatedAt: "05/10/2026",
    bmNotes: "BM AUN-AML-8 recebida em 05/10/2026; recortes de ontem, 7, 14 e 30 dias encerrados em 01/10/2026. Os gastos são totais da conta e não podem ser atribuídos somente ao AMLA. ROAS e compras consolidadas não constam das linhas totais, pois há múltiplas conversões e campanhas de alcance/impressões. As telas de anúncios e conjuntos repetem o recorte de 7 dias. 12.820 anúncios mostrados no gerenciador não equivalem a anúncios ativos da biblioteca pública. Não foi fornecida uma biblioteca Meta; os três previews foram preservados como enviados.",
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
