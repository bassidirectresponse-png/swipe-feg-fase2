// Ingestão de criativo do Facebook — Swipe FEG (BACKGROUND FUNCTION)
//
// Fluxo: o app manda { id, adUrl } (link da Biblioteca de Anúncios / anúncio do FB)
// + o token do admin. A função:
//   1) raspa o anúncio na Apify (actor curious_coder/facebook-ads-library-scraper,
//      ~US$0.00075 por anúncio → centavos),
//   2) baixa o MP4 do criativo e sobe no Storage (bucket criativos) — igual a um
//      upload manual, fica permanente,
//   3) calcula há quantos dias o anúncio está/ficou ativo (data de início do FB),
//   4) grava tudo de volta na linha da oferta e marca a transcrição como pendente
//      (o pipeline de transcrição existente pega o vídeo depois).
//
// Nome termina em "-background": a Netlify responde 202 na hora e deixa rodar até
// 15 min (a raspagem + download passa do limite de ~10s das funções síncronas).
// O app acompanha o resultado lendo a linha no Supabase (campo data.fbIngestStatus).
//
// OBS. sobre métricas: a Biblioteca de Anúncios do FB entrega de forma confiável o
// VÍDEO e a DATA DE INÍCIO (→ dias ativo). Views/likes/comentários NÃO são públicos
// para anúncios comerciais — só aparecem (impressões/gasto) em anúncios políticos.
// Por isso salvamos o que o FB expõe; engajamento fica "best-effort".
//
// Env (Netlify → Site settings → Environment variables):
//   APIFY_TOKEN         (obrigatória, secreta) — mesma conta do Radar TikTok
//   SUPABASE_URL, SUPABASE_ANON_KEY (opcionais, com default)
//   ADMIN_EMAILS        (opcional, csv; default adminswipefeg@swipefeg.app)
//   FB_ADS_ACTOR        (opcional; default curious_coder~facebook-ads-library-scraper)

const SUPABASE_URL = (process.env.SUPABASE_URL || "https://ppaajtzbhjixhyfidojd.supabase.co").replace(/\/+$/, "");
const ANON = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwYWFqdHpiaGppeGh5Zmlkb2pkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMDkzNTcsImV4cCI6MjA5Njc4NTM1N30.uoC_3EHM_dfmkBHJYjPvlaC7DqkJziunz-tug0ItAJc";
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "adminswipefeg@swipefeg.app")
  .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
const AUTOMATION_EMAILS = (process.env.AUTOMATION_EMAILS || "noticias-bot@swipefeg.app")
  .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
const WRITER_EMAILS = new Set([...ADMIN_EMAILS, ...AUTOMATION_EMAILS]);
const APIFY_TOKEN = process.env.APIFY_TOKEN || "";
const FB_ADS_ACTOR = process.env.FB_ADS_ACTOR || "curious_coder~facebook-ads-library-scraper";
const MAX_BYTES = 60 * 1024 * 1024; // teto de download/upload do criativo

