import { getStore } from "@netlify/blobs";
import { setTimeout as pause } from "node:timers/promises";
import {
  buildCostControlledApifyInput,
  extractOfferSearchTargets,
  planDiscoveredLibraries,
} from "../../lib/apify-offer-discovery.mjs";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  authenticate,
  isAdmin,
  json,
  preflight,
  rateLimit,
  readJson,
  trustedOrigin,
} from "./_security.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const METHODS = "POST, OPTIONS";
const ACTOR = "apify~facebook-ads-scraper";
const COOLDOWN_MS = 6 * 60 * 60 * 1000;
const MAX_DAILY_RUNS = Math.max(1, Math.min(50, Number(process.env.APIFY_DISCOVERY_DAILY_MAX_RUNS) || 15));
const DEFAULT_RESULTS_LIMIT = Math.max(5, Math.min(25, Number(process.env.APIFY_DISCOVERY_RESULTS_LIMIT) || 15));

async function fetchOfferFromSupabase(offerId, authHeader) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/offers`);
  url.searchParams.set("select", "id,data");
  url.searchParams.set("id", `eq.${offerId}`);
  const response = await fetch(url, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: authHeader },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) return null;
  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

async function runApifyDiscovery(apifyToken, searchUrls, resultsLimit) {
  const { actorInput, runOptions } = buildCostControlledApifyInput(searchUrls, {
    maxQueries: 2,
    resultsLimit,
    memoryMbytes: 1024,
    timeoutSecs: 120,
  });
  const headers = {
    Authorization: `Bearer ${apifyToken}`,
    "Content-Type": "application/json",
  };
  const startUrl = `https://api.apify.com/v2/acts/${ACTOR}/runs?timeout=${runOptions.timeoutSecs}&memory=${runOptions.memoryMbytes}&maxItems=${runOptions.maxItems}`;
  const startRes = await fetch(startUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(actorInput),
    signal: AbortSignal.timeout(30_000),
  });
  if (!startRes.ok) {
    const detail = (await startRes.text().catch(() => "")).slice(0, 160);
    const err = new Error(`Apify HTTP ${startRes.status}: ${detail}`);
    err.status = startRes.status === 402 || startRes.status === 429 ? 429 : 502;
    throw err;
  }
  let run = (await startRes.json())?.data;
  if (!run?.id) throw new Error("Apify não retornou ID da execução");

  const deadline = Date.now() + 110_000;
  while (!["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(run.status) && Date.now() < deadline) {
    await pause(4_000);
    const pollRes = await fetch(`https://api.apify.com/v2/actor-runs/${run.id}?waitForFinish=20`, {
      headers: { Authorization: `Bearer ${apifyToken}` },
      signal: AbortSignal.timeout(30_000),
    });
    if (!pollRes.ok) break;
    run = (await pollRes.json())?.data || run;
  }
  if (run?.status !== "SUCCEEDED" || !run.defaultDatasetId) {
    throw new Error(`Execução Apify não concluiu no tempo limite (${run?.status || "desconhecido"})`);
  }
  const itemsRes = await fetch(
    `https://api.apify.com/v2/datasets/${run.defaultDatasetId}/items?clean=true&limit=${runOptions.maxItems}`,
    {
      headers: { Authorization: `Bearer ${apifyToken}` },
      signal: AbortSignal.timeout(30_000),
    }
  );
  if (!itemsRes.ok) throw new Error(`Dataset Apify indisponível (HTTP ${itemsRes.status})`);
  const items = await itemsRes.json();
  return {
    runId: run.id,
    items: Array.isArray(items) ? items : [],
    budget: runOptions,
  };
}

