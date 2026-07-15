import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const start = html.indexOf("function ccInline");
const end = html.indexOf("function ccApplyTool", start);
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const ccMarkdown = new Function("esc", `${html.slice(start, end)};return ccMarkdown;`)(esc);

const chunks = Array.from({ length: 200 }, (_, i) => `\n${i + 1}. **Bloco ${i + 1}** — texto de streaming com conteúdo suficiente para medir o parser.`);
function run(every) {
  let text = "", renders = 0, output = "";
  const t0 = performance.now();
  chunks.forEach((chunk, i) => { text += chunk; if ((i + 1) % every === 0 || i === chunks.length - 1) { output = ccMarkdown(text); renders++; } });
  return { renders, ms: +(performance.now() - t0).toFixed(2), bytes: output.length };
}

const words = Array.from({ length: 10_000 }, (_, i) => ({ start: i * .32, end: i * .32 + .3 }));
const times = Array.from({ length: 36_000 }, (_, i) => (i % 192_000) / 60);
let sink = 0, t0 = performance.now();
for (const time of times) sink += words.findIndex(w => w.start <= time && time <= w.end);
const linearMs = performance.now() - t0;
t0 = performance.now();
for (const time of times) { let lo = 0, hi = words.length - 1, answer = -1; while (lo <= hi) { const mid = (lo + hi) >> 1; if (words[mid].start <= time) { answer = mid; lo = mid + 1; } else hi = mid - 1; } sink += answer; }
const binaryMs = performance.now() - t0;

console.log(JSON.stringify({
  streaming: { before: run(1), after80msAt20msChunks: run(4) },
  karaoke: { words: words.length, frames: times.length, linearMs: +linearMs.toFixed(2), binaryMs: +binaryMs.toFixed(2), speedup: +(linearMs / binaryMs).toFixed(1) },
  sink
}, null, 2));
