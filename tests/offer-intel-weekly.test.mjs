import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import {
  WEEKLY_LIMITS, weekStart, isWeekStart, previousWeek, selectPages, planCollection, weeklyActorInput, normalizeAd,
  groupCreatives, scoreCreative, rankCreatives, compareWithPrevious, validateAnalysis, validateSummary, extractJson, publicWeeklyAd,
} from "../lib/offer-intel-weekly.mjs";
import { runWeeklyReport, createWeeklyArchive, weeklyMediaPath, createWeeklyApify } from "../lib/offer-intel-weekly-worker.mjs";
import { signedDispatch } from "../lib/offer-intel-dispatch.mjs";
import { createWeeklyHandlers, weeklySecret } from "../netlify/functions/_offer-intel-weekly.mjs";
import { createFAKEWeeklyStorage, createFAKEWeeklyApify } from "./offer-intel-weekly-FAKE-storage.mjs";

const root = new URL("../", import.meta.url);
const NOW = new Date("2026-10-28T01:00:00Z"); // cron moment: Tue 22:00 Brasília
const WEEK = "2026-10-27";
const lib = id => "https://www.facebook.com/ads/library/?active_status=active&view_all_page_id=" + id;
const offer = (kind, pages, name = "Oferta FAKE") => ({ id: randomUUID(), data: { kind, nomeOferta: name, bibliotecas: pages.map(p => ({ link: lib(p) })) } });
const discovery = (page, ads_found, status = "new", scope = "offer:" + randomUUID()) =>
  ({ scope_key: scope, type: "page", identity_key: "meta:page:" + page, status, data: { page_id: page, page_name: "Página " + page, ads_found } });
const unixDaysAgo = d => Math.floor((NOW.getTime() - d * 86_400_000) / 1000);
let seq = 1000;
const item = (page, { days = 10, collation = 1, text, video } = {}) => {
  const id = String(++seq);
  return { adArchiveId: id, pageId: page, pageName: "Página " + page, startDate: unixDaysAgo(days), collationCount: collation,
    snapshot: { body: { text: text ?? "Copy única do anúncio FAKE número " + id + " com texto suficiente." }, cta_text: "Saiba mais",
      link_url: "https://oferta-fake.example/vsl", display_format: video ? "video" : "image",
      images: [{ original_image_url: "https://scontent.fbcdn.net/v/t39/" + (video || id) + "_n.jpg?oh=sig" + id }],
      ...(video ? { videos: [{ video_hd_url: "https://video.fbcdn.net/v/t42/" + video + "_n.mp4?oh=sig" + id }] } : {}) } };
};
const ANALYSIS = { gancho: "Pergunta direta", angulo: "Medo de perder", promessa: "Resultado rápido", mecanismo: "Ingrediente X",
  formato: "Vídeo UGC", cta: "Saiba mais", publico: "Homens 40+", por_que_funciona: "Roda há muito tempo com várias cópias." };
const okClaude = async ({ prompt }) => prompt.includes("<ranking>")
  ? JSON.stringify({ bullets: ["a", "b", "c", "d", "e"].map(x => "Padrão " + x) }) : "```json\n" + JSON.stringify(ANALYSIS) + "\n```";
const FAKEArchive = () => { const uploads = []; return { uploads, archive: async ({ week, ad_archive_id, kind }) => {
  uploads.push(weeklyMediaPath(week, ad_archive_id, kind, kind === "video" ? "mp4" : "jpg"));
  return { url: "https://FAKE.supabase.co/storage/v1/object/public/criativos/" + weeklyMediaPath(week, ad_archive_id, kind, kind === "video" ? "mp4" : "jpg"),
    image: kind === "thumb" ? { mediaType: "image/jpeg", data: "QUJD" } : null };
} }; };
async function claimed(storage, week = WEEK) {
  const { report, nonce } = await storage.enqueue({ week_start: week, trigger: "manual" });
  return storage.claim({ report_id: report.id, nonce });
}

