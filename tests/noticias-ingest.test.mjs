import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const root = new URL("../", import.meta.url);
const html = await readFile(new URL("index.html", root), "utf8");
const script = await readFile(new URL("scripts/noticias_ingest.py", root), "utf8");
const workflow = await readFile(new URL(".github/workflows/noticias-24h.yml", root), "utf8");
const oidc = await readFile(new URL("netlify/functions/_github-oidc.mjs", root), "utf8");
const topics = JSON.parse(html.match(/const RADAR_TOPICS=(\{[^;]+\});/)[1]);

test("notícias usa exatamente os sete nichos e temas de Ofertas/Radar", () => {
  const python = `import json, sys\nsys.path.insert(0, 'scripts')\nimport noticias_ingest as n\nprint(json.dumps({'niches': list(n.NICHE_FEEDS), 'topics': {k: list(v) for k,v in n.TOPIC_TERMS.items()}}, ensure_ascii=False))`;
  const actual = JSON.parse(execFileSync("python3", ["-c", python], { cwd: new URL(".", root), encoding: "utf8" }));
  assert.deepEqual(actual.niches, Object.keys(topics));
  assert.deepEqual(actual.topics, topics);
  assert.match(html, /function newsItems\(\)\{return offers\.filter\(o=>sectionOf\(o\)==="noticia"&&newsNicheOf\(o\)\);\}/);
  assert.match(html, /if\(section==="noticia"\)return RADAR_NICHES/);
});

test("coleta ignora assuntos antigos e notícias sem relação com o nicho", () => {
  const python = `import json, sys\nsys.path.insert(0, 'scripts')\nimport noticias_ingest as n\nfixture='<rss><channel><item><title>New study of prostate health</title><link>https://example.com/prostate</link></item><item><title>Ozempic weight loss trend</title><link>https://example.com/weight</link></item><item><title>Movie star red carpet</title><link>https://example.com/movie</link></item></channel></rss>'.encode()\nn.http_get=lambda url: fixture\nrows=n.collect()\nprint(json.dumps({k:[(r['nome'], r['subnicho']) for r in v] for k,v in rows.items()}, ensure_ascii=False))`;
  const actual = JSON.parse(execFileSync("python3", ["-c", python], { cwd: new URL(".", root), encoding: "utf8" }));
  assert.deepEqual(actual["Saúde masculina"].map(([title]) => title), Array(actual["Saúde masculina"].length).fill("New study of prostate health"));
  assert.ok(actual["Saúde masculina"].every(([, topic]) => topic === "Próstata"));
  assert.ok(Object.values(actual).flat().every(([title]) => !/Ozempic|Movie star/.test(title)));
  assert.doesNotMatch(script, /TMZ|Page Six|ENABLE_BRAND_NICHES/);
});

test("job diário usa sessão OIDC autorizada em vez da senha antiga", () => {
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /github-automation-token/);
  assert.match(workflow, /SUPABASE_BOT_ACCESS_TOKEN/);
  assert.doesNotMatch(workflow, /secrets\.SUPABASE_BOT_PASSWORD/);
  assert.match(oidc, /"noticias-24h\.yml"/);
});
