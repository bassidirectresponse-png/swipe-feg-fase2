import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("o hardening restringe escrita e torna atualizações concorrentes atômicas", async () => {
  const sql = await readFile(new URL("db/swipe-production-hardening-v2.sql", root), "utf8");
  assert.match(sql, /create or replace function public\.swipe_can_write/);
  assert.match(sql, /userswipefeg@swipefeg\.app/);
  assert.match(sql, /create or replace function public\.swipe_merge_offer_data/);
  assert.match(sql, /data = coalesce\(data, '\{\}'::jsonb\) \|\| coalesce\(p_patch, '\{\}'::jsonb\)/);
  assert.match(sql, /on storage\.objects for insert to authenticated/);
  assert.match(sql, /file_size_limit = 167772160/);
  assert.doesNotMatch(sql, /to anon\b/);
});

test("usuários comuns não recebem permissão de escrita no hardening final", async () => {
  const sql = await readFile(new URL("supabase/migrations/202608050001_restrict_human_writes_to_admin.sql", root), "utf8");
  assert.match(sql, /adminswipefeg@swipefeg\.app/);
  assert.match(sql, /noticias-bot@swipefeg\.app/);
  assert.doesNotMatch(sql, /userswipefeg@swipefeg\.app/);
  assert.match(sql, /offers for insert to authenticated\s+with check \(public\.swipe_is_admin\(\)\)/);
  assert.match(sql, /offers for delete to authenticated\s+using \(public\.swipe_is_admin\(\)\)/);
  assert.match(sql, /offers for update to authenticated\s+using \(public\.swipe_can_write\(\)\)/);
});

test("o importador valida a mídia e cria backup antes de alterar cards", async () => {
  const source = await readFile(new URL("scripts/ingest_angelica_honeypeak.mjs", root), "utf8");
  assert.match(source, /assertStoredObject/);
  assert.match(source, /storageVideoFile/);
  assert.match(source, /"data->>autor": "ilike\.Ang\*"/);
  assert.match(source, /method: "HEAD"/);
  assert.match(source, /offers-before-angelica-honeypeak/);
  assert.match(source, /swipe_merge_offer_data/);
  assert.match(source, /await fs\.chmod\(backupPath, 0o600\)/);
});

test("o upload adapta videos grandes ao limite do bucket sem alterar o original", async () => {
  const source = await readFile(new URL("scripts/upload_angelica_honeypeak_media.mjs", root), "utf8");
  assert.match(source, /MAX_STORAGE_BYTES/);
  assert.match(source, /ffmpeg/);
  assert.match(source, /\.storage\.mp4/);
  assert.match(source, /storageBytes/);
  assert.match(source, /honeyStorageByHash/);
});

test("o backup diário é paginado, verificável e tem retenção limitada", async () => {
  const source = await readFile(new URL("scripts/backup_supabase_metadata.mjs", root), "utf8");
  const scheduled = await readFile(new URL("netlify/functions/supabase-metadata-backup.mjs", root), "utf8");
  const workflow = await readFile(new URL(".github/workflows/supabase-backup.yml", root), "utf8");
  assert.match(source, /PAGE_SIZE = 500/);
  assert.match(source, /sha256/);
  assert.match(source, /gzipSync/);
  assert.match(source, /mode: 0o600/);
  assert.match(scheduled, /schedule: "35 5 \* \* \*"/);
  assert.match(scheduled, /PAGE_SIZE = 500/);
  assert.match(scheduled, /RETENTION_DAYS = 30/);
  assert.match(scheduled, /supabase-metadata-backups/);
  assert.match(scheduled, /latest\.json/);
  assert.match(scheduled, /acquireAutomationLock/);
  assert.match(workflow, /cron: "35 5 \* \* \*"/);
  assert.match(workflow, /retention-days: 30/);
  assert.match(workflow, /persist-credentials: false/);
});

test("o lote administrativo pagina o acervo em vez de pressionar o banco inteiro", async () => {
  const source = await readFile(new URL("netlify/functions/admin-offer-batch.mjs", root), "utf8");
  assert.match(source, /const PAGE_SIZE = 500/);
  assert.match(source, /async function restAll/);
  assert.match(source, /"Range-Unit": "items"/);
  assert.match(source, /await restAll\("offers\?select=id,created_at,data&order=created_at\.asc"/);
});
