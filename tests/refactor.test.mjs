import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const adsScraper = await readFile(new URL("../scripts/ads_scraper.py", import.meta.url), "utf8");
const fn = await readFile(new URL("../netlify/functions/transcribe-file.mjs", import.meta.url), "utf8");
const backgroundFn = await readFile(new URL("../netlify/functions/transcribe-background.mjs", import.meta.url), "utf8");
const transcriptFn = await readFile(new URL("../netlify/functions/transcript.mjs", import.meta.url), "utf8");
const furtadoFn = await readFile(new URL("../netlify/functions/furtado.mjs", import.meta.url), "utf8");
const vslDissectorFn = await readFile(new URL("../netlify/functions/vsl-dissector.mjs", import.meta.url), "utf8");
const vslJobFn = await readFile(new URL("../netlify/functions/vsl-job.mjs", import.meta.url), "utf8");
const vslBackgroundFn = await readFile(new URL("../netlify/functions/vsl-dissector-background.mjs", import.meta.url), "utf8");
const netlify = await readFile(new URL("../netlify.toml", import.meta.url), "utf8");
const joymodeIngest = await readFile(new URL("../scripts/ingest_joymode.mjs", import.meta.url), "utf8");
const joymodeSeed = JSON.parse(await readFile(new URL("../assets/joymode/seed.json", import.meta.url), "utf8"));
const primalVikingIngest = await readFile(new URL("../scripts/ingest_primal_viking.mjs", import.meta.url), "utf8");
const primalVikingSeed = JSON.parse(await readFile(new URL("../assets/primal-viking/seed.json", import.meta.url), "utf8"));
const extraBrandsScriptUrl = new URL("../scripts/ingest_extra_brands.mjs", import.meta.url);
const extraBrandsIngest = await readFile(extraBrandsScriptUrl, "utf8");
const extraBrandsScript = fileURLToPath(extraBrandsScriptUrl);
const ancestralSeed = JSON.parse(execFileSync(process.execPath, [extraBrandsScript, "ancestral-supplements", "--emit-seed"], { encoding: "utf8" }));
const marsSeed = JSON.parse(execFileSync(process.execPath, [extraBrandsScript, "mars-men", "--emit-seed"], { encoding: "utf8" }));
const ultimaPeakSeed = JSON.parse(execFileSync(process.execPath, [extraBrandsScript, "ultima-peak", "--emit-seed"], { encoding: "utf8" }));

test("chat ocupa o viewport, preserva scroll e agrupa o streaming", () => {
  assert.match(html, /height:calc\(100dvh - var\(--topbar-h\)\)/);
  assert.match(html, /\.chat__thread\{[^}]*min-height:0/);
  assert.match(html, /Novas mensagens ↓/);
  assert.match(html, /setTimeout\(flush,80\)/);
  assert.match(html, /e\.key==="Enter"&&!e\.shiftKey/);
});

