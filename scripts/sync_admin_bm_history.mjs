import { readFile, writeFile } from "node:fs/promises";

const source = new URL("../supabase/migrations/202609290001_admin_only_ultima_peak_september_draft.sql", import.meta.url);
const target = new URL("../netlify/functions/_admin-bm-history-generated.mjs", import.meta.url);
const sql = await readFile(source, "utf8");
const offerId = sql.match(/'([0-9a-f-]{36})',\s*'Ultima Peak · Setembro 2026'/)?.[1];
const raw = sql.match(/\$draft\$(\{[\s\S]*?\})\$draft\$::jsonb/)?.[1];
if (!offerId || !raw) throw new Error("Dados da leitura de setembro não encontrados na migração");
const patch = JSON.parse(raw);
if (!Array.isArray(patch.bmReports) || patch.bmReports.length !== 4) throw new Error("Leitura de setembro incompleta");
const output = `// Gerado por scripts/sync_admin_bm_history.mjs. Edite a migração de origem.\nexport const adminBmHistory = ${JSON.stringify({ [offerId]: patch }, null, 2)};\n`;
if (process.argv.includes("--check")) {
  if (await readFile(target, "utf8").catch(() => "") !== output) throw new Error("Histórico administrativo desatualizado; rode npm run bm:sync");
} else await writeFile(target, output);