export default async request => {
  const options = preflight(request, METHODS);
  if (options) return options;
  if (request.method !== "POST") return json(request, 405, { ok: false, error: "método inválido" }, METHODS);
  if (!trustedOrigin(request)) return json(request, 403, { ok: false, error: "origem não autorizada" }, METHODS);

  const user = await authenticate(request);
  if (!user) return json(request, 401, { ok: false, error: "sessão não reconhecida" }, METHODS);
  if (!isAdmin(user)) return json(request, 403, { ok: false, error: "acesso restrito ao administrador (MVP)" }, METHODS);

  const rl = await rateLimit("admin-offer-discovery", user.id || user.email || "admin", { limit: 15, windowMs: 3600_000 });
  if (!rl.allowed) return json(request, 429, { ok: false, error: "limite de buscas por hora atingido para controle de custos" }, METHODS);

  const apifyToken = String(process.env.APIFY_TOKEN || "").trim();
  if (!apifyToken) {
    return json(request, 503, { ok: false, error: "APIFY_TOKEN não configurado no ambiente da Netlify" }, METHODS);
  }

  try {
    const body = await readJson(request, { maxBytes: 64 * 1024 });
    const offerId = String(body?.target_offer_id || body?.offerId || "").trim();
    if (!UUID.test(offerId)) {
      return json(request, 400, { ok: false, error: "identificador da oferta inválido" }, METHODS);
    }
    const force = body?.force === true;
    const resultsLimit = Math.max(5, Math.min(25, Number(body?.results_limit) || DEFAULT_RESULTS_LIMIT));

    const store = getStore({ name: "admin-offer-drafts", consistency: "strong" });
    const draftKey = `offers/${offerId}.json`;
    const existingDraft = await store.get(draftKey, { type: "json" }).catch(() => null);
    const existingPatch = existingDraft?.data_patch && typeof existingDraft.data_patch === "object" ? existingDraft.data_patch : {};

    const lastUpdated = Date.parse(existingPatch.discoveredLibrariesUpdatedAt || "");
    if (!force && Number.isFinite(lastUpdated) && Date.now() - lastUpdated < COOLDOWN_MS && Array.isArray(existingPatch.discoveredLibraries)) {
      return json(request, 200, {
        ok: true,
        cached: true,
        discoveredLibraries: existingPatch.discoveredLibraries,
        meta: existingPatch.discoveredLibrariesMeta || { cached: true },
        draft: existingDraft,
      }, METHODS);
    }

    const today = new Date().toISOString().slice(0, 10);
    const budgetKey = `discovery-budget/${today}.json`;
    const budgetState = (await store.get(budgetKey, { type: "json" }).catch(() => null)) || { date: today, runs: 0 };
    if (Number(budgetState.runs || 0) >= MAX_DAILY_RUNS) {
      return json(request, 429, {
        ok: false,
        error: `limite diário de ${MAX_DAILY_RUNS} buscas Apify atingido para controle de gastos`,
      }, METHODS);
    }

    const row = await fetchOfferFromSupabase(offerId, request.headers.get("authorization") || "");
    const baseData = Object.assign({}, row?.data || {}, body?.offer_data || {}, existingPatch);
    const targets = extractOfferSearchTargets(baseData, { maxQueries: 2 });
    if (!targets.searchUrls.length) {
      return json(request, 400, {
        ok: false,
        error: "este card não possui domínio ou nome de oferta suficiente para buscar outras bibliotecas",
      }, METHODS);
    }

    await store.setJSON(budgetKey, {
      date: today,
      runs: Number(budgetState.runs || 0) + 1,
      lastOfferId: offerId,
      updatedAt: new Date().toISOString(),
    });

    const nowIso = new Date().toISOString();
    const { runId, items, budget } = await runApifyDiscovery(apifyToken, targets.searchUrls, resultsLimit);
    const discoveredLibraries = planDiscoveredLibraries(items, baseData, {
      maxLibraries: 8,
      discoveredAt: nowIso,
    });
    const meta = {
      apifyRunId: runId,
      queries: targets.queries,
      sampledAds: items.length,
      discoveredCount: discoveredLibraries.length,
      resultsLimit: budget.maxItems,
      memoryMbytes: budget.memoryMbytes,
      dailyRunsUsed: Number(budgetState.runs || 0) + 1,
      dailyRunsMax: MAX_DAILY_RUNS,
      updatedAt: nowIso,
    };

    const nextPatch = {
      ...existingPatch,
      discoveredLibraries,
      discoveredLibrariesUpdatedAt: nowIso,
      discoveredLibrariesMeta: meta,
    };
    const draft = {
      target_offer_id: offerId,
      label: String(existingDraft?.label || baseData.nomeOferta || baseData.nomeMarca || "Oferta Brands").slice(0, 160),
      new_offer: existingDraft?.new_offer === true,
      data_patch: nextPatch,
      updated_at: nowIso,
      updated_by: String(user.email || "admin"),
    };
    await store.setJSON(draftKey, draft);

    return json(request, 200, {
      ok: true,
      cached: false,
      discoveredLibraries,
      meta,
      draft,
    }, METHODS);
  } catch (error) {
    if (error?.status) return json(request, error.status, { ok: false, error: error.message }, METHODS);
    console.error("admin-offer-discovery", error);
    return json(request, 500, { ok: false, error: error.message || "falha ao buscar outras bibliotecas" }, METHODS);
  }
};
