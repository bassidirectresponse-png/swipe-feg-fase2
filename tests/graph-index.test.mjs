import test from "node:test";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("espelho do JavaScript inline para o grafo acompanha index.html", () => {
  execFileSync(process.execPath, ["scripts/sync_graph_inline.mjs", "--check"], {
    cwd: root,
    stdio: "pipe",
  });
});
