import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('daily collectors use stable Netlify endpoint with bounded auth retries',()=>{
  for(const file of ['.github/workflows/ads-ativos.yml','.github/workflows/tiktok-mining.yml']){
    const source=read(file);
    assert.doesNotMatch(source,/benchmarkinggrupofeg\.site/);
    assert.match(source,/https:\/\/swipefeg\.netlify\.app\/\.netlify\/functions\/github-automation-token/);
    assert.match(source,/--retry 4 --retry-all-errors/);
    assert.match(source,/--connect-timeout 15 --max-time 60/);
    assert.match(source,/id-token: write/);
  }
  assert.doesNotMatch(read('scripts/tiktok_mining.py'),/benchmarkinggrupofeg\.site/);
});
test('TikTok recovery skips successful days and excludes reset runs',()=>{
  const source=read('.github/workflows/tiktok-mining.yml');
  assert.match(source,/cron: "13 8 \* \* \*"/);
  assert.match(source,/cron: "13 18 \* \* \*"/);
  assert.match(source,/status=success/);
  assert.match(source,/America\/Sao_Paulo/);
  assert.match(source,/"reset" not in r\.get/);
  assert.match(source,/steps\.daily\.outputs\.run == 'true' && inputs\.mode != 'reset'/);
});
test('collectors report partial writes as failures and publish daily summaries',()=>{
  const ads=read('scripts/ads_scraper.py'),radar=read('scripts/tiktok_mining.py');
  assert.match(ads,/not DRY_RUN and \(fail or skipped\)/);
  assert.match(radar,/if update_failed or provider_failures:/);
  assert.match(radar,/update_failed \+= 1/);
  for(const source of [ads,radar])assert.match(source,/GITHUB_STEP_SUMMARY/);
});
