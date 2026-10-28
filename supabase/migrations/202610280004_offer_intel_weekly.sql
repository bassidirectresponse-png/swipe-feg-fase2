-- 006: Creative Review semanal por produto (contrato v2.0, seções 10.3 + 10.5). FILE ONLY; not applied.
-- Only new offer_intel_weekly_* tables and RPCs. Admin can SELECT reports/products/ads;
-- every write goes through service_role RPCs (lease fencing, single-use nonce, weekly USD ceilings).
begin;

-- One folder per meeting Wednesday ("Creative Review DD/MM/AAAA").
create table public.offer_intel_weekly_reports (
  id uuid primary key default gen_random_uuid(),
  review_date date not null unique check (extract(isodow from review_date)=3),
  status text not null default 'queued' check (status in ('queued','running','succeeded','partial','failed')),
  phase text not null default 'queued' check (phase in ('queued','select','collect','media','analysis','summary','done')),
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
  slices integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.offer_intel_weekly_products (
  report_id uuid not null references public.offer_intel_weekly_reports(id) on delete cascade,
  offer_id uuid not null,
  position integer not null default 0,
  offer_name text,
  brand text,
  section text check (section in ('brandsvalidated','brandsgeneral')),
  pages jsonb not null default '[]'::jsonb,
  ads_collected integer not null default 0,
  summary jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (report_id,offer_id)
);

create table public.offer_intel_weekly_ads (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.offer_intel_weekly_reports(id) on delete cascade,
  offer_id uuid not null,
  rank integer not null check (rank between 1 and 10),
  ad_archive_id text not null check (ad_archive_id ~ '^\d{1,40}$'),
  ad_ids jsonb not null default '[]'::jsonb,
  match_keys jsonb not null default '[]'::jsonb,
  page_id text check (page_id ~ '^\d{1,40}$'),
  page_name text,
  page_source text not null check (page_source in ('cadastrada','encontrada')),
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
  unique (report_id,offer_id,rank)
);

-- Internal: single-use dispatch nonces, Apify batches and the weekly USD ledger (apify/ai).
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
  review_date date not null,
  kind text not null check (kind in ('apify','ai')),
  reservation text not null check (reservation ~ '^[a-zA-Z0-9._:-]{1,128}$'),
  usd numeric(10,4) not null check (usd>0),
  created_at timestamptz not null default now(),
  primary key (review_date,kind,reservation)
);

alter table public.offer_intel_weekly_reports enable row level security;
alter table public.offer_intel_weekly_products enable row level security;
alter table public.offer_intel_weekly_ads enable row level security;
alter table public.offer_intel_weekly_dispatches enable row level security;
alter table public.offer_intel_weekly_runs enable row level security;
alter table public.offer_intel_weekly_budget enable row level security;
revoke all on public.offer_intel_weekly_reports, public.offer_intel_weekly_products, public.offer_intel_weekly_ads,
  public.offer_intel_weekly_dispatches, public.offer_intel_weekly_runs, public.offer_intel_weekly_budget from public, anon, authenticated;
grant select on public.offer_intel_weekly_reports, public.offer_intel_weekly_products, public.offer_intel_weekly_ads to authenticated;
create policy offer_intel_weekly_reports_select_admin on public.offer_intel_weekly_reports
  for select to authenticated using (public.swipe_is_admin());
create policy offer_intel_weekly_products_select_admin on public.offer_intel_weekly_products
  for select to authenticated using (public.swipe_is_admin());
create policy offer_intel_weekly_ads_select_admin on public.offer_intel_weekly_ads
  for select to authenticated using (public.swipe_is_admin());
grant all on public.offer_intel_weekly_reports, public.offer_intel_weekly_products, public.offer_intel_weekly_ads,
  public.offer_intel_weekly_dispatches, public.offer_intel_weekly_runs, public.offer_intel_weekly_budget to service_role;

