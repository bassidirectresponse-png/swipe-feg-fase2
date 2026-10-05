import test from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const cwd=fileURLToPath(new URL("..",import.meta.url));
function python(code){return JSON.parse(execFileSync("python3",["-c",code],{cwd}).toString().trim().split("\n").at(-1));}

test("Apify usa run assíncrono e lê o dataset após sucesso",()=>{
  const result=python(`import importlib.util,json
s=importlib.util.spec_from_file_location('miner','scripts/tiktok_mining.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
m.APIFY_TOKEN='test';calls=[]
def fake(method,url,payload=None,retries=3):
 calls.append((method,url))
 if method=='POST':return {'data':{'id':'run-1','defaultDatasetId':'data-1'}}
 if '/actor-runs/' in url:return {'data':{'status':'SUCCEEDED','defaultDatasetId':'data-1'}}
 return [{'id':'video-1'}]
m.apify_json=fake
out=m.fetch_apify(['dog joint health'],2)
print(json.dumps({'items':len(out),'paths':[url for _,url in calls]}))`);
  assert.equal(result.items,1);
  assert.match(result.paths[0],/\/actors\/clockworks~tiktok-scraper\/runs\?/);
  assert.match(result.paths[1],/\/actor-runs\/run-1\?/);
  assert.match(result.paths[2],/\/datasets\/data-1\/items\?/);
});

test("falha de um nicho não descarta vídeos dos outros",()=>{
  const result=python(`import importlib.util,json
s=importlib.util.spec_from_file_location('miner','scripts/tiktok_mining.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
m.PROVIDER='apify'
def fetch(queries,count):
 if queries[0]=='b':raise RuntimeError('Apify HTTP 502')
 return [('apify',{'id':'12345678901'})]
m.fetch_niche=fetch
m.normalize=lambda provider,v,n:{'videoId':v['id'],'dataPub':m.NOW,'isAd':False,'views':100,'faixa':'low','caption':'test','hashtags':[]}
m.relevant=lambda rec,must:True
failures={};out=m.collect({'A':{'queries':['a'],'must':[]},'B':{'queries':['b'],'must':[]}},failures)
print(json.dumps({'kept':len(out['A']),'failed':len(out['B']),'reason':failures.get('B')}))`);
  assert.equal(result.kept,1);
  assert.equal(result.failed,0);
  assert.match(result.reason,/HTTP 502/);
});

test("lote parcial ainda é enviado ao endpoint autenticado",()=>{
  const result=python(`import importlib.util,json,sys
s=importlib.util.spec_from_file_location('miner','scripts/tiktok_mining.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
m.BOT_ACCESS_TOKEN='test';m.BRAND_NICHES={'A':{},'B':{}}
row={'videoId':'12345678901','nome':'video','views':100,'likes':10,'comentarios':1,'engajamento':0.11,'autor':'brand','thumbOrig':'','thumb':'','radarGeneration':m.RADAR_GENERATION}
def collect(niches,failures):failures['B']='Apify HTTP 502';return {'A':[row],'B':[]}
m.collect=collect;m.bot_login=lambda:'test';m.load_existing=lambda token:{};m.rehost_thumb=lambda token,vid,thumb:''
saved=[];m.insert_new_via_github=lambda rows:saved.extend(rows) or len(rows)
m.main()
print(json.dumps({'count':len(saved),'generation':saved[0]['radarGeneration']}))`);
  assert.equal(result.count,1);
  assert.equal(result.generation,"offers-topics-2026-10-05");
});
