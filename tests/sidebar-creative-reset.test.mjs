import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BRAND_CREATIVE_GENERATION, brandCreativeArchived } from "../lib/brand-creative-policy.mjs";
import { mediaArchiveDue, transcriptionDue } from "../netlify/functions/_creative-integrity.mjs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const functionSource = name => html.slice(html.indexOf(`function ${name}(`), html.indexOf("\nfunction ", html.indexOf(`function ${name}(`) + 1));

test("seletores preservam o nó e adiam refresh até blur, sem duplicar listeners", () => {
  for (const id of ["offerSort", "offerDirection", "offerTagFilter"]) {
    const listeners = [], timers = [], doc = {};
    let refreshes = 0;
    const select = { id, tagName: "SELECT", addEventListener: (...args) => listeners.push(args) };
    const panel = { contains: element => element === select };
    const guard = new Function("document", "setTimeout", "renderSubFilter", `
      let activeSection="brandsvalidated",renderedSubFilterSection="brandsvalidated";
      const deferredFilterRefresh=new WeakSet();
      ${functionSource("preserveOpenFilter")}
      return {hold:preserveOpenFilter, section:value=>activeSection=value};
    `)(doc, callback => timers.push(callback), () => refreshes++);
    doc.activeElement = select;
    assert.equal(guard.hold(panel), true);
    assert.equal(guard.hold(panel), true);
    assert.equal(listeners.length, 1);
    assert.equal(listeners[0][0], "blur");
    assert.deepEqual(listeners[0][2], { once: true });
    doc.activeElement = null;
    listeners[0][1](); timers[0]();
    assert.equal(refreshes, 1);
    assert.equal(guard.hold(panel), false);
    doc.activeElement = select; guard.section("tiktok");
    assert.equal(guard.hold(panel), false, "navegar de seção não deve preservar filtros antigos");
  }
  assert.match(html, /if\(preserveOpenFilter\(el\)\)return;[\s\S]*renderedSubFilterSection=activeSection/);
});

test("acervo anterior de Brands fica arquivado sem atingir ofertas, Organic ou Radar", () => {
  assert.match(html, new RegExp(`const BRAND_CREATIVE_GENERATION="${BRAND_CREATIVE_GENERATION}"`));
  const old = { kind: "criativo", division: "fegbrands", video: "original.mp4", sourceOfferId: "preservado" };
  const before = structuredClone(old);
  assert.equal(brandCreativeArchived(old), true);
  assert.deepEqual(old, before);
  for (const data of [{kind:"brandsvalidated",brandTopAds:[old]}, {kind:"brandsgeneral"}, {kind:"criativo",division:"organic"}, {kind:"criativo"}, {kind:"tiktok"}]) {
    assert.equal(brandCreativeArchived(data), false);
  }
  assert.equal(brandCreativeArchived({...old,brandCreativeGeneration:BRAND_CREATIVE_GENERATION}),false);
  const classify = new Function("brandCreativeArchived", "RADAR_GENERATION", "SECTIONS", `${functionSource("sectionOf").split("\n")[0]}; return sectionOf;`)(brandCreativeArchived, "radar", [{key:"brandsvalidated"},{key:"organic"},{key:"criativo"}]);
  assert.equal(classify({data:old}),"brandcreative-archive");
  assert.equal(classify({data:{kind:"brandsvalidated"}}),"brandsvalidated");
  assert.equal(classify({data:{kind:"criativo",division:"organic"}}),"organic");
  assert.equal(classify({data:{kind:"criativo"}}),"criativo");
});

test("filas antigas não baixam, sobem ou transcrevem criativos arquivados", () => {
  const old = {kind:"criativo",division:"fegbrands",sourceOfferId:"offer",linkAnuncio:"https://fb.me/adspreview/facebook/test",video:"https://example.supabase.co/storage/v1/object/public/criativos/ad.mp4"};
  assert.equal(mediaArchiveDue({...old,video:""}),false);
  assert.equal(transcriptionDue(old),false);
  for (const name of ["fb-ingest-background", "offer-creative-archive-background", "transcribe-background"]) {
    const worker = readFileSync(new URL(`../netlify/functions/${name}.mjs`, import.meta.url),"utf8");
    assert.match(worker,/if \(brandCreativeArchived\([^)]*\)\) return \{ statusCode: 202, body: "" \}/);
  }
  assert.match(functionSource("creativeNeedsTranslation"),/if\(brandCreativeArchived\(d\)\)return false/);
  assert.match(functionSource("offerCreativeNeedsArchive"),/if\(brandCreativeArchived\(d\)\)return false/);
});

test("lateral ocupa viewport e mantém navegação rolável com rodapé separado", () => {
  assert.match(html,/height:calc\(100dvh - var\(--topbar-h\)\)/);
  assert.match(html,/\.sidenav__body\{flex:1;min-height:0;overflow-y:auto/);
  assert.match(html,/aria-label="Navegação FEG Brands"/);
  assert.match(html,/sidenav__footer/);
  assert.match(html,/n\.inert=mobile&&!opened/);
  assert.match(html,/setAttribute\("aria-expanded",String\(mobile&&opened\)\)/);
  assert.match(html,/event\.key==="Escape"\)\{event\.preventDefault\(\);closeSideNav\(\)/);
  assert.match(html,/\.sidenav__body",nav\)\.scrollTop=scrollTop/);
  assert.match(html,/@media\(prefers-reduced-motion:reduce\)\{\.sidenav/);
  assert.match(html,/Acervo de top ads em preparação/);
  assert.doesNotMatch(html,/Subir Balls n Brains/);
});
