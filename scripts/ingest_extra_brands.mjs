import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";

const ROOT = new URL("../", import.meta.url);
const target = process.argv[2];
const money = value => value ? `US$ ${value}` : "";
const fields = ["name","spend","roas","avgConversion","costResult","results","ctr","cpc","cpm","cpcLink","costUnique"];
const rows = values => values.map(row => Object.fromEntries(fields.map((field, index) => {
  const value = row[index] || "";
  if (index === 0 || field === "roas" || field === "results" || field === "ctr") return [field, value];
  return [field, value ? money(value) : ""];
})));
const report = (key, label, range, totals, campaigns) => ({ key, label, range, level: "Campanhas", totals, campaigns: rows(campaigns) });
const totals = (spend, avgConversion, ctr, cpc, cpm, cpcLink, costUnique) => ({ spend: money(spend), roas: "—", avgConversion: money(avgConversion), costResult: "—", results: "—", ctr, cpc: money(cpc), cpm: money(cpm), cpcLink: money(cpcLink), costUnique: money(costUnique) });

const ancestralLinks = [
  "https://business.facebook.com/ads/experience/confirmation/?is_responsive=0&encrypted_experience_id=Q8DfBAJBqPSBmKsMfjKe3RcqjwCoXfKGrJIY8hwL3wmx2Y_FPK_FfaMOLntvYMOmB8nsIE4k96f3Mglm5Q",
  "https://business.facebook.com/ads/experience/confirmation/?is_responsive=0&encrypted_experience_id=Q8DfBAI2iOvGhUAoxvzfCKkT17B3lsQBWj4RR8bzS0D-6VHP1BURc1KZ0remFI7z-ggdeH1oDLjqg9oTrA",
  "https://business.facebook.com/ads/experience/confirmation/?is_responsive=0&encrypted_experience_id=Q8DfBAIA4K_S6oRrONK7ZgPtdlUmWVAiCKZ4O_bOesCCnkKU_6Txh_zuyd6tHs7L72dqkRHiPZ4qZEUX-A",
  "https://business.facebook.com/ads/experience/confirmation/?is_responsive=0&encrypted_experience_id=Q8DfBAJJb5GpC6-CXE9Ra8KysYOZeSrXbmquOXabUbm5yoExWMj9AWX6TKeFh-z_PRHzMVqrWvoX3A2lsA",
  "https://business.facebook.com/ads/experience/confirmation/?is_responsive=0&encrypted_experience_id=Q8DfBAJlIBmzlbDlDdCgWHL6x92ksVgJv-dApaZsTVd6Rxsmnw3MWwwrW-k6wEPF7a5X7hYyvR3GHGUqGw",
];
const marsLinks = [
  "https://business.facebook.com/ads/experience/confirmation/?is_responsive=0&encrypted_experience_id=Q8DfBAJqTJPvqnE_hmm8B6gdrIQ-_fLB1ZxyZFE0DjznQePXQqUC7VMqG7zDuYmiDw5RpXgHFKVAbI3D_Q",
  "https://business.facebook.com/ads/experience/confirmation/?is_responsive=0&encrypted_experience_id=Q8DfBAKFXpuuINLpKEse4xgCTlyHqNw8LmPfG1Zk1LOC3byxZqUIIWzJuIuSR1sYUkh9j5-JPJ0wdFlExA",
  "https://business.facebook.com/ads/experience/confirmation/?is_responsive=0&encrypted_experience_id=Q8DfBAJYGVIJgKZGtu0vg_9d2GPSGkqNkNgRx0DxMq7NF6Ohaaiqu3nxqkdgqk9Ap2Dywfb65BBIFb33Sw",
  "https://business.facebook.com/ads/experience/confirmation/?is_responsive=0&encrypted_experience_id=Q8DfBALonB6TGxgcfOezEZBqxs-6Wmd-kF5pD11w_tZ6q_TZwUcJ0zalHSzvs86Ztb3PJAEb7Kq6ayRV",
  "https://business.facebook.com/ads/experience/confirmation/?is_responsive=0&encrypted_experience_id=Q8DfBAKzrXXqYAbi_bMebCc_ucPvOOtuarpmsqXUd_Cw6j94ecsrNXTXdfX0NMrusqiIdlh4jEMiryoyCg",
];
const exactMedia = {
  "ancestral-supplements": [
    "/assets/ancestral-supplements/top-ad-01.mp4",
    "/assets/ancestral-supplements/top-ad-02.jpg",
    "/assets/ancestral-supplements/top-ad-03.jpg",
    "/assets/ancestral-supplements/top-ad-04.jpg",
    "/assets/ancestral-supplements/top-ad-05.jpg",
  ],
  "mars-men": [
    "/assets/mars-men/top-ad-01.jpg",
    "/assets/mars-men/top-ad-02.jpg",
    "/assets/mars-men/top-ad-03.mp4",
    "/assets/mars-men/top-ad-04.jpg",
    "/assets/mars-men/top-ad-05.mp4",
  ],
};

