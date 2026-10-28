import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import {
  WEEKLY_LIMITS, AI_LIMITS, reviewDate, isReviewDate, previousReview, reviewTitle, librarySource, selectProducts, planCollection, weeklyActorInput,
  normalizeAd, sourceMatches, groupCreatives, scoreCreative, rankCreatives, compareWithPrevious, validateAnalysis, validateBullets, extractJson,
  aiCost, publicAd,
} from "../lib/offer-intel-weekly.mjs";
import { runCreativeReviewSlice, createWeeklyArchive, weeklyMediaPath, createWeeklyApify } from "../lib/offer-intel-weekly-worker.mjs";
import { signedDispatch } from "../lib/offer-intel-dispatch.mjs";
import { createWeeklyHandlers, weeklySecret } from "../netlify/functions/_offer-intel-weekly.mjs";
import { createFAKEWeeklyStorage, createFAKEWeeklyApify } from "./offer-intel-weekly-FAKE-storage.mjs";

const root = new URL("../", import.meta.url);
const NOW = new Date("2026-10-28T01:00:00Z"); // cron moment: terça 22:00 em Brasília
const DATE = "2026-10-28";
const MODEL = "claude-sonnet-5";
// Real production link formats (§10.5 "Fontes por produto").
const REAL = {
  page: id => "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&is_targeted_country=false&media_type=all&search_type=page&view_all_page_id=" + id,
  domain: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&is_targeted_country=false&media_type=all&q=kittysupps.com&search_type=keyword_unordered",
  web: "https://web.facebook.com/ads/library/?active_status=all&ad_type=all&country=US&q=resilia&search_type=keyword_unordered&media_type=all",
  quoted: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=%2522Jcked%2522&search_type=keyword_exact_phrase&media_type=all",
  spaced: "https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&q=pure%2520health%2520research&media_type=all",
};
const offer = (kind, links, name = "Oferta FAKE " + Math.random().toString(36).slice(2, 6)) =>
  ({ id: randomUUID(), data: { kind, nomeOferta: name, nomeMarca: "Marca " + name, bibliotecas: links.map(link => ({ link })) } });
const discovery = (offerId, page, status = "confirmed") =>
  ({ scope_key: "offer:" + offerId, type: "page", identity_key: "meta:page:" + page, status, data: { page_id: page, page_name: "Página " + page, ads_found: 9 } });
const unixDaysAgo = d => Math.floor((NOW.getTime() - d * 86_400_000) / 1000);
let seq = 1000;
const item = (page, { days = 10, collation = 1, text, video, landing = "https://oferta-fake.example/vsl" } = {}) => {
  const id = String(++seq);
  return { adArchiveId: id, pageId: page, pageName: "Página " + page, startDate: unixDaysAgo(days), collationCount: collation,
    snapshot: { body: { text: text ?? "Copy única do anúncio FAKE número " + id + " com texto suficiente." }, cta_text: "Saiba mais",
      link_url: landing, display_format: video ? "video" : "image",
      images: [{ original_image_url: "https://scontent.fbcdn.net/v/t39/" + (video || id) + "_n.jpg?oh=sig" + id }],
      ...(video ? { videos: [{ video_hd_url: "https://video.fbcdn.net/v/t42/" + video + "_n.mp4?oh=sig" + id }] } : {}) } };
};
/** FAKE dataset per start URL: page URLs return that page's ads; searches return ads of strangers + matching ones. */
const itemsFor = (perSource = 15) => url => {
  const u = new URL(url), page = u.searchParams.get("view_all_page_id"), q = u.searchParams.get("q");
  if (page) return Array.from({ length: perSource }, (_, i) => item(page, { days: (i * 7) % 120, collation: 1 + (i % 5) }));
  const domain = /\./.test(q) ? q : null;
  return Array.from({ length: perSource }, (_, i) => item(String(70_000 + i), { days: i * 3,
    landing: domain && i % 3 === 0 ? "https://alheio.example/x" : "https://" + (domain || "loja.example") + "/oferta",
    text: (domain ? "" : q + " ") + "Texto de busca FAKE número " + i + " para a consulta " + q }));
};
const ANALYSIS = { gancho: "Pergunta direta", angulo: "Medo de perder", promessa: "Resultado rápido", mecanismo: "Ingrediente X",
  formato: "Vídeo UGC", cta: "Saiba mais", publico: "Homens 40+", por_que_funciona: "Roda há muito tempo com várias cópias." };
// FAKE Claude: exact-count stand-in (UTF-8 bytes ≥ tokens) and a usage block like the Messages API.
const claudeWith = textFor => { const calls = [], counts = [];
  const fn = async ({ prompt, maxTokens }) => { calls.push(prompt); return { text: await textFor(prompt), usage: { input_tokens: 900, output_tokens: Math.min(300, maxTokens) } }; };
  fn.countTokens = async ({ prompt, image }) => { counts.push(prompt); return Buffer.byteLength(prompt) + (image ? 1600 : 0); };
  fn.calls = calls; fn.counts = counts; return fn; };
const okClaude = () => claudeWith(prompt => {
  if (prompt.includes("<semana>")) return JSON.stringify({ bullets: [1, 2, 3, 4, 5].map(n => "Padrão " + n) });
  if (prompt.includes("<top10>")) return JSON.stringify({ bullets: ["Escala", "Ângulos", "Formatos"] });
  return "```json\n" + JSON.stringify(ANALYSIS) + "\n```"; });
const FAKEArchive = () => { const uploads = []; const fn = async ({ date, offer_id, ad_archive_id, kind }) => {
  const path = weeklyMediaPath(date, offer_id, ad_archive_id, kind, kind === "video" ? "mp4" : "jpg"); uploads.push(path);
  return { url: "https://FAKE.supabase.co/storage/v1/object/public/criativos/" + path }; }; fn.uploads = uploads; return fn; };
