-- B3 worker persistence. FILE ONLY; never apply without authorization.
begin;
create function public.offer_intel_worker_state(p jsonb) returns jsonb
language plpgsql set search_path=public,pg_temp as $$
declare j offer_intel_investigations;
begin
  select * into j from offer_intel_investigations where id=(p->>'job_id')::uuid;
  if not found or j.status<>'running' or j.lease_token is distinct from (p->>'lease_token')::uuid
    or j.lease_until<=now() or j.cancel_requested_at is not null then raise exception 'conflict'; end if;
  return jsonb_build_object('counts',j.counts,
    'evidence',coalesce((select jsonb_agg(e) from offer_intel_evidence e where investigation_id=j.id),'[]'),
    'providers',coalesce((select jsonb_agg(r) from offer_intel_provider_runs r where investigation_id=j.id),'[]'));
end $$;

create function public.offer_intel_persist(p jsonb) returns jsonb
language plpgsql set search_path=public,pg_temp as $$
declare j offer_intel_investigations; b jsonb:=p->'batch'; r jsonb; counts jsonb;
begin
  select * into j from offer_intel_investigations where id=(p->>'job_id')::uuid for update;
  if not found or j.status<>'running' or j.lease_token is distinct from (p->>'lease_token')::uuid
    or j.lease_until<=now() or j.cancel_requested_at is not null then raise exception 'conflict'; end if;
  for r in select value from jsonb_array_elements(coalesce(b->'discoveries','[]')) loop
    insert into offer_intel_discoveries(id,scope_key,type,identity_key,data,first_investigation_id,last_investigation_id,existing_offer_id)
      values((r->>'id')::uuid,j.scope_key,r->>'type',r->>'identity_key',r->'data',j.id,j.id,
        case when j.offer_ref_kind='offer' and coalesce(r->'data'->'existing_matches','[]') @>
          jsonb_build_array(jsonb_build_object('ref_kind','offer','ref_id',j.offer_id)) then j.offer_id end)
      on conflict(scope_key,type,identity_key) do update set
        data=offer_intel_discoveries.data||excluded.data,last_investigation_id=j.id,updated_at=now(),
        existing_offer_id=coalesce(offer_intel_discoveries.existing_offer_id,excluded.existing_offer_id);
    -- Preserve review status/version and existing_offer_id on every recollection.
  end loop;
  for r in select value from jsonb_array_elements(coalesce(b->'relations','[]')) loop
    insert into offer_intel_relations(id,scope_key,from_key,to_key,relation_type,reason)
      values((r->>'id')::uuid,j.scope_key,r->>'from_key',r->>'to_key',r->>'relation_type',r->>'reason')
      on conflict(scope_key,from_key,to_key,relation_type) do nothing;
  end loop;
  for r in select value from jsonb_array_elements(coalesce(b->'funnels','[]')) loop
    insert into offer_intel_funnels(id,investigation_id,entry_key,title)
      values((r->>'id')::uuid,j.id,r->>'entry_key',r->>'title')
      on conflict(investigation_id,entry_key) do update set title=coalesce(excluded.title,offer_intel_funnels.title);
  end loop;
  for r in select value from jsonb_array_elements(coalesce(b->'steps','[]')) loop
    if not exists(select 1 from offer_intel_funnels where id=(r->>'funnel_id')::uuid and investigation_id=j.id) then raise exception 'conflict'; end if;
    insert into offer_intel_funnel_steps(id,funnel_id,url_key,title,label,technologies,original_url,final_url,redirects,kind,verification,
      classification_basis,http_status,inaccessible_reason,screenshot_status,observed_at)
      values((r->>'id')::uuid,(r->>'funnel_id')::uuid,r->>'url_key',r->>'title',r->>'label',coalesce(r->'technologies','[]'),
      r->>'original_url',r->>'final_url',coalesce(r->'redirects','[]'),r->>'kind',r->>'verification',
      coalesce(r->'classification_basis','{}'),(r->>'http_status')::integer,r->>'inaccessible_reason','unavailable',(r->>'observed_at')::timestamptz)
      on conflict(funnel_id,url_key) do update set title=excluded.title,label=excluded.label,technologies=excluded.technologies,
      final_url=excluded.final_url,redirects=excluded.redirects,kind=excluded.kind,verification=excluded.verification,
      classification_basis=excluded.classification_basis,http_status=excluded.http_status,inaccessible_reason=excluded.inaccessible_reason,
      screenshot_status='unavailable',observed_at=excluded.observed_at
      where excluded.verification<>'inferred' or offer_intel_funnel_steps.verification='inferred';
  end loop;
  for r in select value from jsonb_array_elements(coalesce(b->'funnels','[]')) loop
    update offer_intel_funnels set start_step_id=coalesce((r->>'start_step_id')::uuid,start_step_id)
      where id=(r->>'id')::uuid and investigation_id=j.id;
  end loop;
  for r in select value from jsonb_array_elements(coalesce(b->'edges','[]')) loop
    if not exists(select 1 from offer_intel_funnels where id=(r->>'funnel_id')::uuid and investigation_id=j.id) then raise exception 'conflict'; end if;
    insert into offer_intel_funnel_edges(id,funnel_id,from_step_id,to_step_id,kind,verification)
      values((r->>'id')::uuid,(r->>'funnel_id')::uuid,(r->>'from_step_id')::uuid,(r->>'to_step_id')::uuid,r->>'kind',r->>'verification')
      on conflict(funnel_id,from_step_id,to_step_id,kind) do nothing;
  end loop;
  for r in select value from jsonb_array_elements(coalesce(b->'evidence','[]')) loop
    if r->>'discovery_id' is not null and not exists(select 1 from offer_intel_discoveries where id=(r->>'discovery_id')::uuid and scope_key=j.scope_key) then raise exception 'conflict'; end if;
    if r->>'relation_id' is not null and not exists(select 1 from offer_intel_relations where id=(r->>'relation_id')::uuid and scope_key=j.scope_key) then raise exception 'conflict'; end if;
    if r->>'step_id' is not null and not exists(select 1 from offer_intel_funnel_steps s join offer_intel_funnels f on f.id=s.funnel_id where s.id=(r->>'step_id')::uuid and f.investigation_id=j.id) then raise exception 'conflict'; end if;
    insert into offer_intel_evidence(id,investigation_id,discovery_id,relation_id,step_id,edge_id,evidence_key,source,source_url,provider_run_id,
      verification,observed_at,content_hash,payload)
      values((r->>'id')::uuid,j.id,(r->>'discovery_id')::uuid,(r->>'relation_id')::uuid,(r->>'step_id')::uuid,(r->>'edge_id')::uuid,
      r->>'evidence_key',r->>'source',r->>'source_url',r->>'provider_run_id',r->>'verification',(r->>'observed_at')::timestamptz,
      r->>'content_hash',coalesce(r->'payload','{}'))
      on conflict(investigation_id,evidence_key) do update set payload=excluded.payload,verification=excluded.verification,
        content_hash=excluded.content_hash,observed_at=excluded.observed_at;
  end loop;
  select jsonb_build_object(
    'discoveries',(select count(distinct discovery_id) from offer_intel_evidence where investigation_id=j.id),
    'relations',(select count(distinct relation_id) from offer_intel_evidence where investigation_id=j.id),
    'funnels',(select count(*) from offer_intel_funnels where investigation_id=j.id),
    'steps',(select count(*) from offer_intel_funnel_steps s join offer_intel_funnels f on f.id=s.funnel_id where f.investigation_id=j.id))
    into counts;
  update offer_intel_investigations set counts=offer_intel_persist.counts,lease_until=now()+interval '2 minutes',updated_at=now() where id=j.id;
  return counts;