test("Feguinho usa a moldura ampla de conversa de IA", () => {
  assert.match(html, /--chat-content-wide:72rem/);
  assert.match(html, /class="chat chat--feguinho" id="cchief"/);
  assert.match(html, /\.chat--feguinho \.chat__input\{min-height:72px/);
});

test("áreas autenticadas não repetem o hero da marca", () => {
  assert.doesNotMatch(html, /<h1 class="impact"/);
  assert.doesNotMatch(html, /id="pageSub"/);
  assert.match(html, /class="login-brand"/);
  assert.match(html, /\.page\{padding:18px/);
  assert.match(html, /body\.toolmode \.page\{display:none/);
});

test("fase 4 do Furtado escolhe corpos e hooks e gera a remessa completa", () => {
  assert.match(html, /id="furNCorpos" min="1" max="8"/);
  assert.match(html, /id="furNHooks" min="1" max="6"/);
  assert.match(html, /Escrever a remessa completa:/);
  assert.match(furtadoFn, /function escritaPrompt\(nicho, biblia, voc, briefing, nCorpos, nHooks\)/);
  assert.match(furtadoFn, /entregue EXATAMENTE \$\{nCorpos\} seções/);
});

test("cards usam a estrutura canônica e mídia uniforme", () => {
  assert.match(html, /function card\(\{id,variant=/);
  assert.match(html, /grid-auto-rows:1fr/);
  assert.match(html, /\.card\{[^}]*height:100%/);
  assert.match(html, /-webkit-line-clamp:2/);
  assert.match(html, /aspect-ratio:16\/10/);
  assert.match(html, /Imagem indisponível/);
});

test("criativo de validação é marcado sem aceitar vídeo de outra variação", () => {
  assert.match(html, /BRAIN_VALIDATION_TEST_IDS=new Set\(\["9daefe15-3078-45f4-bafa-f6ddc3c2ea91"\]\)/);
  assert.match(html, /CRIATIVO TESTE/);
  assert.match(html, /Falta adicionar o vídeo — vídeo não encontrado\./);
});

test("Mega Brain destaca somente os criativos marcados como vendas pendentes", () => {
  assert.match(html, /function brainSalesPending\(d\)/);
  assert.match(html, /d\.autor==="Elaine Montone"&&!brainHasMetric\(d\)/);
  assert.match(html, /if\(sKind==="megabrain"&&\(!sEditingId\|\|p\.metricaPendente===true\)\)p\.metricaPendente=!brainHasMetric\(p\)/);
  assert.match(html, /CRIATIVO SEM ATUALIZAÇAO DE NUMERO DE VENDAS/);
  assert.match(html, /isHostedVideo\(d\.video\)\?"done"/);
  assert.match(html, /function brainCopyText\(d\)/);
  assert.match(html, /Copy original em inglês/);
});

test("Mega Brain filtra copywriter e nicho com estado na URL", () => {
  assert.match(html, /let activeSection=.*brainAuthor=""/);
  assert.match(html, /id="brainAuthorFilter"/);
  assert.match(html, /id="brainNicheFilter"/);
  assert.match(html, /p\.set\("autor",brainAuthor\)/);
  assert.match(html, /r\.q\.get\("autor"\)/);
});

test("todas as listas usam 20 itens por página com opções de 50 e 100", () => {
  assert.match(html, /GRID_PAGE_OPTIONS=\[20,50,100\]/);
  assert.match(html, /gridPageSize=20/);
  assert.match(html, /function pagedItems\(items\)/);
  assert.match(html, /function gridPager\(page\)/);
  assert.match(html, /data-grid-size/);
  assert.match(html, /const page=pagedItems\(items\),visible=page\.items/);
  assert.match(html, /const page=pagedItems\(list\),groups=new Map/);
  assert.match(html, /gridSearchTimer=setTimeout\(\(\)=>renderGrid\(true\),140\)/);
  assert.match(html, /requestIdleCallback\(run,\{timeout:1800\}\)/);
  assert.match(html, /d\.transcricao="";d\.copy=""/);
  assert.match(html, /\.grid>\.card\{content-visibility:auto;contain-intrinsic-size:460px;\}/);
  assert.doesNotMatch(html, /\.card\{[^\n]+will-change:transform/);
});

test("copy rápida usa fallback transcrito e detalhe não duplica transcrição", () => {
  assert.match(html, /function openCopyPop\(id\)[\s\S]*?const copy=brainCopyText\(d\)/);
  assert.match(html, /Sem copy disponível neste card/);
  assert.match(html, /const copyPane=.*brainCopyMarkup\(d\)/);
  assert.doesNotMatch(html, /\$\{transcribeBtn\(o,va,d\)\}\$\{tb\?/);
});

test("Mega Brain acompanha o vídeo grifando a copy", () => {
  assert.match(html, /function brainCopyMarkup\(d\)/);
  assert.match(html, /data-brainword/);
  assert.match(html, /function wireBrainTranscript\(root\)/);
  assert.match(html, /video\.addEventListener\("timeupdate"/);
  assert.match(html, /transcricaoWords=allWords/);
  assert.match(backgroundFn, /timestamp_granularities\[\]", "word"/);
  assert.match(backgroundFn, /data\.transcricaoWords = words/);
});

test("Mega Brain importa novos cards e atualiza existentes por manifesto", () => {
  assert.match(html, /id="brainBatchImport"/);
  assert.match(html, /const BRAIN_BATCH_MANIFEST="megabrain-import\.json"/);
  assert.match(html, /input\.webkitdirectory=true/);
  assert.match(html, /updateExisting=.*parsed\.updateExisting===true/);
  assert.match(html, /existing=new Map\(offers\.filter/);
  assert.match(html, /sb\.from\("offers"\)\.update\(\{data\}\)\.eq\("id",current\.id\)/);
  assert.match(html, /transcribeNew=.*parsed\.transcribeNew===true/);
  assert.match(html, /file\.size>VIDEO_MAX/);
  assert.match(html, /sb\.storage\.from\(VIDEO_BUCKET\)\.upload/);
  assert.match(html, /sb\.from\("offers"\)\.insert\(\{data\}\)/);
  assert.match(html, /missingMedia=record\.videoMissing===true\|\|record\.mediaMissing===true/);
  assert.match(html, /metricaPendente:record\.metricaPendente===true\|\|!metricValue\.trim\(\)/);
  assert.match(html, /isImage=\/\^image\\\//);
  assert.match(html, /d\.videoMissing===true\?"Falta adicionar o vídeo"/);
  assert.match(html, /if\(d\.videoMissing===true\)kvs\.push/);
});

test("oferta não expõe os campos órfãos e o SEMrush usa Storage", () => {
  assert.doesNotMatch(html, /angulosResumo|angulosLink|fPrecos|renderPrecos|data-pri/);
  assert.match(html, /storageUploadWithProgress/);
  assert.match(html, /printSemrushOriginal/);
  assert.match(html, /printSemrushThumb/);
  assert.match(html, /SEMRUSH_MAX_BYTES=12\*1024\*1024/);
});

test("lightbox mantém links nativos e oferece teclado, zoom e pan", () => {
  assert.match(html, /a\[data-lightbox\]/);
  assert.match(html, /e\.metaKey\|\|e\.ctrlKey/);
  assert.match(html, /e\.key==="ArrowLeft"/);
  assert.match(html, /addEventListener\("wheel"/);
  assert.match(html, /addEventListener\("pointermove"/);
});

test("transcritor pede timestamps reais e sincroniza por busca binária", () => {
  assert.match(fn, /timestamp_granularities\[\]", "word"/);
  assert.match(fn, /timestamp_granularities\[\]", "segment"/);
  assert.match(fn, /const words = Array\.isArray\(gj\.words\)/);
  assert.match(html, /function trWordAt\(time\)/);
  assert.match(html, /requestAnimationFrame\(trFrame\)/);
  assert.match(html, /data-trword/);
});

test("Transcritor retoma vídeos longos e reduz automaticamente partes lentas", () => {
  assert.match(html, /TR_MIN_CHUNK_SEC=15,TR_TRANSIENT_RETRIES=3/);
  assert.match(html, /async function trTranscribeSlice\(samples,rate,token,lang,offset,onAdapt,depth=0\)/);
  assert.match(html, /status===502\|\|status===503\|\|status===504/);
  assert.match(html, /reduzindo \$\{Math\.round\(seconds\)\}s para trechos menores/);
  assert.match(html, /trSaveProgress\(file,i\+1,nChunks\)/);
  assert.match(html, /Continuar da última parte/);
  assert.match(html, /const saved=trReadProgress\(file\)/);
  assert.match(html, /part=await trTranscribeSlice\(slice,rate,token,"auto",i\*TR_CHUNK_SEC\)/);
});

test("Mega Brain transcreve vídeos grandes em partes e grava a copy", () => {
  assert.match(html, /async function transcribeBrainInChunks\(offerId,videoUrl\)/);
  assert.match(html, /queueBrainChunkedTranscription/);
  assert.match(html, /chunked=.*content-length/);
  assert.match(html, /data\.transcricao=fullText\.trim\(\)/);
});

test("Dissecador de VSL transcreve, lê o vídeo e entrega dois documentos", () => {
  assert.match(html, /key:"vsldissector",label:"Dissecador de VSL"/);
  assert.match(html, /vsldissector:"dissecador-vsl"/);
  assert.match(html, /function renderVslDissector\(force\)/);
  assert.match(html, /id="vslFile" accept="video\/\*,audio\/\*"/);
  assert.match(html, /async function vslBuildContactSheets\(file,duration,onProgress\)/);
  assert.match(html, /Fechamento e CTA/);
  assert.match(html, /Transcrição completa/);
  assert.match(html, /Dissecação estratégica/);
  assert.match(html, /if\(vslCanonical\)doc\+=`\\n# Apêndice — Roteiro canônico fornecido/);
  assert.match(html, /vslRenderTimer=setTimeout/);
  assert.match(html, /\.vslactions \[hidden\]\{display:none!important/);
  assert.match(html, /\.vslactions \.btn:disabled\{opacity:/);
  assert.match(html, /function vslBuildCompleteTranscript\(\)/);
  assert.match(html, /data-vsldownload="pdf"/);
  assert.match(html, /id="vslGoogleDocs"/);
  assert.match(html, /window\.open\("https:\/\/docs\.new"/);
  assert.doesNotMatch(html, /O fluxo combina Whisper, timestamps/);
  assert.match(html, /max-height:none;overflow:visible/);
});

test("Dissecador persiste, acompanha e retoma a análise em segundo plano", () => {
  assert.match(html, /const VSL_JOB_FN="\/\.netlify\/functions\/vsl-job"/);
  assert.match(html, /async function vslPollJob\(token,id,signal\)/);
  assert.match(html, /localStorage\.setItem\(VSL_LAST_JOB_KEY,id\)/);
  assert.match(html, /async function vslResumeLastJob\(\)/);
  assert.match(html, /A dissecação continua em segundo plano/);
  assert.match(vslJobFn, /getStore\(\{ name: "vsl-jobs", consistency: "strong" \}\)/);
  assert.match(vslJobFn, /vsl-dissector-background/);
  assert.match(vslBackgroundFn, /export default async \(req\)/);
  assert.match(vslBackgroundFn, /config = \{ background: true \}/);
  assert.match(vslBackgroundFn, /job\.coreParts\[index\] = part/);
  assert.match(vslBackgroundFn, /request\.phase !== job\.phase/);
  assert.match(vslBackgroundFn, /if \(job\.status !== "complete"\) await requeue/);
  assert.match(vslBackgroundFn, /job\.status = "complete"/);
  assert.match(vslJobFn, /needsRecovery/);
  assert.match(vslJobFn, /canResumeAutomatically/);
  assert.match(vslJobFn, /terminou antes de ficar completa/);
  assert.match(vslJobFn, /body\.action === "retry"/);
  assert.match(html, /vslJobStatus=job\.status/);
  assert.match(html, /retry\.hidden=vslJobStatus!=="error"/);
  assert.match(html, /vslRenderedTranscript!==vslTranscriptDoc/);
  assert.match(html, /vslRenderedAnalysis!==vslAnalysisDoc/);
});

test("seções com vídeo usam o áudio original e sincronizam palavra por palavra", () => {
  assert.match(html, /d\.transcricao\|\|d\.copy\|\|d\.copyVsl\|\|d\.copyCriativo/);
  assert.match(html, /function wireVideoTranscripts\(root\)/);
  assert.match(html, /data-video-sync/);
  assert.match(html, /data-transcript-pane/);
  assert.match(html, /Abrir copy em português \(doc\)/);
  assert.match(html, /\["wheel","touchstart","pointerdown"\]/);
  assert.match(html, /if\(follow\)setFollow\(false\)/);
  assert.match(html, /requestVideoFrameCallback/);
  assert.match(html, /metadata\.mediaTime/);
  assert.match(html, /cancelVideoFrameCallback/);
  assert.match(html, /let lo=0,hi=words\.length-1,ans=-1/);
  assert.match(html, /\.brainword\{[^\n]*transition:none/);
  assert.match(html, /wireVideoTranscripts\(\$\("#viewBody"\)\)/);
});

test("FEG Brands fica visível para todos e separa spy de Ofertas Insider", () => {
  assert.match(html, /key:"brandsgeneral",label:"Ofertas de Brands no Geral"/);
  assert.match(html, /key:"brandsvalidated",label:"Ofertas Insider"/);
  assert.match(html, /const BRAND_SECTIONS=new Set\(\["brandsgeneral","brandsvalidated"\]\)/);
  assert.doesNotMatch(html, /if\(BRAND_SECTIONS\.has\(r\.section\)&&!isAdmin\)/);
  assert.match(html, /html\+=`<div class="snav__group snav__group--brands">\$\{ic\("trending"\)\}FEG Brands<\/div>`/);
  assert.match(html, /snav__group--dr/);
  assert.match(html, /division-pill--brands/);
  assert.match(html, /DTC Intelligence/);
  assert.match(html, /FEG DR/);
  assert.doesNotMatch(html, /FEG Brands <span>Admin<\/span>/);
  assert.doesNotMatch(html, /Em validação somente no painel admin/);
  assert.match(html, /brandsgeneral:"feg-brands-geral"/);
  assert.match(html, /brandsvalidated:"feg-brands-insider"/);
  assert.match(html, /PATH2SEC\["feg-brands-validadas"\]="brandsvalidated"/);
  assert.match(html, /activeSection==="oferta"\|\|BRAND_SECTIONS\.has\(activeSection\)/);
});

test("cards de Brands exibem resumo completo da BM, prints e top ads", () => {
  for (const field of ["bmSpend7d","bmSpend14d","bmAvgConversion","bmCpc","bmCpcLink","bmCpm","bmCtr","bmCostUnique","bmCostIc","bmRoas","bmUpdatedAt"]) assert.match(html,new RegExp(field));
  assert.match(html, /function brandMetricGrid\(d,detail\)/);
  assert.match(html, /function brandReportsHtml\(d\)/);
  assert.match(html, /Aguardando acesso à BM/);
  assert.match(html, /Resumo da Business Manager/);
  assert.match(html, /Prints da BM/);
  assert.match(html, /Top ads/);
  assert.match(html, /data-zone="bm\|\$\{i\}"/);
  assert.match(html, /data-zone="brandad\|\$\{i\}"/);
  assert.match(html, /data-action="set-brand-stage"/);
  assert.match(html, /bmPrints:fBmPrints\.filter/);
  assert.match(html, /brandTopAds:fBrandTopAds\.filter/);
  assert.match(html, /data-zone="brandsemrush1m"/);
  assert.match(html, /data-zone="brandsemrush3m"/);
  assert.match(html, /Link do Facebook/);
  assert.doesNotMatch(html, /triggerBrandFbIngest/);
  assert.match(html, /case "brandsgeneral":case "brandsvalidated":return brandCard\(o\)/);
  assert.match(html, /Ads ativos na biblioteca/);
  assert.match(html, /Biblioteca conferida em/);
  assert.doesNotMatch(html, /Total conferido na Meta Ads Library com o filtro Ativos/);
  assert.doesNotMatch(html, /não do número de linhas do Gerenciador de Anúncios/);
  assert.match(html, /Conferir na biblioteca/);
  assert.match(html, /Ads ativos · evolução diária/);
  assert.match(html, /adsChartSvg\(ah\)/);
  assert.match(html, /Abrir mídia salva/);
  assert.match(html, /Mídia salva no Swipe/);
  assert.match(html, /Views do domínio/);
  assert.match(html, /Período das views/);
});

test("automação de anúncios ativos inclui FEG DR e FEG Brands e guarda histórico diário", () => {
  assert.match(adsScraper, /\("oferta", "brandsgeneral", "brandsvalidated"\)/);
  assert.match(adsScraper, /data\["adsHistory"\] = update_history/);
  assert.match(adsScraper, /data\["adsLibraryCheckedAt"\]/);
  assert.match(adsScraper, /hist\.append\(\{"d": checked, "n": previous\}\)/);
  assert.match(html, /brand-ads-history/);
  assert.match(html, /Ads ativos · evolução diária/);
});

test("histórico de ads ativos aparece no topo do detalhe de Brands", () => {
  const detailTemplate = html.slice(html.indexOf('$("#viewBody").innerHTML=`'), html.indexOf('wireLightboxLinks($("#viewBody"));'));
  assert.ok(detailTemplate.indexOf("${adsSection}") < detailTemplate.indexOf("${bmSection}"));
});

test("top ads enviados pelo admin ficam persistidos no Storage do Swipe", () => {
  assert.match(html, /async function uploadBrandTopAdFile\(file,dz\)/);
  assert.match(html, /BRAND_VIDEO_MAX_BYTES=50\*1024\*1024/);
  assert.match(html, /brands\/top-ads\//);
  assert.match(html, /await storageUploadWithProgress\(file,path/);
  assert.match(html, /if\(isVideo\)\{ad\.video=url;ad\.img="";\}else\{ad\.img=url;ad\.video="";\}/);
  assert.match(html, /if\(brandMediaUploading\)/);
  assert.match(html, /O arquivo é salvo no Storage do Swipe/);
});

test("Joymode não exibe o contexto técnico nem o comentário de referência", () => {
  assert.equal(joymodeSeed.bmNotes, "");
  assert.equal(joymodeSeed.comentario, "");
  assert.match(joymodeIngest, /bmNotes: ""/);
  assert.match(joymodeIngest, /comentario: ""/);
  assert.doesNotMatch(joymodeIngest, /Conta em USD\. Médias do card/);
  assert.doesNotMatch(joymodeIngest, /Primeira oferta Insider cadastrada/);
  assert.equal(joymodeSeed.numAdsAtivos, "160");
  assert.equal(joymodeSeed.adsLibraryCheckedAt, "17\/07\/2026");
  assert.match(joymodeIngest, /numAdsAtivos: "160"/);
});

test("Joymode e Primal Viking usam somente os dez links exatos enviados", async () => {
  assert.equal(joymodeSeed.dominios.length, 4);
  assert.deepEqual(joymodeSeed.dominios.map(x => x.views), ["31.5K", "38.2K", "23.1K", "27.7K"]);
  assert.equal(joymodeSeed.brandTopAds.length, 5);
  assert.equal(primalVikingSeed.brandTopAds.length, 5);
  for (const ad of [...joymodeSeed.brandTopAds, ...primalVikingSeed.brandTopAds]) {
    assert.match(ad.link, /^https:\/\/business\.facebook\.com\/ads\/experience\/confirmation\/\?is_responsive=0&encrypted_experience_id=Q8DfBA/);
    assert.equal(ad.ingestStatus, "done");
    const media = ad.video || ad.img;
    assert.match(media, /^\/assets\/(joymode|primal-viking)\/top-ad-0[1-5]\.(mp4|jpg)$/);
    assert.ok((await stat(new URL(`..${media}`, import.meta.url))).size > 1_000);
  }
  assert.doesNotMatch(primalVikingIngest, /fb\.me\/adspreview/);
  assert.doesNotMatch(joymodeIngest, /fb\.me\/adspreview/);
  assert.equal(primalVikingSeed.numAdsAtivos, "2400");
  assert.equal(primalVikingSeed.adsLibraryApprox, true);
  assert.equal(primalVikingSeed.bmPrints.length, 10);
  assert.equal(primalVikingSeed.bmReports.length, 4);
  assert.match(primalVikingIngest, /storage\/v1\/object\/criativos\/\$\{objectPath\}/);
  assert.match(primalVikingIngest, /storage\/v1\/object\/public\/criativos\/\$\{objectPath\}/);
  assert.match(joymodeIngest, /storage\/v1\/object\/criativos\/\$\{objectPath\}/);
  assert.match(joymodeIngest, /await persistExactMedia\(\)/);
});

test("Ancestral Supplements, Mars Men e Ultima Peak preservam prints e mídias exatas", async () => {
  assert.equal(ancestralSeed.bmPrints.length, 10);
  assert.equal(marsSeed.bmPrints.length, 10);
  assert.equal(ultimaPeakSeed.bmPrints.length, 10);
  assert.equal(ancestralSeed.bmReports.length, 4);
  assert.equal(marsSeed.bmReports.length, 4);
  assert.equal(ultimaPeakSeed.bmReports.length, 4);
  assert.equal(ultimaPeakSeed.numAdsAtivos, "29");
  assert.equal(ultimaPeakSeed.adsLibraryApprox, true);
  for (const seed of [ancestralSeed, marsSeed, ultimaPeakSeed]) {
    assert.equal(seed.brandTopAds.length, 5);
    for (const ad of seed.brandTopAds) {
      assert.match(ad.link, /^https:\/\/business\.facebook\.com\/ads\/experience\/confirmation\/\?is_responsive=0&encrypted_experience_id=Q8DfBA/);
      assert.equal(ad.ingestStatus, "done");
      const media = ad.video || ad.img;
      assert.match(media, /^\/assets\/(ancestral-supplements|mars-men|ultima-peak)\/top-ad-0[1-5]\.(mp4|jpg)$/);
      assert.ok((await stat(new URL(`..${media}`, import.meta.url))).size > 1_000);
    }
  }
  assert.match(extraBrandsIngest, /async function persistExactMedia\(data\)/);
  assert.match(extraBrandsIngest, /storage\/v1\/object\/criativos\/\$\{objectPath\}/);
  assert.match(extraBrandsIngest, /storage\/v1\/object\/public\/criativos\/\$\{objectPath\}/);
  assert.match(extraBrandsIngest, /await persistExactMedia\(data\)/);
});

test("Dissecador retoma partes concluídas e subdivide trechos que dão timeout", () => {
  assert.match(html, /VSL_CHUNK_SEC=45/);
  assert.match(html, /async function vslTranscribeSlice/);
  assert.match(html, /status===502\|\|status===503\|\|status===504/);
  assert.match(html, /vslChunkCache=new Map/);
  assert.match(html, /Retomando parte/);
  assert.match(fn, /GROQ_BUDGET_MS = 7000/);
  assert.match(fn, /timedFetch/);
  assert.match(fn, /lastStatus === 504 \? 504/);
});

test("backend do Dissecador preserva a copy e analisa por blocos", () => {
  assert.match(vslDissectorFn, /A transcrição organizada é completa, não um resumo/);
  assert.match(vslDissectorFn, /# Lead - 00:00-05:00/);
  assert.match(vslDissectorFn, /Mapa de Extração para Obsidian/);
  assert.match(vslDissectorFn, /Belief Ladder em ordem/);
  assert.match(vslDissectorFn, /Inventário de provas usando/);
  assert.match(vslDissectorFn, /channel: "transcript"/);
  assert.match(vslDissectorFn, /channel: "analysis"/);
  assert.match(vslDissectorFn, /imageContent\(images\)/);
  assert.match(vslDissectorFn, /não crie seções de compliance/);
  assert.match(vslDissectorFn, /translationChunkPrompt/);
  assert.match(vslDissectorFn, /analysisRepairPrompt/);
  assert.match(vslBackgroundFn, /analysisGaps\(job\)/);
});

test("rotas profundas recebem o fallback da SPA", () => {
  assert.match(netlify, /from = "\/\*"[\s\S]*to = "\/index\.html"[\s\S]*status = 200/);
  assert.match(html, /function parseLocation\(\)/);
  assert.match(html, /function renderNotFound\(msg\)/);
  assert.match(html, /history\.replaceState\(history\.state,"","\/transcritor\/"\+id\)/);
  assert.match(html, /TR_SAVE_FN="\/\.netlify\/functions\/transcript"/);
  assert.match(transcriptFn, /getStore\(\{ name: "transcricoes", consistency: "strong" \}\)/);
  assert.match(transcriptFn, /store\.setJSON\(id, transcript\)/);
});
