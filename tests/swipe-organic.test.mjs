import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const importer = fs.readFileSync(new URL("../netlify/functions/admin-creative-import.mjs", import.meta.url), "utf8");
const mediaTicket = fs.readFileSync(new URL("../netlify/functions/admin-media-ticket.mjs", import.meta.url), "utf8");

test("Swipe Organic is directly below Swipe de Criativos and has no niche routes", () => {
  const creative = html.indexOf('{key:"criativo",label:"Swipe de Criativos"');
  const organic = html.indexOf('{key:"organic",label:"Swipe Organic"');
  const presell = html.indexOf('{key:"presell",label:"Presell / Advertorial"');
  assert.ok(creative >= 0 && organic > creative && presell > organic);
  assert.match(html, /organic:"swipe-organic"/);
  assert.doesNotMatch(html, /NICHE_SECTIONS=new Set\([^\n]*"organic"/);
  assert.match(html, /if\(NICHE_SECTIONS\.has\(activeSection\)/);
});

test("organic cards reuse the creative transcription and translation pipeline", () => {
  assert.match(html, /d\.kind==="criativo"&&d\.division==="organic"/);
  assert.match(html, /case "organic":return criativoCard\(o\)/);
  assert.match(html, /organic\?"VIDEO ORGANICO":d\.collectionLabel/);
  assert.match(importer, /collectionLabel: "VIDEO ORGANICO"/);
  assert.match(html, /transcricaoPtStatus:"pending"/);
  assert.match(html, /transcriptionProvider:"faster-whisper"/);
});

test("creative and organic swipes always paginate newest materials first", () => {
  assert.match(html, /RECENT_FIRST_SECTIONS=new Set\(\["criativo","organic"\]\)/);
  assert.match(html, /function recentFirstFn\(a,b\)/);
  assert.match(html, /return bt-at/);
  assert.match(html, /RECENT_FIRST_SECTIONS\.has\(activeSection\)\?\[\.\.\.list\]\.sort\(recentFirstFn\):list/);
});

test("organic folder import validates, deduplicates, preserves relative source and uses public storage", () => {
  assert.match(html, /buildOrganicManifest\(files,existingSources\)/);
  assert.match(html, /organicSourceFile\(file\)/);
  assert.match(html, /!name\.includes\("\."\)/);
  assert.match(html, /organic\/ad-feg-ed\/\$\{uid\}/);
  assert.match(html, /\[ORG ED\]/);
  assert.match(importer, /organicMode = body\.division === "organic"/);
  assert.match(importer, /organic\/ad-feg-ed/);
  assert.match(mediaTicket, /organic\\\/ad-feg-ed/);
  assert.match(importer, /transcriptionRequired: true/);
});
