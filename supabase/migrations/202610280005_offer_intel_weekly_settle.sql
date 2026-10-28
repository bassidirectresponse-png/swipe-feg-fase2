-- 007: Creative Review AI settlement. FILE ONLY; not applied. 202610280004 is already in production: do not edit it.
-- A reservation can only be LOWERED to the real usage after the call; the weekly ceiling check is unchanged.
begin;
create function public.offer_intel_weekly_budget_settle(p jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  v_date date := (p->>'review_date')::date;
  v_kind text := p->>'kind';
  v_usd numeric(10,4);
  b offer_intel_weekly_budget;
begin
  if extract(isodow from v_date)<>3 or v_kind not in ('apify','ai') or (p->>'reservation') !~ '^[a-zA-Z0-9._:-]{1,128}$'
    or jsonb_typeof(p->'usd') is distinct from 'number' then raise exception 'invalid_request'; end if;
  v_usd := ceil((p->>'usd')::numeric*10000)/10000;
  if v_usd<=0 then raise exception 'invalid_request'; end if;
  perform pg_advisory_xact_lock(7261030,(v_date-date '2000-01-01')*2+(case v_kind when 'ai' then 1 else 0 end));
  select * into b from offer_intel_weekly_budget where review_date=v_date and kind=v_kind and reservation=p->>'reservation' for update;
  if not found then raise exception 'not_found'; end if;
  update offer_intel_weekly_budget set usd=least(usd,v_usd)
    where review_date=v_date and kind=v_kind and reservation=b.reservation returning * into b;
  return jsonb_build_object('reservation',b.reservation,'usd',b.usd);
end $$;
revoke execute on function public.offer_intel_weekly_budget_settle(jsonb) from public, anon, authenticated;
grant execute on function public.offer_intel_weekly_budget_settle(jsonb) to service_role;
commit;