async function claimed(storage, date = DATE) {
  const { report, nonce } = await storage.enqueue({ review_date: date, trigger: "manual" });
  return storage.claim({ report_id: report.id, nonce });
}
/** Runs slices (claim → slice → continue) until done, like the self re-dispatching background function. */
async function runAll(storage, deps, date = DATE) {
  let report = await claimed(storage, date), slices = 0;
  for (;;) {
    const out = await runCreativeReviewSlice({ report, storage, model: MODEL, now: () => NOW, ...deps });
    slices++;
    if (out.done) return { ...out, slices, report: storage.reports.get(report.id) };
    const { nonce } = await storage.continue({ report_id: report.id, lease_token: report.lease_token });
    report = await storage.claim({ report_id: report.id, nonce });
  }
}

test("review_date = next Wednesday ≥ today in America/Sao_Paulo", () => {
  assert.equal(reviewDate(NOW), DATE); // terça 22h → quarta seguinte
  assert.equal(reviewDate(new Date("2026-10-27T15:00:00Z")), DATE); // terça 12h
  assert.equal(reviewDate(new Date("2026-10-28T18:00:00Z")), DATE); // quarta 15h → a própria quarta
  assert.equal(reviewDate(new Date("2026-10-29T02:59:00Z")), DATE); // quarta 23h59
  assert.equal(reviewDate(new Date("2026-10-29T03:00:00Z")), "2026-11-04"); // quinta 00h → próxima quarta
  assert.equal(reviewTitle(DATE), "Creative Review 28/10/2026");
  assert.ok(isReviewDate(DATE)); assert.ok(!isReviewDate("2026-10-27")); assert.ok(!isReviewDate("2026-02-31"));
  assert.equal(previousReview(DATE), "2026-10-21");
});

test("cron is exactly '0 1 * * 3' and the worker is a background function", async () => {
  const scheduled = await readFile(new URL("netlify/functions/offer-intel-weekly-scheduled.mjs", root), "utf8");
  assert.match(scheduled, /schedule:\s*"0 1 \* \* 3"/);
  assert.equal((await import("../netlify/functions/offer-intel-weekly-scheduled.mjs")).config.schedule, "0 1 * * 3");
  assert.equal((await import("../netlify/functions/offer-intel-weekly-background.mjs")).config.background, true);
});

test("library sources from real link formats: Page ID, domain, keyword, web.facebook.com, double %25", () => {
  const page = librarySource(REAL.page("123456"));
  assert.deepEqual([page.kind, page.page_id, page.key], ["page", "123456", "page:123456"]);
  const domain = librarySource(REAL.domain);
  assert.equal(domain.kind, "search"); assert.equal(domain.domain, "kittysupps.com");
  const u = new URL(domain.url);
  assert.equal(u.hostname, "www.facebook.com"); assert.equal(u.searchParams.get("q"), "kittysupps.com");
  assert.equal(u.searchParams.get("active_status"), "active"); assert.equal(u.searchParams.get("sort_data[mode]"), "total_impressions");
  assert.equal(u.searchParams.get("sort_data[direction]"), "desc"); assert.equal(u.searchParams.get("search_type"), "keyword_unordered");
  const web = librarySource(REAL.web);
  assert.equal(web.domain, null); assert.equal(web.keyword, "resilia");
  assert.equal(new URL(web.url).searchParams.get("active_status"), "active"); assert.equal(new URL(web.url).searchParams.get("country"), "US");
  const quoted = librarySource(REAL.quoted);
  assert.equal(quoted.query, '"Jcked"'); assert.equal(quoted.keyword, "jcked");
  assert.equal(new URL(quoted.url).searchParams.get("search_type"), "keyword_exact_phrase");
  assert.equal(librarySource(REAL.spaced).query, "pure health research");
  assert.equal(librarySource(REAL.spaced).domain, null);
  for (const bad of ["https://evil.example/ads/library/?q=x", "http://www.facebook.com/ads/library/?q=x", "https://www.facebook.com/ads/library/", "nada"])
    assert.equal(librarySource(bad), null, bad);
});

test("products: every current menu offer, all libraries + CONFIRMED discoveries of its own scope", () => {
  const a = offer("brandsvalidated", [REAL.page("111"), REAL.domain, REAL.page("111")], "Alpha");
  const b = offer("brandsgeneral", [REAL.web], "Beta");
  const c = offer("brandsvalidated", [], "Gama sem biblioteca");
  const old = offer("oferta", [REAL.page("999")], "Antiga");
  const products = selectProducts({ offers: [b, old, c, a], discoveries: [discovery(a.id, "222"), discovery(a.id, "333", "new"),
    discovery(a.id, "444", "ignored"), discovery(b.id, "111"), discovery(old.id, "555"),
    { ...discovery(a.id, "666"), scope_key: "url:abc" }] });
  assert.deepEqual(products.map(p => p.offer_name), ["Alpha", "Gama sem biblioteca", "Beta"]);
  const alpha = products[0];
  assert.deepEqual(alpha.sources.map(s => [s.key.startsWith("q:") ? "q" : s.key, s.origin]), [["page:111", "cadastrada"], ["q", "cadastrada"], ["page:222", "encontrada"]]);
  assert.equal(products[1].sources.length, 0);
  assert.deepEqual(products[2].sources.map(s => s.origin), ["cadastrada", "encontrada"]);
});

