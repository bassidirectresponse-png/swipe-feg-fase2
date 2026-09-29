import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sourcePath = resolve(root, "index.html");
const targetPath = resolve(root, "graph-sources/index-inline.generated.js");
const source = await readFile(sourcePath, "utf8");
const matches = [...source.matchAll(/<script>\s*\n([\s\S]*?)\n<\/script>/g)];

if (matches.length !== 1) {
  throw new Error(`Esperado um script inline principal em index.html; encontrados ${matches.length}.`);
}

const generated = [
  "// Gerado de index.html por npm run graph:sync. Não é carregado pelo site.",
  "// Destino exclusivo: indexação das funções inline pelo Code Review Graph.",
  matches[0][1],
  "",
].join("\n");

if (process.argv.includes("--check")) {
  const current = await readFile(targetPath, "utf8").catch(() => "");
  if (current !== generated) {
    throw new Error("Espelho do grafo desatualizado. Execute npm run graph:sync.");
  }
  console.log("Espelho do JavaScript inline atualizado.");
} else {
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, generated);
  console.log(`Espelho do JavaScript inline gerado em ${targetPath}.`);
}
