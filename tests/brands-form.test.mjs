import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

test("formulário Brands não exige o campo Taboola ausente",async()=>{
  const html=await readFile(new URL("../index.html",import.meta.url),"utf8");
  const render=html.match(/function renderTaboola\(\)\{([\s\S]*?)\n\}/)?.[1];
  assert.ok(render,"renderTaboola deve existir");
  assert.match(render,/const wrap=\$\("#tabWrap"\);\s*if\(!wrap\)return;/);
  assert.match(render,/wireZones\(wrap\)/);
});
