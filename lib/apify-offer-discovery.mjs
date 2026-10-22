const IGNORED_DISCOVERY_HOSTS = [
  "buygoods.com",
  "mycartpanda.com",
  "clickbank.net",
  "hotmart.com",
  "kiwify.com.br",
  "shopify.com",
  "myshopify.com",
  "facebook.com",
  "fb.com",
  "fb.me",
  "instagram.com",
  "tiktok.com",
  "youtube.com",
  "youtu.be",
  "drive.google.com",
  "docs.google.com",
];

const SUBDOMAIN_PREFIXES = /^(?:www|lp|pdp|cc|app|go|try|get|shop|store|pages|offer|offers|vsl|a1|twr)\./i;

export function extractPageIdFromLibraryUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    const pageId = (url.searchParams.get("view_all_page_id") || "").trim();
    return /^\d+$/.test(pageId) ? pageId : "";
  } catch {
    const match = String(value || "").match(/[?&]view_all_page_id=(\d+)/i);
    return match ? match[1] : "";
  }
}

export function normalizeDiscoveryDomain(value) {
  try {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
    if (!host || !host.includes(".") || /^\d+(?:\.\d+){3}$/.test(host)) return "";
    if (IGNORED_DISCOVERY_HOSTS.some(ignored => host === ignored || host.endsWith(`.${ignored}`))) return "";
    return host;
  } catch {
    return "";
  }
}

export function registrableDomain(host) {
  const clean = normalizeDiscoveryDomain(host);
  if (!clean) return "";
  const stripped = clean.replace(SUBDOMAIN_PREFIXES, "");
  const parts = stripped.split(".");
  if (parts.length <= 2) return stripped;
  const tld2 = parts.slice(-2).join(".");
  if (/^(?:com|co|org|net|edu|gov)\.[a-z]{2}$/i.test(tld2) && parts.length >= 3) {
    return parts.slice(-3).join(".");
  }
  return parts.slice(-2).join(".");
}

function cleanBrandTerm(value) {
  const raw = String(value || "")
    .split(/\s+(?:[—–·|]|-\s+)\s*/)[0]
    .replace(/\s+/g, " ")
    .trim();
  return raw.length >= 3 ? raw : "";
}

export function buildMetaLibrarySearchUrl(query, country = "ALL") {
  const clean = String(query || "").trim();
  if (!clean) return "";
  const url = new URL("https://www.facebook.com/ads/library/");
  url.searchParams.set("active_status", "active");
  url.searchParams.set("ad_type", "all");
  url.searchParams.set("country", country || "ALL");
  url.searchParams.set("is_targeted_country", "false");
  url.searchParams.set("media_type", "all");
  url.searchParams.set("q", clean);
  url.searchParams.set("search_type", "keyword_unordered");
  url.searchParams.set("sort_data[direction]", "desc");
  url.searchParams.set("sort_data[mode]", "total_impressions");
  return url.href;
}

export function buildMetaPageLibraryUrl(pageId, country = "ALL") {
  const cleanId = String(pageId || "").trim();
  if (!/^\d+$/.test(cleanId)) return "";
  const url = new URL("https://www.facebook.com/ads/library/");
  url.searchParams.set("active_status", "active");
  url.searchParams.set("ad_type", "all");
  url.searchParams.set("country", country || "ALL");
  url.searchParams.set("is_targeted_country", "false");
  url.searchParams.set("media_type", "all");
  url.searchParams.set("search_type", "page");
  url.searchParams.set("sort_data[direction]", "desc");
  url.searchParams.set("sort_data[mode]", "total_impressions");
  url.searchParams.set("view_all_page_id", cleanId);
  return url.href;
}

