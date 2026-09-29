import { readFile } from "node:fs/promises";
import { authHeaders, productionAdminAuth } from "./_supabase-auth.mjs";

const ROOT = new URL("../", import.meta.url);
const COVER = "/var/folders/sh/5tg1710n2qn04l30nnc8plxm0000gn/T/codex-clipboard-5e4ecf0d-5b25-4b67-9645-ec2d9e5df3c9.png";
const MONEY = value => value ? `US$ ${value}` : "";
const fields = ["name", "spend", "roas", "avgConversion", "costResult", "results", "ctr", "cpc", "cpm", "cpcLink", "costUnique"];
const campaigns = rows => rows.map(row => Object.fromEntries(fields.map((field, index) => {
  const value = row[index] || "";
  return [field, index === 0 || field === "roas" || field === "results" || field === "ctr" ? value : MONEY(value)];
})));
const totals = (spend, avgConversion, ctr, cpc, cpm, extras = {}) => ({
  spend: MONEY(spend), roas: "—", avgConversion: MONEY(avgConversion), costResult: "—", results: "—", ctr, cpc: MONEY(cpc), cpm: MONEY(cpm), ...extras,
});
const report = (key, label, range, total, rows) => ({ key, label, range, level: "Campanhas", currency: "USD", capturedAt: "2026-09-18", totals: total, campaigns: campaigns(rows) });

const reports = [
  report("2026-09-18-1d", "Setembro 2026 · Ontem", "18/09/2026", totals("1.132,04", "108,76", "2,06%", "2,21", "45,55"), [
    ["19/08/26 | BnB | BR-CBO | CA01", "300,25", "1,41", "106,12", "75,06", "4 compras", "1,30%", "2,42", "31,57"],
    ["04/08/26 | BnB | BS-CBO | CA01", "288,84", "1,16", "111,33", "96,28", "3 compras", "3,46%", "1,86", "64,55"],
    ["04/08/26 | BnB | BS-CBO | CA01 | OP", "288,24", "2,30", "110,37", "48,04", "6 compras", "2,47%", "2,23", "55,12"],
    ["10/08/26 | BnB | BT-CBO | CA01", "254,71", "1,25", "106,50", "84,90", "3 compras", "1,84%", "2,45", "45,19"],
  ]),
  report("2026-09-18-7d", "Setembro 2026 · Últimos 7 dias", "12/09/2026 a 18/09/2026", totals("8.379,11", "100,88", "1,95%", "2,51", "48,96"), [
    ["04/08/26 | BnB | BS-CBO | CA01", "2.367,57", "0,81", "101,26", "124,61", "19 compras", "2,98%", "2,16", "64,33"],
    ["04/08/26 | BnB | BS-CBO | CA01 | OP", "2.132,93", "1,16", "98,79", "85,32", "25 compras", "2,58%", "2,59", "66,94"],
    ["19/08/26 | BnB | BR-CBO | CA01", "2.128,93", "0,96", "102,49", "106,45", "20 compras", "1,17%", "2,82", "33,09"],
    ["10/08/26 | BnB | BT-CBO | CA01", "1.749,68", "1,45", "101,40", "69,99", "25 compras", "1,76%", "2,60", "45,87"],
  ]),
  report("2026-09-18-14d", "Setembro 2026 · Últimos 14 dias", "05/09/2026 a 18/09/2026", totals("16.027,54", "98,25", "1,89%", "2,62", "49,59"), [
    ["19/08/26 | BnB | BR-CBO | CA01", "4.235,86", "1,01", "101,40", "100,85", "42 compras", "1,22%", "3,01", "36,93"],
    ["04/08/26 | BnB | BS-CBO | CA01 | OP", "4.215,69", "1,13", "97,32", "86,03", "49 compras", "2,39%", "2,78", "66,25"],
    ["04/08/26 | BnB | BS-CBO | CA01", "4.051,16", "0,87", "95,14", "109,49", "37 compras", "2,67%", "2,27", "60,53"],
    ["10/08/26 | BnB | BT-CBO | CA01", "3.524,83", "1,46", "98,81", "67,79", "52 compras", "1,79%", "2,52", "45,23"],
  ]),
  report("2026-09-18-30d", "Setembro 2026 · Últimos 30 dias", "20/08/2026 a 18/09/2026", totals("34.397,81", "99,43", "1,97%", "2,80", "55,12", { otherResults: "Aquec: 76 visitas à página/perfil (não são compras)." }), [
    ["19/08/26 | BnB | BR-CBO | CA01", "8.970,48", "1,12", "97,86", "87,09", "103 compras", "1,39%", "3,15", "43,68"],
    ["04/08/26 | BnB | BS-CBO | CA01 | OP", "8.842,08", "1,28", "99,15", "77,56", "114 compras", "2,32%", "2,67", "61,72"],
    ["04/08/26 | BnB | BS-CBO | CA01", "8.641,47", "1,00", "98,98", "99,33", "87 compras", "2,61%", "2,62", "68,25"],
    ["10/08/26 | BnB | BT-CBO | CA01", "7.932,56", "1,17", "101,99", "87,17", "91 compras", "1,86%", "2,88", "53,68"],
    ["Aquec · visitas à página/perfil (não compra)", "11,22", "—", "—", "0,15", "76 visitas (não compras)", "4,98%", "0,22", "11,16"],
  ]),
];

