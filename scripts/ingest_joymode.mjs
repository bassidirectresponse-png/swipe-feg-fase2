import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = new URL("../", import.meta.url);
const html = await fs.readFile(new URL("index.html", ROOT), "utf8");
const SUPABASE_URL = html.match(/const DEFAULT_URL="([^"]+)"/)?.[1];
const ANON = html.match(/const DEFAULT_KEY="([^"]+)"/)?.[1];
if (!SUPABASE_URL || !ANON) throw new Error("Configuração do Supabase não encontrada no index.html");
function netlifySecret(name) {
  try { return execFileSync("npx", ["netlify", "env:get", name, "--context", "production"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); }
  catch { return ""; }
}
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || (process.env.CI ? "" : netlifySecret("SUPABASE_SERVICE_ROLE_KEY"));
const API_KEY = SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ANON;
let AUTH_TOKEN = API_KEY;
if (!SERVICE_KEY && process.env.SUPABASE_BOT_EMAIL && process.env.SUPABASE_BOT_PASSWORD) {
  const login = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: process.env.SUPABASE_BOT_EMAIL, password: process.env.SUPABASE_BOT_PASSWORD }),
  });
  if (!login.ok) throw new Error(`Login do bot falhou: ${login.status}`);
  AUTH_TOKEN = (await login.json()).access_token;
}

const downloads = "/Users/guilhermeaugustobassi/Downloads";
const printFiles = [
  ["Configuração · conversão, pixel e atribuição", "WhatsApp Image 2026-07-16 at 23.07.09 (1).jpeg"],
  ["Configuração · orçamento diário e início", "WhatsApp Image 2026-07-16 at 23.07.09 (2).jpeg"],
  ["Desempenho · anúncios · últimos 7 dias", "WhatsApp Image 2026-07-16 at 23.07.09.jpeg"],
  ["Desempenho · conjuntos · últimos 7 dias", "WhatsApp Image 2026-07-16 at 23.07.10 (1).jpeg"],
  ["Configuração · público e localização", "WhatsApp Image 2026-07-16 at 23.07.10 (2).jpeg"],
  ["Configuração · campanha e orçamento ABO", "WhatsApp Image 2026-07-16 at 23.07.10.jpeg"],
  ["Desempenho · campanhas · últimos 14 dias", "WhatsApp Image 2026-07-16 at 23.07.11 (1).jpeg"],
  ["Desempenho · campanhas · últimos 7 dias", "WhatsApp Image 2026-07-16 at 23.07.11 (2).jpeg"],
  ["Desempenho · campanhas · 15/07/2026", "WhatsApp Image 2026-07-16 at 23.07.11 (3).jpeg"],
  ["Desempenho · campanhas · últimos 30 dias", "WhatsApp Image 2026-07-16 at 23.07.11.jpeg"],
];

const bmPrints = await Promise.all(printFiles.map(async ([nome, file], i) => {
  let base64="";
  try{base64=(await fs.readFile(path.join(downloads,file))).toString("base64");}
  catch{base64=(await fs.readFile(new URL(`assets/joymode/print-${String(i+1).padStart(2,"0")}.b64`,ROOT),"utf8")).trim();}
  return {nome,img:`data:image/jpeg;base64,${base64}`};
}));