const configs = {
  "ancestral-supplements": {
    name: "Ancestral Supplements", niche: "Saúde e suplementos", format: "Suplementos de órgãos liofilizados", ads: "300", approximate: true,
    image: "/assets/ancestral-supplements/product.png",
    library: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&is_targeted_country=false&media_type=all&search_type=page&sort_data[mode]=total_impressions&sort_data[direction]=desc&view_all_page_id=187583778382475",
    domain: "https://ancestralsupplements.com/pages/liver-changes-lives-v1", links: ancestralLinks,
    prints: ["Configuração · orçamento do conjunto e início","Configuração · conversão, pixel e atribuição","Configuração · campanha e orçamento","Desempenho · campanhas · 15/07/2026","Desempenho · campanhas · últimos 7 dias","Configuração · público e localização","Desempenho · campanhas · últimos 30 dias","Desempenho · anúncios · últimos 7 dias","Desempenho · conjuntos · últimos 7 dias","Desempenho · campanhas · últimos 14 dias"],
    reports: [
      report("1d", "15 de julho", "15/07/2026", totals("15.360,58", "105,69", "0,88%", "0,89", "19,11", "2,17", "1,16"), [
        ["dr-nc_cbo-maxconv_hv_sales_7dc_Sale_0326","3.450,85","0,94","134,84","143,79","24","0,52%","2,44","20,38","3,92","2,93"],
        ["dr-nc_cbo-maxconv_hv_sales_7dc1ev_core-Liver","2.943,99","1,14","101,31","89,21","33","0,84%","0,99","23,22","2,76","1,13"],
        ["dr-nc_cbo-maxconv_hv_sales_7dc1ev_partner-JPS","1.966,78","1,22","109,00","89,40","22","1,63%","0,58","23,40","1,44","0,68"],
        ["dr-nc_cbo-maxconv_hv_sales_7dc1ev_test-FEM","1.786,33","0,71","114,95","162,39","11","0,90%","1,45","23,56","2,60","1,70"],
      ]),
      report("7d", "Últimos 7 dias", "09/07/2026 a 15/07/2026", totals("109.991,34", "106,05", "0,98%", "0,67", "19,66", "2,01", "0,97"), [
        ["dr-nc_cbo-maxconv_hv_sales_7dc_Sale_0326","23.116,72","1,07","113,62","106,04","218","0,59%","2,51","23,34","3,94","3,36"],
        ["dr-nc_cbo-maxconv_hv_sales_7dc1ev_core-Liver","20.174,85","0,75","95,82","127,69","158","1,04%","0,35","21,43","2,06","0,44"],
        ["dr-nc_cbo-maxconv_hv_sales_7dc1ev_partner-JPS","12.880,66","1,27","116,21","91,35","141","1,70%","0,54","23,46","1,38","0,64"],
        ["dr-nc_cbo-maxconv_hv_sales_7dc1ev_test-FEM","12.884,76","0,67","104,12","155,24","83","0,97%","1,33","24,32","2,51","1,73"],
      ]),
      report("14d", "Últimos 14 dias", "02/07/2026 a 15/07/2026", totals("251.679,65", "106,47", "1,00%", "0,72", "19,93", "2,00", "1,10"), [
        ["dr-nc_cbo-maxconv_hv_sales_7dc_Sale_0326","54.765,69","1,00","111,29","110,86","494","0,58%","2,54","23,33","3,99","3,75"],
        ["dr-nc_cbo-maxconv_hv_sales_7dc1ev_core-Liver","46.349,46","0,72","102,99","142,61","325","0,91%","0,57","22,00","2,42","0,76"],
        ["dr-nc_cbo-maxconv_hv_sales_7dc1ev_partner-JPS","30.817,53","1,07","111,11","105,54","292","1,89%","0,48","23,73","1,25","0,62"],
        ["dr-nc_cbo-maxconv_hv_sales_7dc1ev_test-FEM","27.878,62","0,70","107,53","154,03","181","0,93%","1,49","25,81","2,78","1,94"],
      ]),
      report("30d", "Últimos 30 dias", "16/06/2026 a 15/07/2026", totals("515.566,26", "105,71", "0,94%", "0,79", "19,54", "2,08", "1,35"), [
        ["dr-nc_cbo-maxconv_hv_sales_7dc_Sale_0326","116.146,18","0,93","109,49","117,32","990","0,57%","2,51","22,52","3,95","3,79"],
        ["dr-nc_cbo-maxconv_hv_sales_7dc1ev_core-Liver","88.204,74","0,66","102,26","156,11","565","0,91%","0,69","22,23","2,43","0,93"],
        ["dr-nc_cbo-maxconv_hv_sales_7dc1ev_partner-JPS","60.610,37","0,91","111,11","122,20","496","1,51%","0,55","22,91","1,45","0,77"],
        ["dr-nc_cbo-maxconv_hv_sales_7dc1ev_test-FEM","57.949,44","0,64","106,17","165,10","351","0,88%","1,39","23,79","2,69","1,97"],
      ]),
    ],
    top: {spend:"109.991,34", average:"106,05", ctr:"0,98%", cpc:"0,67", cpm:"19,66", cpcLink:"2,01", unique:"0,97"},
    funnel: "Meta Ads → VSL Liver Changes Lives → oferta Ancestral Supplements",
  },
  "mars-men": {
    name: "Mars Men", niche: "Saúde masculina", format: "Suplemento para cortisol e hormônios masculinos", ads: "A confirmar", approximate: false,
    image: "/assets/mars-men/product.png",
    library: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&is_targeted_country=false&media_type=all&search_type=page&sort_data[direction]=desc&sort_data[mode]=total_impressions&view_all_page_id=184711951390377",
    domain: "https://mengotomars.com/pages/quiz-v6", links: marsLinks,
    prints: ["Desempenho · campanhas · 30 dias","Desempenho · conjuntos · 7 dias","Desempenho · campanhas · 15/07/2026","Configuração · público","Configuração · orçamento da campanha","Configuração · orçamento do conjunto","Desempenho · campanhas · 7 dias","Desempenho · anúncios · 7 dias","Desempenho · campanhas · 14 dias","Configuração · conversão e pixel"],
    reports: [
      report("1d", "15 de julho", "15/07/2026", totals("157.955,46", "63,89", "0,61%", "2,28", "24,46", "4,01", "2,82"), [
        ["02_Prospecting_MM4_CreativeTesting_2_USA_ABO","44.170,68","0,17","61,05","356,22","124","0,63%","2,49","28,20","4,50","2,76"],
        ["02_Prospecting_MM4_Scale_Core_USA_CBO","35.446,55","0,28","64,55","227,22","156","0,70%","2,38","30,40","4,37","2,66"],
        ["02_Prospecting_MM4_Scale_Quiz_USA_CBO_CC","14.743,18","0,44","63,62","143,14","103","0,79%","1,77","23,94","3,05","2,03"],
        ["02_Prospecting_MM4_Scale_Pages_USA_CBO","10.417,16","0,42","59,32","140,77","74","0,39%","5,12","27,71","7,04","5,86"],
      ]),
      report("7d", "Últimos 7 dias", "09/07/2026 a 15/07/2026", totals("1.060.674,62", "63,71", "0,65%", "2,13", "24,78", "3,84", "2,94"), [
        ["02_Prospecting_MM4_Scale_Core_USA_CBO","253.460,90","0,29","63,98","220,78","1.148","0,69%","2,07","28,93","4,22","2,43"],
        ["02_Prospecting_MM4_CreativeTesting_2_USA_ABO","196.503,64","0,25","63,11","253,23","776","0,63%","2,47","28,45","4,49","2,85"],
        ["02_Prospecting_MM4_Scale_Quiz_USA_CBO_CC","142.343,75","0,38","64,42","169,05","842","0,78%","1,90","25,02","3,23","2,40"],
        ["02_Prospecting_MM4_Zombie_USA_CBO_CC","95.050,05","0,86","63,35","73,34","1.296","0,57%","2,19","23,87","4,16","2,68"],
      ]),
      report("14d", "Últimos 14 dias", "02/07/2026 a 15/07/2026", totals("2.085.815,70", "58,81", "0,64%", "2,11", "24,44", "3,80", "3,32"), [
        ["02_Prospecting_MM4_Scale_Quiz_USA_CBO_CC","371.262,01","0,38","56,94","150,86","2.461","0,76%","1,97","26,22","3,45","2,58"],
        ["02_Prospecting_MM4_Scale_Core_USA_CBO","314.021,55","0,30","63,46","214,20","1.466","0,70%","1,99","28,35","4,06","2,37"],
        ["02_Prospecting_MM4_CreativeTesting_2_USA_ABO","283.139,38","0,26","59,93","228,34","1.240","0,64%","2,53","29,41","4,57","3,03"],
        ["02_Prospecting_MM4_Zombie_USA_CBO_CC","120.050,05","0,81","61,28","75,27","1.595","0,58%","2,08","23,91","4,09","2,50"],
      ]),
      report("30d", "Últimos 30 dias", "16/06/2026 a 15/07/2026", totals("4.168.437,08", "54,35", "0,66%", "2,04", "24,10", "3,64", "3,55"), [
        ["02_Prospecting_MM4_Scale_Quiz_USA_CBO_CC","710.627,84","0,39","51,17","132,04","5.382","0,80%","1,87","26,45","3,30","2,54"],
        ["02_Prospecting_MM4_Scale_Core_USA_CBO","632.498,10","0,32","62,06","193,31","3.272","0,76%","1,82","27,12","3,56","2,24"],
        ["02_Prospecting_MM4_CreativeTesting_2_USA_ABO","585.516,23","0,26","59,24","231,52","2.529","0,68%","2,36","28,47","4,22","2,83"],
        ["02_Prospecting_MM4_cortisol-quiz_USA_CBO","234.713,56","0,29","51,92","181,11","1.296","0,76%","1,43","23,46","3,07","1,67"],
      ]),
    ],
    top: {spend:"1.060.674,62", average:"63,71", ctr:"0,65%", cpc:"2,13", cpm:"24,78", cpcLink:"3,84", unique:"2,94"},
    funnel: "Meta Ads → quiz de cortisol → oferta Mars Men",
  },
};

