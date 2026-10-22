import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildCostControlledApifyInput,
  extractOfferSearchTargets,
  planDiscoveredLibraries,
} from "../lib/apify-offer-discovery.mjs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const adsScraper = readFileSync(new URL("../scripts/ads_scraper.py", import.meta.url), "utf8");
const tiktokMining = readFileSync(new URL("../scripts/tiktok_mining.py", import.meta.url), "utf8");

test("extração de queries e payload Apify respeitam controle de gastos", () => {
  const offer = {
    nomeOferta: "Pulse Flow",
    nomeMarca: "Rootvana",
    dominios: [{ linkDominio: "https://www.tryrootvana.com/pages/listicle-2" }],
    bibliotecas: [{ nome: "Funil Winner", link: "https://www.facebook.com/ads/library/?view_all_page_id=12345" }],
  };
  const extracted = extractOfferSearchTargets(offer, { maxQueries: 2 });
  assert.ok(extracted.domains.includes("tryrootvana.com"));
  assert.deepEqual(extracted.queries, ["tryrootvana.com", "Rootvana"]);

  const { actorInput, runOptions } = buildCostControlledApifyInput(extracted.searchUrls, {
    maxQueries: 2,
    resultsLimit: 15,
    memoryMbytes: 1024,
    timeoutSecs: 120,
  });
  assert.equal(actorInput.startUrls.length, 2);
  assert.equal(actorInput.resultsLimit, 15);
  assert.equal(actorInput.isDetailsPerAd, false);
  assert.equal(runOptions.maxItems, 30);
  assert.equal(runOptions.memoryMbytes, 1024);
});

test("planDiscoveredLibraries agrupa por pageId e exclui bibliotecas já cadastradas", () => {
  const offer = {
    nomeOferta: "Pulse Flow",
    nomeMarca: "Rootvana",
    dominios: [{ linkDominio: "https://tryrootvana.com/pages/listicle-2" }],
    bibliotecas: [{ nome: "Funil Winner", link: "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&view_all_page_id=11111" }],
  };
  const items = [
    { pageId: "11111", pageName: "Rootvana Main", linkUrl: "https://tryrootvana.com/pages/listicle-2", adArchiveId: "1001" },
    { pageId: "22222", pageName: "Rootvana Health Lab", linkUrl: "https://tryrootvana.com/pages/listicle-2", adArchiveId: "1002" },
    { pageId: "22222", pageName: "Rootvana Health Lab", linkUrl: "https://tryrootvana.com/products/pulse-flow", adArchiveId: "1003" },
    { pageId: "33333", pageName: "Unrelated Page", linkUrl: "https://otherdomain.com/offer", adArchiveId: "1004" },
  ];
  const discovered = planDiscoveredLibraries(items, offer);
  assert.equal(discovered.length, 1);
  assert.equal(discovered[0].pageId, "22222");
  assert.equal(discovered[0].matchedAds, 2);
  assert.ok(discovered[0].matchedDomains.includes("tryrootvana.com"));
});

test("cards com BM nomeiam biblioteca como Funil Winner e coletores têm limite de custo e fuso BR", () => {
  assert.match(html, /function hasBmHistoryData\(d\)/);
  assert.match(html, /function libraryDisplayName\(d,b,index=0,total=1\)/);
  assert.match(html, /const libBtnLabel=hasBmHistoryData\(d\)\?"Funil Winner":"Biblioteca"/);
  assert.match(html, /adminOfferDiscoverySectionHtml\(d,id,num\)/);
  assert.match(adsScraper, /ZoneInfo\("America\/Sao_Paulo"\)/);
  assert.match(tiktokMining, /APIFY_MAX_ITEMS_PER_RUN/);
  assert.match(tiktokMining, /APIFY_MEMORY_MB/);
});