const library = "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&q=ballsnbrains&search_type=keyword_unordered&sort_data[direction]=desc&sort_data[mode]=total_impressions";
const salesPage = "https://lp.ballsnbrains.com/6a70e951406ffd42c56e6f12";
const topAdLinks = [
  "https://fb.me/adspreview/facebook/35YUm3HCxfXqA8q",
  "https://fb.me/adspreview/facebook/1WwGauhJXK6YUG3",
  "https://fb.me/adspreview/facebook/2kcFZwJd2e9B2yT",
];

const html = await readFile(new URL("index.html", ROOT), "utf8");
const supabaseUrl = html.match(/const DEFAULT_URL="([^"]+)"/)?.[1];
if (!supabaseUrl) throw new Error("URL do Supabase não encontrada");
const manifest = { batchDate: "2026-09-18", items: [{ kind: "brandsvalidated", name: "Balls N Brains", brand: "Balls N Brains", niche: "Saúde masculina", format: "Café de cogumelos com testosterona", image: `${supabaseUrl}/storage/v1/object/public/criativos/brands/balls-n-brains/product-cover.png`, libraries: [{ name: "Balls N Brains · Meta Ads Library", url: library }], domains: [{ name: "Página de vendas", offer: salesPage }] }] };
function makeData(previous = {}) {
  return {
    ...previous,
    kind: "brandsvalidated", tipoTrafego: "meta", nomeOferta: "Balls N Brains", nomeMarca: "Balls N Brains", nicho: "Saúde masculina", formato: "Café de cogumelos com testosterona", imagemProduto: manifest.items[0].image,
    numAdsAtivos: "", adsLibraryCheckedAt: "18/09/2026", bibliotecas: [{ nome: "Balls N Brains · Meta Ads Library · Setembro 2026", link: library }],
    dominios: [{ nome: "Página de vendas", linkDominio: salesPage, linkCheckout: "", backRedirect: "", views: "", viewsPeriod: "", vslLink: "", vslVideo: "" }],
    bmSpend7d: MONEY("8.379,11"), bmSpend14d: MONEY("16.027,54"), bmSpend30d: MONEY("34.397,81"), bmAvgConversion: MONEY("100,88"), bmCpc: MONEY("2,51"), bmCpcLink: "", bmCpm: MONEY("48,96"), bmCtr: "1,95%", bmCostUnique: "", bmCostIc: "Não exibido nos prints", bmRoas: "— (múltiplas conversões)", bmUpdatedAt: "18/09/2026",
    bmNotes: "Leitura de setembro de 2026. A campanha Aquec, no recorte de 30 dias, gerou 76 visitas à página/perfil e não foi contabilizada como compra.", bmReports: reports, bmPrints: [],
    brandTopAds: topAdLinks.map((link, index) => ({ nome: `Anúncio ${index + 1} — Setembro 2026 — 12 a 18`, link, period: "2026-09", sourceDate: "18/09/2026" })),
    funil: "Meta Ads → página de vendas Balls N Brains → checkout", comentario: "",
  };
}
if (process.argv.includes("--sql")) {
  const payload = JSON.stringify(makeData()).replaceAll("'", "''");
  console.log(`DO $$ DECLARE payload jsonb := '${payload}'::jsonb; BEGIN UPDATE offers SET data = payload WHERE data->>'kind' = 'brandsvalidated' AND lower(data->>'nomeOferta') = 'balls n brains'; IF NOT FOUND THEN INSERT INTO offers (data) VALUES (payload); END IF; END $$; SELECT id, data->>'nomeOferta' AS nome, jsonb_array_length(data->'bmReports') AS relatorios FROM offers WHERE data->>'kind' = 'brandsvalidated' AND lower(data->>'nomeOferta') = 'balls n brains';`);
  process.exit(0);
}
const admin = await productionAdminAuth();
if (admin.url !== supabaseUrl) throw new Error("A credencial administrativa aponta para outro projeto Supabase");
const headers = { ...authHeaders(admin), "Content-Type": "application/json" };
const catalogQuery = new URL(`${supabaseUrl}/rest/v1/offers`); catalogQuery.searchParams.set("select", "id,data"); catalogQuery.searchParams.set("data->>kind", "eq.brandsvalidated");
const catalog = await fetch(catalogQuery, { headers }).then(async response => response.ok ? response.json() : Promise.reject(new Error(await response.text())));
const prior = catalog.find(row => String(row.data?.nomeOferta || "").trim().toLowerCase() === "balls n brains");
const validation = { mode: "validate", plan: [{ kind: "brandsvalidated", name: "Balls N Brains", action: prior ? "update" : "create", newAds: 0, duplicatesSkipped: 0 }], totals: { newCards: prior ? 0 : 1, updates: prior ? 1 : 0 } };
if (validation.totals.newCards + validation.totals.updates !== 1) throw new Error(`Plano inesperado: ${JSON.stringify(validation.plan)}`);
const cover = await readFile(COVER);
const upload = await fetch(`${supabaseUrl}/storage/v1/object/criativos/brands/balls-n-brains/product-cover.png`, { method: "POST", headers: { ...headers, "Content-Type": "image/png", "x-upsert": "true" }, body: cover });
if (!upload.ok) throw new Error(`Upload da capa: ${upload.status} ${(await upload.text()).slice(0, 180)}`);
const offerId = prior?.id || (await fetch(`${supabaseUrl}/rest/v1/offers`, { method: "POST", headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify({ data: { kind: "brandsvalidated", nomeOferta: "Balls N Brains", nomeMarca: "Balls N Brains", nicho: "Saúde masculina" } }) }).then(async response => {
  if (!response.ok) throw new Error(`Criação do card: ${response.status} ${(await response.text()).slice(0, 180)}`);
  return (await response.json())[0]?.id;
}));
if (!offerId) throw new Error("O banco não retornou o identificador do novo card");
const data = makeData(prior?.data || {});
const saved = await fetch(`${supabaseUrl}/rest/v1/offers?id=eq.${offerId}`, { method: "PATCH", headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify({ data }) });
if (!saved.ok) throw new Error(`Dados estruturados: ${saved.status} ${(await saved.text()).slice(0, 220)}`);
console.log(JSON.stringify({ ok: true, validation: validation.plan, action: validation.plan[0].action, offerId, reports: reports.length, topAds: topAdLinks.length, cover: manifest.items[0].image }));