export function extractOfferSearchTargets(offerData = {}, options = {}) {
  const maxQueries = Math.max(1, Math.min(3, Number(options.maxQueries) || 2));
  const country = String(options.country || "ALL").trim() || "ALL";
  const existingPageIds = new Set();
  const existingLinks = new Set();

  for (const lib of Array.isArray(offerData?.bibliotecas) ? offerData.bibliotecas : []) {
    const link = String(lib?.link || "").trim();
    if (!link) continue;
    existingLinks.add(link.toLowerCase());
    const pageId = extractPageIdFromLibraryUrl(link);
    if (pageId) existingPageIds.add(pageId);
  }

  const domains = new Set();
  const domainRoots = new Set();
  const candidateUrls = [
    ...(Array.isArray(offerData?.dominios) ? offerData.dominios.map(d => d?.linkDominio) : []),
    offerData?.advertorialLink,
    offerData?.linkOferta,
  ];
  for (const candidate of candidateUrls) {
    const host = normalizeDiscoveryDomain(candidate);
    if (!host) continue;
    domains.add(host);
    const root = registrableDomain(host);
    if (root) domainRoots.add(root);
  }

  const brandTerms = [];
  for (const raw of [offerData?.nomeMarca, offerData?.nomeOferta]) {
    const term = cleanBrandTerm(raw);
    if (term && !brandTerms.some(existing => existing.toLowerCase() === term.toLowerCase())) {
      brandTerms.push(term);
    }
  }

  const queries = [];
  for (const root of domainRoots) {
    if (!queries.includes(root)) queries.push(root);
    if (queries.length >= maxQueries) break;
  }
  for (const term of brandTerms) {
    if (queries.length >= maxQueries) break;
    if (!queries.some(q => q.toLowerCase() === term.toLowerCase())) queries.push(term);
  }

  const searchUrls = queries.map(q => buildMetaLibrarySearchUrl(q, country)).filter(Boolean);
  return {
    queries,
    searchUrls,
    domains: [...new Set([...domainRoots, ...domains])],
    brandTerms,
    existingPageIds: [...existingPageIds],
    existingLinks: [...existingLinks],
  };
}

export function buildCostControlledApifyInput(searchUrls, budget = {}) {
  const maxQueries = Math.max(1, Math.min(3, Number(budget.maxQueries) || 2));
  const resultsLimit = Math.max(5, Math.min(30, Number(budget.resultsLimit) || 20));
  const memoryMbytes = Math.max(512, Math.min(2048, Number(budget.memoryMbytes) || 1024));
  const timeoutSecs = Math.max(30, Math.min(240, Number(budget.timeoutSecs) || 120));
  const urls = (Array.isArray(searchUrls) ? searchUrls : [])
    .map(u => String(typeof u === "string" ? u : u?.url || "").trim())
    .filter(u => u.startsWith("https://www.facebook.com/ads/library/"))
    .slice(0, maxQueries);

  if (!urls.length) {
    throw new Error("Nenhuma URL de busca válida da Meta Ads Library para consultar");
  }

  return {
    actorInput: {
      startUrls: urls.map(url => ({ url })),
      resultsLimit,
      activeStatus: "active",
      onlyTotal: false,
      includeAboutPage: false,
      isDetailsPerAd: false,
    },
    runOptions: {
      memoryMbytes,
      timeoutSecs,
      maxItems: urls.length * resultsLimit,
    },
  };
}

