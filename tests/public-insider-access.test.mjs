import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../index.html", import.meta.url), "utf8");

assert.match(source, /function insiderOverride\(o\)\{if\(!o\|\|sectionOf\(o\)!=="brandsvalidated"\)/);
assert.match(source, /function isInsiderAdminArea\(\)\{return activeSection==="brandsvalidated";\}/);
assert.match(source, /activeBrand=\(BRAND_OFFER_SECTIONS\.has\(activeSection\)/);
assert.match(source, /validated=sectionOf\(o\)==="brandsvalidated",clean=validated/);
assert.match(source, /\$\{d\.imagemProduto\?`<img class="img"/);
assert.match(source, /const interactiveInsider=true/);
