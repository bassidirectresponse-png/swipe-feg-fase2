import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const source=await readFile(new URL("../netlify/functions/github-tiktok-ingest.mjs",import.meta.url),"utf8");

test("novos vídeos exigem identidade GitHub do workflow e service role",async()=>{
  assert.match(source,/verifyGithubAutomationToken\(bearer\)/);
  assert.match(source,/tiktok-mining\.yml@/);
  assert.match(source,/admin\.mode!=="service_role"/);
  assert.match(source,/MAX_ROWS=400,MAX_BYTES=2\*1024\*1024/);
  assert.match(source,/row\.radarGeneration!==GENERATION/);
  assert.match(source,/TOPICS\[row\.nicho\]\.includes\(row\.subnicho\)/);
  assert.match(source,/data->>kind=eq\.tiktok/);
  assert.match(source,/DELETE_ALL_TIKTOK/);
  const {default:handler}=await import("../netlify/functions/github-tiktok-ingest.mjs");
  const response=await handler(new Request("https://benchmarkinggrupofeg.site/.netlify/functions/github-tiktok-ingest",{method:"POST",headers:{"Content-Type":"application/json"},body:"[]"}));
  assert.equal(response.status,401);
});

test("miner não usa INSERT público para novos vídeos",async()=>{
  const miner=await readFile(new URL("../scripts/tiktok_mining.py",import.meta.url),"utf8");
  assert.match(miner,/insert_new_via_github\(new_rows\)/);
  assert.match(miner,/ACTIONS_ID_TOKEN_REQUEST_URL/);
  assert.doesNotMatch(miner,/sb\("POST", "\/rest\/v1\/offers"/);
});
