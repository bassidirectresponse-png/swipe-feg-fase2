import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const oidc = await readFile(new URL("netlify/functions/_github-oidc.mjs", root), "utf8");
const endpoint = await readFile(new URL("netlify/functions/github-automation-token.mjs", root), "utf8");
const adsWorkflow = await readFile(new URL(".github/workflows/ads-ativos.yml", root), "utf8");

test("a sessão das automações é temporária, de baixo privilégio e restrita ao repositório", () => {
  assert.match(oidc, /token\.actions\.githubusercontent\.com/);
  assert.match(oidc, /swipe-feg-netlify-automation/);
  assert.match(oidc, /bassidirectresponse-png\/swipe-feg-fase2/);
  assert.match(oidc, /refs\/heads\/main/);
  assert.match(oidc, /ALLOWED_WORKFLOWS/);
  assert.match(oidc, /verifySignature/);
  assert.match(endpoint, /noticias-bot@swipefeg\.app/);
  assert.match(endpoint, /randomBytes\(36\)/);
  assert.match(endpoint, /supabaseAdminAuth/);
  assert.match(endpoint, /admin\.mode !== "service_role"/);
  assert.doesNotMatch(endpoint, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("a revisão de anúncios ativos usa OIDC e continua duas vezes ao dia", () => {
  assert.match(adsWorkflow, /cron: "0 11 \* \* \*"/);
  assert.match(adsWorkflow, /cron: "0 23 \* \* \*"/);
  assert.match(adsWorkflow, /id-token: write/);
  assert.match(adsWorkflow, /github-automation-token/);
  assert.match(adsWorkflow, /SUPABASE_BOT_ACCESS_TOKEN/);
});