const money = value => value ? `US$ ${value}` : "";
const reports = [
  {
    key: "7d", label: "Últimos 7 dias", range: "09/07/2026 a 15/07/2026", level: "Campanhas",
    totals: { spend: money("25.418,14"), roas: "—", avgConversion: money("79,12"), costResult: "—", results: "—", ctr: "2,25%", cpc: money("0,96"), cpm: money("39,10"), cpcLink: money("1,74"), costUnique: money("1,43") },
    campaigns: [
      ["JM - HARD - ABO - TESTING - MAX CONV - 07.07.26","11.890,48","0,45","85,42","188,74","63","2,37%","1,10","59,76","2,52","1,35"],
      ["JM - HARD - CBO - TESTING - MAX CONV - 01.13.26","11.726,09","1,14","76,95","67,39","174","2,02%","0,92","28,31","1,40","1,33"],
      ["JM - HARD - CBO - WINNERS - BID CAP - 07.09.26","1.020,51","0,34","85,69","255,13","4","5,49%","0,41","40,48","0,74","0,46"],
      ["JM - HARD - ASC+ - SCALING - MAX CONV - 01.21.26","512,83","1,16","85,07","73,26","7","2,24%","2,24","85,81","3,83","2,44"],
      ["JM - PRIMET - CBO - TESTING - MAX CONV - 07.02.26","254,76","0,59","50,13","84,92","3","0,76%","3,59","47,23","6,21","4,11"],
      ["JM - HARD - CBO - WINNERS - BID CAP - 01.29.26","8,82","","","","","2,73%","1,26","40,09","1,47","1,26"],
      ["JM - HARD - CBO - TTS AFFILIATE - BID CAP - 06.05.26","4,63","","","","","3,96%","0,66","46,04","1,16","0,66"],
    ],
  },
  {
    key: "14d", label: "Últimos 14 dias", range: "02/07/2026 a 15/07/2026", level: "Campanhas",
    totals: { spend: money("53.368,29"), roas: "—", avgConversion: money("77,69"), costResult: "—", results: "—", ctr: "2,03%", cpc: money("1,15"), cpm: money("39,31"), cpcLink: money("1,94"), costUnique: money("1,90") },
    campaigns: [
      ["JM - HARD - CBO - TESTING - MAX CONV - 01.13.26","26.449,87","0,95","76,84","80,64","328","1,90%","1,02","29,26","1,54","1,70"],
      ["JM - HARD - ABO - TESTING - MAX CONV - 07.07.26","14.350,63","0,44","83,96","188,82","76","2,31%","1,22","61,95","2,69","1,55"],
      ["JM - HARD - ASC+ - SCALING - MAX CONV - 01.21.26","7.326,98","0,60","79,16","130,84","56","2,25%","2,93","96,54","4,29","3,57"],
      ["JM - PRIMET - CBO - TESTING - MAX CONV - 07.02.26","3.498,91","0,34","59,04","174,95","20","1,29%","1,16","32,72","2,53","1,45"],
      ["JM - HARD - CBO - WINNERS - BID CAP - 07.09.26","1.020,51","0,34","85,69","255,13","4","5,49%","0,41","40,48","0,74","0,46"],
      ["JM - HARD - CBO - TTS AFFILIATE - BID CAP - 06.05.26","454,36","0,91","82,47","90,87","5","2,49%","1,40","62,57","2,51","1,80"],
      ["JM - HARD - CBO - WINNERS - BID CAP - 01.29.26","244,48","1,10","89,94","81,49","3","3,42%","0,92","43,54","1,27","1,02"],
      ["JM - SPB - USA - GRAVEYARD - BID CAP - 05.11.26 - CBO","22,55","","","","","10,10%","0,09","16,50","0,16","0,10"],
    ],
  },
  {
    key: "1d", label: "Ontem", range: "15/07/2026", level: "Campanhas",
    totals: { spend: money("3.726,30"), roas: "—", avgConversion: money("76,35"), costResult: "—", results: "—", ctr: "2,06%", cpc: money("1,12"), cpm: money("41,37"), cpcLink: money("2,00"), costUnique: "—" },
    campaigns: [
      ["JM - HARD - CBO - TESTING - MAX CONV - 01.13.26","1.663,38","1,19","75,90","63,98","26","1,78%","1,06","27,21","1,53","1,27"],
      ["JM - HARD - ABO - TESTING - MAX CONV - 07.07.26","1.383,30","0,29","81,41","276,66","5","2,42%","1,10","67,89","2,81","1,26"],
      ["JM - HARD - CBO - WINNERS - BID CAP - 07.09.26","679,55","0,32","71,77","226,52","3","3,24%","1,35","79,37","2,45","1,57"],
      ["JM - HARD - CBO - TTS AFFILIATE - BID CAP - 06.05.26","9,07","","","","","","","23,33","",""]
    ],
  },
  {
    key: "30d", label: "Últimos 30 dias", range: "16/06/2026 a 15/07/2026", level: "Campanhas",
    totals: { spend: money("110.038,42"), roas: "—", avgConversion: money("74,88"), costResult: "—", results: "—", ctr: "2,50%", cpc: money("1,10"), cpm: money("42,56"), cpcLink: money("1,70"), costUnique: money("1,94") },
    campaigns: [
      ["JM - HARD - CBO - TESTING - MAX CONV - 01.13.26","58.558,06","0,93","74,03","79,89","733","2,05%","1,11","33,13","1,61","2,08"],
      ["JM - HARD - ASC+ - SCALING - MAX CONV - 01.21.26","23.434,10","0,61","74,06","121,42","193","3,45%","1,90","88,58","2,57","2,41"],
      ["JM - HARD - ABO - TESTING - MAX CONV - 07.07.26","14.350,63","0,44","83,96","188,82","76","2,31%","1,22","61,95","2,69","1,55"],
      ["JM - HARD - CBO - TTS AFFILIATE - BID CAP - 06.05.26","4.056,56","0,74","76,88","104,01","39","2,99%","1,00","52,06","1,74","1,32"],
      ["JM - PRIMET - CBO - TESTING - MAX CONV - 07.02.26","3.498,91","0,34","59,04","174,95","20","1,29%","1,16","32,72","2,53","1,45"],
      ["JM - All Products - USA - SWIM LANE TESTING - MAX CONV","2.948,20","0,36","75,17","210,59","14","5,01%","1,00","82,35","1,64","1,21"],
      ["JM - HARD - CBO - WINNERS - BID CAP - 01.29.26","1.371,29","0,88","92,99","105,48","13","5,07%","0,72","47,80","0,94","0,81"],
      ["JM - HARD - CBO - WINNERS - BID CAP - 07.09.26","1.020,51","0,34","85,69","255,13","4","5,49%","0,41","40,48","0,74","0,46"],
      ["JM - SPB - USA - GRAVEYARD - BID CAP - 05.11.26 - CBO","800,16","","","","","11,62%","0,10","16,87","0,15","0,10"],
    ],
  },
];