test("weekStart is the Brasília Tuesday; cron moment maps to the same week", () => {
  assert.equal(weekStart(NOW), WEEK);
  assert.equal(weekStart(new Date("2026-10-28T02:59:00Z")), WEEK);
  assert.equal(weekStart(new Date("2026-11-03T02:59:00Z")), WEEK); // Mon 23:59 BRT
  assert.equal(weekStart(new Date("2026-11-03T03:00:00Z")), "2026-11-03");
  assert.ok(isWeekStart(WEEK)); assert.ok(!isWeekStart("2026-10-28")); assert.ok(!isWeekStart("2026-02-30"));
  assert.equal(previousWeek(WEEK), "2026-10-20");
});

test("cron is exactly '0 1 * * 3' and the background is a background function", async () => {
  const scheduled = await readFile(new URL("netlify/functions/offer-intel-weekly-scheduled.mjs", root), "utf8");
  assert.match(scheduled, /schedule:\s*"0 1 \* \* 3"/);
  assert.equal((await import("../netlify/functions/offer-intel-weekly-scheduled.mjs")).config.schedule, "0 1 * * 3");
  assert.equal((await import("../netlify/functions/offer-intel-weekly-background.mjs")).config.background, true);
});

test("Page selection: registered from current menu offers; discovered ≠ ignored, outside registered, by ads_found", () => {
  const pages = selectPages({
    offers: [offer("brandsvalidated", ["111", "222"]), offer("brandsgeneral", ["222", "333"]), offer("oferta", ["999"]), offer("criativo", ["998"])],
    discoveries: [discovery("444", 3), discovery("555", 30), discovery("666", 99, "ignored"), discovery("111", 50), discovery("444", 8)],
  });
  assert.deepEqual(pages.registered.map(p => p.page_id), ["111", "222", "333"]);
  assert.equal(pages.registered[1].offer_ids.length, 2);
  assert.deepEqual(pages.discovered.map(p => [p.page_id, p.ads_found]), [["555", 30], ["444", 8]]);
});

test("collection plan never exceeds US$ 15, prioritizes registered and fails closed on unknown price", () => {
  const registered = Array.from({ length: 50 }, (_, i) => ({ page_id: String(100 + i) }));
  const discovered = Array.from({ length: 50 }, (_, i) => ({ page_id: String(900 + i), ads_found: 50 - i }));
  const plan = planCollection({ registered, discovered });
  assert.ok(plan.usd_planned <= 15);
  const chosen = plan.batches.flatMap(b => b.page_ids);
  assert.equal(chosen.length, 62); // 62 × 40 × 0.006 = 14.88
  assert.deepEqual(chosen.slice(0, 50), registered.map(p => p.page_id));
  assert.equal(chosen[50], "900");
  assert.ok(plan.batches.every(b => b.page_ids.length <= WEEKLY_LIMITS.pages_per_run && b.max_items === b.page_ids.length * 40));
  assert.equal(planCollection({ registered, discovered }, { spentUsd: 14.9 }).batches.length, 0);
  assert.equal(planCollection({ registered, discovered }, { spentUsd: NaN }).batches.length, 0);
  assert.equal(planCollection({ registered, discovered }, { limits: { ...WEEKLY_LIMITS, usd_per_ad: 0 } }).batches.length, 0);
  const input = weeklyActorInput(["123"]);
  assert.equal(input.actorInput.resultsLimit, 40);
  assert.match(input.actorInput.startUrls[0].url, /view_all_page_id=123/);
  assert.match(input.actorInput.startUrls[0].url, /active_status=active/);
  assert.match(input.actorInput.startUrls[0].url, /sort_data%5Bmode%5D=total_impressions/);
});

