#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { setTimeout as pause } from "node:timers/promises";
import {
  buildCostControlledApifyInput,
  extractOfferSearchTargets,
  planDiscoveredLibraries,
} from "../lib/apify-offer-discovery.mjs";

const ACTOR = "apify~facebook-ads-scraper";
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const offerFilter = (args.find(a => a.startsWith("--offer="))?.split("=")[1] || process.env.DISCOVER_OFFER || "").trim().toLowerCase();
const maxOffers = Math.max(1, Math.min(10, Number(args.find(a => a.startsWith("--max-offers="))?.split("=")[1] || process.env.DISCOVER_MAX_OFFERS || 3)));
const resultsLimit = Math.max(5, Math.min(25, Number(args.find(a => a.startsWith("--results-limit="))?.split("=")[1] || process.env.DISCOVER_RESULTS_LIMIT || 15)));

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const supabaseUrl = html.match(/const DEFAULT_URL="([^"]+)"/)?.[1];
const anonKey = html.match(/const DEFAULT_KEY="([^"]+)"/)?.[1];
if (!supabaseUrl || !anonKey) throw new Error("Configuração pública do Supabase ausente");

const botToken = (process.env.SUPABASE_BOT_ACCESS_TOKEN || "").trim();
const apifyToken = (process.env.APIFY_TOKEN || "").trim();
if (!botToken) throw new Error("SUPABASE_BOT_ACCESS_TOKEN é obrigatório");
if (!dryRun && !apifyToken) throw new Error("APIFY_TOKEN é obrigatório exceto em --dry-run");

const supabaseHeaders = { apikey: anonKey, Authorization: `Bearer ${botToken}` };

async function fetchCandidates() {
  const url = new URL(`${supabaseUrl}/rest/v1/offers`);
  url.searchParams.set("select", "id,data");
  url.searchParams.set("order", "created_at.desc");
  url.searchParams.set("limit", "200");
  const res = await fetch(url, { headers: supabaseHeaders, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`Falha ao ler ofertas: HTTP ${res.status}`);
  const rows = await res.json();
  return rows.filter(row => {
    const d = row?.data || {};
    if (!["oferta", "brandsgeneral", "brandsvalidated"].includes(d.kind || "oferta")) return false;
    if ((d.tipoTrafego || "meta") !== "meta") return false;
    if (offerFilter) {
      const hay = `${row.id} ${d.nomeOferta || ""} ${d.nomeMarca || ""}`.toLowerCase();
      if (!hay.includes(offerFilter)) return false;
    }
    return extractOfferSearchTargets(d).searchUrls.length > 0;
  }).slice(0, maxOffers);
}

async function runApify(searchUrls) {
  const { actorInput, runOptions } = buildCostControlledApifyInput(searchUrls, {
    maxQueries: 2,
    resultsLimit,
    memoryMbytes: 1024,
    timeoutSecs: 120,
  });
  const headers = { Authorization: `Bearer ${apifyToken}`, "Content-Type": "application/json" };
  const startUrl = `https://api.apify.com/v2/acts/${ACTOR}/runs?timeout=${runOptions.timeoutSecs}&memory=${runOptions.memoryMbytes}&maxItems=${runOptions.maxItems}`;
  const startRes = await fetch(startUrl, { method: "POST", headers, body: JSON.stringify(actorInput), signal: AbortSignal.timeout(30_000) });
  if (!startRes.ok) throw new Error(`Apify HTTP ${startRes.status}: ${(await startRes.text()).slice(0, 160)}`);
  let run = (await startRes.json())?.data;
  const deadline = Date.now() + 120_000;
  while (!["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(run?.status) && Date.now() < deadline) {
    await pause(5_000);
    const pollRes = await fetch(`https://api.apify.com/v2/actor-runs/${run.id}?waitForFinish=20`, { headers, signal: AbortSignal.timeout(30_000) });
    if (pollRes.ok) run = (await pollRes.json())?.data || run;
  }
  if (run?.status !== "SUCCEEDED" || !run.defaultDatasetId) throw new Error(`Apify status: ${run?.status}`);
  const itemsRes = await fetch(`https://api.apify.com/v2/datasets/${run.defaultDatasetId}/items?clean=true&limit=${runOptions.maxItems}`, { headers, signal: AbortSignal.timeout(30_000) });
  if (!itemsRes.ok) throw new Error(`Dataset HTTP ${itemsRes.status}`);
  return { runId: run.id, items: await itemsRes.json(), budget: runOptions };
}

const candidates = await fetchCandidates();
const summary = [];
for (const row of candidates) {
  const targets = extractOfferSearchTargets(row.data, { maxQueries: 2 });
  if (dryRun) {
    summary.push({ id: row.id, name: row.data.nomeOferta, queries: targets.queries, searchUrls: targets.searchUrls, dryRun: true });
    continue;
  }
  const { runId, items, budget } = await runApify(targets.searchUrls);
  const discovered = planDiscoveredLibraries(items, row.data, { maxLibraries: 8 });
  summary.push({
    id: row.id,
    name: row.data.nomeOferta,
    apifyRunId: runId,
    queries: targets.queries,
    sampledAds: items.length,
    budget,
    discoveredLibraries: discovered,
  });
}
console.log(JSON.stringify({ ok: true, count: summary.length, results: summary }, null, 2));
