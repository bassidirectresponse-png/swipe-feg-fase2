import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

const read = path => readFile(new URL(path, root), "utf8");

test("ingestão manual é autenticada, validada e idempotente", async () => {
  const source = await read("netlify/functions/manual-ingest-n8n.mjs");
  assert.match(source, /N8N_MANUAL_INGEST_SECRET/);
  assert.match(source, /isAdmin\(user\)/);
  assert.match(source, /mode === "apply" \? "apply" : "validate"/);
  assert.match(source, /o lote excede o limite de 100 itens/);
  assert.match(source, /plannedAdUrls/);
  assert.match(source, /resolution=ignore-duplicates/);
  assert.match(source, /sourceOfferId/);
  assert.match(source, /transcriptionStatus: item\.copy \? "completed" : "pending"/);
  assert.match(source, /mediaArchiveStatus: item\.video \? "completed" : "pending"/);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY\s*=/);
});

test("workflow n8n é manual, valida antes de aplicar e não agenda execuções", async () => {
  const raw = await read("n8n/workflows/swipe-manual-ingestion.json");
  const workflow = JSON.parse(raw);
  const types = workflow.nodes.map(node => node.type);
  assert.ok(types.includes("n8n-nodes-base.webhook"));
  assert.ok(types.includes("n8n-nodes-base.httpRequest"));
  assert.ok(!types.some(type => /schedule|cron/i.test(type)));
  assert.match(raw, /manual-ingest-n8n/);
  assert.match(raw, /mode: 'validate'/);
  assert.match(raw, /mode: 'apply'/);
  assert.match(raw, /N8N_MANUAL_INGEST_SECRET/);
  assert.doesNotMatch(raw, /SUPABASE_SERVICE_ROLE_KEY|service_role/i);
  assert.equal(workflow.active, false);
});

test("histórico de atualizações permanece somente no painel admin", async () => {
  const sql = await read("supabase/migrations/202608050002_swipe_updates_admin_preview.sql");
  const html = await read("index.html");
  assert.match(sql, /create table if not exists public\.swipe_updates/);
  assert.match(sql, /using \(public\.swipe_is_admin\(\)\)/);
  assert.match(sql, /after insert on public\.offers/);
  assert.match(sql, /item_kind not in \('oferta', 'brandsgeneral', 'brandsvalidated', 'presell', 'criativo'\)/);
  assert.match(html, /ADMIN_SECTIONS=new Set\(\["updates"\]\)/);
  assert.match(html, /sb\.from\("swipe_updates"\)/);
  assert.match(html, /Atualização \[\$\{esc\(date\)\}\]/);
  assert.match(html, /snav__cnt--alert/);
});

test("ordenação de ofertas usa somente anúncios ativos e dias ativos", async () => {
  const html = await read("index.html");
  const metrics = await read("lib/swipe-metrics.js");
  assert.match(html, /const options=\[\["active_ads","Anúncios ativos"\],\["active_days","Dias ativos"\]\]/);
  assert.match(html, /offerSort=\["active_ads","active_days"\]\.includes/);
  assert.match(metrics, /function activeDays\(data\)/);
  assert.match(metrics, /if \(sort === "active_days"\) return activeDays\(data\)/);
});

test("skill de ingestão exige manifesto, validação e conferência pós-escrita", async () => {
  const skill = await read(".codex/skills/swipe-manual-ingestion/SKILL.md");
  const schema = await read(".codex/skills/swipe-manual-ingestion/references/manifest-schema.md");
  assert.match(skill, /execute primeiro com `mode: validate`/);
  assert.match(skill, /Não use caminhos locais do computador como mídia pública/);
  assert.match(skill, /Não declare sucesso se a aplicação ou a leitura posterior do card não tiver sido confirmada/);
  assert.match(schema, /"batchDate": "2026-08-05"/);
  assert.match(schema, /"creativeName": "\[ADS MM\]\[01\]"/);
  assert.doesNotMatch(skill, /\bTODO\b|\[TODO\]/i);
});