function extractRowUrls(row) {
  const snapshot = row?.snapshot || {};
  const candidates = [
    snapshot.linkUrl,
    snapshot.caption,
    row?.linkUrl,
    ...(Array.isArray(snapshot.cards) ? snapshot.cards.flatMap(card => [card?.linkUrl, card?.caption]) : []),
  ];
  const bodyText = typeof snapshot.body === "string" ? snapshot.body : snapshot.body?.text || "";
  for (const match of String(bodyText).matchAll(/https?:\/\/[^\s"'<>)]+/gi)) {
    candidates.push(match[0]);
  }
  return candidates.map(v => String(v || "").trim()).filter(Boolean);
}

export function planDiscoveredLibraries(items, offerData = {}, options = {}) {
  const maxLibraries = Math.max(1, Math.min(15, Number(options.maxLibraries) || 8));
  const discoveredAt = String(options.discoveredAt || new Date().toISOString());
  const targets = extractOfferSearchTargets(offerData, options);
  const existingPages = new Set(targets.existingPageIds);
  const targetDomains = targets.domains.map(d => d.toLowerCase());
  const targetBrands = targets.brandTerms
    .map(b => b.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim())
    .filter(b => b.length >= 3);

  const byPage = new Map();

  for (const row of Array.isArray(items) ? items : []) {
    const snapshot = row?.snapshot || {};
    const pageId = String(row?.pageId || row?.pageID || snapshot.pageId || "").trim();
    if (!/^\d+$/.test(pageId) || existingPages.has(pageId)) continue;

    const pageName = String(row?.pageName || snapshot.pageName || snapshot.currentPageName || `Página ${pageId}`).trim().slice(0, 120);
    const adId = String(row?.adArchiveId || row?.adArchiveID || "").trim();
    const rowUrls = extractRowUrls(row);
    const rowHosts = rowUrls.map(normalizeDiscoveryDomain).filter(Boolean);
    const rowRoots = rowHosts.map(registrableDomain).filter(Boolean);
    const allRowDomains = [...new Set([...rowHosts, ...rowRoots])];

    const matchedDomains = targetDomains.filter(target =>
      allRowDomains.some(host => host === target || host.endsWith(`.${target}`) || target.endsWith(`.${host}`))
      || rowUrls.some(rawUrl => rawUrl.toLowerCase().includes(target))
    );

    const textHaystack = [
      pageName,
      snapshot.title,
      typeof snapshot.body === "string" ? snapshot.body : snapshot.body?.text,
      snapshot.caption,
      ...rowUrls,
    ]
      .join(" ")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const matchedBrands = targetBrands.filter(brand => textHaystack.includes(brand));
    if (!matchedDomains.length && !matchedBrands.length) continue;

    let entry = byPage.get(pageId);
    if (!entry) {
      entry = {
        pageId,
        pageName,
        adIds: new Set(),
        matchedDomains: new Set(),
        matchedBrands: new Set(),
        sampleAdUrl: "",
        sampleLandingUrl: "",
      };
      byPage.set(pageId, entry);
    }
    if (/^\d+$/.test(adId)) {
      entry.adIds.add(adId);
      if (!entry.sampleAdUrl) entry.sampleAdUrl = `https://www.facebook.com/ads/library/?id=${adId}`;
    }
    for (const d of matchedDomains) entry.matchedDomains.add(d);
    for (const b of matchedBrands) entry.matchedBrands.add(b);
    if (!entry.sampleLandingUrl) {
      const landing = rowUrls.find(u => /^https?:\/\//i.test(u) && normalizeDiscoveryDomain(u));
      if (landing) entry.sampleLandingUrl = landing.slice(0, 260);
    }
  }

  return [...byPage.values()]
    .map(entry => {
      const matchedDomains = [...entry.matchedDomains];
      const matchedBrands = [...entry.matchedBrands];
      const matchType = matchedDomains.length ? "domain" : "brand";
      const matchedAds = Math.max(1, entry.adIds.size);
      return {
        pageId: entry.pageId,
        pageName: entry.pageName,
        nome: `${entry.pageName} (${matchType === "domain" ? "mesmo domínio" : "mesma oferta"})`,
        link: buildMetaPageLibraryUrl(entry.pageId),
        matchType,
        matchedDomains,
        matchedBrands,
        matchedAds,
        sampleAdUrl: entry.sampleAdUrl,
        sampleLandingUrl: entry.sampleLandingUrl,
        discoveredAt,
      };
    })
    .sort((a, b) => {
      if (a.matchType !== b.matchType) return a.matchType === "domain" ? -1 : 1;
      if (b.matchedAds !== a.matchedAds) return b.matchedAds - a.matchedAds;
      return a.pageName.localeCompare(b.pageName, "pt-BR");
    })
    .slice(0, maxLibraries);
}
