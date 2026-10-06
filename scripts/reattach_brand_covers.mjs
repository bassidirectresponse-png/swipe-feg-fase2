// Repara exclusivamente os dois cards relatados, sem sobrescrever outros dados.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { projectConfig } from "./_supabase-auth.mjs";

const targets = [
  { name: "Balls N Brains", brand: "Balls N Brains", file: new URL("../assets/balls-n-brains/product-cover.png", import.meta.url), path: "brands/balls-n-brains" },
  { name: "Joymode", brand: "Joymode", file: new URL("../assets/joymode/product-cover.png", import.meta.url), path: "brands/joymode" },
];
const token = String(process.env.SUPABASE_BOT_ACCESS_TOKEN || "").trim();
if (!token) throw new Error("sessão temporária de automação ausente");
const { url, anonKey } = await projectConfig();
const headers = { apikey: anonKey, Authorization: `Bearer ${token}` };
const query = new URL(`${url}/rest/v1/offers`);
query.searchParams.set("select", "id,data");
query.searchParams.set("data->>kind", "eq.brandsvalidated");
query.searchParams.set("limit", "1000");
const catalogResponse = await fetch(query, { headers, signal: AbortSignal.timeout(20_000) });
if (!catalogResponse.ok) throw new Error(`leitura dos cards recusada: HTTP ${catalogResponse.status}`);
const catalog = await catalogResponse.json();

const plans = await Promise.all(targets.map(async target => {
  const matches = catalog.filter(row => String(row.data?.nomeOferta || "").trim().toLowerCase() === target.name.toLowerCase()
    && String(row.data?.nomeMarca || "").trim().toLowerCase() === target.brand.toLowerCase());
  if (matches.length !== 1) throw new Error(`${target.name}: esperava 1 card exato, encontrei ${matches.length}`);
  const bytes = await readFile(target.file);
  if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error(`${target.name}: PNG original inválido`);
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 20);
  const path = `${target.path}/reattached-${hash}.png`;
  return { target, row: matches[0], bytes, path, publicUrl: `${url}/storage/v1/object/public/criativos/${path}` };
}));

for (const plan of plans) {
  const upload = await fetch(`${url}/storage/v1/object/criativos/${plan.path}`, {
    method: "POST", headers: { ...headers, "Content-Type": "image/png", "x-upsert": "true", "cache-control": "31536000" },
    body: plan.bytes, signal: AbortSignal.timeout(25_000),
  });
  if (!upload.ok) throw new Error(`${plan.target.name}: upload recusado HTTP ${upload.status}`);
  const check = await fetch(plan.publicUrl, { method: "GET", signal: AbortSignal.timeout(15_000) });
  if (!check.ok || !String(check.headers.get("content-type") || "").startsWith("image/png")) throw new Error(`${plan.target.name}: imagem pública indisponível (HTTP ${check.status})`);
  const uploaded = Buffer.from(await check.arrayBuffer());
  if (!uploaded.equals(plan.bytes)) throw new Error(`${plan.target.name}: bytes públicos divergem do original`);
}

for (const plan of plans) {
  const saved = await fetch(`${url}/rest/v1/rpc/swipe_merge_offer_data`, {
    method: "POST", headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ p_id: plan.row.id, p_patch: { imagemProduto: plan.publicUrl } }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!saved.ok) throw new Error(`${plan.target.name}: atualização recusada HTTP ${saved.status}`);
  const verify = await fetch(`${url}/rest/v1/offers?id=eq.${encodeURIComponent(plan.row.id)}&select=id,data`, { headers, signal: AbortSignal.timeout(15_000) });
  if (!verify.ok || (await verify.json())[0]?.data?.imagemProduto !== plan.publicUrl) throw new Error(`${plan.target.name}: URL não persistiu no card`);
  console.log(`${plan.target.name}: imagem original reanexada e verificada no card ${plan.row.id}`);
}
