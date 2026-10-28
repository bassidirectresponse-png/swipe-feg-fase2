-- 006: relatório semanal Top 10 (contrato v2.0, seção 10.3). FILE ONLY; not applied.
-- Only new offer_intel_weekly_* tables and RPCs. Admin can SELECT the report tables;
-- every write goes through service_role RPCs (lease fencing, nonce, weekly USD ceiling).
begin;

create table public.offer_intel_weekly_reports (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique check (extract(isodow from week_start)=2),
  status text not null default 'queued' check (status in ('queued','running','succeeded','partial','failed')),
  phase text not null default 'queued' check (phase in ('queued','select','collect','rank','media','analysis','summary','done')),
  progress integer not null default 0 check (progress between 0 and 100),
  trigger text not null default 'manual' check (trigger in ('schedule','manual')),
  actor_id uuid,
  started_at timestamptz,
  finished_at timestamptz,
  cost jsonb not null default '{}'::jsonb,
  summary jsonb,
  error jsonb,
  lease_token uuid,
  lease_until timestamptz,
  attempt integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.offer_intel_weekly_ads (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.offer_intel_weekly_reports(id) on delete cascade,
  "group" text not null check ("group" in ('registered','discovered')),
  rank integer not null check (rank between 1 and 10),
  ad_archive_id text not null check (ad_archive_id ~ '^\d{1,40}$'),
  ad_ids jsonb not null default '[]'::jsonb,
  match_keys jsonb not null default '[]'::jsonb,
  page_id text check (page_id ~ '^\d{1,40}$'),
  page_name text,
  offer_id uuid references public.offers(id) on delete set null,
  ad_text text,
  cta_text text,
  landing_url text,
  display_format text,
  started_at timestamptz,
  days_active integer not null default 0 check (days_active>=0),
  repetitions integer not null default 1 check (repetitions>=1),
  score numeric(6,2) not null check (score between 0 and 100),
  is_new boolean not null default true,
  rank_change integer,
  media jsonb not null default '{}'::jsonb,
  analysis jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (report_id,"group",rank)
);
create index offer_intel_weekly_ads_report on public.offer_intel_weekly_ads(report_id,"group",rank);

-- Internal: single-use dispatch nonces, Apify runs per batch and the weekly USD ledger.
create table public.offer_intel_weekly_dispatches (
  nonce uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.offer_intel_weekly_reports(id) on delete cascade,
  expires_at timestamptz not null default now()+interval '5 minutes',
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.offer_intel_weekly_runs (
  report_id uuid not null references public.offer_intel_weekly_reports(id) on delete cascade,
  batch_key text not null check (batch_key ~ '^[a-f0-9]{16,64}$'),
  reservation text not null check (reservation ~ '^[a-zA-Z0-9._:-]{1,128}$'),
  page_ids jsonb not null default '[]'::jsonb,
  usd_est numeric(8,2) not null default 0,
  state text not null check (state in ('starting','running','succeeded','failed','unknown')),
  provider_run_id text check (provider_run_id ~ '^\w{1,100}$'),
  dataset_id text check (dataset_id ~ '^\w{1,100}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (report_id,batch_key)
);

create table public.offer_intel_weekly_budget (
  week_start date not null,
  reservation text not null check (reservation ~ '^[a-zA-Z0-9._:-]{1,128}$'),
  usd numeric(8,2) not null check (usd>0),
  created_at timestamptz not null default now(),
  primary key (week_start,reservation)
);

alter table public.offer_intel_weekly_reports enable row level security;
alter table public.offer_intel_weekly_ads enable row level security;
alter table public.offer_intel_weekly_dispatches enable row level security;
alter table public.offer_intel_weekly_runs enable row level security;
alter table public.offer_intel_weekly_budget enable row level security;
revoke all on public.offer_intel_weekly_reports, public.offer_intel_weekly_ads, public.offer_intel_weekly_dispatches,
  public.offer_intel_weekly_runs, public.offer_intel_weekly_budget from public, anon, authenticated;
grant select on public.offer_intel_weekly_reports, public.offer_intel_weekly_ads to authenticated;
create policy offer_intel_weekly_reports_select_admin on public.offer_intel_weekly_reports
  for select to authenticated using (public.swipe_is_admin());
create policy offer_intel_weekly_ads_select_admin on public.offer_intel_weekly_ads
  for select to authenticated using (public.swipe_is_admin());
grant all on public.offer_intel_weekly_reports, public.offer_intel_weekly_ads, public.offer_intel_weekly_dispatches,
  public.offer_intel_weekly_runs, public.offer_intel_weekly_budget to service_role;

-- Idempotent per week. Active report -> job_active; succeeded -> reused without nonce;
-- failed/partial/stale -> re-queued (the worker resumes runs, media and analyses already saved).
create function public.offer_intel_weekly_enqueue(p jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  v_week date := (p->>'week_start')::date;
  v_trigger text := coalesce(p->>'trigger','manual');
  r offer_intel_weekly_reports;
  v_nonce uuid;
begin
  if extract(isodow from v_week)<>2 or v_trigger not in ('schedule','manual') then raise exception 'invalid_request'; end if;
  perform pg_advisory_xact_lock(7261029,v_week-date '2000-01-01');
  select * into r from offer_intel_weekly_reports where week_start=v_week for update;
  if not found then
    insert into offer_intel_weekly_reports(week_start,trigger,actor_id)
      values(v_week,v_trigger,nullif(p->>'actor_id','')::uuid) returning * into r;
  else
    if (r.status='running' and r.lease_until>now()) or (r.status='queued' and r.updated_at>now()-interval '5 minutes') then
      raise exception 'job_active';
    end if;
    if r.status='succeeded' then
      return jsonb_build_object('report',to_jsonb(r),'reused',true,'nonce',null);
    end if;
    update offer_intel_weekly_reports set status='queued',phase='queued',progress=0,error=null,attempt=0,
      lease_token=null,lease_until=null,finished_at=null,trigger=v_trigger,
      actor_id=coalesce(nullif(p->>'actor_id','')::uuid,actor_id),updated_at=now()
      where id=r.id returning * into r;
  end if;
  insert into offer_intel_weekly_dispatches(report_id) values(r.id) returning nonce into v_nonce;
  return jsonb_build_object('report',to_jsonb(r),'reused',false,'nonce',v_nonce);
end $$;

create function public.offer_intel_weekly_claim(p jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare r offer_intel_weekly_reports; n offer_intel_weekly_dispatches;
begin
  select * into r from offer_intel_weekly_reports where id=(p->>'report_id')::uuid for update;
  if not found or r.status not in ('queued','running') or r.lease_until>now() or r.attempt>=3 then return null; end if;
  select * into n from offer_intel_weekly_dispatches where nonce=(p->>'nonce')::uuid and report_id=r.id for update;
  if not found or n.used_at is not null or n.expires_at<=now() then return null; end if;
  update offer_intel_weekly_dispatches set used_at=now() where nonce=n.nonce;
  update offer_intel_weekly_reports set status='running',phase='select',lease_token=gen_random_uuid(),
    lease_until=now()+interval '5 minutes',attempt=attempt+1,started_at=coalesce(started_at,now()),updated_at=now()
    where id=r.id returning * into r;
  return to_jsonb(r);
end $$;

-- Fenced report checkpoint: only the lease holder writes, and every write extends the lease.
create function public.offer_intel_weekly_checkpoint(p jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare r offer_intel_weekly_reports; v jsonb := coalesce(p->'patch','{}'::jsonb);
begin
  select * into r from offer_intel_weekly_reports where id=(p->>'report_id')::uuid for update;
  if not found or r.status<>'running' or r.lease_token is distinct from (p->>'lease_token')::uuid or r.lease_until<=now() then
    raise exception 'conflict';
  end if;
  if v ? 'status' and v->>'status' not in ('running','succeeded','partial','failed') then raise exception 'invalid_request'; end if;
  update offer_intel_weekly_reports set
    status=coalesce(v->>'status',status),
    phase=coalesce(v->>'phase',phase),
    progress=coalesce((v->>'progress')::integer,progress),
    cost=case when v ? 'cost' then v->'cost' else cost end,
    summary=case when v ? 'summary' then v->'summary' else summary end,
    error=case when v ? 'error' then nullif(v->'error','null'::jsonb) else error end,
    finished_at=case when coalesce(v->>'status','running')<>'running' then now() else finished_at end,
    lease_until=case when coalesce(v->>'status','running')<>'running' then null else now()+interval '5 minutes' end,
    updated_at=now()
    where id=r.id returning * into r;
  return to_jsonb(r);
end $$;

-- Absolute weekly ceiling: US$ 15 per week_start, reservation is idempotent and never refunded.
create function public.offer_intel_weekly_budget_reserve(p jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  v_week date := (p->>'week_start')::date;
  v_reservation text := p->>'reservation';
  v_usd numeric(8,2) := (p->>'usd')::numeric;
  v_used numeric(8,2);
  v_cap constant numeric(8,2) := 15.00;
begin
  if extract(isodow from v_week)<>2 or v_reservation !~ '^[a-zA-Z0-9._:-]{1,128}$' or v_usd is null or v_usd<=0 then
    raise exception 'invalid_request';
  end if;
  perform pg_advisory_xact_lock(7261030,v_week-date '2000-01-01');
  select coalesce(sum(usd),0) into v_used from offer_intel_weekly_budget where week_start=v_week;
  if exists(select 1 from offer_intel_weekly_budget where week_start=v_week and reservation=v_reservation) then
    return jsonb_build_object('week_start',v_week,'used_usd',v_used,'cap_usd',v_cap,'reused',true);
  end if;
  if v_used+v_usd>v_cap then raise exception 'budget_exceeded'; end if;
  insert into offer_intel_weekly_budget(week_start,reservation,usd) values(v_week,v_reservation,v_usd);
  return jsonb_build_object('week_start',v_week,'used_usd',v_used+v_usd,'cap_usd',v_cap,'reused',false);
end $$;

create function public.offer_intel_weekly_budget_usage(p jsonb) returns jsonb
language sql stable security invoker set search_path=public,pg_temp as $$
  select jsonb_build_object('week_start',(p->>'week_start')::date,'used_usd',coalesce(sum(usd),0),'cap_usd',15.00)
  from offer_intel_weekly_budget where week_start=(p->>'week_start')::date;
$$;

-- Fenced Apify batch state (compare-and-set by expected_state; absent row is created).
create function public.offer_intel_weekly_run(p jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare r offer_intel_weekly_reports; x offer_intel_weekly_runs; v jsonb := coalesce(p->'patch','{}'::jsonb);
begin
  select * into r from offer_intel_weekly_reports where id=(p->>'report_id')::uuid for update;
  if not found or r.status<>'running' or r.lease_token is distinct from (p->>'lease_token')::uuid or r.lease_until<=now() then
    raise exception 'conflict';
  end if;
  select * into x from offer_intel_weekly_runs where report_id=r.id and batch_key=p->>'batch_key' for update;
  if not found then
    if not (p ? 'patch') then return null; end if;
    insert into offer_intel_weekly_runs(report_id,batch_key,reservation,page_ids,usd_est,state,provider_run_id,dataset_id)
      values(r.id,p->>'batch_key',v->>'reservation',coalesce(v->'page_ids','[]'::jsonb),coalesce((v->>'usd_est')::numeric,0),
        v->>'state',v->>'provider_run_id',v->>'dataset_id') returning * into x;
  elsif p ? 'patch' then
    if p->>'expected_state' is distinct from x.state then raise exception 'conflict'; end if;
    update offer_intel_weekly_runs set state=coalesce(v->>'state',state),
      provider_run_id=coalesce(v->>'provider_run_id',provider_run_id),dataset_id=coalesce(v->>'dataset_id',dataset_id),updated_at=now()
      where report_id=r.id and batch_key=x.batch_key returning * into x;
  end if;
  update offer_intel_weekly_reports set lease_until=now()+interval '5 minutes',updated_at=now() where id=r.id;
  return to_jsonb(x);
end $$;

-- Replaces the report ranking atomically (both groups).
create function public.offer_intel_weekly_save_ads(p jsonb) returns integer
language plpgsql security invoker set search_path=public,pg_temp as $$
declare r offer_intel_weekly_reports; v_count integer;
begin
  select * into r from offer_intel_weekly_reports where id=(p->>'report_id')::uuid for update;
  if not found or r.status<>'running' or r.lease_token is distinct from (p->>'lease_token')::uuid or r.lease_until<=now() then
    raise exception 'conflict';
  end if;
  if jsonb_typeof(p->'ads') is distinct from 'array' or jsonb_array_length(p->'ads')>20 then raise exception 'invalid_request'; end if;
  delete from offer_intel_weekly_ads where report_id=r.id;
  insert into offer_intel_weekly_ads(report_id,"group",rank,ad_archive_id,ad_ids,match_keys,page_id,page_name,offer_id,ad_text,cta_text,
    landing_url,display_format,started_at,days_active,repetitions,score,is_new,rank_change,media,analysis)
  select r.id,a->>'group',(a->>'rank')::integer,a->>'ad_archive_id',coalesce(a->'ad_ids','[]'::jsonb),coalesce(a->'match_keys','[]'::jsonb),
    a->>'page_id',a->>'page_name',
    case when exists(select 1 from offers o where o.id::text=a->>'offer_id') then (a->>'offer_id')::uuid end,
    a->>'ad_text',a->>'cta_text',a->>'landing_url',a->>'display_format',(a->>'started_at')::timestamptz,
    (a->>'days_active')::integer,(a->>'repetitions')::integer,(a->>'score')::numeric,(a->>'is_new')::boolean,
    (a->>'rank_change')::integer,coalesce(a->'media','{}'::jsonb),nullif(a->'analysis','null'::jsonb)
  from jsonb_array_elements(p->'ads') a;
  get diagnostics v_count = row_count;
  update offer_intel_weekly_reports set lease_until=now()+interval '5 minutes',updated_at=now() where id=r.id;
  return v_count;
end $$;

create function public.offer_intel_weekly_save_ad(p jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare r offer_intel_weekly_reports; a offer_intel_weekly_ads; v jsonb := coalesce(p->'patch','{}'::jsonb);
begin
  select * into r from offer_intel_weekly_reports where id=(p->>'report_id')::uuid for update;
  if not found or r.status<>'running' or r.lease_token is distinct from (p->>'lease_token')::uuid or r.lease_until<=now() then
    raise exception 'conflict';
  end if;
  update offer_intel_weekly_ads set
    media=case when v ? 'media' then v->'media' else media end,
    analysis=case when v ? 'analysis' then nullif(v->'analysis','null'::jsonb) else analysis end,
    updated_at=now()
    where id=(p->>'id')::uuid and report_id=r.id returning * into a;
  if not found then raise exception 'not_found'; end if;
  update offer_intel_weekly_reports set lease_until=now()+interval '5 minutes',updated_at=now() where id=r.id;
  return to_jsonb(a);
end $$;

revoke execute on function public.offer_intel_weekly_enqueue(jsonb), public.offer_intel_weekly_claim(jsonb),
  public.offer_intel_weekly_checkpoint(jsonb), public.offer_intel_weekly_budget_reserve(jsonb),
  public.offer_intel_weekly_budget_usage(jsonb), public.offer_intel_weekly_run(jsonb),
  public.offer_intel_weekly_save_ads(jsonb), public.offer_intel_weekly_save_ad(jsonb) from public, anon, authenticated;
grant execute on function public.offer_intel_weekly_enqueue(jsonb), public.offer_intel_weekly_claim(jsonb),
  public.offer_intel_weekly_checkpoint(jsonb), public.offer_intel_weekly_budget_reserve(jsonb),
  public.offer_intel_weekly_budget_usage(jsonb), public.offer_intel_weekly_run(jsonb),
  public.offer_intel_weekly_save_ads(jsonb), public.offer_intel_weekly_save_ad(jsonb) to service_role;
commit;
