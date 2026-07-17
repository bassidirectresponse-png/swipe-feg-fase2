import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const fn = await readFile(new URL("../netlify/functions/transcribe-file.mjs", import.meta.url), "utf8");
const backgroundFn = await readFile(new URL("../netlify/functions/transcribe-background.mjs", import.meta.url), "utf8");
const transcriptFn = await readFile(new URL("../netlify/functions/transcript.mjs", import.meta.url), "utf8");
const furtadoFn = await readFile(new URL("../netlify/functions/furtado.mjs", import.meta.url), "utf8");
const vslDissectorFn = await readFile(new URL("../netlify/functions/vsl-dissector.mjs", import.meta.url), "utf8");
const vslJobFn = await readFile(new URL("../netlify/functions/vsl-job.mjs", import.meta.url), "utf8");
const vslBackgroundFn = await readFile(new URL("../netlify/functions/vsl-dissector-background.mjs", import.meta.url), "utf8");
const netlify = await readFile(new URL("../netlify.toml", import.meta.url), "utf8");

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

test("Mega Brain e Radar limitam o DOM e evitam trabalho pesado durante interação", () => {
  assert.match(html, /GRID_PAGE_SIZES=\{tiktok:48,megabrain:36\}/);
  assert.match(html, /function pagedItems\(items\)/);
  assert.match(html, /function gridPager\(page\)/);
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
