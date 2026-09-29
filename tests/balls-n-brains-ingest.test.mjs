import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../scripts/ingest_balls_n_brains.mjs", import.meta.url), "utf8");

assert.match(source, /nomeOferta: "Balls N Brains"/);
assert.match(source, /nicho: "Saúde masculina"/);
assert.match(source, /bmReports: reports/);
assert.match(source, /"2026-09-18-1d"/);
assert.match(source, /"2026-09-18-7d"/);
assert.match(source, /"2026-09-18-14d"/);
assert.match(source, /"2026-09-18-30d"/);
assert.match(source, /"34\.397,81"/);
assert.match(source, /Aquec: 76 visitas à página\/perfil/);
assert.match(source, /brandTopAds: topAdLinks\.map/);
assert.match(source, /Anúncio \$\{index \+ 1\} — Setembro 2026 — 12 a 18/);
assert.match(source, /bmPrints: \[\]/);
