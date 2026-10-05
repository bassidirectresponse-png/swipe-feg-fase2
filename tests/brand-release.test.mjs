import assert from "node:assert/strict";
import test from "node:test";
import { changedFields, draftIsPublished, mergeBrandDraft } from "../lib/brand-release.mjs";

test("publicação mescla períodos e prints sem apagar o histórico automático", () => {
  const before = {
    kind: "brandsvalidated", nomeOferta: "Produto", numAdsAtivos: "350",
    adsHistory: [{ d: "2026-10-05", n: 350 }], adsLibraryCheckedAt: "05/10/2026",
    bmReports: [{ key: "2026-07-15-7d", totals: { spend: "US$ 20.000,00" } }],
    bmPrints: [{ img: "antigo.jpg" }],
  };
  const after = mergeBrandDraft(before, {
    adsHistory: [], numAdsAtivos: "0", adsLibraryCheckedAt: "18/09/2026",
    bmReports: [{ key: "2026-09-18-7d", totals: { spend: "US$ 120.001,00" } }],
    bmPrints: [{ img: "admin-bm:blob:produto:hash:jpeg", periodKey: "7d" }],
  });
  assert.deepEqual(after.adsHistory, before.adsHistory);
  assert.equal(after.numAdsAtivos, "350");
  assert.equal(after.adsLibraryCheckedAt, "05/10/2026");
  assert.deepEqual(after.bmReports.map(report => report.key), ["2026-09-18-7d", "2026-07-15-7d"]);
  assert.equal(after.bmPrints.length, 2);
  assert.deepEqual(after.offerTags, ["insider", "scale"]);
  const delta = changedFields(before, after);
  assert.ok(!Object.hasOwn(delta, "adsHistory"));
  assert.ok(!Object.hasOwn(delta, "numAdsAtivos"));
});

test("Escala remove Potencial, enquanto seleção manual permanece editável", () => {
  const result = mergeBrandDraft({ kind: "brandsvalidated", numAdsAtivos: "500" }, { offerTags: ["potential", "scale", "new"] });
  assert.deepEqual(result.offerTags, ["insider", "scale", "new"]);
  const potential = mergeBrandDraft({ kind: "brandsvalidated", numAdsAtivos: "500" }, {});
  assert.deepEqual(potential.offerTags, ["insider", "potential"]);
});

test("nova oferta publicada recebe Nova e Insider; rascunho publicado não reaplica", () => {
  const result = mergeBrandDraft({}, { kind: "brandsvalidated", nomeOferta: "Astaxanthin", nicho: "Saúde feminina" }, { newOffer: true });
  assert.deepEqual(result.offerTags, ["insider", "new"]);
  assert.equal(draftIsPublished({ updated_at: "a", published_at: "b", published_update_at: "a" }), true);
  assert.equal(draftIsPublished({ updated_at: "c", published_at: "b", published_update_at: "a" }), false);
});

test("verificação da publicação ignora a ordem das chaves JSONB", () => {
  assert.deepEqual(changedFields({ bmReports: [{ key: "7d", totals: { spend: 5, sales: 2 } }] },
    { bmReports: [{ totals: { sales: 2, spend: 5 }, key: "7d" }] }), {});
});
