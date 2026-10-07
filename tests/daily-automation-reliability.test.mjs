import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
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
  assert.match(ads,/library_run_failed\(fail, skipped, zero_pending, DRY_RUN\)/);
  assert.match(radar,/if update_failed or provider_failures:/);
  assert.match(radar,/update_failed \+= 1/);
  for(const source of [ads,radar])assert.match(source,/GITHUB_STEP_SUMMARY/);
});
test('zero confirmation is normal protection, but partial reads and write errors fail',()=>{
  const result=execFileSync('python3',['-c',`
import ast, sys
source=open(sys.argv[1],encoding='utf-8').read()
tree=ast.parse(source)
node=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='library_run_failed')
ns={};exec(compile(ast.Module(body=[node],type_ignores=[]),'<test>','exec'),ns)
f=ns['library_run_failed']
assert not f(0,0,0)
assert not f(0,1,1)
assert f(0,2,1)
assert f(1,1,1)
assert not f(1,2,0,True)
print('ok')
`,fileURLToPath(new URL('../scripts/ads_scraper.py',import.meta.url))],{encoding:'utf-8'});
  assert.equal(result.trim(),'ok');
});
test('manual recovery can target pending cards without narrowing daily coverage',()=>{
  const workflow=read('.github/workflows/ads-ativos.yml'),ads=read('scripts/ads_scraper.py');
  assert.match(workflow,/only_pending:[\s\S]*?default: false/);
  assert.match(ads,/ONLY_PENDING = os\.environ\.get\("ONLY_PENDING", "0"\)/);
  assert.match(ads,/if ONLY_PENDING and status not in \("pending", "processing", "retry_scheduled", "failed"\)/);
});
