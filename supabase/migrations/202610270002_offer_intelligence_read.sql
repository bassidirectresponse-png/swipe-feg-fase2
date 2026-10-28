-- B3 read API; FILE ONLY. No legacy table mutations. All functions are invoker.
begin;
create index offer_intel_evidence_job_discovery on public.offer_intel_evidence(investigation_id,discovery_id);
create index offer_intel_evidence_job_relation on public.offer_intel_evidence(investigation_id,relation_id);
create function public.offer_intel_read(p jsonb) returns jsonb
language plpgsql set search_path=public,pg_temp as $$
declare
  resource text:=p->>'resource'; scope text:=p->>'scope'; job uuid:=(p->>'job_id')::uuid;
  entity uuid:=(p->>'id')::uuid; result jsonb; table_name text; scope_sql text;
  page_limit integer:=least(100,greatest(1,coalesce((p->>'limit')::integer,25)))+1;
begin
  if job is not null then
    select scope_key into scope from offer_intel_investigations where id=job;
    if not found then raise exception 'not_found'; end if;
  end if;
  if resource='summary' then
    if scope is null then raise exception 'invalid_request'; end if;
    select jsonb_build_object(
      'active_job',(select to_jsonb(j) from offer_intel_investigations j where scope_key=scope and status in ('queued','running') limit 1),
      'last_job',(select to_jsonb(j) from offer_intel_investigations j where scope_key=scope order by created_at desc,id desc limit 1),
      'latest_at',(select max(created_at) from offer_intel_investigations where scope_key=scope),
      'counts',jsonb_build_object(
        'new',count(*) filter(where status='new'),'review',count(*) filter(where status='review'),
        'confirmed',count(*) filter(where status='confirmed'),'ignored',count(*) filter(where status='ignored'),
        'relations_pending',(select count(*) from offer_intel_relations where scope_key=scope and status='pending'),
        'funnels',(select count(*) from offer_intel_funnels f join offer_intel_investigations j on j.id=f.investigation_id where j.scope_key=scope)))
      into result from offer_intel_discoveries where scope_key=scope;
    return result;
  elsif resource='evidence' then
    return (select to_jsonb(e) from offer_intel_evidence e where id=entity);
  elsif resource='funnel' then
    return (select to_jsonb(f)||jsonb_build_object(
      'steps',coalesce((select jsonb_agg(to_jsonb(s) order by observed_at,id) from offer_intel_funnel_steps s where funnel_id=f.id),'[]'),
      'edges',coalesce((select jsonb_agg(to_jsonb(e) order by id) from offer_intel_funnel_edges e where funnel_id=f.id),'[]'))
      from offer_intel_funnels f where id=entity);
  elsif resource='funnels' then
    if scope is null then raise exception 'invalid_request'; end if;
    select jsonb_build_object('items',coalesce(jsonb_agg(to_jsonb(t) order by created_at desc,id desc),'[]')) into result from (
      select f.*,s.original_url origin_url,s.final_url,
        (select count(*) from offer_intel_funnel_steps where funnel_id=f.id) steps_count
      from offer_intel_funnels f join offer_intel_investigations j on j.id=f.investigation_id
      left join offer_intel_funnel_steps s on s.id=f.start_step_id
      where j.scope_key=scope and (job is null or j.id=job)
        and (p->'cursor' is null or p->'cursor'='null'::jsonb or
          (f.created_at,f.id)<((p->'cursor'->>'created_at')::timestamptz,(p->'cursor'->>'id')::uuid))
      order by f.created_at desc,f.id desc limit page_limit
    ) t;
    return result;
  end if;
  if resource in ('discoveries','discovery') then table_name:='offer_intel_discoveries';
  elsif resource in ('relations','relation') then table_name:='offer_intel_relations';
  else raise exception 'invalid_request'; end if;
  -- Only these hard-coded identifiers enter dynamic SQL; all client values are bound.
  if entity is not null then
    execute format('select to_jsonb(t)||jsonb_build_object(''evidence'',coalesce((select jsonb_agg(e) from
      (select * from offer_intel_evidence where %I=t.id order by observed_at desc,id desc limit 20) e),''[]'')) from %I t where id=$1',
      case when resource='discovery' then 'discovery_id' else 'relation_id' end,table_name) into result using entity;
    return result;
  end if;
  if scope is null then raise exception 'invalid_request'; end if;
  scope_sql:=case when resource='discoveries' then
    'case when jsonb_typeof(t.data->''ads_count'')=''number'' and (t.data->>''ads_count'') ~ ''^[0-9]{1,15}$''
      then (t.data->>''ads_count'')::bigint else 0 end' else '0::bigint' end;
  execute format('
    with candidates as (
      select t.*,case when $1->>''sort''=''ads'' then %s else 0 end rank
      from %I t where t.scope_key=$2
      and ($3 is null or exists(select 1 from offer_intel_evidence e where e.%I=t.id and e.investigation_id=$3))
      and ($1->>''type'' is null or t.%I=$1->>''type'')
      and ($1->''status'' is null or $1->''status''=''null''::jsonb or t.status in (select jsonb_array_elements_text($1->''status'')))
      and ($1->>''q'' is null or strpos(lower(%s),lower($1->>''q''))>0)
    ), page as (
      select * from candidates where $1->''cursor'' is null or $1->''cursor''=''null''::jsonb or
        (rank,created_at,id)<(($1->''cursor''->>''rank'')::bigint,($1->''cursor''->>''created_at'')::timestamptz,($1->''cursor''->>''id'')::uuid)
      order by rank desc,created_at desc,id desc limit $4
    )
    select jsonb_build_object(''items'',coalesce(jsonb_agg(to_jsonb(t)||jsonb_build_object(''evidence'',
      coalesce((select jsonb_agg(e) from (select * from offer_intel_evidence where %I=t.id
        and ($3 is null or investigation_id=$3) order by observed_at desc,id desc limit 20) e),''[]''))
      order by rank desc,created_at desc,id desc),''[]'')) from page t',
    scope_sql,table_name,case when resource='discoveries' then 'discovery_id' else 'relation_id' end,
    case when resource='discoveries' then 'type' else 'relation_type' end,
    case when resource='discoveries' then 'concat_ws('' '',t.data->>''title'',t.data->>''page_name'',t.data->>''domain'',t.identity_key)' else 't.reason' end,
    case when resource='discoveries' then 'discovery_id' else 'relation_id' end)
    into result using p,scope,job,page_limit;
  return result;
end $$;
revoke execute on function public.offer_intel_read(jsonb) from public,anon,authenticated;
grant execute on function public.offer_intel_read(jsonb) to service_role;
commit;