test("collection plan: never above US$ 15, round-robin by least coverage, fail closed on unknown price/balance", () => {
  const big = { offer_id: "a", sources: Array.from({ length: 70 }, (_, i) => ({ key: "page:" + (100 + i), url: REAL.page(String(100 + i)) })) };
  const small = { offer_id: "b", sources: [{ key: "page:9", url: REAL.page("9") }, { key: "page:8", url: REAL.page("8") }] };
  const none = { offer_id: "c", sources: [] };
  const plan = planCollection([big, small, none]);
  const chosen = plan.batches.flatMap(b => b.sources.map(s => s.key));
  assert.ok(plan.usd_planned <= 15); assert.equal(chosen.length, 62); // 62 × 40 × 0.006 = 14.88
  assert.deepEqual(chosen.slice(0, 4), ["page:9", "page:100", "page:8", "page:101"]);
  assert.ok(plan.batches.every(b => b.sources.length <= 10 && b.max_items === b.sources.length * 40));
  assert.equal(planCollection([big], { spentUsd: 14.9 }).batches.length, 0);
  for (const spentUsd of [NaN, -1, Infinity, null, "0", undefined === 1]) assert.equal(planCollection([big], { spentUsd }).batches.length, 0, String(spentUsd));
  assert.equal(planCollection([big], { limits: { ...WEEKLY_LIMITS, usd_per_ad: 0 } }).batches.length, 0);
  const input = weeklyActorInput([REAL.page("1"), "https://evil.example/"]);
  assert.equal(input.actorInput.startUrls.length, 1); assert.equal(input.actorInput.resultsLimit, 40);
});

test("domain searches keep only ads that mention the domain; keyword searches need the keyword", () => {
  const domain = librarySource(REAL.domain), web = librarySource(REAL.web);
  const ad = (landing, text, input) => ({ ...normalizeAd({ ...item("1", { landing, text }), ...(input ? { inputUrl: input } : {}) }, NOW) });
  assert.ok(sourceMatches(ad("https://kittysupps.com/p", "x"), domain));
  assert.ok(sourceMatches(ad("https://x.example", "Compre em kittysupps.com hoje"), domain));
  assert.ok(sourceMatches(ad("https://shop.kittysupps.com/p", "x"), domain));
  for (const other of ["https://notkittysupps.com/p", "https://kittysupps.com.evil.example/p", "https://kittysupps.co/p"])
    assert.ok(!sourceMatches(ad(other, "texto sem o domínio"), domain), other);
  assert.ok(!sourceMatches(ad("https://x.example", "visite notkittysupps.com"), domain));
  assert.ok(!sourceMatches(ad("https://alheio.example", "outro produto qualquer"), domain));
  assert.ok(sourceMatches(ad("https://x.example", "Resília funciona"), web));
  assert.ok(!sourceMatches(ad("https://x.example", "nada a ver"), web));
  assert.ok(sourceMatches(ad("https://x.example", "nada a ver", REAL.web), web), "inputUrl attribution");
  assert.ok(!sourceMatches(ad("https://kittysupps.com", "x", REAL.web), domain), "other search input");
});