-- Idempotent per Wednesday. Active -> job_active. Any finished folder is re-queued ("rodar de novo atualiza a
-- mesma pasta"); the worker reuses Apify runs, the USD ledger, archived media and valid analyses.
create function public.offer_intel_weekly_enqueue(p jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  v_date date := (p->>'review_date')::date;
  v_trigger text := coalesce(p->>'trigger','manual');
  r offer_intel_weekly_reports;
  v_nonce uuid;
begin
  if extract(isodow from v_date)<>3 or v_trigger not in ('schedule','manual') then raise exception 'invalid_request'; end if;
  perform pg_advisory_xact_lock(7261029,v_date-date '2000-01-01');
  select * into r from offer_intel_weekly_reports where review_date=v_date for update;
  if not found then
    insert into offer_intel_weekly_reports(review_date,trigger,actor_id)
      values(v_date,v_trigger,nullif(p->>'actor_id','')::uuid) returning * into r;
  else
    if (r.status='running' and r.lease_until>now()) or (r.status='queued' and r.updated_at>now()-interval '5 minutes') then
      raise exception 'job_active';
    end if;
    update offer_intel_weekly_reports set status='queued',phase='queued',progress=0,error=null,attempt=0,slices=0,
      lease_token=null,lease_until=null,finished_at=null,trigger=v_trigger,
      actor_id=coalesce(nullif(p->>'actor_id','')::uuid,actor_id),updated_at=now()
      where id=r.id returning * into r;
  end if;
  insert into offer_intel_weekly_dispatches(report_id) values(r.id) returning nonce into v_nonce;
  return jsonb_build_object('report',to_jsonb(r),'nonce',v_nonce);
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
  update offer_intel_weekly_reports set status='running',phase=case when phase='queued' then 'select' else phase end,
    lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes',attempt=attempt+1,
    started_at=coalesce(started_at,now()),updated_at=now()
    where id=r.id returning * into r;
  return to_jsonb(r);
end $$;

-- Self re-chaining across the 15-minute background limit: the lease holder releases its lease and
-- receives a fresh single-use nonce for the next slice. Bounded by 24 slices per run.
create function public.offer_intel_weekly_continue(p jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare r offer_intel_weekly_reports; v_nonce uuid;
begin
  select * into r from offer_intel_weekly_reports where id=(p->>'report_id')::uuid for update;
  if not found or r.status<>'running' or r.lease_token is distinct from (p->>'lease_token')::uuid or r.lease_until<=now() then
    raise exception 'conflict';
  end if;
  if r.slices>=24 then raise exception 'invalid_request'; end if;
  update offer_intel_weekly_reports set lease_token=null,lease_until=null,attempt=0,slices=slices+1,updated_at=now() where id=r.id;
  insert into offer_intel_weekly_dispatches(report_id) values(r.id) returning nonce into v_nonce;
  return jsonb_build_object('nonce',v_nonce);
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
    cost=case when v ? 'cost' then cost||(v->'cost') else cost end,
    summary=case when v ? 'summary' then nullif(v->'summary','null'::jsonb) else summary end,
    error=case when v ? 'error' then nullif(v->'error','null'::jsonb) else error end,
    finished_at=case when coalesce(v->>'status','running')<>'running' then now() else finished_at end,
    lease_until=case when coalesce(v->>'status','running')<>'running' then null else now()+interval '5 minutes' end,
    updated_at=now()
    where id=r.id returning * into r;
  return to_jsonb(r);
end $$;

-- Absolute weekly ceilings per meeting date: Apify US$ 15, AI US$ 10. Idempotent, never refunded.
create function public.offer_intel_weekly_budget_reserve(p jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  v_date date := (p->>'review_date')::date;
  v_kind text := p->>'kind';
  v_reservation text := p->>'reservation';
  v_usd numeric(10,4) := (p->>'usd')::numeric;
  v_used numeric(10,4);
  v_cap numeric(10,4);
begin
  v_cap := case v_kind when 'apify' then 15.00 when 'ai' then 10.00 end;
  if extract(isodow from v_date)<>3 or v_cap is null or v_reservation !~ '^[a-zA-Z0-9._:-]{1,128}$'
    or jsonb_typeof(p->'usd') is distinct from 'number' or v_usd<=0 then
    raise exception 'invalid_request';
  end if;
  perform pg_advisory_xact_lock(7261030,(v_date-date '2000-01-01')*2+(case v_kind when 'ai' then 1 else 0 end));
  select coalesce(sum(usd),0) into v_used from offer_intel_weekly_budget where review_date=v_date and kind=v_kind;
  if exists(select 1 from offer_intel_weekly_budget where review_date=v_date and kind=v_kind and reservation=v_reservation) then
    return jsonb_build_object('review_date',v_date,'kind',v_kind,'used_usd',v_used,'cap_usd',v_cap,'reused',true);
  end if;
  if v_used+v_usd>v_cap then raise exception 'budget_exceeded'; end if;
  insert into offer_intel_weekly_budget(review_date,kind,reservation,usd) values(v_date,v_kind,v_reservation,v_usd);
  return jsonb_build_object('review_date',v_date,'kind',v_kind,'used_usd',v_used+v_usd,'cap_usd',v_cap,'reused',false);
end $$;

create function public.offer_intel_weekly_budget_usage(p jsonb) returns jsonb
language sql stable security invoker set search_path=public,pg_temp as $$
  select jsonb_build_object('review_date',(p->>'review_date')::date,'kind',p->>'kind','used_usd',coalesce(sum(usd),0)::float8,
    'cap_usd',case p->>'kind' when 'apify' then 15.00 when 'ai' then 10.00 end)
  from offer_intel_weekly_budget where review_date=(p->>'review_date')::date and kind=p->>'kind';
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

-- Replaces products of the folder (selection step).
create function public.offer_intel_weekly_save_products(p jsonb) returns integer
language plpgsql security invoker set search_path=public,pg_temp as $$
declare r offer_intel_weekly_reports; v_count integer;
begin
  select * into r from offer_intel_weekly_reports where id=(p->>'report_id')::uuid for update;
  if not found or r.status<>'running' or r.lease_token is distinct from (p->>'lease_token')::uuid or r.lease_until<=now() then
    raise exception 'conflict';
  end if;
  if jsonb_typeof(p->'products') is distinct from 'array' or jsonb_array_length(p->'products')>200 then raise exception 'invalid_request'; end if;
  delete from offer_intel_weekly_products where report_id=r.id;
  insert into offer_intel_weekly_products(report_id,offer_id,position,offer_name,brand,section,pages,ads_collected,summary)
  select r.id,(a->>'offer_id')::uuid,(a->>'position')::integer,a->>'offer_name',a->>'brand',a->>'section',coalesce(a->'pages','[]'::jsonb),
    coalesce((a->>'ads_collected')::integer,0),nullif(a->'summary','null'::jsonb)
  from jsonb_array_elements(p->'products') a;
  get diagnostics v_count = row_count;
  update offer_intel_weekly_reports set lease_until=now()+interval '5 minutes',updated_at=now() where id=r.id;
  return v_count;
end $$;

create function public.offer_intel_weekly_save_product(p jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare r offer_intel_weekly_reports; x offer_intel_weekly_products; v jsonb := coalesce(p->'patch','{}'::jsonb);
begin
  select * into r from offer_intel_weekly_reports where id=(p->>'report_id')::uuid for update;
  if not found or r.status<>'running' or r.lease_token is distinct from (p->>'lease_token')::uuid or r.lease_until<=now() then
    raise exception 'conflict';
  end if;
  update offer_intel_weekly_products set
    ads_collected=coalesce((v->>'ads_collected')::integer,ads_collected),
    summary=case when v ? 'summary' then nullif(v->'summary','null'::jsonb) else summary end,updated_at=now()
    where report_id=r.id and offer_id=(p->>'offer_id')::uuid returning * into x;
  if not found then raise exception 'not_found'; end if;
  update offer_intel_weekly_reports set lease_until=now()+interval '5 minutes',updated_at=now() where id=r.id;
  return to_jsonb(x);
end $$;

-- Replaces the folder ranking atomically (Top 10 of every product).
create function public.offer_intel_weekly_save_ads(p jsonb) returns integer
language plpgsql security invoker set search_path=public,pg_temp as $$
declare r offer_intel_weekly_reports; v_count integer;
begin
  select * into r from offer_intel_weekly_reports where id=(p->>'report_id')::uuid for update;
  if not found or r.status<>'running' or r.lease_token is distinct from (p->>'lease_token')::uuid or r.lease_until<=now() then
    raise exception 'conflict';
  end if;
  if jsonb_typeof(p->'ads') is distinct from 'array' or jsonb_array_length(p->'ads')>2000 then raise exception 'invalid_request'; end if;
  delete from offer_intel_weekly_ads where report_id=r.id;
  insert into offer_intel_weekly_ads(report_id,offer_id,rank,ad_archive_id,ad_ids,match_keys,page_id,page_name,page_source,ad_text,cta_text,
    landing_url,display_format,started_at,days_active,repetitions,score,is_new,rank_change,media,analysis)
  select r.id,(a->>'offer_id')::uuid,(a->>'rank')::integer,a->>'ad_archive_id',coalesce(a->'ad_ids','[]'::jsonb),coalesce(a->'match_keys','[]'::jsonb),
    a->>'page_id',a->>'page_name',a->>'page_source',a->>'ad_text',a->>'cta_text',a->>'landing_url',a->>'display_format',(a->>'started_at')::timestamptz,
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
  public.offer_intel_weekly_continue(jsonb), public.offer_intel_weekly_checkpoint(jsonb),
  public.offer_intel_weekly_budget_reserve(jsonb), public.offer_intel_weekly_budget_usage(jsonb),
  public.offer_intel_weekly_run(jsonb), public.offer_intel_weekly_save_products(jsonb), public.offer_intel_weekly_save_product(jsonb),
  public.offer_intel_weekly_save_ads(jsonb), public.offer_intel_weekly_save_ad(jsonb) from public, anon, authenticated;
grant execute on function public.offer_intel_weekly_enqueue(jsonb), public.offer_intel_weekly_claim(jsonb),
  public.offer_intel_weekly_continue(jsonb), public.offer_intel_weekly_checkpoint(jsonb),
  public.offer_intel_weekly_budget_reserve(jsonb), public.offer_intel_weekly_budget_usage(jsonb),
  public.offer_intel_weekly_run(jsonb), public.offer_intel_weekly_save_products(jsonb), public.offer_intel_weekly_save_product(jsonb),
  public.offer_intel_weekly_save_ads(jsonb), public.offer_intel_weekly_save_ad(jsonb) to service_role;
commit;