test("Apify item normalization keeps start date, collation, media and copy", () => {
  const ad = normalizeAd(item("777", { days: 45, collation: 7, video: "vidFAKE12345" }), NOW);
  assert.equal(ad.page_id, "777"); assert.equal(ad.days_active, 45); assert.equal(ad.collation_count, 7);
  assert.match(ad.video_url, /^https:\/\/video\.fbcdn\.net\//); assert.match(ad.thumb_url, /fbcdn\.net/);
  assert.equal(ad.cta_text, "Saiba mais"); assert.equal(ad.display_format, "video");
  assert.equal(normalizeAd({ adArchiveId: "x" }), null);
  assert.equal(normalizeAd({ adArchiveId: "1", snapshot: { images: [{ original_image_url: "https://evil.example/a.jpg" }] } }).thumb_url, null);
});

test("duplicate creatives are grouped (same media or same normalized text) and repetitions summed", () => {
  const sameText = "Descubra o MÉTODO que médicos não contam — funciona em 7 dias!";
  const ads = [item("1", { text: sameText, collation: 3 }), item("1", { text: "descubra o metodo que medicos nao contam, funciona em 7 dias", days: 60 }),
    item("1", { video: "sharedVideo001", text: "Texto A totalmente diferente de qualquer outro anúncio" }),
    item("1", { video: "sharedVideo001", text: "Texto B também diferente, mas com o mesmo vídeo" }), item("1", {})].map(r => normalizeAd(r, NOW));
  const groups = groupCreatives(ads);
  assert.equal(groups.length, 3);
  const textGroup = groups.find(g => g.ad_ids.length === 2 && g.days_active === 60);
  assert.equal(textGroup.repetitions, 4);
  assert.equal(textGroup.score, scoreCreative(60, 4));
});

test("score = 60·min(d,90)/90 + 40·min(r,20)/20 with deterministic tie-break", () => {
  assert.equal(scoreCreative(90, 20), 100); assert.equal(scoreCreative(200, 50), 100);
  assert.equal(scoreCreative(45, 10), 50); assert.equal(scoreCreative(0, 1), 2);
  const g = (id, score, days, repetitions) => ({ ad_archive_id: id, score, days_active: days, repetitions });
  const ranked = rankCreatives([g("30", 50, 10, 5), g("20", 50, 20, 1), g("100", 50, 20, 1), g("9", 50, 20, 1), g("1", 80, 1, 1)]);
  assert.deepEqual(ranked.map(r => r.ad_archive_id), ["1", "9", "20", "100", "30"]);
  assert.deepEqual(ranked.map(r => r.rank), [1, 2, 3, 4, 5]);
  assert.equal(rankCreatives(Array.from({ length: 15 }, (_, i) => g(String(i + 1), i, 1, 1))).length, 10);
});

test("is_new and rank_change against the previous week (same group only)", () => {
  const cur = [{ ad_archive_id: "5", ad_ids: ["5", "6"], match_keys: ["t:x"], rank: 1 }, { ad_archive_id: "7", ad_ids: ["7"], match_keys: ["m:y"], rank: 2 },
    { ad_archive_id: "8", ad_ids: ["8"], match_keys: ["m:z"], rank: 3 }];
  const prev = [{ group: "registered", ad_archive_id: "6", rank: 4, ad_ids: ["6"], match_keys: [] },
    { group: "registered", ad_archive_id: "70", rank: 1, ad_ids: ["70"], match_keys: ["m:y"] },
    { group: "discovered", ad_archive_id: "8", rank: 1, ad_ids: ["8"], match_keys: ["m:z"] }];
  const out = compareWithPrevious(cur, prev, "registered");
  assert.deepEqual(out.map(a => [a.is_new, a.rank_change]), [[false, 3], [false, -1], [true, null]]);
});

test("AI JSON is validated strictly", () => {
  assert.deepEqual(validateAnalysis(extractJson("```json\n" + JSON.stringify(ANALYSIS) + "\n```")), ANALYSIS);
  assert.equal(validateAnalysis({ ...ANALYSIS, cta: "" }), null);
  assert.equal(validateAnalysis({ ...ANALYSIS, publico: 3 }), null);
  assert.equal(validateAnalysis(extractJson("sem json")), null);
  assert.equal(validateSummary({ bullets: ["1", "2", "3", "4"] }), null);
  assert.equal(validateSummary({ bullets: ["1", "2", "3", "4", "5"] }).bullets.length, 5);
});

function scenario({ registeredPages = 3, discoveredPages = 3, perPage = 15 } = {}) {
  const reg = Array.from({ length: registeredPages }, (_, i) => String(10_000 + i));
  const disc = Array.from({ length: discoveredPages }, (_, i) => String(20_000 + i));
  const storage = createFAKEWeeklyStorage({ offers: [offer("brandsvalidated", reg)], discoveries: disc.map((p, i) => discovery(p, 100 - i)), clock: () => Date.now() });
  const apify = createFAKEWeeklyApify({ itemsFor: page => Array.from({ length: perPage }, (_, i) => item(page, { days: (i * 7) % 120, collation: 1 + (i % 5) })) });
  return { storage, apify, reg, disc };
}

test("worker: full run ranks Top 10 ×2, archives media, analyses each ad and writes the summary", async () => {
  const { storage, apify } = scenario(), { archive, uploads } = FAKEArchive();
  const report = await claimed(storage);
  const out = await runWeeklyReport({ report, storage, apify, archive, claude: okClaude, now: () => NOW });
  assert.equal(out.status, "succeeded");
  const saved = storage.reports.get(report.id), rows = await storage.listAds(report.id);
  assert.equal(rows.filter(r => r.group === "registered").length, 10);
  assert.equal(rows.filter(r => r.group === "discovered").length, 10);
  assert.ok(rows.every(r => r.media.archived && r.analysis && r.is_new === true && r.rank_change === null));
  assert.ok(uploads.every(p => p.startsWith("intel-weekly/" + WEEK + "/")));
  assert.equal(saved.summary.bullets.length, 5);
  assert.equal(saved.cost.ads_collected, 90);
  assert.ok(apify.starts.every(s => s.maxUsd > 0 && s.maxUsd <= 15));
  const sorted = rows.filter(r => r.group === "registered");
  assert.ok(sorted.every((r, i) => i === 0 || sorted[i - 1].score >= r.score));
});

test("worker: weekly reservations never exceed US$ 15, even across reruns and many Pages", async () => {
  const { storage, apify } = scenario({ registeredPages: 70, discoveredPages: 40, perPage: 2 }), { archive } = FAKEArchive();
  let report = await claimed(storage);
  await runWeeklyReport({ report, storage, apify, archive, claude: async () => { throw new Error("FAKE IA fora"); }, now: () => NOW });
  const cents = () => storage.ledger.reduce((s, l) => s + Math.round(l.usd * 100), 0);
  assert.ok(cents() <= 1500, "reserved " + cents());
  const startsBefore = apify.starts.length;
  // Same week again (partial → re-queued): reuses runs and reservations, no new provider POST.
  storage.reports.get(report.id).updated_at_ms = 0;
  report = await claimed(storage);
  await runWeeklyReport({ report, storage, apify, archive, claude: okClaude, now: () => NOW });
  assert.equal(apify.starts.length, startsBefore);
  assert.ok(cents() <= 1500);
  // Every page of the registered group was planned before any discovered page.
  const firstDiscoveredBatch = apify.starts.findIndex(s => s.actorInput.startUrls.some(u => u.url.includes("view_all_page_id=2")));
  assert.equal(firstDiscoveredBatch, -1, "62 páginas cabem no teto; 70 cadastradas ocupam tudo");
  assert.ok(storage.reports.get(report.id).cost.pages_skipped > 0);
  // Reserve is called before each start POST.
  const reserves = storage.calls.filter(c => c[0] === "reserve").length;
  assert.ok(reserves >= apify.starts.length);
});

test("worker: unknown ledger balance fails closed with no reservation or POST", async () => {
  const { storage, apify } = scenario(), { archive } = FAKEArchive();
  storage.budgetUsage = async () => null;
  const report = await claimed(storage);
  await assert.rejects(runWeeklyReport({ report, storage, apify, archive, claude: okClaude, now: () => NOW }), { code: "capability_unavailable" });
  assert.equal(apify.starts.length, 0); assert.equal(storage.ledger.length, 0);
});

test("worker: Apify ok + IA failure = partial with ranking kept; rerun fills the analyses", async () => {
  const { storage, apify } = scenario(), { archive } = FAKEArchive();
  let report = await claimed(storage);
  const out = await runWeeklyReport({ report, storage, apify, archive, claude: async () => "isto não é JSON", now: () => NOW });
  assert.equal(out.status, "partial");
  const saved = storage.reports.get(report.id);
  assert.equal(saved.error.code, "analysis_error");
  assert.equal((await storage.listAds(report.id)).length, 20);
  saved.updated_at_ms = 0;
  report = await claimed(storage);
  assert.equal((await runWeeklyReport({ report, storage, apify, archive, claude: okClaude, now: () => NOW })).status, "succeeded");
  assert.ok((await storage.listAds(report.id)).every(r => r.analysis));
});

test("worker: uncertain start is never re-POSTed; provider failure without ads = failed", async () => {
  const { storage } = scenario({ registeredPages: 1, discoveredPages: 0 });
  const apify = createFAKEWeeklyApify({ startError: new Error("FAKE rede caiu") }), { archive } = FAKEArchive();
  let report = await claimed(storage);
  assert.equal((await runWeeklyReport({ report, storage, apify, archive, claude: okClaude, now: () => NOW })).status, "failed");
  assert.equal([...storage.runs.values()][0].state, "unknown");
  storage.reports.get(report.id).updated_at_ms = 0;
  report = await claimed(storage);
  await runWeeklyReport({ report, storage, apify, archive, claude: okClaude, now: () => NOW });
  assert.equal(apify.starts.length, 1);
});

test("worker: is_new / rank_change against the previous week's saved report", async () => {
  const { storage, apify } = scenario({ registeredPages: 2, discoveredPages: 0 }), { archive } = FAKEArchive();
  const prev = await claimed(storage, "2026-10-20");
  await runWeeklyReport({ report: prev, storage, apify, archive, claude: okClaude, now: () => NOW });
  const report = await claimed(storage);
  await runWeeklyReport({ report, storage, apify: createFAKEWeeklyApify({ itemsFor: page => apify.datasets.get("FAKEds1").filter(i => i.pageId === page) }),
    archive, claude: okClaude, now: () => NOW });
  const rows = await storage.listAds(report.id);
  assert.ok(rows.length > 0 && rows.every(r => r.is_new === false && Number.isInteger(r.rank_change)));
});

test("archive: Meta CDN only through injected download, fixed path, type checked", async () => {
  assert.throws(() => weeklyMediaPath(WEEK, "../1", "thumb", "jpg"));
  assert.throws(() => weeklyMediaPath("../x", "1", "thumb", "jpg"));
  assert.throws(() => weeklyMediaPath(WEEK, "1", "thumb", "html"));
  const uploads = [];
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 1, 2, 3]);
  const archive = createWeeklyArchive({ download: async () => jpeg, upload: async (p, b, t) => uploads.push([p, t]), publicUrl: p => "https://FAKE/" + p });
  const thumb = await archive({ week: WEEK, ad_archive_id: "123", kind: "thumb", url: "https://scontent.fbcdn.net/x.jpg" });
  assert.equal(thumb.url, "https://FAKE/intel-weekly/" + WEEK + "/123-thumb.jpg");
  assert.deepEqual(uploads, [["intel-weekly/" + WEEK + "/123-thumb.jpg", "image/jpeg"]]);
  await assert.rejects(archive({ week: WEEK, ad_archive_id: "123", kind: "video", url: "https://video.fbcdn.net/x.mp4" }));
  const html = createWeeklyArchive({ download: async () => Buffer.from("<html>"), upload: async () => {}, publicUrl: p => p });
  await assert.rejects(html({ week: WEEK, ad_archive_id: "1", kind: "thumb", url: "https://scontent.fbcdn.net/x" }));
  const runtime = await readFile(new URL("netlify/functions/_offer-intel-weekly.mjs", root), "utf8");
  assert.match(runtime, /safeRemoteFetch\(url, \{ allowedHostSuffixes: FB_MEDIA_HOSTS/);
});

test("Apify adapter sends maxTotalChargeUsd and refuses unknown cost", async () => {
  const calls = [];
  const fetcher = async (url, init) => { calls.push([url, init]);
    return new Response(JSON.stringify({ data: { id: "FAKErun", defaultDatasetId: "FAKEds" } }), { status: 201 }); };
  const apify = createWeeklyApify({ token: "FAKE-token", fetcher });
  await apify.start(weeklyActorInput(["1"]), "m", 0.24);
  assert.match(calls[0][0], /maxTotalChargeUsd=0\.24/);
  await assert.rejects(apify.start(weeklyActorInput(["1"]), "m", NaN));
  assert.equal(calls.length, 1);
});

// ---- HTTP handlers -------------------------------------------------------------
const SIGNING = ["FAKE", "weekly", "hmac"].join("-");
function handlers(storage, extra = {}) {
  const dispatched = [];
  const services = { storage, secret: weeklySecret(SIGNING), apify: createFAKEWeeklyApify(), archive: FAKEArchive().archive, claude: okClaude,
    dispatch: async (id, nonce) => dispatched.push({ id, nonce }) };
  const h = createWeeklyHandlers({ authenticate: async req => req.headers.get("authorization") ? { id: "00000000-0000-4000-8000-000000000001", admin: !!req.headers.get("x-admin") } : null,
    isAdmin: u => u.admin, rateLimit: async () => ({ allowed: true }), getServices: () => services, now: () => NOW, ...extra });
  return { h, dispatched, services };
}
const req = (method, path = "", body, headers = { authorization: "Bearer FAKE", "x-admin": "1" }) =>
  new Request("https://site.example/.netlify/functions/offer-intel-weekly" + path, { method,
    headers: { ...headers, ...(body ? { "content-type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });

test("API: admin only; POST run is idempotent per week and 409 while running", async () => {
  const storage = createFAKEWeeklyStorage();
  const { h, dispatched } = handlers(storage);
  assert.equal((await h.api(req("GET", "", null, {}))).status, 401);
  assert.equal((await h.api(req("GET", "", null, { authorization: "Bearer FAKE" }))).status, 403);
  assert.equal((await h.api(req("POST", "", { action: "nope" }))).status, 400);
  const first = await h.api(req("POST", "", { action: "run" }));
  assert.equal(first.status, 202);
  const body = await first.json();
  assert.equal(body.week_start, WEEK); assert.equal(dispatched.length, 1);
  assert.equal(JSON.stringify(body).includes(dispatched[0].nonce), false);
  const again = await h.api(req("POST", "", { action: "run" }));
  assert.equal(again.status, 409); assert.equal((await again.json()).code, "job_active");
  // Concurrent scheduled trigger in the same window is also refused, without a second dispatch.
  const sched = await h.scheduled();
  assert.equal((await sched.json()).code, "job_active"); assert.equal(dispatched.length, 1);
  const r = [...storage.reports.values()][0]; r.status = "succeeded";
  const reused = await h.api(req("POST", "", { action: "run" }));
  assert.equal(reused.status, 200); assert.equal((await reused.json()).reused, true); assert.equal(dispatched.length, 1);
});

test("background: HMAC with domain separation + single-use nonce + lease; responses carry no secrets", async () => {
  const storage = createFAKEWeeklyStorage({ offers: [offer("brandsvalidated", ["555"])] });
  const { h, dispatched, services } = handlers(storage);
  services.apify = createFAKEWeeklyApify({ itemsFor: p => Array.from({ length: 3 }, () => item(p)) });
  await h.api(req("POST", "", { action: "run" }));
  const { id, nonce } = dispatched[0];
  const bg = signed => new Request("https://site.example/.netlify/functions/offer-intel-weekly-background", { method: "POST", ...signed });
  assert.equal((await h.background(bg(signedDispatch(id, nonce, SIGNING)))).status, 403, "base secret is not valid for weekly");
  assert.equal((await h.background(bg(signedDispatch(id, nonce, weeklySecret(SIGNING))))).status, 202);
  assert.equal(storage.reports.get(id).status, "succeeded");
  const replay = await h.background(bg(signedDispatch(id, nonce, weeklySecret(SIGNING))));
  assert.equal(replay.status, 202); assert.equal(storage.reports.get(id).attempt, 1);

  const list = await (await h.api(req("GET"))).json();
  assert.deepEqual(Object.keys(list.items[0]).sort(), ["cost", "finished_at", "id", "status", "week_start"]);
  const latest = await h.api(req("GET", "?week=latest"));
  const text = await latest.text(), detail = JSON.parse(text);
  assert.equal(detail.report.week_start, WEEK); assert.equal(detail.registered.length, 3); assert.equal(detail.discovered.length, 0);
  assert.equal(detail.summary.bullets.length, 5);
  for (const secret of [SIGNING, weeklySecret(SIGNING), nonce, storage.reports.get(id).lease_token, "FAKErun", "FAKEds", "lease", "nonce", "oh=sig"])
    assert.equal(text.includes(secret), false, "vazou " + secret);
  assert.equal((await h.api(req("GET", "?week=2026-10-28"))).status, 400);
  assert.equal((await h.api(req("GET", "?week=2026-10-20"))).status, 404);
});

test("public ad projection exposes only archived https media and validated analysis", () => {
  const ad = publicWeeklyAd({ id: "x", group: "registered", rank: 1, ad_archive_id: "9", score: "50.00", days_active: 1, repetitions: 1,
    media: { source_thumb_url: "https://evil.example/a.jpg", source_video_url: "https://video.fbcdn.net/a.mp4" }, analysis: { gancho: "só um campo" } });
  assert.equal(ad.media.thumb_url, null); assert.equal(ad.media.video_url, null); assert.equal(ad.analysis, null); assert.equal(ad.score, 50);
});

test("migration: only new offer_intel_weekly_* objects, RLS admin select, service_role writes, US$ 15 cap", async () => {
  const sql = await readFile(new URL("supabase/migrations/202610280004_offer_intel_weekly.sql", root), "utf8");
  for (const m of sql.matchAll(/create (?:table|function|index|policy) (?:public\.)?(\w+)/g)) assert.match(m[1], /^offer_intel_weekly_/);
  assert.doesNotMatch(sql, /alter table public\.(?!offer_intel_weekly_)/);
  assert.doesNotMatch(sql, /(insert into|update|delete from) (public\.)?offers\b/);
  assert.equal((sql.match(/enable row level security/g) || []).length, 5);
  assert.match(sql, /grant select on public\.offer_intel_weekly_reports, public\.offer_intel_weekly_ads to authenticated/);
  assert.equal((sql.match(/using \(public\.swipe_is_admin\(\)\)/g) || []).length, 2);
  assert.match(sql, /v_cap constant numeric\(8,2\) := 15\.00/);
  assert.match(sql, /if v_used\+v_usd>v_cap then raise exception 'budget_exceeded'/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /to service_role;\s*commit;\s*$/);
});
