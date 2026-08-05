import fs from "node:fs/promises";
import { productionAdminAuth, authHeaders } from "./_supabase-auth.mjs";

const backupPath = process.argv[2];
if (!backupPath) throw new Error("Informe o arquivo de backup.");

const backup = JSON.parse(await fs.readFile(backupPath, "utf8"));
const auth = await productionAdminAuth();
const headers = authHeaders(auth, { "Content-Type": "application/json" });
const isRestoredAsset = value => /^\/assets\/(?:offers-july(?:22|29)|(?:ancestral-supplements|mars-men|primal-viking|ultima-peak))\//.test(String(value || ""));

async function request(endpoint, options = {}) {
  const response = await fetch(`${auth.url}${endpoint}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase HTTP ${response.status}: ${text.slice(0, 240)}`);
  return text ? JSON.parse(text) : null;
}

let cards = 0;
let fields = 0;
for (const saved of backup.rows || []) {
  const rows = await request(`/rest/v1/offers?id=eq.${encodeURIComponent(saved.id)}&select=data&limit=1`);
  if (!rows?.length) continue;
  const current = structuredClone(rows[0].data || {});
  const before = saved.data || {};
  let changed = false;

  if (isRestoredAsset(current.imagemProduto) && current.imagemProduto !== before.imagemProduto) {
    current.imagemProduto = before.imagemProduto;
    changed = true;
    fields += 1;
  }

  const previousDomains = Array.isArray(before.dominios) ? before.dominios : [];
  current.dominios = (Array.isArray(current.dominios) ? current.dominios : []).map((domain, index) => {
    const previous = previousDomains[index] || {};
    const next = { ...domain };
    for (const field of ["printPV", "printCheckout"]) {
      if (isRestoredAsset(next[field]) && next[field] !== previous[field]) {
        next[field] = previous[field];
        changed = true;
        fields += 1;
      }
    }
    return next;
  });

  if (!changed) continue;
  await request(`/rest/v1/offers?id=eq.${encodeURIComponent(saved.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ data: current }),
  });
  cards += 1;
}

console.log(JSON.stringify({ backupPath, cardsRolledBack: cards, fieldsRolledBack: fields }, null, 2));
