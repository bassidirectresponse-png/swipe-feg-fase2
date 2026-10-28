-- Domain recon v2. FILE ONLY. Existing tables/functions stay unchanged.
begin;
create table public.offer_intel_domain_scans (
 id uuid primary key default gen_random_uuid(),
 investigation_id uuid not null references public.offer_intel_investigations(id) on delete cascade,
 scope_key text not null, host text not null check(length(host)<=253 and host ~ '^[a-z0-9.-]+$'), registrable text not null,
 status text not null check(status in ('running','succeeded','partial','failed')),
 sources jsonb not null default '[]' check(jsonb_typeof(sources)='array'),
 data jsonb not null default '{}' check(jsonb_typeof(data)='object'), created_at timestamptz not null default now(),unique(investigation_id,host)
);
create index offer_intel_domain_scans_scope_host on public.offer_intel_domain_scans(scope_key,host,created_at desc,id desc);
alter table public.offer_intel_domain_scans enable row level security;
create policy offer_intel_domain_scans_admin on public.offer_intel_domain_scans for select to authenticated using(public.swipe_is_admin());
revoke all on public.offer_intel_domain_scans from public,anon,authenticated;
grant select on public.offer_intel_domain_scans to authenticated;
grant select,insert,update,delete on public.offer_intel_domain_scans to service_role;
create function public.offer_intel_scan_persist(p jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_job offer_intel_investigations; v_scan jsonb:=p->'scan'; v_result offer_intel_domain_scans;
begin
 select * into v_job from offer_intel_investigations where id=(p->>'job_id')::uuid for update;
 if not found or v_job.status<>'running' or v_job.lease_token is distinct from (p->>'lease_token')::uuid
   or v_job.lease_until<=now() or v_job.cancel_requested_at is not null then raise exception 'conflict'; end if;
 if octet_length(v_scan::text)>2097152 then raise exception 'invalid_request'; end if;
 insert into offer_intel_domain_scans(id,investigation_id,scope_key,host,registrable,status,sources,data)
 values((v_scan->>'id')::uuid,v_job.id,v_job.scope_key,v_scan->>'host',v_scan->>'registrable',v_scan->>'status',v_scan->'sources',v_scan->'data')
 on conflict(investigation_id,host) do update set status=excluded.status,sources=excluded.sources,data=excluded.data returning * into v_result;
 return to_jsonb(v_result);
end $$;
create function public.offer_intel_scan_read(p jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_scope text:=p->>'scope'; v_job uuid:=(p->>'job_id')::uuid; v_result jsonb;
begin
 if p->>'id' is not null then
   select to_jsonb(s) into v_result from offer_intel_domain_scans s where s.id=(p->>'id')::uuid; return v_result;
 end if;
 if v_job is not null then
   select scope_key into v_scope from offer_intel_investigations where id=v_job;
   if not found then raise exception 'not_found'; end if;
 end if;
 if v_scope is null then raise exception 'invalid_request'; end if;
 select jsonb_build_object('items',coalesce(jsonb_agg(to_jsonb(latest) order by latest.host),'[]'::jsonb)) into v_result
 from (select distinct on(s.host) s.* from offer_intel_domain_scans s where s.scope_key=v_scope and (v_job is null or s.investigation_id=v_job)
 order by s.host,s.created_at desc,s.id desc limit 400) latest;
 return v_result;
end $$;
revoke all on function public.offer_intel_scan_persist(jsonb),public.offer_intel_scan_read(jsonb) from public,anon,authenticated;
grant execute on function public.offer_intel_scan_persist(jsonb),public.offer_intel_scan_read(jsonb) to service_role;
commit;
