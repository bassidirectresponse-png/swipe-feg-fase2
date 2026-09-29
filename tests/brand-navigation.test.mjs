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
  assert.match(html, /activeSection==="brandcreative"\|\|activeSection==="brandsgeneral"\)&&isAdmin&&activeBrand/);
  assert.match(html, /activeSection==="brandcreative"\|\|activeSection==="brandsgeneral"/);
  assert.match(html, /if\(sectionOf\(o\)==="brandsvalidated"\)return insiderNicheOf\(o\)/);
  assert.match(html, /niche===BRAND_NICHE_REVIEW\?NO_NICHE:niche/);
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
