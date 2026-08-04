import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const adsPath = fileURLToPath(new URL("../scripts/ads_scraper.py", import.meta.url));
const ads = await readFile(new URL("../scripts/ads_scraper.py", import.meta.url), "utf8");
const transcription = await readFile(new URL("../scripts/transcrever.py", import.meta.url), "utf8");
const translation = await readFile(new URL("../scripts/traduzir_transcricoes.py", import.meta.url), "utf8");
const adsWorkflow = await readFile(new URL("../.github/workflows/ads-ativos.yml", import.meta.url), "utf8");
const transcriptionWorkflow = await readFile(new URL("../.github/workflows/transcrever-videos.yml", import.meta.url), "utf8");
const runtimeConfigPath = fileURLToPath(new URL("../scripts/runtime_config.py", import.meta.url));
const runtimeConfig = await readFile(new URL("../scripts/runtime_config.py", import.meta.url), "utf8");

test("workflows preferem secrets e recuperam somente a configuração pública da aplicação", () => {
  for (const workflow of [adsWorkflow, transcriptionWorkflow]) {
    assert.match(workflow, /SUPABASE_URL: \$\{\{ secrets\.SUPABASE_URL \}\}/);
    assert.match(workflow, /SUPABASE_ANON_KEY: \$\{\{ secrets\.SUPABASE_ANON_KEY \}\}/);
  }
  for (const script of [ads, transcription, translation]) {
    assert.match(script, /supabase_public_config\(\)/);
  }
  assert.match(runtimeConfig, /DEFAULT_SUPABASE_URL/);
  assert.match(runtimeConfig, /DEFAULT_SUPABASE_ANON_KEY/);
  assert.doesNotMatch(runtimeConfig, /https:\/\/[a-z]+\.supabase\.co/);
});

test("fallback público é resolvido e variáveis de ambiente têm precedência", () => {
  const code = String.raw`
import json, os, sys
sys.path.insert(0, os.path.dirname(sys.argv[1]))
from runtime_config import supabase_public_config
fallback = supabase_public_config()
os.environ["SUPABASE_URL"] = "https://override.invalid/"
os.environ["SUPABASE_ANON_KEY"] = "override-anon"
override = supabase_public_config()
assert fallback[0].endswith(".supabase.co") and len(fallback[1]) > 40, fallback
assert override == ("https://override.invalid", "override-anon"), override
print(json.dumps({"fallback_ok": True, "override": override}))
`;
  const output = execFileSync("python3", ["-c", code, runtimeConfigPath], { encoding: "utf8" });
  const result = JSON.parse(output);
  assert.equal(result.fallback_ok, true);
  assert.deepEqual(result.override, ["https://override.invalid", "override-anon"]);
});

test("seleção de anúncios ativos é round-robin e guarda checkpoint por card", () => {
  assert.match(ads, /def round_robin_targets\(targets, limit\):/);
  assert.match(ads, /analysisCursorAt/);
  assert.match(ads, /eligible_count = len\(targets\)/);
  assert.match(ads, /selected=len\(targets\)/);
  assert.doesNotMatch(ads, /targets = targets\[:MAX_OFFERS\]/);
});

test("histórico preserva duas leituras do mesmo dia com timestamps distintos", () => {
  const code = String.raw`
import importlib.util, json, sys, types
from pathlib import Path
sys.path.insert(0, str(Path(sys.argv[1]).resolve().parent))
playwright = types.ModuleType("playwright")
sync_api = types.ModuleType("playwright.sync_api")
sync_api.sync_playwright = lambda: None
sys.modules["playwright"] = playwright
sys.modules["playwright.sync_api"] = sync_api
spec = importlib.util.spec_from_file_location("ads_scraper_test", sys.argv[1])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
from datetime import datetime, timezone
data = {"adsHistory": [{"d":"2026-08-04", "at":"2026-08-04T11:00:00Z", "n":10}]}
result = module.update_history(data, 12, datetime(2026,8,4,23,0,tzinfo=timezone.utc))
same_day = [point for point in result if point["d"] == "2026-08-04"]
assert len(same_day) == 2, same_day
assert same_day[0]["n"] == 10 and same_day[1]["n"] == 12, same_day
print(json.dumps(same_day))
`;
  const output = execFileSync("python3", ["-c", code, adsPath], { encoding: "utf8" });
  const points = JSON.parse(output);
  assert.equal(points.length, 2);
  assert.notEqual(points[0].at, points[1].at);
});

test("tradução cobre Criativos e Mega Brain e recupera locks antigos", () => {
  assert.match(transcriptionWorkflow, /TRANSLATE_KINDS: "criativo,megabrain"/);
  assert.match(transcriptionWorkflow, /TRANSLATION_LOCK_MINUTES: "45"/);
  assert.match(translation, /TRANSLATE_KINDS/);
  assert.match(translation, /"criativo,megabrain"/);
  assert.match(translation, /data\.get\("kind"\) not in TRANSLATE_KINDS/);
  assert.match(translation, /transcricaoPtIniciadaEm/);
  assert.match(translation, /timedelta\(minutes=LOCK_MINUTES\)/);
});
