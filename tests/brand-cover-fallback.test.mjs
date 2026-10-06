import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const source = html.slice(html.indexOf("const KNOWN_BRAND_COVERS="), html.indexOf("function normalize(raw)"));
const applyFallback = new Function(`const KNOWN_OFFER_MEDIA=[];const fixUrl=value=>value;${source};return applyKnownMediaFallbacks;`)();

test("substitui capas antigas instáveis pelas cópias locais e preserva imagens customizadas", async () => {
  const balls = applyFallback({ nomeOferta: "Balls N Brains", imagemProduto: "https://pkvzwtstidtobpdngxnd.supabase.co/storage/v1/object/public/criativos/brands/balls-n-brains/product-cover.png", dominios: [] });
  const joymode = applyFallback({ nomeOferta: "JOYMODE HARD+", imagemProduto: "https://assets.replocdn.com/projects/0e54a4ce-4105-4700-aab7-d46d0874071b/ec1bac99-e229-4b05-a664-e1d2f1c82259", dominios: [] });
  assert.equal(balls.imagemProduto, "/assets/balls-n-brains/product-cover.png");
  assert.equal(joymode.imagemProduto, "/assets/joymode/product-cover.png");
  assert.equal(applyFallback({ nomeOferta: "Joymode", imagemProduto: "https://example.test/custom.png", dominios: [] }).imagemProduto, "https://example.test/custom.png");
  for (const path of [balls.imagemProduto, joymode.imagemProduto]) {
    assert.ok((await stat(new URL(`..${path}`, import.meta.url))).size > 1000);
  }
});
