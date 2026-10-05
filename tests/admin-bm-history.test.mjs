import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { adminBmHistory } from "../netlify/functions/_admin-bm-history-generated.mjs";
import handler from "../netlify/functions/admin-bm-history.mjs";

const offerId = "23681d5a-89f6-4f41-8afb-ba3c8ab9bed9";
const url = "https://benchmarkinggrupofeg.site/.netlify/functions/admin-bm-history";

test("migração histórica mantém os quatro recortes para auditoria, mas identifica a marca incorreta", async () => {
  const source = await readFile(new URL("../supabase/migrations/202609290001_admin_only_ultima_peak_september_draft.sql", import.meta.url), "utf8");
  const raw = source.match(/\$draft\$(\{[\s\S]*?\})\$draft\$::jsonb/)?.[1];
  assert.deepEqual(adminBmHistory[offerId], JSON.parse(raw));
  const reports = adminBmHistory[offerId].bmReports;
  assert.deepEqual(reports.map(item => item.key), ["2026-09-18-30d", "2026-09-18-14d", "2026-09-18-7d", "2026-09-18-1d"]);
  assert.deepEqual(reports.map(item => item.totals.spend), ["US$ 34.397,81", "US$ 16.027,54", "US$ 8.379,11", "US$ 1.132,04"]);
  assert.deepEqual(reports.map(item => item.totals.results), ["395 compras", "180 compras", "89 compras", "16 compras"]);
  assert.equal(reports[0].campaigns.at(-1).results, "76 visitas (não compras)");
  assert.ok(reports.some(report => report.campaigns.some(row => /\|\s*BnB\s*\|/i.test(row.name))));
});

test("endpoint do histórico rejeita anônimo e usuário comum, atende apenas admin", async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const request = new Request(url, { headers: { Authorization: "Bearer test-token", Origin: "https://benchmarkinggrupofeg.site" } });
  globalThis.fetch = async () => Response.json({ id: "ordinary-user", email: "ordinary@example.com" });
  assert.equal((await handler(request)).status, 403);
  globalThis.fetch = async () => Response.json({ id: "ff9e002e-7ed1-4bc3-8571-18ffcb0c95c3", email: "adminswipefeg@swipefeg.app" });
  const allowed = await handler(request);
  assert.equal(allowed.status, 200);
  assert.equal((await allowed.json()).patches[offerId], undefined);
  assert.equal((await handler(new Request(url))).status, 401);
});
