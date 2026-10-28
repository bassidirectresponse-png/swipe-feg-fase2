-- Offer Intelligence v1.1. FILE ONLY: do not apply without authorization.
begin;
create table public.offer_intel_investigations (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid,
  offer_ref_kind text check (offer_ref_kind in ('offer','admin_draft')),
  persisted_offer_id uuid generated always as
    (case when offer_ref_kind='offer' then offer_id end) stored
    references public.offers(id) on delete restrict,
  seed_url text,
  seed_key text,
  scope_key text generated always as
    (coalesce(offer_ref_kind || ':' || offer_id::text, 'url:' || seed_key)) stored,
  created_by uuid not null,
  idempotency_key text not null,
  request_hash text not null,
  seed_snapshot jsonb not null,
  status text not null default 'queued'
    check (status in ('queued','running','partial','succeeded','failed','cancelled')),
  phase text not null default 'validation',
  progress integer not null default 0 check (progress between 0 and 100),
  limits jsonb not null,
  options jsonb not null default '{}',
  progress_detail jsonb not null default '{"done":0,"total":0}',
  counts jsonb not null default '{"discoveries":0,"relations":0,"funnels":0,"steps":0}',
  started_at timestamptz,
  sources jsonb not null default '[]',
  error jsonb,
  attempt integer not null default 0 check (attempt >= 0),
  next_retry_at timestamptz,
  lease_token uuid,
  lease_until timestamptz,
  cancel_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (created_by,idempotency_key),
  check (
    (offer_id is not null and offer_ref_kind is not null
      and ((seed_url is null and seed_key is null) or (seed_url is not null and seed_key ~ '^[a-f0-9]{64}
    or
    (offer_id is null and offer_ref_kind is null and seed_url is not null
      and seed_key is not null and seed_key ~ '^[a-f0-9]{64}$')
  )
);
create unique index offer_intel_one_active_scope
  on public.offer_intel_investigations(scope_key)
  where status in ('queued','running');
create index offer_intel_history
  on public.offer_intel_investigations(scope_key,created_at desc,id desc);

create table public.offer_intel_discoveries (
  id uuid primary key default gen_random_uuid(),
  scope_key text not null,
  type text not null check (type in ('ad','page','domain')),
  identity_key text not null,
  data jsonb not null,
  status text not null default 'new'
    check (status in ('new','confirmed','ignored','review')),
  existing_offer_id uuid references public.offers(id) on delete set null,
  first_investigation_id uuid not null references public.offer_intel_investigations(id),
  last_investigation_id uuid not null references public.offer_intel_investigations(id),
  version integer not null default 1 check (version > 0),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scope_key,type,identity_key)
);

create table public.offer_intel_relations (
  id uuid primary key default gen_random_uuid(),
  scope_key text not null,
  from_key text not null,
  to_key text not null,
  relation_type text not null check (relation_type in ('same_page','same_domain','same_destination_url','similar_creative','redirect')),
  status text not null default 'pending'
    check (status in ('pending','confirmed','ignored')),
  reason text,
  version integer not null default 1 check (version > 0),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(scope_key,from_key,to_key,relation_type)
);

create table public.offer_intel_funnels (
  id uuid primary key default gen_random_uuid(),
  investigation_id uuid not null references public.offer_intel_investigations(id),
  entry_key text not null,
  title text,
  start_step_id uuid,
  created_at timestamptz not null default now(),
  unique(investigation_id,entry_key)
);
create table public.offer_intel_funnel_steps (
  id uuid primary key default gen_random_uuid(),
  funnel_id uuid not null references public.offer_intel_funnels(id),
  url_key text not null,
  title text,
  label text,
  technologies jsonb not null default '[]',
  original_url text not null,
  final_url text,
  redirects jsonb not null default '[]',
  kind text not null check
    (kind in ('landing','presell','quiz','vsl','sales','checkout','upsell','unknown')),
  verification text not null check
    (verification in ('verified','inferred','inaccessible')),
  classification_basis jsonb not null default '{}',
  http_status integer,
  inaccessible_reason text,
  screenshot_path text,
  screenshot_status text not null default 'not_requested'
    check (screenshot_status in ('not_requested','pending','captured','unavailable','failed')),
  observed_at timestamptz not null,
  unique(funnel_id,url_key),
  unique(funnel_id,id)
);
alter table public.offer_intel_funnels add constraint offer_intel_start_step_fk
  foreign key(id,start_step_id) references public.offer_intel_funnel_steps(funnel_id,id);
create table public.offer_intel_funnel_edges (
  id uuid primary key default gen_random_uuid(),
  funnel_id uuid not null references public.offer_intel_funnels(id),
  from_step_id uuid not null,
  to_step_id uuid not null,
  kind text not null check (kind in ('redirect','link','inferred')),
  verification text not null check
    (verification in ('verified','inferred','inaccessible')),
  foreign key(funnel_id,from_step_id)
    references public.offer_intel_funnel_steps(funnel_id,id),
  foreign key(funnel_id,to_step_id)
    references public.offer_intel_funnel_steps(funnel_id,id),
  unique(funnel_id,from_step_id,to_step_id,kind)
);
create table public.offer_intel_evidence (
  id uuid primary key default gen_random_uuid(),
  investigation_id uuid not null references public.offer_intel_investigations(id),
  discovery_id uuid references public.offer_intel_discoveries(id),
  relation_id uuid references public.offer_intel_relations(id),
  step_id uuid references public.offer_intel_funnel_steps(id),
  edge_id uuid references public.offer_intel_funnel_edges(id),
  evidence_key text not null,
  source text not null,
  source_url text,
  provider_run_id text,
  verification text not null check
    (verification in ('verified','inferred','inaccessible')),
  observed_at timestamptz not null,
  content_hash text,
  payload jsonb not null,
  unique(investigation_id,evidence_key)
);
create index offer_intel_evidence_discovery
  on public.offer_intel_evidence(discovery_id,observed_at desc);

create table public.offer_intel_review_events (
  id uuid primary key default gen_random_uuid(),
  discovery_id uuid references public.offer_intel_discoveries(id),
  relation_id uuid references public.offer_intel_relations(id),
  from_status text not null,
  to_status text not null,
  actor_id uuid not null,
  action_key text not null,
  reason text,
  created_at timestamptz not null default now(),
  unique(actor_id,action_key),
  check (num_nonnulls(discovery_id,relation_id)=1)
);
create table public.offer_intel_provider_runs (
  id uuid primary key default gen_random_uuid(),
  investigation_id uuid not null references public.offer_intel_investigations(id),
  query_key text not null,
  provider text not null default 'apify',
  provider_run_id text,
  dataset_id text,
  state text not null default 'reserved'
    check (state in ('reserved','starting','running','succeeded','failed','unknown','cancelled')),
  request jsonb not null,
  usage jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(investigation_id,provider,query_key),
  unique(provider,provider_run_id)
);

do $$
declare t text;
begin
  foreach t in array array[
    'offer_intel_investigations','offer_intel_discoveries',
    'offer_intel_relations','offer_intel_funnels',
    'offer_intel_funnel_steps','offer_intel_funnel_edges',
    'offer_intel_evidence','offer_intel_review_events','offer_intel_provider_runs'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public, anon, authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('grant all on public.%I to service_role',t);
    execute format(
      'create policy offer_intel_select_admin on public.%I for select to authenticated using (public.swipe_is_admin())',t
    );
  end loop;
end $$;
)))
    or
    (offer_id is null and offer_ref_kind is null and seed_url is not null
      and seed_key is not null and seed_key ~ '^[a-f0-9]{64}$')
  )
);
create unique index offer_intel_one_active_scope
  on public.offer_intel_investigations(scope_key)
  where status in ('queued','running');
