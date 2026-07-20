import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const netlify = await readFile(new URL("../netlify.toml", import.meta.url), "utf8");

if (!/^<!doctype html>/i.test(html.trim())) throw new Error("index.html inválido");
if (!/publish\s*=\s*"\."/.test(netlify)) throw new Error("diretório de publicação estática inválido");

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(match => match[1])
  .filter(source => source.trim());
if (!inlineScripts.length) throw new Error("bundle JavaScript inline ausente");
for (const source of inlineScripts) new Function(source);

console.log(`Build estático válido: index.html + ${inlineScripts.length} bundle(s) inline`);