const config = configs[target];
if (!config) throw new Error("Use ancestral-supplements ou mars-men");
const printPath = index => `/assets/${target}/print-${String(index + 1).padStart(2, "0")}.jpeg`;
const makeData = previous => {
  const previousAds = Array.isArray(previous.brandTopAds) ? previous.brandTopAds : [];
  const brandTopAds = config.links.map((link, index) => {
    const old = previousAds.find(item => item.link === link) || {};
    const source = exactMedia[target][index];
    const savedVideo = String(old.video || "").includes("/storage/v1/object/public/") ? old.video : source.endsWith(".mp4") ? source : "";
    const savedImage = String(old.img || "").includes("/storage/v1/object/public/") ? old.img : source.endsWith(".mp4") ? "" : source;
    return { ...old, nome: `${config.name} · Top Ad ${String(index + 1).padStart(2, "0")}`, link, img: savedImage, video: savedVideo, ingestStatus: "done", ingestError: "", ingestSource: "Link exato enviado", downloadedAt: old.downloadedAt || "17/07/2026" };
  });
  return ({ ...previous,
  kind: "brandsvalidated", tipoTrafego: "meta", nomeOferta: config.name, nomeMarca: config.name, nicho: config.niche,
  formato: config.format, numAdsAtivos: config.ads, adsLibraryApprox: config.approximate, adsLibraryCheckedAt: "17/07/2026", imagemProduto: config.image,
  bibliotecas: [{ nome: `${config.name} · Meta Ads Library`, link: config.library }],
  dominios: [{ nome: "Página principal", linkDominio: config.domain, views: "", viewsPeriod: "", linkCheckout: "", backRedirect: "", printPV: "", printCheckout: "" }],
  brandTopAds,
  bmSpend7d: money(config.top.spend), bmSpend14d: config.reports.find(x => x.key === "14d")?.totals.spend || "", bmAvgConversion: money(config.top.average), bmCpc: money(config.top.cpc), bmCpcLink: money(config.top.cpcLink), bmCpm: money(config.top.cpm), bmCtr: config.top.ctr, bmCostUnique: money(config.top.unique), bmCostIc: "Não exibido nos prints", bmRoas: "— (múltiplas conversões)", bmUpdatedAt: "15/07/2026", bmNotes: "", bmReports: config.reports,
  bmPrints: config.prints.map((nome, index) => ({ nome, img: printPath(index) })), brandSemrush1m: previous.brandSemrush1m || "", brandSemrush3m: previous.brandSemrush3m || "", funil: config.funnel, comentario: "",
  });
};