test("Apify item normalization keeps start date, collation, media and copy", () => {
  const ad = normalizeAd(item("777", { days: 45, collation: 7, video: "vidFAKE12345" }), NOW);
  assert.equal(ad.page_id, "777"); assert.equal(ad.days_active, 45); assert.equal(ad.collation_count, 7);
  assert.match(ad.video_url, /^https:\/\/video\.fbcdn\.net\//); assert.match(ad.thumb_url, /fbcdn\.net/);
  assert.equal(ad.cta_text, "Saiba mais"); assert.equal(ad.display_format, "video");
  assert.equal(normalizeAd({ adArchiveId: "x" }), null);
  assert.equal(normalizeAd({ adArchiveId: "1", snapshot: { images: [{ original_image_url: "https://evil.example/a.jpg" }] } }).thumb_url, null);
});

test("duplicates grouped (same media or normalized text); repetitions = Σ collation_count, min. 1 per ad", () => {
  const single = groupCreatives([normalizeAd(item("1", { days: 0, collation: 7 }), NOW)]);
  assert.equal(single[0].repetitions, 7); assert.equal(single[0].score, 14);
  const sameText = "Descubra o MÉTODO que médicos não contam — funciona em 7 dias!";
  const ads = [item("1", { text: sameText, collation: 3 }), item("1", { text: "descubra o metodo que medicos nao contam, funciona em 7 dias", days: 60 }),
    item("1", { video: "sharedVideo001", text: "Texto A totalmente diferente de qualquer outro anúncio" }),
    item("1", { video: "sharedVideo001", text: "Texto B também diferente, mas com o mesmo vídeo" }), item("1", {})].map(r => normalizeAd(r, NOW));
  const groups = groupCreatives(ads);
  assert.equal(groups.length, 3);
  const textGroup = groups.find(g => g.ad_ids.length === 2 && g.days_active === 60);
  assert.equal(textGroup.repetitions, 4); assert.equal(textGroup.score, scoreCreative(60, 4));
});

test("score = 60·min(d,90)/90 + 40·min(r,20)/20 with deterministic tie-break", () => {
  assert.equal(scoreCreative(90, 20), 100); assert.equal(scoreCreative(200, 50), 100);
  assert.equal(scoreCreative(45, 10), 50); assert.equal(scoreCreative(0, 1), 2);
  const g = (id, score, days, repetitions) => ({ ad_archive_id: id, score, days_active: days, repetitions });
  const ranked = rankCreatives([g("30", 50, 10, 5), g("20", 50, 20, 1), g("100", 50, 20, 1), g("9", 50, 20, 1), g("1", 80, 1, 1)]);
  assert.deepEqual(ranked.map(r => r.ad_archive_id), ["1", "9", "20", "100", "30"]);
  assert.equal(rankCreatives(Array.from({ length: 15 }, (_, i) => g(String(i + 1), i, 1, 1))).length, 10);
});

test("is_new and rank_change against the previous folder", () => {
  const cur = [{ ad_archive_id: "5", ad_ids: ["5", "6"], match_keys: ["t:x"], rank: 1 }, { ad_archive_id: "7", ad_ids: ["7"], match_keys: ["m:y"], rank: 2 },
    { ad_archive_id: "8", ad_ids: ["8"], match_keys: ["m:z"], rank: 3 }];
  const prev = [{ ad_archive_id: "6", rank: 4, ad_ids: ["6"], match_keys: [] }, { ad_archive_id: "70", rank: 1, ad_ids: ["70"], match_keys: ["m:y"] }];
  assert.deepEqual(compareWithPrevious(cur, prev).map(a => [a.is_new, a.rank_change]), [[false, 3], [false, -1], [true, null]]);
});

test("AI JSON validation and AI cost: exact model allowlist, look-alikes and invalid counts fail closed", () => {
  assert.deepEqual(validateAnalysis(extractJson("```json\n" + JSON.stringify(ANALYSIS) + "\n```")), ANALYSIS);
  assert.equal(validateAnalysis({ ...ANALYSIS, cta: "" }), null); assert.equal(validateAnalysis({ ...ANALYSIS, publico: 3 }), null);
  assert.equal(validateBullets({ bullets: ["1", "2", "3"] }, 3).bullets.length, 3); assert.equal(validateBullets({ bullets: ["1", "2"] }, 3), null);
  for (const model of ["claude-sonnet-future-unknown", "claude-sonnet-5-evil", "xclaude-sonnet-5", "CLAUDE-SONNET-5", "sonnet", "", null, "toString", "__proto__"])
    assert.equal(aiCost(model, { inputTokens: 3000, outputTokens: 700 }), null, String(model));
  for (const bad of [{ inputTokens: NaN, outputTokens: 700 }, { inputTokens: 0, outputTokens: 700 }, { inputTokens: 10.5, outputTokens: 1 },
    { inputTokens: "10", outputTokens: 1 }, { inputTokens: 10, outputTokens: -1 }, { inputTokens: 10 }])
    assert.equal(aiCost(MODEL, bad), null, JSON.stringify(bad));
  assert.equal(aiCost(MODEL, { inputTokens: 1_000_000, outputTokens: 1_000_000 }), 30); // sonnet at the conservative 5/25 table
  assert.ok(Object.keys(AI_LIMITS.models).every(m => AI_LIMITS.models[m][0] > 0 && AI_LIMITS.models[m][1] > 0));
});

function scenario({ products = 3, pagesPer = 2, perSource = 15, withSearch = true } = {}) {
  const offers = Array.from({ length: products }, (_, i) => offer(i % 2 ? "brandsgeneral" : "brandsvalidated",
    [...Array.from({ length: pagesPer }, (_, j) => REAL.page(String(10_000 + i * 100 + j))), ...(withSearch && i === 0 ? [REAL.domain] : [])], "Produto " + i));
  offers.push(offer("brandsvalidated", [], "Zeta sem biblioteca"));
  const storage = createFAKEWeeklyStorage({ offers, discoveries: [discovery(offers[0].id, "55555")] });
  return { storage, offers, apify: createFAKEWeeklyApify({ itemsFor: itemsFor(perSource) }) };
}

test("worker: full run → Top 10 per product, media, analyses, 3-bullet product and 5-bullet week summaries", async () => {
  const { storage, apify, offers } = scenario(), archive = FAKEArchive(), claude = okClaude();
  const out = await runAll(storage, { apify, archive, claude });
  assert.equal(out.status, "succeeded");
  const ads = [...storage.ads.values()], products = [...storage.products.values()];
  assert.equal(products.length, 4);
  for (const o of offers.slice(0, 3)) assert.equal(ads.filter(a => a.offer_id === o.id).length, 10);
  assert.ok(ads.every(a => a.media.archived && validateAnalysis(a.analysis)));
  assert.ok(archive.uploads.every(p => p.startsWith("creative-review/" + DATE + "/")));
  assert.ok(products.filter(p => p.pages.length).every(p => validateBullets(p.summary, 3)));
  assert.equal(products.find(p => !p.pages.length).offer_name, "Zeta sem biblioteca");
  assert.equal(out.report.summary.bullets.length, 5);
  const first = ads.filter(a => a.offer_id === offers[0].id);
  assert.ok(first.some(a => a.page_source === "encontrada") && first.some(a => a.page_source === "cadastrada"));
  assert.ok(!first.some(a => a.page_id === "70000"), "domain filter drops the stranger ad (i=0 lands elsewhere)");
  assert.ok(apify.starts.every(s => s.maxUsd > 0 && s.maxUsd <= 15));
  const reserves = storage.calls.filter(c => c[0] === "reserve" && c[1] === "ai");
  assert.equal(reserves.length, claude.calls.length, "one reservation before every call");
  assert.equal(claude.counts.length, claude.calls.length, "exact count before every call");
  assert.ok(storage.calls.filter(c => c[0] === "settle").length === claude.calls.length, "settled down to real usage");
  assert.ok(storage.ledger.filter(l => l.kind === "ai").reduce((s, l) => s + l.usd, 0) <= 10);
});

test("worker: self re-chaining across slices resumes without a second Apify POST", async () => {
  const { storage, apify } = scenario({ products: 2 }), archive = FAKEArchive(), claude = okClaude();
  apify.status = (orig => async id => (apify.polls++ < 1 ? { status: "RUNNING" } : orig(id)))(apify.status);
  let report = await claimed(storage);
  // Slice 1: just under the 3-min polling margin → starts runs and hands over.
  const s1 = await runCreativeReviewSlice({ report, storage, apify, archive, claude, model: MODEL, now: () => NOW, deadline: Date.now() + 150_000 });
  assert.equal(s1.done, false); assert.equal(storage.reports.get(report.id).phase, "collect");
  const starts = apify.starts.length;
  const { nonce } = await storage.continue({ report_id: report.id, lease_token: report.lease_token });
  assert.equal(await storage.claim({ report_id: report.id, nonce: randomUUID() }), null, "only the issued nonce claims");
  report = await storage.claim({ report_id: report.id, nonce });
  assert.equal((await runCreativeReviewSlice({ report, storage, apify, archive, claude, model: MODEL, now: () => NOW })).done, true);
  assert.equal(apify.starts.length, starts); assert.equal(storage.reports.get(report.id).status, "succeeded");
  assert.equal(storage.reports.get(report.id).slices, 1);
});

test("worker: Apify reservations never exceed US$ 15 (many sources) and reruns reuse runs/ledger", async () => {
  const { storage, apify } = scenario({ products: 10, pagesPer: 9, perSource: 2 }), archive = FAKEArchive();
  const cents = kind => storage.ledger.filter(l => l.kind === kind).reduce((s, l) => s + Math.round(l.usd * 100), 0);
  const out = await runAll(storage, { apify, archive, claude: okClaude() });
  assert.ok(cents("apify") <= 1500, "apify " + cents("apify")); assert.ok(cents("ai") <= 1000, "ai " + cents("ai"));
  assert.ok(out.report.cost.sources_skipped > 0);
  const starts = apify.starts.length;
  await runAll(storage, { apify, archive, claude: okClaude() });
  assert.equal(apify.starts.length, starts, "rerun of the same Wednesday: no new POST");
  assert.ok(cents("apify") <= 1500);
  assert.ok(storage.calls.filter(c => c[1] === "apify").length >= apify.starts.length, "reserve precedes each POST");
});

test("worker: unknown or malformed Apify balance fails closed with no reservation or POST", async () => {
  const corpus = [null, undefined, [], "x", { review_date: "2026-10-21", used_usd: 0 }, { used_usd: 0 },
    ...[null, "", "0", false, true, [], {}, NaN, Infinity, -1, undefined].map(used_usd => ({ review_date: DATE, used_usd }))];
  for (const usage of corpus) {
    const { storage, apify } = scenario({ products: 1 });
    storage.budgetUsage = async () => usage;
    const report = await claimed(storage);
    await assert.rejects(runCreativeReviewSlice({ report, storage, apify, archive: FAKEArchive(), claude: okClaude(), model: MODEL, now: () => NOW }),
      { code: "capability_unavailable" }, JSON.stringify(usage));
    assert.equal(apify.starts.length, 0); assert.equal(storage.calls.filter(c => c[0] === "reserve").length, 0);
  }
});

test("worker: AI ceiling / unknown price fail closed → partial with full ranking; invalid JSON → partial, rerun fills", async () => {
  let { storage, apify } = scenario({ products: 2 });
  storage.ledger.push({ review_date: DATE, kind: "ai", reservation: "FAKE-prev", usd: 9.99 });
  let claude = okClaude(), out = await runAll(storage, { apify, archive: FAKEArchive(), claude });
  assert.equal(out.status, "partial"); assert.equal(claude.calls.length, 0);
  assert.match(out.report.error.message, /Teto semanal de IA/);
  assert.equal([...storage.ads.values()].length, 20);

  for (const model of ["modelo-sem-preco", "claude-sonnet-future-unknown"]) {
    ({ storage, apify } = scenario({ products: 1 }));
    claude = okClaude();
    out = await runAll(storage, { apify, archive: FAKEArchive(), claude, model });
    assert.equal(out.status, "partial"); assert.equal(claude.calls.length + claude.counts.length, 0, model);
    assert.equal([...storage.ads.values()].length, 10); assert.equal(storage.ledger.filter(l => l.kind === "ai").length, 0);
  }

  // Count failure or a count that would cross the ceiling: no call for it.
  ({ storage, apify } = scenario({ products: 1 }));
  claude = okClaude(); claude.countTokens = async () => { throw new Error("FAKE count fora"); };
  out = await runAll(storage, { apify, archive: FAKEArchive(), claude });
  assert.equal(claude.calls.length, 0); assert.equal(out.status, "partial");
  ({ storage, apify } = scenario({ products: 1 }));
  claude = okClaude(); claude.countTokens = async () => 5_000_000; // 5M tokens × US$5/M = US$25 > ceiling
  out = await runAll(storage, { apify, archive: FAKEArchive(), claude });
  assert.equal(claude.calls.length, 0); assert.match(out.report.error.message, /Teto semanal de IA/);

  ({ storage, apify } = scenario({ products: 1 }));
  out = await runAll(storage, { apify, archive: FAKEArchive(), claude: claudeWith(() => "isto não é JSON") });
  assert.equal(out.status, "partial"); assert.equal([...storage.ads.values()].length, 10);
  out = await runAll(storage, { apify, archive: FAKEArchive(), claude: okClaude() });
  assert.equal(out.status, "succeeded"); assert.ok([...storage.ads.values()].every(a => validateAnalysis(a.analysis)));
});

test("worker: uncertain start stays unknown and is never re-POSTed", async () => {
  const { storage } = scenario({ products: 1, withSearch: false });
  const apify = createFAKEWeeklyApify({ startError: new Error("FAKE rede caiu") });
  assert.equal((await runAll(storage, { apify, archive: FAKEArchive(), claude: okClaude() })).status, "failed");
  assert.equal([...storage.runs.values()][0].state, "unknown");
  await runAll(storage, { apify, archive: FAKEArchive(), claude: okClaude() });
  assert.equal(apify.starts.length, 1);
});

test("worker: is_new / rank_change against the previous Wednesday", async () => {
  const { storage, apify } = scenario({ products: 1, withSearch: false });
  await runAll(storage, { apify, archive: FAKEArchive(), claude: okClaude() }, "2026-10-21");
  const replay = createFAKEWeeklyApify({ itemsFor: url => [...apify.datasets.values()].flat().filter(i => url.includes("view_all_page_id=" + i.pageId)) });
  await runAll(storage, { apify: replay, archive: FAKEArchive(), claude: okClaude() });
  const current = [...storage.reports.values()].find(r => r.review_date === DATE);
  const rows = [...storage.ads.values()].filter(a => a.report_id === current.id);
  assert.ok(rows.length && rows.every(r => r.is_new === false && Number.isInteger(r.rank_change)));
});

test("archive: Meta CDN download cap 25 MB video, fixed path, magic bytes", async () => {
  const offerId = randomUUID();
  assert.throws(() => weeklyMediaPath(DATE, offerId, "../1", "thumb", "jpg"));
  assert.throws(() => weeklyMediaPath("../x", offerId, "1", "thumb", "jpg"));
  assert.throws(() => weeklyMediaPath(DATE, "../" + offerId, "1", "thumb", "jpg"));
  assert.throws(() => weeklyMediaPath(DATE, offerId, "1", "thumb", "html"));
  const uploads = [], limits = [];
  const archive = createWeeklyArchive({ download: async (url, max) => { limits.push(max); return url.endsWith(".mp4") ? Buffer.from("0000ftypisom0000") : Buffer.from([0xff, 0xd8, 0xff, 1]); },
    upload: async (p, b, t) => uploads.push([p, t]), publicUrl: p => "https://FAKE/" + p });
  assert.equal((await archive({ date: DATE, offer_id: offerId, ad_archive_id: "123", kind: "thumb", url: "https://scontent.fbcdn.net/x.jpg" })).url,
    "https://FAKE/creative-review/" + DATE + "/" + offerId + "/123-thumb.jpg");
  await archive({ date: DATE, offer_id: offerId, ad_archive_id: "123", kind: "video", url: "https://video.fbcdn.net/x.mp4" });
  assert.deepEqual(limits, [8 * 1024 * 1024, 25 * 1024 * 1024]);
  assert.deepEqual(uploads.map(u => u[1]), ["image/jpeg", "video/mp4"]);
  await assert.rejects(archive({ date: DATE, offer_id: offerId, ad_archive_id: "1", kind: "video", url: "https://video.fbcdn.net/x.jpg" }));
  const big = createWeeklyArchive({ download: async () => Buffer.alloc(25 * 1024 * 1024 + 1), upload: async () => {}, publicUrl: p => p });
  await assert.rejects(big({ date: DATE, offer_id: offerId, ad_archive_id: "1", kind: "video", url: "https://video.fbcdn.net/x.mp4" }));
  const runtime = await readFile(new URL("netlify/functions/_offer-intel-weekly.mjs", root), "utf8");
  assert.match(runtime, /safeRemoteFetch\(url, \{ allowedHostSuffixes: FB_MEDIA_HOSTS/);
});

test("Apify adapter sends maxTotalChargeUsd and refuses unknown cost", async () => {
  const calls = [];
  const fetcher = async url => { calls.push(url); return new Response(JSON.stringify({ data: { id: "FAKErun", defaultDatasetId: "FAKEds" } }), { status: 201 }); };
  const apify = createWeeklyApify({ token: ["FAKE", "apify"].join("-"), fetcher });
  await apify.start(weeklyActorInput([REAL.page("1")]), "m", 0.24);
  assert.match(calls[0], /maxTotalChargeUsd=0\.24/);
  for (const bad of [NaN, 0, -1, null, "1"]) await assert.rejects(apify.start(weeklyActorInput([REAL.page("1")]), "m", bad));
  assert.equal(calls.length, 1);
});

// ---- HTTP handlers -------------------------------------------------------------
const SIGNING = ["FAKE", "weekly", "hmac"].join("-");
function handlers(storage, extra = {}) {
  const queue = [], cfg = { slice: 13 * 60_000 };
  const services = { storage, secret: weeklySecret(SIGNING), model: MODEL, apify: createFAKEWeeklyApify({ itemsFor: itemsFor(12) }),
    archive: FAKEArchive(), claude: okClaude(), dispatch: async (id, nonce) => queue.push({ id, nonce }) };
  const h = createWeeklyHandlers({ authenticate: async req => req.headers.get("authorization") ? { id: "00000000-0000-4000-8000-000000000001", admin: !!req.headers.get("x-admin") } : null,
    isAdmin: u => u.admin, rateLimit: async () => ({ allowed: true }), getServices: () => services, now: () => new Date("2026-10-28T18:00:00Z"),
    sliceMs: () => cfg.slice, ...extra });
  return { h, queue, services, cfg };
}
const req = (method, path = "", body, headers = { authorization: "Bearer FAKE", "x-admin": "1" }) =>
  new Request("https://site.example/.netlify/functions/offer-intel-weekly" + path, { method,
    headers: { ...headers, ...(body ? { "content-type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
const bg = signed => new Request("https://site.example/.netlify/functions/offer-intel-weekly-background", { method: "POST", ...signed });

test("API: admin only; POST run per Wednesday; 409 while running; concurrent schedule refused", async () => {
  const storage = createFAKEWeeklyStorage();
  const { h, queue } = handlers(storage);
  assert.equal((await h.api(req("GET", "", null, {}))).status, 401);
  assert.equal((await h.api(req("GET", "", null, { authorization: "Bearer FAKE" }))).status, 403);
  assert.equal((await h.api(req("POST", "", { action: "nope" }))).status, 400);
  const first = await h.api(req("POST", "", { action: "run" }));
  assert.equal(first.status, 202);
  const body = await first.json();
  assert.deepEqual([body.review_date, body.title], [DATE, "Creative Review 28/10/2026"]);
  assert.equal(JSON.stringify(body).includes(queue[0].nonce), false);
  const again = await h.api(req("POST", "", { action: "run" }));
  assert.equal(again.status, 409); assert.equal((await again.json()).code, "job_active");
  assert.equal((await (await h.scheduled()).json()).code, "job_active"); assert.equal(queue.length, 1);
});

test("background: HMAC domain separation, single-use nonce, self re-dispatch until done; API shapes, no secrets", async () => {
  const offers = [offer("brandsvalidated", [REAL.page("31"), REAL.domain], "Alpha"), offer("brandsgeneral", [REAL.web], "Beta"), offer("brandsvalidated", [], "Gama")];
  const storage = createFAKEWeeklyStorage({ offers });
  const { h, queue, cfg } = handlers(storage);
  // An older finished folder must not hide the current run from the UI.
  const old = await claimed(storage, "2026-10-21");
  await storage.checkpoint({ report_id: old.id, lease_token: old.lease_token, patch: { status: "succeeded", phase: "done", progress: 100 } });
  await h.api(req("POST", "", { action: "run" }));
  const { id, nonce } = queue.shift();
  assert.equal((await h.background(bg(signedDispatch(id, nonce, SIGNING)))).status, 403, "base secret is not valid for weekly");
  const latestQueued = await (await h.api(req("GET", "?date=latest"))).json();
  assert.equal(latestQueued.report.review_date, DATE); assert.equal(latestQueued.report.active, true);
  cfg.slice = 150_000; // first slice hands over during collection
  assert.equal((await h.background(bg(signedDispatch(id, nonce, weeklySecret(SIGNING))))).status, 202);
  assert.equal(queue.length, 1, "re-dispatched itself"); assert.equal(storage.reports.get(id).status, "running");
  assert.equal((await h.background(bg(signedDispatch(id, nonce, weeklySecret(SIGNING))))).status, 202, "replayed nonce is ignored");
  assert.equal(storage.reports.get(id).lease_token, null);
  cfg.slice = 13 * 60_000;
  while (queue.length) { const next = queue.shift(); await h.background(bg(signedDispatch(next.id, next.nonce, weeklySecret(SIGNING)))); }
  assert.equal(storage.reports.get(id).status, "succeeded");

  const list = await (await h.api(req("GET"))).json();
  assert.deepEqual(list.items.map(i => i.title), ["Creative Review 28/10/2026", "Creative Review 21/10/2026"]);
  assert.equal(list.items[0].products_count, 3); assert.equal(list.items[0].ads_count, 20);
  const text = await (await h.api(req("GET", "?date=" + DATE))).text(), folder = JSON.parse(text);
  assert.deepEqual(Object.keys(folder).sort(), ["ok", "products", "report", "summary"]);
  assert.equal(folder.summary.bullets.length, 5);
  assert.deepEqual(folder.products.map(p => [p.offer_name, p.no_library, p.status_label]), [["Alpha", false, null], ["Gama", true, "Sem biblioteca cadastrada"], ["Beta", false, null]]);
  assert.equal(folder.products[0].top.length, 3); assert.equal(folder.products[0].summary.bullets.length, 3);
  const detail = await (await h.api(req("GET", "?date=" + DATE + "&offer_id=" + offers[0].id))).json();
  assert.equal(detail.ads.length, 10); assert.deepEqual(detail.ads.map(a => a.rank), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(detail.product.next_offer_id, offers[2].id);
  const ad = detail.ads[0];
  for (const k of ["rank", "score", "days_active", "repetitions", "is_new", "rank_change", "page_name", "page_source", "ad_text", "cta_text", "landing_url", "started_at", "ad_library_url", "media", "analysis"])
    assert.ok(k in ad, k);
  for (const secret of [SIGNING, weeklySecret(SIGNING), nonce, "FAKErun", "FAKEds", "lease", "nonce", "oh=sig", "reservation"])
    assert.equal((text + JSON.stringify(detail) + JSON.stringify(list)).includes(secret), false, "vazou " + secret);
  assert.equal((await h.api(req("GET", "?date=2026-10-27"))).status, 400);
  assert.equal((await h.api(req("GET", "?date=2026-11-04"))).status, 404);
  assert.equal((await h.api(req("GET", "?date=" + DATE + "&offer_id=" + randomUUID()))).status, 404);
});

test("public ad projection exposes only Meta CDN / archived https media and validated analysis", () => {
  const ad = publicAd({ id: "x", offer_id: "o", rank: 1, ad_archive_id: "9", score: "50.00", days_active: 1, repetitions: 1,
    media: { source_thumb_url: "https://evil.example/a.jpg", source_video_url: "https://video.fbcdn.net/a.mp4" }, analysis: { error: true } });
  assert.deepEqual(ad.media, { archived: false, thumb_url: null, video_url: null }); assert.equal(ad.analysis, null); assert.equal(ad.score, 50);
});

test("migration: only new offer_intel_weekly_* objects, RLS admin select, service_role writes, US$ 15 / US$ 10 caps", async () => {
  const sql = await readFile(new URL("supabase/migrations/202610280004_offer_intel_weekly.sql", root), "utf8");
  for (const m of sql.matchAll(/create (?:table|function|index|policy) (?:public\.)?(\w+)/g)) assert.match(m[1], /^offer_intel_weekly_/);
  assert.doesNotMatch(sql, /alter table public\.(?!offer_intel_weekly_)/);
  assert.doesNotMatch(sql, /(insert into|update|delete from) (public\.)?offers\b/);
  assert.equal((sql.match(/enable row level security/g) || []).length, 6);
  assert.match(sql, /grant select on public\.offer_intel_weekly_reports, public\.offer_intel_weekly_products, public\.offer_intel_weekly_ads to authenticated/);
  assert.equal((sql.match(/using \(public\.swipe_is_admin\(\)\)/g) || []).length, 3);
  assert.match(sql, /review_date date not null unique check \(extract\(isodow from review_date\)=3\)/);
  assert.match(sql, /when 'apify' then 15\.00 when 'ai' then 10\.00/);
  assert.match(sql, /if v_used\+v_usd>v_cap then raise exception 'budget_exceeded'/);
  assert.match(sql, /jsonb_typeof\(p->'usd'\) is distinct from 'number'/);
  assert.match(sql, /function public\.offer_intel_weekly_continue/);
  assert.match(sql, /to service_role;\s*commit;\s*$/);
});

test("Creative Review uses a valid allowlisted Claude model by default", async () => {
  const { CREATIVE_REVIEW_MODEL } = await import("../netlify/functions/_offer-intel-weekly.mjs");
  const { AI_LIMITS } = await import("../lib/offer-intel-weekly.mjs");
  assert.equal(CREATIVE_REVIEW_MODEL, "claude-sonnet-5-5");
  assert.ok(Object.hasOwn(AI_LIMITS.models, CREATIVE_REVIEW_MODEL));
});

test("OpenRouter adapter: model per kind, max_price pinned to the allowlist, usage mapped, failures explained", async () => {
  const { createWeeklyOpenRouter, OPENROUTER_IMAGE_TOKENS } = await import("../lib/offer-intel-weekly-worker.mjs");
  const { AI_LIMITS } = await import("../lib/offer-intel-weekly.mjs");
  const calls = [];
  const FAKE_fetch = async (url, init) => {
    calls.push(JSON.parse(init.body));
    if (calls.length === 3) return new Response(JSON.stringify({ error: { code: 402, message: "Insufficient credits" } }), { status: 402 });
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":1}' } }], usage: { prompt_tokens: 900, completion_tokens: 120 } }));
  };
  const ai = createWeeklyOpenRouter({ key: "FAKE-KEY", adsModel: "google/gemini-3.8-flash", summaryModel: "anthropic/claude-sonnet-5.5", fetcher: FAKE_fetch });
  const ad = await ai({ prompt: "p", image: "https://x.supabase.co/a.png", maxTokens: 1500, kind: "ad" });
  assert.deepEqual(ad.usage, { input_tokens: 900, output_tokens: 120 });
  await ai({ prompt: "p", maxTokens: 1200, kind: "week" });
  assert.equal(calls[0].model, "google/gemini-3.8-flash");
  assert.equal(calls[1].model, "anthropic/claude-sonnet-5.5");
  assert.deepEqual(calls[0].provider.max_price, { prompt: AI_LIMITS.models["google/gemini-3.8-flash"][0], completion: AI_LIMITS.models["google/gemini-3.8-flash"][1] });
  assert.equal(calls[0].messages[0].content[1].type, "image_url");
  assert.equal(calls[1].messages[0].content.length, 1);
  await assert.rejects(ai({ prompt: "p", maxTokens: 10, kind: "ad" }), /OpenRouter HTTP 402 402: Insufficient credits/);
  assert.equal(ai.modelFor("product"), "anthropic/claude-sonnet-5.5");
  assert.equal(await ai.countTokens({ prompt: "x".repeat(1001), image: "https://x/a.png" }), 1001 + OPENROUTER_IMAGE_TOKENS);
  const unknown = createWeeklyOpenRouter({ key: "FAKE-KEY", adsModel: "google/unknown-model", summaryModel: "anthropic/claude-sonnet-5.5", fetcher: FAKE_fetch });
  await assert.rejects(unknown({ prompt: "p", maxTokens: 10, kind: "ad" }), /sem preço/);
});

test("Creative Review prefers OpenRouter when its key exists and falls back to Anthropic", async () => {
  const { creativeReviewAi } = await import("../netlify/functions/_offer-intel-weekly.mjs");
  const or = creativeReviewAi({ OPENROUTER_API_KEY: "FAKE-KEY" });
  assert.equal(or.model, "google/gemini-3.8-flash");
  assert.equal(or.claude.modelFor("week"), "anthropic/claude-sonnet-5.5");
  const direct = creativeReviewAi({ ANTHROPIC_API_KEY: "FAKE-KEY" });
  assert.equal(direct.model, "claude-sonnet-5-5");
  assert.equal(direct.claude.modelFor, undefined);
});

test("first Creative Review folder marks nothing as new; DCO placeholders are stripped", async () => {
  const { compareWithPrevious, withoutTemplateTokens, publicAd } = await import("../lib/offer-intel-weekly.mjs");
  const ranked = [{ ad_ids: ["1"], match_keys: ["k"], rank: 1 }];
  assert.deepEqual(compareWithPrevious(ranked, null).map(a => [a.is_new, a.rank_change]), [[false, null]]);
  assert.deepEqual(compareWithPrevious(ranked, []).map(a => a.is_new), [true]);
  assert.deepEqual(compareWithPrevious(ranked, [{ ad_archive_id: "1", rank: 3 }]).map(a => [a.is_new, a.rank_change]), [[false, 2]]);
  assert.equal(withoutTemplateTokens("{{product.brand}}"), null);
  assert.equal(withoutTemplateTokens("Try {{ product.name }} today"), "Try today");
  assert.equal(publicAd({ id: "a", ad_archive_id: "1", ad_text: "{{product.brand}}", score: 1, media: {} }).ad_text, null);
});

test("worker: real AI usage above the estimated reservation is booked and the US$ 10 ceiling stops further calls", async () => {
  const { storage, apify } = scenario({ products: 2 });
  const claude = okClaude();
  claude.countTokens = async () => 10;                       // estimate far below reality
  const base = claude;
  const heavy = async args => ({ ...(await base(args)), usage: { input_tokens: 600_000, output_tokens: 300 } }); // ≈ US$3 each
  heavy.countTokens = claude.countTokens; heavy.calls = claude.calls; heavy.counts = claude.counts;
  const out = await runAll(storage, { apify, archive: FAKEArchive(), claude: heavy });
  const ai = storage.ledger.filter(l => l.kind === "ai");
  assert.ok(ai.some(l => l.reservation.endsWith(":extra")), "extra reservation booked");
  assert.ok(ai.reduce((sum, l) => sum + Number(l.usd), 0) <= 10.0001, "ledger never above US$ 10");
  assert.ok(claude.calls.length < 22, "AI stops once the ceiling is reached");
  assert.equal(out.status, "partial");
});
