import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { detectMedia, isMetaMediaUrl, planMetaAds } from "../lib/apify-brand-archive.mjs";

test("piloto aceita somente anúncios da página Meta exata e não duplica IDs", () => {
  const rows = [
    { pageId: "688168747706811", adArchiveId: "123", isActive: true, snapshot: { title: "Ultima", videos: [{ videoHdUrl: "https://video.xx.fbcdn.net/hd.mp4", videoSdUrl: "https://video.xx.fbcdn.net/sd.mp4" }] } },
    { pageId: "688168747706811", adArchiveId: "123", snapshot: { images: [{ originalImageUrl: "https://scontent.xx.fbcdn.net/a.jpg" }] } },
    { pageId: "999", adArchiveId: "456", snapshot: { images: [{ originalImageUrl: "https://scontent.xx.fbcdn.net/b.jpg" }] } },
  ];
  const planned = planMetaAds(rows, "688168747706811");
  assert.equal(planned.length, 1);
  assert.equal(planned[0].adArchiveId, "123");
  assert.equal(planned[0].media[0].quality, "hd");
  assert.equal(planned[0].link, "https://www.facebook.com/ads/library/?id=123");
});

test("carrossel mantém URLs de mídia original e rejeita hosts externos", () => {
  const planned = planMetaAds([{ pageID: "688168747706811", adArchiveID: "789", snapshot: { cards: [
    { originalImageUrl: "https://scontent.xx.fbcdn.net/original.jpg", resizedImageUrl: "https://scontent.xx.fbcdn.net/small.jpg" },
    { videoHdUrl: "https://video.xx.fbcdn.net/film.mp4" },
    { originalImageUrl: "https://evil.example/other.jpg" },
  ] } }], "688168747706811");
  assert.deepEqual(planned[0].media.map(item => item.quality), ["original", "hd"]);
  assert.equal(isMetaMediaUrl("https://fbcdn.net.evil.example/a.jpg"), false);
  assert.equal(isMetaMediaUrl("http://video.xx.fbcdn.net/a.mp4"), false);
});

test("mídia só é aceita após verificação dos bytes", () => {
  const mp4 = Buffer.alloc(32); mp4.write("ftyp", 4);
  assert.equal(detectMedia(mp4).ext, "mp4");
  assert.equal(detectMedia(Buffer.from([255, 216, 255, 0])).ext, "jpg");
  assert.throws(() => detectMedia(Buffer.from("<html>blocked</html>")));
});

test("workflow do piloto limita a Ultima Peak e mantém Apify em secret", () => {
  const workflow = readFileSync(new URL("../.github/workflows/ultima-peak-apify-pilot.yml", import.meta.url), "utf8");
  const script = readFileSync(new URL("../scripts/archive_ultima_peak_apify.mjs", import.meta.url), "utf8");
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(workflow, /APIFY_TOKEN: \$\{\{ secrets\.APIFY_TOKEN \}\}/);
  assert.match(script, /const PAGE_ID = "688168747706811"/);
  assert.match(script, /brandArchivedAds/);
  assert.match(html, /Anúncios arquivados/);
});
