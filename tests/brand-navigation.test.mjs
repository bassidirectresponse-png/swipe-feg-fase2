import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("admin agrupa Geral, Insider e Criativos por nicho e produto sem descartar dados", () => {
  assert.match(html, /function catalogNiches\(\)/);
  assert.match(html, /function renderAdminGeneral\(items\)/);
  assert.match(html, /function renderAdminInsider\(items\)/);
  assert.match(html, /function renderAdminBrandHub\(items\)/);
  assert.match(html, /const productMenu=niche=>/);
  assert.match(html, /if\(selected\)nicheHtml\+=productMenu\(n\)/);
  assert.match(html, /if\(sectionOf\(o\)==="brandsvalidated"\)return insiderNicheOf\(o\)/);
  assert.match(html, /niche===BRAND_NICHE_REVIEW\?NO_NICHE:niche/);
  assert.match(html, /const selectedNiche=niche===NO_NICHE\?BRAND_NICHE_REVIEW:niche/);
  assert.match(html, /const BRAND_CREATIVE_NICHE_OVERRIDES=\{"balls-n-brains":"Saúde masculina"\}/);
  assert.match(html, /function brandHubItems\(\)\{return offers\.filter\(o=>sectionOf\(o\)==="brandcreative"\);\}/);
  assert.doesNotMatch(html, /list=list\.filter\(o=>INSIDER_NICHES\.some/);
});

test("Notícias e Radar recebem os nichos de Brands sem nova coleta automática", () => {
  assert.match(html, /function topicNicheOf\(o\)/);
  assert.match(html, /activeSection==="noticia"\|\|activeSection==="tiktok"/);
  const radar = execFileSync("python3", ["scripts/tiktok_mining.py", "--list-taxonomy"], { cwd: fileURLToPath(new URL("..", import.meta.url)) });
  const info = JSON.parse(radar.toString());
  assert.equal(info.provider_calls, 0);
  for (const niche of ["Saúde masculina", "Saúde feminina", "Saúde Cardiovascular", "Saúde íntima / libido", "Sono/ Beleza", "Saúde Geral/Nutrição"]) {
    assert.ok(info.brands_prepared[niche]?.queries.length);
    assert.ok(info.brands_prepared[niche]?.must.length);
  }
});

test("Radar TikTok de Brands limita a coleta diária e preserva a taxonomia Insider", () => {
  const workflow = readFileSync(new URL("../.github/workflows/tiktok-mining.yml", import.meta.url), "utf8");
  const miner = readFileSync(new URL("../scripts/tiktok_mining.py", import.meta.url), "utf8");
  assert.match(workflow, /ENABLE_BRAND_NICHES: "1"/);
  assert.match(workflow, /MAX_PER_NICHE: "50"/);
  assert.match(workflow, /RADAR_GENERATION: "brands-2026-10-05"/);
  assert.match(workflow, /PER_KEYWORD: "20"/);
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /github-automation-token/);
  assert.match(workflow, /SUPABASE_BOT_ACCESS_TOKEN=/);
  assert.doesNotMatch(workflow, /secrets\.SUPABASE_BOT_PASSWORD/);
  assert.match(html, /function syncRadarGeneration\(rows\)/);
  assert.match(html, /if\(d\.kind==="tiktok"&&activeRadarGeneration&&d\.radarGeneration!==activeRadarGeneration\)return"tiktok-archive"/);
  assert.match(miner, /active_niches = BRAND_NICHES if brand_enabled else NICHES/);
  assert.match(miner, /rec\["radarGeneration"\] = RADAR_GENERATION/);
  assert.match(miner, /\[:MAX_PER_NICHE\]/);
});

test("Radar novo conserva geração e não duplica vídeos entre nichos", () => {
  const code = `import importlib.util,json\n`+
    `s=importlib.util.spec_from_file_location('miner','scripts/tiktok_mining.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)\n`+
    `m.PROVIDER='apify';m.MAX_PER_NICHE=2;m.fetch_niche=lambda queries,count:[('apify',{'id':v}) for v in ['shared',queries[0]+'-1',queries[0]+'-2']]\n`+
    `m.normalize=lambda provider,v,n:{'videoId':v['id'],'dataPub':m.NOW,'isAd':False,'views':100,'faixa':'mid','caption':'test','hashtags':[]}\n`+
    `m.relevant=lambda rec,must:True\n`+
    `out=m.collect({'A':{'queries':['a'],'must':[]},'B':{'queries':['b'],'must':[]}})\n`+
    `print(json.dumps({n:[(v['videoId'],v['radarGeneration']) for v in rows] for n,rows in out.items()}))`;
  const output = execFileSync("python3", ["-c",code], { cwd: fileURLToPath(new URL("..", import.meta.url)) }).toString();
  const result = JSON.parse(output.trim().split("\n").at(-1));
  assert.equal(result.A.length,2);
  assert.equal(result.B.length,2);
  assert.equal(new Set([...result.A,...result.B].map(([id])=>id)).size,4);
  assert.ok([...result.A,...result.B].every(([,generation])=>generation==="brands-2026-10-05"));
});
