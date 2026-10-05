// Importação sem navegador dos 12 anexos da SP Nutrition recebidos em 05/10/2026.
// --validate não grava nada; --apply valida primeiro e só então publica.
import { createDecipheriv, createHash, generateKeyPairSync, privateDecrypt, constants, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://benchmarkinggrupofeg.site";
const SUPABASE = "https://pkvzwtstidtobpdngxnd.supabase.co";
const DATE = "2026-10-05";
const LIBRARY = "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&is_targeted_country=false&media_type=all&search_type=page&sort_data[mode]=total_impressions&sort_data[direction]=desc&view_all_page_id=100168256385357";
const PAGE = "https://spnutrition-us.com/pages/advertorial-magnesium";
const ADS = [
  "https://fb.me/adspreview/facebook/269owN9fu7Ncpt7",
  "https://fb.me/adspreview/facebook/22SvRAthkpa2nJh",
  "https://fb.me/adspreview/facebook/2bvx0qzp5D3VmOJ",
];
export const evidence = [
  { file: "codex-clipboard-708ce447-4983-4845-b964-0e3f482f0fbc.png", name: "Produto · Magnesium Bisglycinate Gummies", periodKey: "cover", cover: true },
  { file: "codex-clipboard-aec96ef7-b6cd-40f2-b9b0-e80cbe2fee36.png", name: "Campanhas · 7 dias · 27/09 a 03/10/2026", periodKey: "7d" },
  { file: "codex-clipboard-566b9f36-4520-4ea8-9047-7d5b61adb1dc.png", name: "Campanhas · ontem · 03/10/2026", periodKey: "1d" },
  { file: "codex-clipboard-51514dca-cf96-4e47-ae05-acefe976c607.png", name: "Campanhas · 14 dias · 20/09 a 03/10/2026", periodKey: "14d" },
  { file: "codex-clipboard-cdbbb909-0a77-467c-b921-0de97ce6f92b.png", name: "Conjuntos · 7 dias · 27/09 a 03/10/2026", periodKey: "7d" },
  { file: "codex-clipboard-a38062bb-da0e-4cb0-985f-f87a73c5aef3.png", name: "Campanhas · 30 dias · 04/09 a 03/10/2026", periodKey: "30d" },
  { file: "codex-clipboard-a2f7634c-e8b4-4568-a97d-2b660708d271.png", name: "Anúncios · 7 dias · 27/09 a 03/10/2026", periodKey: "7d" },
  { file: "codex-clipboard-58d01979-0822-476c-9019-247a271bab99.png", name: "Configuração · orçamento da campanha", periodKey: "settings" },
  { file: "codex-clipboard-5ce96760-3da2-498e-a33d-9bbfa2206b39.png", name: "Configuração · conversão", periodKey: "settings" },
  { file: "codex-clipboard-fed38197-e98f-4ea7-ad4d-1665ee14972e.png", name: "Configuração · atribuição", periodKey: "settings" },
  { file: "codex-clipboard-666ad18e-6648-41ab-81b5-39d4663b952a.png", name: "Configuração · período de exibição", periodKey: "settings" },
  { file: "codex-clipboard-8244be60-f396-4ae8-a7d3-a3ffe453c6e7.png", name: "Configuração · público", periodKey: "settings" },
];

// A linha de total exibe gasto, mas deixa vendas/ROAS em branco devido a
// múltiplas conversões. Os 16 resultados visíveis são um limite inferior;
// o ROAS abaixo é ponderado APENAS pelas cinco maiores campanhas legíveis.
const samples = [
  { key: "1d", label: "Ontem", range: "03/10/2026", spend: 172980.30, visibleSales: 2269, rows: [
    ["CBO · Highest Volume", 27240.05, 350, 0.99], ["CBO · BOF Product Page", 20060.70, 500, 1.97],
    ["CBO · Advertorial", 27091.89, 281, 0.82], ["CBO · Videos Revive", 10902.02, 153, 1.07],
    ["CBO · Videos Non Spenders", 11827.07, 177, 1.15],
  ] },
  { key: "7d", label: "Últimos 7 dias", range: "27/09/2026 a 03/10/2026", spend: 1199382.55, visibleSales: 15058, rows: [
    ["CBO · Highest Volume", 191625.66, 2197, 0.90], ["CBO · BOF Product Page", 142074.99, 3428, 1.90],
    ["CBO · Videos Revive", 99516.60, 1237, 0.93], ["CBO · Advertorial", 103409.60, 1132, 0.87],
    ["CBO · Videos Non Spenders", 74195.99, 1040, 1.08],
  ] },
  { key: "14d", label: "Últimos 14 dias", range: "20/09/2026 a 03/10/2026", spend: 2384551.80, visibleSales: 30115, rows: [
    ["CBO · Highest Volume", 379678.78, 4451, 0.91], ["CBO · BOF Product Page", 274958.27, 6676, 1.87],
    ["CBO · Videos Revive", 218669.34, 2725, 0.93], ["CBO · Advertorial", 200161.36, 2436, 0.94],
    ["CBO · Videos Non Spenders", 128588.63, 1782, 1.06],
  ] },
  { key: "30d", label: "Últimos 30 dias", range: "04/09/2026 a 03/10/2026", spend: 4718302.21, visibleSales: 60455, rows: [
    ["CBO · Highest Volume", 667197.38, 9318, 1.05], ["CBO · BOF Product Page", 531927.55, 12592, 1.78],
    ["CBO · Videos Revive", 481520.36, 6316, 0.94], ["CBO · Advertorial", 414492.01, 5687, 1.02],
    ["CBO · Videos UK/AU/CA", 216253.59, 3152, 0.96],
  ] },
];
const money = n => `US$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const decimal = n => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const reports = samples.map(item => {
  const sampleSpend = item.rows.reduce((sum, row) => sum + row[1], 0);
  const roas = item.rows.reduce((sum, row) => sum + row[1] * row[3], 0) / sampleSpend;
  return {
    key: `${DATE}-${item.key}`, label: `Outubro 2026 · ${item.label}`, range: item.range,
    level: "Campanhas", currency: "USD", capturedAt: DATE,
    totals: {
      spend: money(item.spend), results: `≥ ${item.visibleSales.toLocaleString("pt-BR")} compras · parcial`,
      roas: `≈ ${decimal(roas)} · amostra parcial`,
      otherResults: "Gasto total da conta BM. Compras: soma das 16 campanhas visíveis no print, não o total de 178 campanhas. ROAS: média ponderada por gasto das 5 maiores campanhas visíveis, não ROAS consolidado. A conta inclui outros produtos; não atribuir estes números exclusivamente ao magnésio. Períodos sobrepostos: não somar.",
    },
    campaigns: item.rows.map(([name, spend, sales, ratio]) => ({ name, spend: money(spend), results: `${sales.toLocaleString("pt-BR")} compras`, roas: decimal(ratio) })),
  };
});

export const makeManifest = cover => ({ batchDate: DATE, items: [{
  kind: "brandsvalidated", name: "SP Nutrition", brand: "SP Nutrition", niche: "Saúde e Suplemento",
  format: "Magnesium Bisglycinate Gummies", image: cover,
  libraries: [{ name: "SP Nutrition · Meta Ads Library", url: LIBRARY }],
  domains: [{ name: "Advertorial · Magnesium", offer: PAGE }],
  ads: ADS.map((url, index) => ({ name: `Anúncio ${index + 1}`, url, creativeName: `SP Nutrition — Anúncio ${String(index + 1).padStart(2, "0")} — Outubro 2026`, platform: "meta" })),
}] });

function ghEnv() {
  if (process.env.GH_TOKEN || process.env.GITHUB_TOKEN) return { ...process.env, GH_TOKEN: process.env.GH_TOKEN || process.env.GITHUB_TOKEN };
  const raw = execFileSync("git", ["credential", "fill"], { input: "protocol=https\nhost=github.com\n\n", encoding: "utf8", timeout: 12_000 });
  const token = raw.match(/^password=(.+)$/m)?.[1];
  if (!token) throw new Error("credencial GitHub indisponível no chaveiro; não foi possível iniciar a automação sem navegador");
  return { ...process.env, GH_TOKEN: token };
}
const gh = (env, args) => execFileSync("gh", args, { env, encoding: "utf8", timeout: 30_000, maxBuffer: 3 * 1024 * 1024 });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function temporaryToken() {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 3072 });
  const publicPem = publicKey.export({ format: "pem", type: "spki" });
  const requestId = randomUUID();
  const env = ghEnv();
  gh(env, ["workflow", "run", "brands-cli-token.yml", "--ref", "main", "-f", `request_id=${requestId}`, "-f", `public_key=${Buffer.from(publicPem).toString("base64")}`]);
  let runId = null;
  const deadline = Date.now() + 150_000;
  while (Date.now() < deadline) {
    const runs = JSON.parse(gh(env, ["run", "list", "-w", "brands-cli-token.yml", "-L", "20", "--json", "databaseId,displayTitle,status,conclusion"]));
    const run = runs.find(row => String(row.displayTitle || "").includes(requestId));
    if (run) {
      runId = run.databaseId;
      if (run.status === "completed") {
        if (run.conclusion !== "success") throw new Error(`emissão de sessão falhou: execução GitHub ${runId}`);
        break;
      }
    }
    await pause(3000);
  }
  if (!runId) throw new Error("execução GitHub para sessão temporária não apareceu");
  const log = gh(env, ["run", "view", String(runId), "--log"]);
  const encoded = log.match(/TOKEN_ENVELOPE=(\{[^\r\n]+\})/)?.[1];
  if (!encoded) throw new Error("sessão cifrada não encontrada no log da execução");
  const envelope = JSON.parse(encoded);
  const key = privateDecrypt({ key: privateKey, oaepHash: "sha256", padding: constants.RSA_PKCS1_OAEP_PADDING }, Buffer.from(envelope.key, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.iv, "base64"));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(envelope.data, "base64")), decipher.final()]).toString("utf8");
}

export async function responseJson(response, label) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) throw new Error(`${label}: HTTP ${response.status} ${String(data.error || data.errors?.join("; ") || "").slice(0, 180)}`);
  return data;
}
export async function postManifest(token, manifest, mode) {
  return responseJson(await fetch(`${BASE}/.netlify/functions/manual-ingest-n8n`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...manifest, mode }), signal: AbortSignal.timeout(60_000),
  }), `Manifesto ${mode}`);
}
export async function upload(token, entry, bytes, offerId = "", brandKey = "sp-nutrition") {
  const data = await responseJson(await fetch(`${BASE}/.netlify/functions/brands-cli-media`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "image/png", "x-media-role": entry.cover ? "cover" : "bm", "x-offer-id": offerId, "x-brand-key": brandKey },
    body: bytes, signal: AbortSignal.timeout(60_000),
  }), `Upload ${entry.name}`);
  return data;
}
async function main() {
  const root = process.env.SP_NUTRITION_MEDIA_ROOT;
  if (!root) throw new Error("Defina SP_NUTRITION_MEDIA_ROOT para a pasta dos 12 anexos originais");
  const media = await Promise.all(evidence.map(async entry => {
    const bytes = await readFile(join(root, entry.file));
    if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || bytes.length > 4 * 1024 * 1024) throw new Error(`PNG inválido ou acima de 4 MB: ${entry.file}`);
    return { ...entry, bytes, hash: createHash("sha256").update(bytes).digest("hex") };
  }));
  const coverUrl = `${SUPABASE}/storage/v1/object/public/criativos/brands/sp-nutrition/cover-${media[0].hash.slice(0, 20)}.png`;
  const manifest = makeManifest(coverUrl);
  let token = await temporaryToken();
  const validation = await postManifest(token, manifest, "validate");
  if (validation.plan?.length !== 1 || validation.plan[0]?.kind !== "brandsvalidated" || validation.plan[0]?.name !== "SP Nutrition") throw new Error("plano de importação inesperado");
  console.log(JSON.stringify({ mode: "validate", plan: validation.plan, totals: validation.totals, reports: reports.map(report => ({ period: report.range, spend: report.totals.spend, sales: report.totals.results, roas: report.totals.roas })), evidence: media.length }, null, 2));
  if (!process.argv.includes("--apply")) return;

  const cover = await upload(token, media[0], media[0].bytes);
  if (cover.url !== coverUrl) throw new Error("URL da capa diverge do manifesto validado");
  const applied = await postManifest(token, manifest, "apply");
  const offer = applied.applied?.find(item => item.kind === "brandsvalidated" && item.name === "SP Nutrition");
  if (!offer?.id) throw new Error("importação não retornou ID da SP Nutrition");
  const printResponses = [];
  for (const entry of media.slice(1)) printResponses.push(await upload(token, entry, entry.bytes, offer.id));
  const patch = {
    bmReports: reports,
    bmPrints: media.slice(1).map((entry, index) => ({ nome: entry.name, periodKey: entry.periodKey, img: printResponses[index].ref })),
    brandTopAds: ADS.map((link, index) => ({ nome: `SP Nutrition · Anúncio ${index + 1}`, link, period: "2026-10", sourceDate: "05/10/2026" })),
    bmSpend7d: reports[1].totals.spend, bmSpend14d: reports[2].totals.spend, bmSpend30d: reports[3].totals.spend,
    bmRoas: reports[1].totals.roas, bmUpdatedAt: "05/10/2026",
    bmNotes: "Leitura da conta BM SPNutrition recebida em 05/10/2026. Os prints cobrem ontem, 7, 14 e 30 dias encerrados em 03/10/2026. A conta possui 178 campanhas e múltiplos produtos; o total de vendas e o ROAS consolidado não estão visíveis. Vendas exibidas são o mínimo das 16 linhas legíveis; ROAS estimado apenas nas cinco maiores campanhas visíveis, ponderado pelo gasto. Não atribuir números exclusivamente ao Magnesium Bisglycinate Gummies. Períodos se sobrepõem e não devem ser somados. A tela de conjuntos e a de anúncios repetem o período de 7 dias e não foram adicionadas aos totais.",
    offerTags: ["insider", "new", "scale"],
  };
  const updated = await responseJson(await fetch(`${BASE}/.netlify/functions/brands-cli-media`, {
    method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ offerId: offer.id, patch }), signal: AbortSignal.timeout(60_000),
  }), "Atualização BM");
  if (updated.reports < 4 || updated.prints < 11 || updated.creatives < 3) throw new Error("verificação da BM ou dos criativos falhou");
  const checkCover = await fetch(coverUrl, { method: "HEAD", signal: AbortSignal.timeout(15_000) });
  if (!checkCover.ok) throw new Error(`capa pública indisponível (HTTP ${checkCover.status})`);
  console.log(JSON.stringify({ ok: true, offerId: offer.id, action: validation.plan[0].action, creativeCards: updated.creatives, newCreativeCards: applied.applied.filter(item => item.kind === "criativo").length, reports: updated.reports, prints: updated.prints, cover: coverUrl }, null, 2));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch(error => { console.error(error.message); process.exitCode = 1; });