if (process.argv.includes("--emit-seed")) { console.log(JSON.stringify(makeData({}))); process.exit(0); }
const html = await fs.readFile(new URL("index.html", ROOT), "utf8");
const SUPABASE_URL = html.match(/const DEFAULT_URL="([^"]+)"/)?.[1];
const ANON = html.match(/const DEFAULT_KEY="([^"]+)"/)?.[1];
if (!SUPABASE_URL || !ANON) throw new Error("Configuração do Supabase não encontrada");
function secret(name) { try { return execFileSync("npx", ["netlify", "env:get", name, "--context", "production"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim(); } catch { return ""; } }
const API_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || (process.env.CI ? "" : secret("SUPABASE_SERVICE_ROLE_KEY")) || process.env.SUPABASE_ANON_KEY || ANON;
let auth = API_KEY;
if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_BOT_EMAIL && process.env.SUPABASE_BOT_PASSWORD) {
  const login = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: process.env.SUPABASE_BOT_EMAIL, password: process.env.SUPABASE_BOT_PASSWORD }) });
  if (!login.ok) throw new Error(`Login do bot falhou: ${login.status}`); auth = (await login.json()).access_token;
}
const headers = { apikey: API_KEY, Authorization: `Bearer ${auth}`, "Content-Type": "application/json" };
async function persistExactMedia(data) {
  for (let index = 0; index < data.brandTopAds.length; index++) {
    const ad = data.brandTopAds[index];
    const source = ad.video || ad.img || "";
    if (!source.startsWith(`/assets/${target}/`)) continue;
    const ext = source.split(".").pop().toLowerCase();
    const isVideo = ext === "mp4";
    const contentType = isVideo ? "video/mp4" : ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    const objectPath = `brands/${target}/top-ad-${String(index + 1).padStart(2, "0")}.${ext}`;
    const body = await fs.readFile(new URL(`.${source}`, ROOT));
    const upload = await fetch(`${SUPABASE_URL}/storage/v1/object/criativos/${objectPath}`, { method: "POST", headers: { apikey: API_KEY, Authorization: `Bearer ${auth}`, "Content-Type": contentType, "x-upsert": "true" }, body });
    if (!upload.ok) throw new Error(`Storage ${config.name} ${index + 1}: ${upload.status} ${(await upload.text()).slice(0, 200)}`);
    const stored = `${SUPABASE_URL}/storage/v1/object/public/criativos/${objectPath}`;
    if (isVideo) { ad.video = stored; ad.img = ""; } else { ad.img = stored; ad.video = ""; }
  }
}
const query = new URL(`${SUPABASE_URL}/rest/v1/offers`); query.searchParams.set("select", "id,data"); query.searchParams.set("data->>kind", "eq.brandsvalidated");
const existingRows = await fetch(query, { headers }).then(async response => response.ok ? response.json() : Promise.reject(new Error(await response.text())));
const existing = existingRows.find(row => String(row.data?.nomeOferta || "").trim().toLowerCase() === config.name.toLowerCase());
const data = makeData(existing?.data || {});
await persistExactMedia(data);
const response = await fetch(existing ? `${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(existing.id)}` : `${SUPABASE_URL}/rest/v1/offers`, { method: existing ? "PATCH" : "POST", headers: { ...headers, Prefer: "return=representation" }, body: JSON.stringify({ data }) });
if (!response.ok) throw new Error(`Supabase ${response.status}: ${(await response.text()).slice(0, 300)}`);
console.log(JSON.stringify({ ok: true, action: existing ? "updated" : "inserted", name: config.name, reports: config.reports.length, topAds: config.links.length, prints: config.prints.length }));
