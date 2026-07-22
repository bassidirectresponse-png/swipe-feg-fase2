const fbLibraryKeyword = query => `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&is_targeted_country=false&media_type=all&q=${encodeURIComponent(`"${query}"`)}&search_type=keyword_exact_phrase&sort_data[direction]=desc&sort_data[mode]=total_impressions&source=page-transparency-widget`;

const domain = (name, offer, checkout = "") => ({ name, offer, checkout });
const library = (name, link, providedCount = null) => ({ name, link, providedCount });
const ad = (name, link) => ({ name, link });

export const offers = [
  {
    slug: "vital-bp", section: "brandsgeneral", name: "Vital BP", brand: "Vital BP",
    aliases: ["VitalBP", "Vital BP - Meta Ads"], niche: "Pressão arterial", format: "Suplemento para saúde cardiovascular",
    ads: 390,
    domains: [domain("PV · Vital BP", "https://bloodflowsecret.com/pages/vbp-pdpfb/", "https://pdp.bloodflowsecret.com/products/vitalbp-6-pack-vbp-pdpfb-sub")],
    libraries: [library("Vital BP · bloodflowsecret.com", fbLibraryKeyword("bloodflowsecret.com"), 390)],
    funnel: "Meta Ads → página do produto Vital BP → checkout do kit",
  },
  {
    slug: "score-blue", section: "brandsgeneral", name: "Score Blue", brand: "Score Blue",
    aliases: ["ScoreBlue"], niche: "Disfunção erétil", format: "Telemedicina DTC",
    ads: 85,
    advertorial: "https://scoreblue.com/top10update",
    domains: [
      domain("PV · Score Blue", "https://scoreblue.com/", "https://app.scoreblue.com/patient/checkout?checkout=sb"),
      domain("Quiz · Score Blue", "https://scoreblue.com/intake"),
    ],
    libraries: [library("Score Blue · scoreblue.com", fbLibraryKeyword("scoreblue.com"), 85)],
    funnel: "Meta Ads/advertorial → página ou quiz → checkout de telemedicina",
  },
  {
    slug: "jubilance-pms", section: "brandsgeneral", name: "Jubilance PMS", brand: "Jubilance",
    aliases: ["Jubilance"], niche: "Saúde feminina · PMS", format: "Suplemento DTC",
    ads: 73,
    domains: [domain("PV · Jubilance", "https://jubilance.com/", "https://jubilance.com/checkout/")],
    libraries: [library("Jubilance · Meta Ads Library", "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&is_targeted_country=false&media_type=all&search_type=page&sort_data[mode]=total_impressions&sort_data[direction]=desc&source=page-transparency-widget&view_all_page_id=115432411523933", 73)],
    funnel: "Meta Ads → página do produto Jubilance → checkout",
  },
  {
    slug: "protaflo", section: "brandsgeneral", name: "ProtaFlo", brand: "ProtaFlo",
    aliases: ["Prota Flo"], niche: "Próstata", format: "Suplemento DTC",
    ads: 390,
    domains: [domain("PV · ProtaFlo", "https://prostatediscovery.com/pages/ptf-pdpfb/", "https://pdp.prostatediscovery.com/products/protaflo-6-pack-sub-ptf-pdpfb")],
    libraries: [library("ProtaFlo · prostatediscovery.com", fbLibraryKeyword("prostatediscovery.com"), 390)],
    funnel: "Meta Ads → página do produto ProtaFlo → checkout do kit",
  },
  {
    slug: "neuro-naturals", section: "brandsgeneral", name: "Neuro Naturals · Migraine MD", brand: "Neuro Naturals",
    aliases: ["Neuro Naturals", "Migraine MD"], niche: "Enxaqueca", format: "Suplemento DTC",
    ads: 24,
    domains: [domain("PV · Neuro Naturals", "https://myneuronaturals.com/", "https://myneuronaturals.com/checkouts/cn/hWNEk7VsGXZmXjRsG55TVwRO/en-us")],
    libraries: [library("Neuro Naturals · Meta Ads Library", "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&is_targeted_country=false&media_type=all&search_type=page&sort_data[mode]=total_impressions&sort_data[direction]=desc&source=page-transparency-widget&view_all_page_id=188802700993015", 24)],
    funnel: "Meta Ads → página Neuro Naturals → checkout",
  },
  {
    slug: "glyco-reset", section: "oferta", name: "Glyco Reset", brand: "Glyco Reset",
    aliases: ["GlycoReset", "Glycoreset"], niche: "Diabetes", format: "VSL · suplemento",
    ads: 15340,
    domains: [
      domain("VSL · USA Health Academy", "https://usainsurance.live/glycoreset-vsl06-lead2-ml156", "https://buygoods.com/secure/checkout.html?account_id=12805&product_codename=gly6"),
      domain("VSL · Lets Updated", "https://letsupdated.site/fb/bg/gl-res-06/01/", "https://buygoods.com/secure/checkout.html?account_id=12805&product_codename=gly6"),
      domain("VSL · Olive Health Today", "https://olivehealthtoday.com/mg/gr-bg/vsl06-ld2-ml2-c49-ev4/", "https://buygoods.com/secure/checkout.html?account_id=12805&product_codename=gly6"),
    ],
    libraries: [
      library("USA Health Academy · 640 ads informados", fbLibraryKeyword("USHEALTHACADEMY.COM"), 640),
      library("Lets Updated · 2.700+ ads informados", fbLibraryKeyword("LUP.LETSUPDATED.SITE"), 2700),
      library("Olive Health Today · 12.000 ads informados", fbLibraryKeyword("M.OLIVEHEALTHTODAY.COM"), 12000),
    ],
    creatives: [
      ad("Anúncio · Glyco Reset 01", "https://www.facebook.com/61551441573843/posts/27540486892312963/?app=fbl"),
      ad("Anúncio · Glyco Reset 02", "https://www.facebook.com/61551360140312/posts/37028526893460252/?app=fbl"),
    ],
    funnel: "Meta Ads → VSL Glyco Reset → checkout BuyGoods",
  },
  {
    slug: "glpro", section: "oferta", name: "GLPro", brand: "GLPro",
    aliases: ["GL Pro", "GLP Pro"], niche: "Diabetes", format: "Página de vendas · suplemento",
    ads: 0, traffic28d: "152.4K views · junho",
    domains: [domain("Oferta · GLPro", "https://tryglpro.com/glp1", "https://buygoods.com/secure/checkout.html?account_id=11606&product_codename=GLP6V1")],
    libraries: [library("GLPro · tryglpro.com", fbLibraryKeyword("tryglpro.com"), 0)],
    funnel: "Página de vendas GLPro → checkout BuyGoods",
  },
  {
    slug: "steel-power-horse-fil", section: "oferta", name: "Steel Power / Horse Fil", brand: "Steel Power · Horse Fil",
    aliases: ["Steel Power", "Horse Fil", "Horsefil", "Horse Fill"], niche: "Disfunção erétil", format: "VSL · suplemento",
    ads: 9900,
    domains: [
      domain("Horse Fil · HFMIA", "https://www.healthnewsletters.life/hfmia", "https://horsefil.mycartpanda.com/checkout/211570842:1?afid=IcvAetmMjP"),
      domain("Horse Fil · HPST", "https://www.healthnewsletters.life/hpst", "https://horsefil.mycartpanda.com/checkout/211570842:1?afid=IcvAetmMjP"),
      domain("Steel Power · Health Mens", "https://www.healthnewsletters.life/health-mens", "https://steel-power.mycartpanda.com/checkout?afid=fnGIqxinKX"),
      domain("Steel Power · BGPR", "https://www.healthnewsletters.life/bgpr", "https://steel-power.mycartpanda.com/checkout?afid=fnGIqxinKX"),
      domain("Steel Power · Health Mens 2", "https://www.healthnewsletters.life/health-mens2", "https://steel-power.mycartpanda.com/checkout?afid=fnGIqxinKX"),
      domain("Horse Fil · HFBT", "https://www.healthnewsletters.life/hfbt", "https://horsefil.mycartpanda.com/checkout/211570842:1?afid=IcvAetmMjP"),
      domain("Horse Fil · HFB Alcone", "https://www.healthnewsletters.life/hfbalcone", "https://horsefil.mycartpanda.com/checkout/211570842:1?afid=IcvAetmMjP"),
    ],
    libraries: [library("Steel Power / Horse Fil · Mens Health", "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&is_targeted_country=false&media_type=all&q=MENS-HEALTH.LIFE&search_type=keyword_unordered&sort_data[direction]=desc&sort_data[mode]=total_impressions&source=page-transparency-widget", 9900)],
    creatives: [
      ad("Anúncio · Steel Power / Horse Fil 01", "https://www.facebook.com/61571351735730/posts/27589462977379190/?app=fbl"),
      ad("Anúncio · Steel Power / Horse Fil 02", "https://www.facebook.com/194260819952155/videos/1630509035747080"),
    ],
    funnel: "Meta Ads → VSL Steel Power ou Horse Fil → checkout Cartpanda",
  },
  {
    slug: "jellyfill", section: "oferta", name: "JellyFill", brand: "JellyFill",
    aliases: ["Jelly Fill", "JellyFill V2"], niche: "Disfunção erétil", format: "VSL · suplemento",
    ads: 0,
    domains: [
      domain("VSL · JellyFill V2 ML24", "https://www.purehealthnest.site/ml24inst", "https://buygoods.com/secure/checkout.html?account_id=12796&product_codename=PP_JFL6UNITS_AFF"),
      domain("VSL · JellyFill V2 L9L1", "https://www.purehealthnest.site/l9l1", "https://buygoods.com/secure/checkout.html?account_id=12796&product_codename=PP_JFL6UNITS_AFF"),
      domain("VSL · JellyFill YouTube", "https://www.flashburn.life/lp1", "https://buygoods.com/secure/checkout.html?account_id=12796&product_codename=PP_JFL6UNITS_AFF"),
    ],
    libraries: [
      library("JellyFill · purehealthnest.site", fbLibraryKeyword("PUREHEALTHNEST.SITE"), 0),
      library("JellyFill · flashburn.life", fbLibraryKeyword("FLASHBURN.LIFE"), 0),
    ],
    funnel: "Meta/YouTube → VSL JellyFill → checkout BuyGoods",
  },
  {
    slug: "power-up", section: "oferta", name: "Power Up", brand: "Power Up",
    aliases: ["PowerUp", "Power Up Max"], niche: "Disfunção erétil", format: "VSL · suplemento",
    ads: 1300,
    domains: [domain("VSL · Baking Soda Trick", "https://powerupmax.app/vsl-01-lead-12", "https://powerupmax.app/b?p=PUP6V1&b=347&fid=653&fnid=2&pfnid=1&pg=15441")],
    libraries: [library("Power Up · lp.xevrilo487.info", fbLibraryKeyword("LP.XEVRILO487.INFO"), 1300)],
    creatives: [ad("Anúncio · Power Up 01", "https://www.facebook.com/reel/2424358831304906")],
    funnel: "Meta Ads → VSL Power Up → checkout exibido na oferta",
  },
  {
    slug: "optivell", section: "oferta", name: "Optivell", brand: "Optivell",
    aliases: ["Opti Vell"], niche: "Visão", format: "VSL · suplemento",
    ads: 900,
    domains: [
      domain("VSL · Optivell HWR TL3", "https://www.balanceyourlevels.com/hwrtl3ml2", "https://cc.useoptivell.com/v2/checkout.php?campaignkey=pg-cyb--kit-kit3--funnelid-homefunnel&package=6bottles"),
      domain("VSL · Optivell HWR TL1", "https://www.balanceyourlevels.com/hwrtl1", "https://cc.useoptivell.com/v2/checkout.php?campaignkey=pg-cyb--kit-kit3--funnelid-homefunnel&package=6bottles"),
      domain("VSL · Optivell IBM", "https://www.healthylifetips.blog/opt-ibm-vsl1-l1-ml1", "https://cc.useoptivell.com/v2/checkout.php?campaignkey=pg-cyb--kit-kit3--funnelid-homefunnel&package=6bottles"),
    ],
    libraries: [
      library("Optivell · Vision Living Healthy Life · 150 ads", fbLibraryKeyword("VISION.LIVINGHEALTHYLIFE.ORG"), 150),
      library("Optivell · Página 325552607301114 · 340 ads", "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&is_targeted_country=false&media_type=all&search_type=page&sort_data[mode]=total_impressions&sort_data[direction]=desc&source=page-transparency-widget&view_all_page_id=325552607301114", 340),
      library("Optivell · Web True Vitality Path · 410 ads", fbLibraryKeyword("WEB.TRUEVITALITYPATH.COM"), 410),
    ],
    creatives: [
      ad("Anúncio · Optivell 01", "https://www.facebook.com/100063517332443/posts/27319861581042410/?app=fbl"),
      ad("Anúncio · Optivell 02", "https://www.facebook.com/61558968793886/posts/27518639364465334/?app=fbl"),
      ad("Anúncio · Optivell 03", "https://www.facebook.com/61584263597093/posts/27887668107538719/?app=fbl"),
    ],
    funnel: "Meta Ads → VSL Optivell → checkout do kit",
  },
];