const keys = ["name","spend","roas","avgConversion","costResult","results","ctr","cpc","cpm","cpcLink","costUnique"];
for (const report of reports) report.campaigns = report.campaigns.map(values => Object.fromEntries(keys.map((key, i) => [key, i === 0 ? values[i] : (values[i] ? (key === "ctr" ? values[i] : money(values[i])) : "")])));
for (const report of reports) for (const row of report.campaigns) {
  row.roas = row.roas.replace(/^US\$ /, "");
  row.results = row.results.replace(/^US\$ /, "");
}

const links = [
  "https://fb.me/adspreview/facebook/29gpH1kvIKRRwW5",
  "https://fb.me/adspreview/facebook/2eqsoZjvdw2DjV1",
  "https://fb.me/adspreview/facebook/22BlAfASZJ8Ozq6",
  "https://fb.me/adspreview/facebook/204983VHDMlbEQO",
  "https://fb.me/adspreview/facebook/22Q6eQIvX61EVvo",
];

const headers = { apikey: API_KEY, Authorization: `Bearer ${AUTH_TOKEN}`, "Content-Type": "application/json" };
const query = new URL(`${SUPABASE_URL}/rest/v1/offers`);
query.searchParams.set("select", "id,data");
query.searchParams.set("data->>kind", "eq.brandsvalidated");
const existingRows = await fetch(query, { headers }).then(async r => r.ok ? r.json() : Promise.reject(new Error(await r.text())));
const existing = existingRows.find(row => String(row.data?.nomeOferta || "").trim().toLowerCase() === "joymode");
const previousAds = Array.isArray(existing?.data?.brandTopAds) ? existing.data.brandTopAds : [];
const brandTopAds = links.map((link, i) => {
  const previous = previousAds.find(ad => ad.link === link) || {};
  return {
    nome: `Joymode · Top Ad ${String(i + 1).padStart(2, "0")}`,
    link,
    ...previous,
    ingestStatus: previous.video || previous.img ? "done" : "link_only",
    ingestError: "",
    active: null,
    daysActive: null,
    startDate: "",
    startDateUnix: null,
    endDateUnix: null,
  };
});

