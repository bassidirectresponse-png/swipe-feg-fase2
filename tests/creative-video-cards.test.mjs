import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("creative cards use video first frames regardless of ad platform", () => {
  assert.match(html, /const hasVid=!!va;/);
  assert.doesNotMatch(html, /const hasVid=!!va&&!tab;/);
  assert.match(html, /function creativeCardMedia\(d,video\)/);
  assert.match(html, /return video\?mediaThumb\("",d\.nome,true,video\):mediaThumb\(d\.print,d\.nome,false,""\)/);
  assert.match(html, /media:creativeCardMedia\(d,hasVid\?va:""\)/);
  assert.match(html, /data-card-video-poster=/);
  assert.match(html, /drawImage\(video,0,0,w,h\)/);
});

test("creative cards and details show their upload date", () => {
  assert.match(html, /function creativeUploadDate\(o\)/);
  assert.match(html, /timeZone:"America\/Sao_Paulo"/);
  assert.match(html, /creativeUploadMeta\(o\)/);
  assert.match(html, /Adicionado em <strong>/);
  assert.match(html, /<div class="k">Adicionado em<\/div>/);
});

test("creative details embed video and transcription for Taboola too", () => {
  assert.match(html, /const showVideo=!!va;/);
  assert.doesNotMatch(html, /const showVideo=!!va&&d\.plataforma!=="taboola"/);
  assert.match(html, /videoBlock\(va,d,true,d\.transcricaoStatus\)/);
  assert.match(html, /function transBox\(d,alwaysShow,status,syncable\)/);
  assert.match(html, /data-transcript-lang="original"/);
  assert.match(html, /data-transcript-lang="pt"/);
});
