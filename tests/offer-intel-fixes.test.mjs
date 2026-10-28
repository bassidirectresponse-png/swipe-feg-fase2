import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createSupabaseStorage } from "../lib/offer-intel-storage.mjs";
import { createDailyBudget } from "../lib/offer-intel-budget.mjs";
import { refreshBudgetUsage, publicLimits } from "../lib/offer-intel-limits.mjs";
import { createIntelHandlers } from "../netlify/functions/_offer-intel-api.mjs";

test("Postgres budget REST sends only reservation; usage and admission use separate RPCs",async()=>{
  const calls=[],FAKE_fetch=async(url,options)=>{
    calls.push({url:String(url),options});
    return Response.json({day:"2026-10-28",daily_used:15,daily_max_runs:15,reused:true});
  };
  const storage=createSupabaseStorage({url:"https://example.invalid",serviceKey:"FAKE-service",fetcher:FAKE_fetch});
  const result=await createDailyBudget({storage}).reserve("reservation-001");
  assert.equal(result.reused,true);assert.equal(result.daily_used,15);
  await storage.budgetUsage();
  assert.match(calls[0].url,/rpc\/offer_intel_budget_reserve$/);
  assert.deepEqual(JSON.parse(calls[0].options.body),{p:{reservation:"reservation-001"}});
  assert.match(calls[1].url,/rpc\/offer_intel_budget_usage$/);
  assert.deepEqual(JSON.parse(calls[1].options.body),{p:{}});
});
test("Postgres daily_limit becomes structured 429 preserving server Retry-After",async()=>{
  const storage=createSupabaseStorage({url:"https://example.invalid",serviceKey:"FAKE-service",
    fetcher:async()=>Response.json({message:"daily_limit",details:"1234"},{status:400})});
  await assert.rejects(()=>createDailyBudget({storage}).reserve("over-limit"),e=>e.status===429&&e.code==="daily_limit"&&e.retryAfter===1234);
  for(const response of [undefined,{day:"2026-10-28",daily_used:0,reused:false}, {day:"2026-10-28",daily_used:16,daily_max_runs:15,reused:false}])
    await assert.rejects(()=>createDailyBudget({storage:{budgetReserve:async()=>response}}).reserve("bad"),e=>e.status===503);
});
test("daily_used is read once from PostgreSQL for GET job; usage failure omits stale values",async()=>{
  let reads=0;const id="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const services={capabilities:{apify:true},storage:{get:async()=>({id,created_at:"2026-10-28T00:00:00Z"}),
    budgetUsage:async()=>{reads++;return {daily_used:7};}}};
  const handlers=createIntelHandlers({authenticate:async()=>({id}),isAdmin:()=>true,rateLimit:async()=>({allowed:true}),getServices:()=>services});
  const res=await handlers.job(new Request("https://benchmarkinggrupofeg.site/job?job_id="+id));
  assert.equal(res.status,200);assert.equal((await res.json()).limits.apify.daily_used,7);assert.equal(reads,1);
  services.storage.budgetUsage=async()=>{throw Error("FAKE unavailable");};
  await refreshBudgetUsage(services);
  assert.equal(publicLimits(services.capabilities).apify.daily_used,undefined);
  services.storage.budgetUsage=async()=>({daily_used:0});
  await refreshBudgetUsage(services);assert.equal(publicLimits(services.capabilities).apify.daily_used,0);
});
test("004 replaces persist with v_counts and grants only service_role; budget uses server UTC and lock",()=>{
  const sql=readFileSync(new URL("../supabase/migrations/202610280001_offer_intelligence_fixes.sql",import.meta.url),"utf8");
  assert.match(sql,/create or replace function public\.offer_intel_persist/);
  assert.match(sql,/set counts=v_counts/);assert.doesNotMatch(sql,/offer_intel_persist\.counts/);
  assert.match(sql,/primary key\(day,reservation\)/);
  assert.match(sql,/pg_advisory_xact_lock\(7261028,v_day-date '2000-01-01'\)/);
  assert.match(sql,/statement_timestamp\(\) at time zone 'UTC'/);
  for(const name of ["persist","budget_reserve","budget_usage"]) {
    assert.ok(sql.includes("revoke execute on function public.offer_intel_"+name+"(jsonb) from public,anon,authenticated"));
    assert.ok(sql.includes("grant execute on function public.offer_intel_"+name+"(jsonb) to service_role"));
  }
  assert.doesNotMatch(sql,/security definer/i);
});