const data = {
  ...(existing?.data || {}),
  kind: "brandsvalidated",
  tipoTrafego: "meta",
  nomeOferta: "Joymode",
  nomeMarca: "Joymode",
  nicho: "Disfunção Erétil",
  formato: "Suplemento em pó · sachê ou pote",
  numAdsAtivos: "2387",
  imagemProduto: "https://assets.replocdn.com/projects/0e54a4ce-4105-4700-aab7-d46d0874071b/ec1bac99-e229-4b05-a664-e1d2f1c82259",
  bibliotecas: [{ nome: "Joymode · Meta Ads Library", link: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&search_type=page&sort_data[mode]=total_impressions&sort_data[direction]=desc&source=page-transparency-widget&view_all_page_id=108435064861552" }],
  dominios: [{ nome: "Hard+ · Sexual Performance Booster", linkDominio: "https://www.tryjoymode.com/products/sexual-performance-booster", linkCheckout: "", backRedirect: "", printPV: "", printCheckout: "" }],
  brandTopAds,
  bmSpend7d: money("25.418,14"),
  bmSpend14d: money("53.368,29"),
  bmAvgConversion: money("79,12"),
  bmCpc: money("0,96"),
  bmCpcLink: money("1,74"),
  bmCpm: money("39,10"),
  bmCtr: "2,25%",
  bmCostUnique: money("1,43"),
  bmCostIc: "Não exibido no print",
  bmRoas: "— (múltiplas conversões)",
  bmUpdatedAt: "15/07/2026",
  bmNotes: "Conta em USD. Médias do card: rodapé do Gerenciador no período de 09/07 a 15/07/2026. O custo por IC não aparece nas colunas enviadas; por isso foi mantido como não exibido. Configuração observada: objetivo Vendas, conversão no site, evento Comprar, pixel JOYMODE 2026 Pixel Test, atribuição de 7 dias após clique e 1 dia após visualização. Público: Estados Unidos, 18–65+, todos os gêneros. Orçamento do conjunto analisado: US$ 500/dia, iniciado em 07/07/2026, sem data final.",
  bmReports: reports,
  bmPrints,
  brandSemrush1m: existing?.data?.brandSemrush1m || "",
  brandSemrush3m: existing?.data?.brandSemrush3m || "",
  funil: "Meta Ads → página do produto Hard+ → carrinho → checkout",
  comentario: "Primeira oferta Insider cadastrada como padrão de referência. Prints, médias gerais e métricas por campanha foram separados por período. Os cinco top ads estão vinculados diretamente ao Facebook; a mídia pode ser anexada manualmente ao card quando o arquivo estiver disponível.",
};

if (process.argv.includes("--emit-seed")) {
  data.bmPrints = printFiles.map(([nome], i) => ({ nome, asset: `/assets/joymode/print-${String(i + 1).padStart(2, "0")}.b64` }));
  console.log(JSON.stringify(data));
  process.exit(0);
}

const endpoint = existing ? `${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(existing.id)}` : `${SUPABASE_URL}/rest/v1/offers`;
const response = await fetch(endpoint, {
  method: existing ? "PATCH" : "POST",
  headers: { ...headers, Prefer: "return=representation" },
  body: JSON.stringify({ data }),
});
if (!response.ok) throw new Error(`Supabase ${response.status}: ${(await response.text()).slice(0, 300)}`);
const rows = await response.json();
const savedId=rows[0]?.id||existing?.id;
console.log(JSON.stringify({ ok: true, action: existing ? "updated" : "inserted", id: savedId, prints: bmPrints.length, reports: reports.length, campaigns: reports.reduce((n, r) => n + r.campaigns.length, 0), topAds: brandTopAds.length }));
