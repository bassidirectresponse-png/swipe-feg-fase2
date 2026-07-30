import test from "node:test";
import assert from "node:assert/strict";
import {
  decodeFacebookUrl,
  extractFacebookMediaFromHtml,
} from "../netlify/functions/_facebook-public-media.mjs";

test("decodifica URL de vídeo escapada pelo player do Facebook", () => {
  const value = "https:\\/\\/video.xx.fbcdn.net\\/v\\/arquivo.mp4?x=1\\u0026y=2";
  assert.equal(decodeFacebookUrl(value), "https://video.xx.fbcdn.net/v/arquivo.mp4?x=1&y=2");
});

test("prioriza vídeo público sobre imagens da interface", () => {
  const html = `
    <link href="https://static.xx.fbcdn.net/icon.png">
    {"progressive_url":"https:\\/\\/video.xx.fbcdn.net\\/v\\/criativo.mp4?token=ok\\u0026x=1"}
  `;
  assert.deepEqual(extractFacebookMediaFromHtml(html), {
    mediaUrl: "https://video.xx.fbcdn.net/v/criativo.mp4?token=ok&x=1",
    type: "video",
  });
});

test("usa imagem do anúncio quando o post não contém vídeo", () => {
  const html = '<meta property="og:image" content="https://scontent.xx.fbcdn.net/v/t1.0-9/anuncio.jpg?x=1&amp;y=2">';
  assert.deepEqual(extractFacebookMediaFromHtml(html), {
    mediaUrl: "https://scontent.xx.fbcdn.net/v/t1.0-9/anuncio.jpg?x=1&y=2",
    type: "image",
  });
});

test("ignora mídia hospedada fora da infraestrutura do Facebook", () => {
  const html = '{"video":"https:\\/\\/example.com\\/roubo.mp4"}';
  assert.equal(extractFacebookMediaFromHtml(html), null);
});