end $$;

create function public.offer_intel_provider(p jsonb) returns jsonb
language plpgsql set search_path=public,pg_temp as $$
declare j offer_intel_investigations; r offer_intel_provider_runs; patch jsonb:=p->'patch';
begin
  select * into j from offer_intel_investigations where id=(p->>'job_id')::uuid for update;
  if not found or j.status<>'running' or j.lease_token is distinct from (p->>'lease_token')::uuid
    or j.lease_until<=now() or j.cancel_requested_at is not null then raise exception 'conflict'; end if;
  insert into offer_intel_provider_runs(investigation_id,query_key,request)
    values(j.id,p->>'query_key',coalesce(p->'request','{}'))
    on conflict(investigation_id,provider,query_key) do nothing;
  select * into r from offer_intel_provider_runs where investigation_id=j.id and provider='apify' and query_key=p->>'query_key' for update;
  if patch is not null then
    if p->>'expected_state' is distinct from r.state then raise exception 'conflict'; end if;
    update offer_intel_provider_runs set state=coalesce(patch->>'state',state),provider_run_id=coalesce(patch->>'provider_run_id',provider_run_id),
      dataset_id=coalesce(patch->>'dataset_id',dataset_id),usage=coalesce(patch->'usage',usage),updated_at=now()
      where id=r.id returning * into r;
  end if;
  update offer_intel_investigations set lease_until=now()+interval '2 minutes',updated_at=now() where id=j.id;
  return to_jsonb(r);
end $$;
revoke execute on function public.offer_intel_worker_state(jsonb) from public,anon,authenticated;
revoke execute on function public.offer_intel_persist(jsonb) from public,anon,authenticated;
revoke execute on function public.offer_intel_provider(jsonb) from public,anon,authenticated;
grant execute on function public.offer_intel_worker_state(jsonb) to service_role;
grant execute on function public.offer_intel_persist(jsonb) to service_role;
grant execute on function public.offer_intel_provider(jsonb) to service_role;
commit;