create index offer_intel_history
  on public.offer_intel_investigations(scope_key,created_at desc,id desc);

create table public.offer_intel_discoveries (
  id uuid primary key default gen_random_uuid(),
  scope_key text not null,
  type text not null check (type in ('ad','page','domain')),
  identity_key text not null,
  data jsonb not null,
  status text not null default 'new'
    check (status in ('new','confirmed','ignored','review')),
  existing_offer_id uuid references public.offers(id) on delete set null,
  first_investigation_id uuid not null references public.offer_intel_investigations(id),
  last_investigation_id uuid not null references public.offer_intel_investigations(id),
  version integer not null default 1 check (version > 0),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scope_key,type,identity_key)
);

create table public.offer_intel_relations (
  id uuid primary key default gen_random_uuid(),
  scope_key text not null,
  from_key text not null,
  to_key text not null,
  relation_type text not null,
  status text not null default 'pending'
    check (status in ('pending','confirmed','ignored')),
  reason text,
  version integer not null default 1 check (version > 0),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(scope_key,from_key,to_key,relation_type)
);

create table public.offer_intel_funnels (
  id uuid primary key default gen_random_uuid(),
  investigation_id uuid not null references public.offer_intel_investigations(id),
  entry_key text not null,
  title text,
  created_at timestamptz not null default now(),
  unique(investigation_id,entry_key)
);
create table public.offer_intel_funnel_steps (
  id uuid primary key default gen_random_uuid(),
  funnel_id uuid not null references public.offer_intel_funnels(id),
  url_key text not null,
  original_url text not null,
  final_url text,
  redirects jsonb not null default '[]',
  kind text not null check
    (kind in ('landing','presell','quiz','vsl','sales','checkout','unknown')),
  verification text not null check
    (verification in ('verified','inferred','inaccessible')),
  classification_basis jsonb not null default '{}',
  http_status integer,
  inaccessible_reason text,
  screenshot_path text,
  screenshot_status text not null default 'not_requested'
    check (screenshot_status in ('not_requested','pending','captured','unavailable','failed')),
  observed_at timestamptz not null,
  unique(funnel_id,url_key),
  unique(funnel_id,id)
);
create table public.offer_intel_funnel_edges (
  id uuid primary key default gen_random_uuid(),
  funnel_id uuid not null references public.offer_intel_funnels(id),
  from_step_id uuid not null,
  to_step_id uuid not null,
  kind text not null check (kind in ('redirect','link','inferred')),
  verification text not null check
    (verification in ('verified','inferred','inaccessible')),
  foreign key(funnel_id,from_step_id)
    references public.offer_intel_funnel_steps(funnel_id,id),
  foreign key(funnel_id,to_step_id)
    references public.offer_intel_funnel_steps(funnel_id,id),
  unique(funnel_id,from_step_id,to_step_id,kind)
);
create table public.offer_intel_evidence (
  id uuid primary key default gen_random_uuid(),
  investigation_id uuid not null references public.offer_intel_investigations(id),
  discovery_id uuid references public.offer_intel_discoveries(id),
  relation_id uuid references public.offer_intel_relations(id),
  step_id uuid references public.offer_intel_funnel_steps(id),
  edge_id uuid references public.offer_intel_funnel_edges(id),
  evidence_key text not null,
  source text not null,
  source_url text,
  provider_run_id text,
  verification text not null check
    (verification in ('verified','inferred','inaccessible')),
  observed_at timestamptz not null,
  content_hash text,
  payload jsonb not null,
  unique(investigation_id,evidence_key)
);
create index offer_intel_evidence_discovery
  on public.offer_intel_evidence(discovery_id,observed_at desc);

