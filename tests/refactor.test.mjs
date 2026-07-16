import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const fn = await readFile(new URL("../netlify/functions/transcribe-file.mjs", import.meta.url), "utf8");
const transcriptFn = await readFile(new URL("../netlify/functions/transcript.mjs", import.meta.url), "utf8");
const furtadoFn = await readFile(new URL("../netlify/functions/furtado.mjs", import.meta.url), "utf8");
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
  assert.match(html, /d\.metricaPendente===true/);
  assert.match(html, /if\(sKind==="megabrain"&&\(!sEditingId\|\|p\.metricaPendente===true\)\)p\.metricaPendente=!brainHasMetric\(p\)/);
  assert.match(html, /CRIATIVO SEM ATUALIZAÇAO DE NUMERO DE VENDAS/);
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

test("rotas profundas recebem o fallback da SPA", () => {
  assert.match(netlify, /from = "\/\*"[\s\S]*to = "\/index\.html"[\s\S]*status = 200/);
  assert.match(html, /function parseLocation\(\)/);
  assert.match(html, /function renderNotFound\(msg\)/);
  assert.match(html, /history\.replaceState\(history\.state,"","\/transcritor\/"\+id\)/);
  assert.match(html, /TR_SAVE_FN="\/\.netlify\/functions\/transcript"/);
  assert.match(transcriptFn, /getStore\(\{ name: "transcricoes", consistency: "strong" \}\)/);
  assert.match(transcriptFn, /store\.setJSON\(id, transcript\)/);
});