// ---------- busca profunda tolerante a variações de schema do actor ----------
function deepFind(o, pred) {
  let hit = null;
  (function walk(x) {
    if (hit) return;
    if (Array.isArray(x)) { for (const v of x) { walk(v); if (hit) return; } return; }
    if (x && typeof x === "object") {
      for (const [k, v] of Object.entries(x)) {
        if (hit) return;
        if (typeof v === "string" && /^https?:\/\//.test(v) && pred(k, v)) { hit = v; return; }
        walk(v);
      }
    }
  })(o);
  return hit;
}
function deepVal(o, pred) {
  let hit = null;
  (function walk(x) {
    if (hit != null) return;
    if (Array.isArray(x)) { for (const v of x) { walk(v); if (hit != null) return; } return; }
    if (x && typeof x === "object") {
      for (const [k, v] of Object.entries(x)) {
        if (hit != null) return;
        if ((typeof v === "string" || typeof v === "number") && v !== "" && pred(k, v)) { hit = v; return; }
        walk(v);
      }
    }
  })(o);
  return hit;
}
function pickVideoUrl(item) {
  return deepFind(item, k => /video_hd_url/i.test(k))
      || deepFind(item, k => /video_sd_url/i.test(k))
      || deepFind(item, (k, v) => /video/i.test(k) && !/thumb|image|cover|preview|poster/i.test(k) && /\.(mp4|mov|m4v)(\?|$)/i.test(v))
      || deepFind(item, (k, v) => /\.(mp4|mov|m4v)(\?|$)/i.test(v));
}
function pickImageUrl(item) {
  return deepFind(item, k => /(image_snapshot_url|original_image_url|image_url|thumbnail_url)/i.test(k))
      || deepFind(item, (k, v) => /image|thumb|cover|poster|preview/i.test(k) && /\.(jpe?g|png|webp)(\?|$)/i.test(v));
}
function toUnix(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v > 1e12 ? Math.floor(v / 1000) : Math.floor(v);
  const s = String(v).trim();
  if (/^\d+$/.test(s)) { const n = +s; return n > 1e12 ? Math.floor(n / 1000) : n; }
  const t = Date.parse(s);
  return isNaN(t) ? null : Math.floor(t / 1000);
}

// ---------- Apify ----------
async function scrapeAds(adUrl, count = 3) {
  const input = { urls: [{ url: adUrl }], scrapeAdDetails: true, count, limitPerSource: count, activeStatus: "all" };
  const url = `https://api.apify.com/v2/acts/${FB_ADS_ACTOR}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=240`;
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  const txt = await r.text();
  if (!r.ok) throw new Error(`Apify HTTP ${r.status}: ${txt.slice(0, 180)}`);
  let items; try { items = JSON.parse(txt); } catch { throw new Error("resposta da Apify inválida"); }
  if (!Array.isArray(items)) {
    const msg = (items && items.error && items.error.message) || "";
    throw new Error(msg ? `Apify: ${msg}` : "Apify não retornou anúncios");
  }
  return items;
}
async function scrapeAd(adUrl) {
  const items = await scrapeAds(adUrl, 3);
  // escolhe o 1º item que tenha vídeo (alguns podem ser imagem/carrossel)
  const withVideo = items.find(it => pickVideoUrl(it)) || items[0];
  if (!withVideo) throw new Error("nenhum anúncio encontrado nesse link");
  return withVideo;
}
async function abortStuckRuns(){
  for(const status of ["READY","RUNNING"]){const r=await fetch(`https://api.apify.com/v2/acts/${FB_ADS_ACTOR}/runs?token=${APIFY_TOKEN}&status=${status}&limit=50&desc=1`);if(!r.ok)continue;const items=((await r.json())?.data?.items)||[];for(const run of items)await fetch(`https://api.apify.com/v2/actor-runs/${run.id}/abort?token=${APIFY_TOKEN}`,{method:"POST"});}
}
async function storeBatchMedia(ad,id,index,token){
  const videoUrl=pickVideoUrl(ad),imageUrl=pickImageUrl(ad),mediaUrl=videoUrl||imageUrl;if(!mediaUrl)return{status:"error",error:"anúncio sem mídia pública acessível"};
  try{const r=await fetch(mediaUrl);if(!r.ok)throw new Error(`download HTTP ${r.status}`);const buf=Buffer.from(await r.arrayBuffer());if(!buf.length||buf.length>MAX_BYTES)throw new Error("mídia fora do limite de 60 MB");const isVideo=!!videoUrl,contentType=isVideo?"video/mp4":((r.headers.get("content-type")||"image/jpeg").split(";")[0]),ext=isVideo?"mp4":contentType.includes("png")?"png":contentType.includes("webp")?"webp":"jpg",path=`brands/${id}/joymode-top-${index+1}-${Date.now()}.${ext}`;const up=await fetch(`${SUPABASE_URL}/storage/v1/object/criativos/${path}`,{method:"POST",headers:{apikey:ANON,Authorization:`Bearer ${token}`,"Content-Type":contentType,"x-upsert":"true"},body:buf});if(!up.ok)throw new Error(`storage HTTP ${up.status}`);return{status:"done",type:isVideo?"video":"image",url:`${SUPABASE_URL}/storage/v1/object/public/criativos/${path}`};}catch(e){return{status:"partial",error:String(e.message||e)};}
}

async function patchOffer(id, token, mutate) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(id)}&select=data`,
    { headers: { apikey: ANON, Authorization: `Bearer ${token}` } });
  const rows = r.ok ? await r.json() : [];
  const data = (rows[0] && rows[0].data) || {};
  mutate(data);
  await fetch(`${SUPABASE_URL}/rest/v1/offers?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ data }),
  });
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 202, body: "" };
  let id = null, token = "", targetIndex = null;
  try {
    if (!APIFY_TOKEN) throw new Error("APIFY_TOKEN não configurada no Netlify");
    token = (event.headers.authorization || event.headers.Authorization || "").replace(/^Bearer\s+/i, "").trim();
    const body = JSON.parse(event.body || "{}");
    id = body.id; const adUrl = body.adUrl, batch = body.batch === true, libraryUrl = body.libraryUrl;
    targetIndex = Number.isInteger(body.targetIndex) && body.targetIndex >= 0 ? body.targetIndex : null;
    if (!token || !id || (!adUrl&&!libraryUrl)) throw new Error("faltou token/id/link do Facebook");
    if (!/facebook\.com|fb\.com|fb\.me|fb\.watch/i.test(String(adUrl||libraryUrl))) throw new Error("não parece um link do Facebook");

    // admin?
    const u = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON, Authorization: `Bearer ${token}` } });
    if (!u.ok) throw new Error("sessão inválida");
    const email = String(((await u.json()) || {}).email || "").toLowerCase();
    if (!WRITER_EMAILS.has(email)) throw new Error("usuário sem permissão de escrita");

    if(batch){
      await abortStuckRuns();
      const wanted=Math.max(1,Math.min(12,Array.isArray(body.links)?body.links.length:5)),items=await scrapeAds(libraryUrl||adUrl,wanted+5),ads=items.filter(x=>pickVideoUrl(x)||pickImageUrl(x)).slice(0,wanted),nowU=Math.floor(Date.now()/1000),updates=[];
      for(let i=0;i<wanted;i++){const ad=ads[i];if(!ad){updates.push({ingestStatus:"error",ingestError:"anúncio correspondente não retornado pela biblioteca",ingestedAt:new Date().toISOString()});continue;}const startU=toUnix(deepVal(ad,k=>/(ad_delivery_start_time|start_?date|start_?time)/i.test(k))),stopU=toUnix(deepVal(ad,k=>/(ad_delivery_stop_time|end_?date|stop_?time)/i.test(k))),active=!stopU||stopU>nowU,media=await storeBatchMedia(ad,id,i,token);updates.push({...(media.type==="video"?{video:media.url}:media.type==="image"?{img:media.url}:{}),startDateUnix:startU||null,endDateUnix:stopU||null,startDate:startU?new Date(startU*1000).toLocaleDateString("pt-BR",{timeZone:"UTC"}):"",active,daysActive:startU?Math.max(0,Math.floor(((active?nowU:stopU)-startU)/86400)):null,pageName:deepVal(ad,k=>/page_?name/i.test(k))||"Joymode",ingestStatus:media.status,ingestError:media.error||"",ingestedAt:new Date().toISOString()});}
      await patchOffer(id,token,data=>{if(!Array.isArray(data.brandTopAds))data.brandTopAds=[];updates.forEach((up,i)=>{data.brandTopAds[i]=Object.assign({},data.brandTopAds[i]||{},up);});data.brandMediaBatchAt=new Date().toISOString();});
      console.log(`fb-ingest batch ${id}: ${updates.map(x=>x.ingestStatus).join(",")}`);return{statusCode:202,body:""};
    }

    // 1) raspa o anúncio
    const ad = await scrapeAd(adUrl);
    const videoUrl = pickVideoUrl(ad);
    const imageUrl = pickImageUrl(ad);

    // 2) datas → dias ativo
    const startU = toUnix(deepVal(ad, k => /(ad_delivery_start_time|start_?date|start_?time)/i.test(k)));
    const stopU = toUnix(deepVal(ad, k => /(ad_delivery_stop_time|end_?date|stop_?time)/i.test(k)));
    const nowU = Math.floor(Date.now() / 1000);
    const active = !stopU || stopU > nowU;
    const daysActive = startU ? Math.max(0, Math.floor(((active ? nowU : stopU) - startU) / 86400)) : null;
    const pageName = deepVal(ad, k => /(page_?name)/i.test(k));
    // métricas best-effort (normalmente ausentes p/ anúncios comerciais)
    const metrics = {};
    for (const key of ["impressions", "spend", "reach"]) {
      const v = deepVal(ad, k => new RegExp(key, "i").test(k));
      if (v != null) metrics[key] = v;
    }

    // 3) baixa o MP4 e sobe no Storage (permanente)
    let storedUrl = "", storedType = "", previewUrl = imageUrl || "";
    const mediaUrl = videoUrl || imageUrl;
    if (mediaUrl) {
      const v = await fetch(mediaUrl);
      if (v.ok) {
        const buf = Buffer.from(await v.arrayBuffer());
        if (buf.length && buf.length <= MAX_BYTES) {
          storedType = videoUrl ? "video" : "image";
          const contentType = videoUrl ? "video/mp4" : (v.headers.get("content-type") || "image/jpeg").split(";")[0];
          const ext = videoUrl ? "mp4" : (contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg");
          const prefix = targetIndex == null ? "criativo" : `brands/${id}`;
          const path = `${prefix}/fb-${targetIndex == null ? id : targetIndex}-${Date.now()}.${ext}`;
          const up = await fetch(`${SUPABASE_URL}/storage/v1/object/criativos/${path}`, {
            method: "POST",
            headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": contentType, "x-upsert": "true" },
            body: buf,
          });
          if (up.ok) storedUrl = `${SUPABASE_URL}/storage/v1/object/public/criativos/${path}`;
          else console.error("fb-ingest upload falhou:", up.status, (await up.text()).slice(0, 140));
        } else console.error("fb-ingest: vídeo fora do limite de tamanho", buf.length);
      } else console.error("fb-ingest: download do vídeo HTTP", v.status);
    }

    // 4) grava de volta
    await patchOffer(id, token, (data) => {
      if (targetIndex != null) {
        if (!Array.isArray(data.brandTopAds)) data.brandTopAds = [];
        const item = data.brandTopAds[targetIndex] || {};
        if (storedUrl && storedType === "video") item.video = storedUrl;
        if (storedUrl && storedType === "image") item.img = storedUrl;
        else if (previewUrl && !item.img) item.img = previewUrl;
        item.startDateUnix = startU || null;
        item.endDateUnix = stopU || null;
        item.startDate = startU ? new Date(startU * 1000).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "";
        item.active = active;
        item.daysActive = daysActive;
        if (pageName) item.pageName = pageName;
        if (Object.keys(metrics).length) item.metrics = metrics;
        item.ingestStatus = storedUrl ? "done" : "partial";
        item.ingestError = storedUrl ? "" : (mediaUrl ? "não deu para baixar/salvar a mídia" : "anúncio sem mídia pública acessível");
        item.ingestedAt = new Date().toISOString();
        data.brandTopAds[targetIndex] = item;
        return;
      }
      if (storedUrl) { data.video = storedUrl; if (!((data.transcricao || "").trim())) data.transcricaoStatus = "pending"; }
      data.fbStartDate = startU || null;
      data.fbEndDate = stopU || null;
      data.fbActive = active;
      data.fbDaysActive = daysActive;
      if (pageName) data.fbPageName = pageName;
      if (Object.keys(metrics).length) data.fbMetrics = metrics;
      data.fbIngestStatus = storedUrl ? "done" : "partial"; // partial = pegou dados mas não a mídia
      data.fbIngestError = storedUrl ? "" : (mediaUrl ? "não deu para baixar/salvar a mídia" : "anúncio sem mídia pública acessível");
      data.fbIngestAt = new Date().toISOString();
    });
    console.log(`fb-ingest ${id}${targetIndex == null ? "" : `/top-ad-${targetIndex}`}: media=${!!storedUrl} diasAtivo=${daysActive} ativo=${active}`);
  } catch (e) {
    const msg = String(e && e.message ? e.message : e).slice(0, 200);
    console.error("fb-ingest-background falhou:", msg);
    if (id && token) { try { await patchOffer(id, token, (data) => {
      if (targetIndex != null) { if (!Array.isArray(data.brandTopAds)) data.brandTopAds=[]; const item=data.brandTopAds[targetIndex]||{}; item.ingestStatus="error";item.ingestError=msg;item.ingestedAt=new Date().toISOString();data.brandTopAds[targetIndex]=item; }
      else { data.fbIngestStatus = "error"; data.fbIngestError = msg; data.fbIngestAt = new Date().toISOString(); }
    }); } catch {} }
  }
  return { statusCode: 202, body: "" };
};