create table public.offer_intel_review_events (
  id uuid primary key default gen_random_uuid(),
  discovery_id uuid references public.offer_intel_discoveries(id),
  relation_id uuid references public.offer_intel_relations(id),
  from_status text not null,
  to_status text not null,
  actor_id uuid not null,
  action_key text not null,
  reason text,
  created_at timestamptz not null default now(),
  unique(actor_id,action_key),
  check (num_nonnulls(discovery_id,relation_id)=1)
);
create table public.offer_intel_provider_runs (
  id uuid primary key default gen_random_uuid(),
  investigation_id uuid not null references public.offer_intel_investigations(id),
  query_key text not null,
  provider text not null default 'apify',
  provider_run_id text,
  dataset_id text,
  state text not null default 'reserved'
    check (state in ('reserved','starting','running','succeeded','failed','unknown','cancelled')),
  request jsonb not null,
  usage jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(investigation_id,provider,query_key),
  unique(provider,provider_run_id)
);

do $$
declare t text;
begin
  foreach t in array array[
    'offer_intel_investigations','offer_intel_discoveries',
    'offer_intel_relations','offer_intel_funnels',
    'offer_intel_funnel_steps','offer_intel_funnel_edges',
    'offer_intel_evidence','offer_intel_review_events','offer_intel_provider_runs'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public, anon, authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('grant all on public.%I to service_role',t);
    execute format(
      'create policy offer_intel_select_admin on public.%I for select to authenticated using (public.swipe_is_admin())',t
    );
  end loop;
end $$;


-- Internal ledgers: no browser access, even for an authenticated admin.
create table public.offer_intel_requests (
  actor_id uuid not null,
  key text not null,
  request_hash text not null,
  kind text not null,
  job_id uuid references public.offer_intel_investigations(id),
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key(actor_id,key)
);
create table public.offer_intel_dispatches (
  nonce uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.offer_intel_investigations(id),
  expires_at timestamptz not null default now()+interval '5 minutes',
  used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.offer_intel_requests enable row level security;
alter table public.offer_intel_dispatches enable row level security;
revoke all on public.offer_intel_requests, public.offer_intel_dispatches from public, anon, authenticated;
grant all on public.offer_intel_requests, public.offer_intel_dispatches to service_role;

-- Short transaction mutex covers idempotency, scope reuse and admission quotas.
-- All functions are SECURITY INVOKER: only service_role has underlying writes.
create function public.offer_intel_create(p jsonb) returns jsonb
language plpgsql set search_path = public, pg_temp as $$
declare
  r offer_intel_requests;
  j offer_intel_investigations;
  actor uuid := (p->>'actor_id')::uuid;
  nonce_value uuid;
  reused boolean := false;
  scope text := coalesce((p->>'offer_ref_kind')||':'||(p->>'offer_id'), 'url:'||(p->>'seed_key'));
  last_time timestamptz;
begin
  perform pg_advisory_xact_lock(7261027001);
  select * into r from offer_intel_requests where actor_id=actor and key=p->>'idempotency_key';
  if found then
    if r.request_hash<>p->>'request_hash' or r.kind<>'create' then raise exception 'conflict'; end if;
    select * into j from offer_intel_investigations where id=r.job_id;
    return jsonb_build_object('job',to_jsonb(j),'reused',true,'nonce',r.result->'nonce');
  end if;
  select * into j from offer_intel_investigations where scope_key=scope and status in ('queued','running');
  if found then
    reused := true;
    select nonce into nonce_value from offer_intel_dispatches
      where job_id=j.id and used_at is null and expires_at>now() order by created_at desc limit 1;
  else
    select max(created_at) into last_time from offer_intel_investigations where scope_key=scope;
    if last_time>now()-interval '6 hours' then
      raise exception 'cooldown' using detail=ceil(extract(epoch from last_time+interval '6 hours'-now()))::text;
    end if;
    if (select count(*) from offer_intel_investigations where created_by=actor and created_at>now()-interval '1 hour')>=15 then
      raise exception 'rate_limited' using detail='3600';
    end if;
    insert into offer_intel_investigations (
      offer_id,offer_ref_kind,seed_url,seed_key,created_by,idempotency_key,request_hash,seed_snapshot,limits,options,sources
    ) values (
      (p->>'offer_id')::uuid,p->>'offer_ref_kind',p->>'seed_url',p->>'seed_key',actor,
      p->>'idempotency_key',p->>'request_hash',p->'seed_snapshot',p->'limits',p->'options',p->'sources'
    ) returning * into j;
    insert into offer_intel_dispatches(job_id) values(j.id) returning nonce into nonce_value;
  end if;
  insert into offer_intel_requests(actor_id,key,request_hash,kind,job_id,result)
    values(actor,p->>'idempotency_key',p->>'request_hash','create',j.id,jsonb_build_object('nonce',nonce_value));
  return jsonb_build_object('job',to_jsonb(j),'reused',reused,'nonce',nonce_value);
end $$;

create function public.offer_intel_action(p jsonb) returns jsonb
language plpgsql set search_path = public, pg_temp as $$
declare
  r offer_intel_requests;
  j offer_intel_investigations;
  actor uuid := (p->>'actor_id')::uuid;
  nonce_value uuid;
  action text := p->>'action';
begin
  perform pg_advisory_xact_lock(7261027001);
  select * into r from offer_intel_requests where actor_id=actor and key=p->>'idempotency_key';
  if found then
    if r.request_hash<>p->>'request_hash' or r.kind<>action then raise exception 'conflict'; end if;
    select * into j from offer_intel_investigations where id=r.job_id;
    return jsonb_build_object('job',to_jsonb(j),'reused',true,'nonce',r.result->'nonce');
  end if;
  select * into j from offer_intel_investigations where id=(p->>'job_id')::uuid for update;
  if not found then raise exception 'not_found'; end if;
  if action='cancel' then
    if j.status in ('queued','running') then
      update offer_intel_investigations set status='cancelled',phase='done',
        cancel_requested_at=now(),finished_at=now(),updated_at=now(),lease_token=null,lease_until=null
        where id=j.id returning * into j;
    end if;
  elsif action='retry' then
    if j.status='running' and j.lease_until>now() then raise exception 'job_active'; end if;
    if j.status in ('succeeded','cancelled') or
      (j.status in ('failed','partial') and coalesce((j.error->>'retryable')::boolean,false)=false) then
      raise exception 'conflict';
    end if;
    if j.attempt>=3 then raise exception 'conflict'; end if;
    if j.next_retry_at>now() then
      raise exception 'rate_limited' using detail=ceil(extract(epoch from j.next_retry_at-now()))::text;
    end if;
    if exists(select 1 from offer_intel_investigations where scope_key=j.scope_key and id<>j.id and status in ('queued','running')) then raise exception 'job_active'; end if;
    update offer_intel_dispatches set used_at=now() where job_id=j.id and used_at is null;
    update offer_intel_investigations set status='queued',error=null,finished_at=null,
      lease_token=null,lease_until=null,updated_at=now() where id=j.id returning * into j;
    insert into offer_intel_dispatches(job_id) values(j.id) returning nonce into nonce_value;
  else raise exception 'invalid_request';
  end if;
  insert into offer_intel_requests(actor_id,key,request_hash,kind,job_id,result)
    values(actor,p->>'idempotency_key',p->>'request_hash',action,j.id,jsonb_build_object('nonce',nonce_value));
  return jsonb_build_object('job',to_jsonb(j),'nonce',nonce_value,'reused',false);
end $$;

create function public.offer_intel_claim(p jsonb) returns jsonb
language plpgsql set search_path = public, pg_temp as $$
declare j offer_intel_investigations; n offer_intel_dispatches;
begin
  select * into j from offer_intel_investigations where id=(p->>'job_id')::uuid for update;
  if not found or j.status not in ('queued','running') or j.cancel_requested_at is not null
    or j.next_retry_at>now() or j.lease_until>now() or j.attempt>=3 then return null; end if;
  select * into n from offer_intel_dispatches where nonce=(p->>'nonce')::uuid and job_id=j.id for update;
  if not found or n.used_at is not null or n.expires_at<=now() then return null; end if;
  update offer_intel_dispatches set used_at=now() where nonce=n.nonce;
  update offer_intel_investigations set status='running',lease_token=gen_random_uuid(),
    lease_until=now()+interval '2 minutes',attempt=attempt+1,updated_at=now(),
    started_at=coalesce(started_at,now()) where id=j.id returning * into j;
  return to_jsonb(j);
end $$;

create function public.offer_intel_checkpoint(p jsonb) returns jsonb
language plpgsql set search_path = public, pg_temp as $$
declare j offer_intel_investigations; patch jsonb := p->'patch'; next_status text;
begin
  select * into j from offer_intel_investigations where id=(p->>'job_id')::uuid for update;
  if not found or j.status<>'running' or j.lease_token is distinct from (p->>'lease_token')::uuid
    or j.lease_until<=now() or j.cancel_requested_at is not null then raise exception 'conflict'; end if;
  next_status := coalesce(patch->>'status','running');
  if next_status not in ('running','succeeded','partial','failed') then raise exception 'invalid_request'; end if;
  update offer_intel_investigations set status=next_status,
    phase=coalesce(patch->>'phase',phase),
    progress=coalesce((patch->>'progress')::integer,progress),
    progress_detail=coalesce(patch->'progress_detail',progress_detail),
    counts=coalesce(patch->'counts',counts),sources=coalesce(patch->'sources',sources),
    error=case when patch ? 'error' then patch->'error' else error end,
    updated_at=now(),
    finished_at=case when next_status<>'running' then now() else null end,
    lease_until=case when next_status='running' then now()+interval '2 minutes' else null end,
    lease_token=case when next_status='running' then lease_token else null end
    where id=j.id returning * into j;
  return to_jsonb(j);
end $$;

create function public.offer_intel_review(p jsonb) returns jsonb
language plpgsql set search_path = public, pg_temp as $$
declare
  r offer_intel_requests; row_data jsonb; updated jsonb;
  target_table text; actor uuid := (p->>'actor_id')::uuid;
  entity uuid := (p->>'id')::uuid; desired text := p->>'status';
begin
  perform pg_advisory_xact_lock(7261027001);
  select * into r from offer_intel_requests where actor_id=actor and key=p->>'idempotency_key';
  if found then
    if r.kind<>'review' or r.request_hash<>p->>'request_hash' then raise exception 'conflict'; end if;
    return r.result;
  end if;
  if p->>'entity_type'='discovery' and desired in ('new','confirmed','ignored','review') then
    target_table := 'offer_intel_discoveries';
  elsif p->>'entity_type'='relation' and desired in ('pending','confirmed','ignored') then
    target_table := 'offer_intel_relations';
  else raise exception 'invalid_request'; end if;
  execute format('select to_jsonb(t) from %I t where id=$1 for update',target_table) into row_data using entity;
  if row_data is null then raise exception 'not_found'; end if;
  if (row_data->>'version')::integer is distinct from (p->>'expected_version')::integer then raise exception 'conflict'; end if;
  execute format('update %I set status=$1,version=version+1,reviewed_by=$2,reviewed_at=now(),updated_at=now() where id=$3 returning to_jsonb(%I)',target_table,target_table)
    into updated using desired,actor,entity;
  insert into offer_intel_review_events(discovery_id,relation_id,from_status,to_status,actor_id,action_key,reason)
    values(case when target_table='offer_intel_discoveries' then entity end,
      case when target_table='offer_intel_relations' then entity end,
      row_data->>'status',desired,actor,p->>'idempotency_key',p->>'reason');
  insert into offer_intel_requests(actor_id,key,request_hash,kind,result)
    values(actor,p->>'idempotency_key',p->>'request_hash','review',updated);
  return updated;
end $$;

revoke execute on function public.offer_intel_create(jsonb) from public, anon, authenticated;
revoke execute on function public.offer_intel_action(jsonb) from public, anon, authenticated;
revoke execute on function public.offer_intel_claim(jsonb) from public, anon, authenticated;
revoke execute on function public.offer_intel_checkpoint(jsonb) from public, anon, authenticated;
revoke execute on function public.offer_intel_review(jsonb) from public, anon, authenticated;
grant execute on function public.offer_intel_create(jsonb) to service_role;
grant execute on function public.offer_intel_action(jsonb) to service_role;
grant execute on function public.offer_intel_claim(jsonb) to service_role;
grant execute on function public.offer_intel_checkpoint(jsonb) to service_role;
grant execute on function public.offer_intel_review(jsonb) to service_role;

commit;
