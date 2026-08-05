import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  AD_ANALYSIS_PROMPT_VERSION,
  AD_MAX_DURATION_SECONDS,
  buildAdAnalysisPrompt,
  externalTranscript,
  finalizeAdReport,
  validAdDuration,
  validateAdReport,
} from "../netlify/functions/_ad-video-analysis.mjs";

const root = new URL("../", import.meta.url);
const workflow = await readFile(new URL(".github/workflows/transcrever-videos.yml", root), "utf8");
const scanner = await readFile(new URL("scripts/analisar_anuncios.py", root), "utf8");
const job = await readFile(new URL("netlify/functions/ad-analysis-job.mjs", root), "utf8");
const worker = await readFile(new URL("netlify/functions/ad-analysis-background.mjs", root), "utf8");
const html = await readFile(new URL("index.html", root), "utf8");

test("engenharia reversa aceita somente anúncios de até dez minutos", () => {
  assert.equal(AD_MAX_DURATION_SECONDS, 600);
  assert.equal(validAdDuration(1), true);
  assert.equal(validAdDuration(600), true);
  assert.equal(validAdDuration(600.001), false);
  assert.equal(validAdDuration(0), false);
  assert.match(job, /validAdDuration\(duration\)/);
  assert.match(job, /somente anúncios de até 10 minutos/);
  assert.doesNotMatch(worker, /analysisDoc\s*:/);
});

test("prompt preserva a estrutura e termina no transcript externo", () => {
  const transcript = "[00:00] Texto original sem correção.";
  const prompt = buildAdAnalysisPrompt({
    niche: "Memória", country: "US", language: "English", platform: "Meta Ads",
    duration: 42, transcript, segments: [], contactSheets: [],
  });
  for (let section = 1; section <= 7; section += 1) {
    assert.match(prompt, new RegExp(`## ${section}\\.`));
  }
  assert.match(prompt, /# RELATÓRIO GEMINI/);
  assert.match(prompt, /## TRANSCRIPT\nFonte: transcript externo/);
  assert.match(prompt, /\[O SISTEMA ANEXARÁ O TRANSCRIPT EXTERNO VERBATIM\]/);
  assert.match(prompt, /TRANSCRIPT DE REFERÊNCIA PARA SINCRONIZAÇÃO/);
  assert.match(prompt, new RegExp(AD_ANALYSIS_PROMPT_VERSION.replaceAll(".", "\\.")));
});

test("validador exige todas as seções e transcript como última seção", () => {
  const report = `# RELATÓRIO GEMINI
## 1. FORMATO GERAL E PERSONAGENS
NÃO IDENTIFICADO
## 2. HOOK VISUAL — PRIMEIROS 3 SEGUNDOS
NÃO IDENTIFICADO
## 3. MAPA DE BLOCOS COM TIMESTAMPS
NÃO IDENTIFICADO
## 4. PROVAS VISUAIS, DEMONSTRAÇÕES E TEXTO NA TELA
NÃO IDENTIFICADO
## 5. CENÁRIO, EDIÇÃO E RITMO
NÃO IDENTIFICADO
## 6. SENSAÇÃO GERAL E PONTOS DE FRICÇÃO
NÃO IDENTIFICADO
## 7. CAMPOS DE DURAÇÃO
DURAÇÃO TOTAL DO ANÚNCIO: 00:10
## TRANSCRIPT
Fonte: transcript externo

Texto original completo.`;
  assert.deepEqual(validateAdReport(report, "Texto original completo."), { complete: true, missing: [] });
  assert.equal(validateAdReport(report.replace("## 6. SENSAÇÃO GERAL", "## AUSENTE"), "Texto original completo.").complete, false);
  assert.equal(validateAdReport(`${report}\n## EXTRA\nnão pode`, "Texto original completo.").complete, false);
});

test("transcript é anexado deterministicamente e sem correções do modelo", () => {
  const input = { transcript: "fallback", segments: [{ start: 0, text: "Texto  original." }, { start: 2.4, text: "Fim!" }] };
  const source = externalTranscript(input);
  const report = finalizeAdReport("# RELATÓRIO GEMINI\n## 1. FORMATO GERAL E PERSONAGENS\nX\n## TRANSCRIPT\nFonte: transcript externo\n\ntexto alterado", input);
  assert.equal(source, "[00:00] Texto  original.\n[00:02] Fim!");
  assert.equal(report.endsWith(source), true);
  assert.equal(report.includes("texto alterado"), false);
});

test("fila horária percorre Criativos e Mega Brain sem limite global de mil", () => {
  assert.match(workflow, /cron: "17 \* \* \* \*"/);
  assert.match(workflow, /TRANSCRIBE_KINDS: "criativo,megabrain"/);
  assert.match(workflow, /AD_ANALYSIS_KINDS: "criativo,megabrain"/);
  assert.match(scanner, /page_size, offset = \[\], 1000, 0/);
  assert.match(scanner, /while True:/);
  assert.match(scanner, /offset \+= page_size/);
  assert.match(scanner, /long_videos_excluded/);
  assert.match(scanner, /normalize_video_url/);
});

test("cards e Transcritor exibem e persistem o relatório separado", () => {
  assert.match(worker, /adVisualAnalysis: report/);
  assert.match(worker, /adAnalysisPromptVersion/);
  assert.match(html, /Engenharia reversa visual do anúncio/);
  assert.match(html, /function adAnalysisSection/);
  assert.match(html, /adVisualAnalysis/);
  assert.match(html, /TR_AD_MAX_SEC=600/);
});

test("worker envia uma requisição compatível com Claude e expõe o erro real", () => {
  assert.match(worker, /max_tokens:\s*MAX_OUTPUT_TOKENS/);
  assert.match(worker, /const MAX_OUTPUT_TOKENS = 8_192/);
  assert.doesNotMatch(worker, /temperature\s*:/);
  assert.match(worker, /compactClaudeError/);
  assert.match(worker, /Claude HTTP \$\{status\}:/);
});

test("usuário comum pode analisar, mas somente admin pode gravar a análise em card", () => {
  assert.match(job, /import \{ authenticate, isAdmin,/);
  assert.match(job, /cardId:\s*isAdmin\(user\)\s*&&/);
});

test("versão da análise permanece sincronizada entre fila, função e interface", () => {
  assert.match(scanner, new RegExp(`PROMPT_VERSION = ["']${AD_ANALYSIS_PROMPT_VERSION.replaceAll(".", "\\.")}["']`));
  assert.match(html, new RegExp(`TR_AD_PROMPT_VERSION=["']${AD_ANALYSIS_PROMPT_VERSION.replaceAll(".", "\\.")}["']`));
});
