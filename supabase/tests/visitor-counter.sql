-- Run against the dedicated portfolio project. Every synthetic change rolls back.
begin;
set local role service_role;
do $$
declare
  before_count bigint;
  result jsonb;
  first_hash text := repeat('a', 64);
  network_hash text := repeat('b', 64);
  i integer;
begin
  before_count := (public.portfolio_mark_count()->>'count')::bigint;
  result := public.portfolio_record_mark(first_hash, network_hash);
  assert (result->>'count')::bigint = before_count + 1, 'first mark increments';
  assert result->>'marked' = 'true' and result->>'alreadyMarked' = 'false';
  result := public.portfolio_record_mark(first_hash, network_hash);
  assert (result->>'count')::bigint = before_count + 1, 'duplicate does not increment';
  assert result->>'alreadyMarked' = 'true';
  for i in 2..30 loop
    result := public.portfolio_record_mark(lpad(to_hex(i), 64, '0'), network_hash);
    assert result->>'marked' = 'true', 'first thirty new marks allowed';
  end loop;
  result := public.portfolio_record_mark(repeat('c', 64), network_hash);
  assert result->>'error' = 'rate_limit', 'thirty-first new mark throttled';
  assert (public.portfolio_mark_count()->>'count')::bigint = before_count + 30;
  result := public.portfolio_record_mark(first_hash, network_hash);
  assert result->>'alreadyMarked' = 'true', 'idempotent retry survives quota';

  insert into portfolio_private.visitor_rate_windows values (repeat('d',64), now()-interval '3 days', 1);
  perform public.portfolio_record_mark(first_hash, network_hash);
  assert not exists (select 1 from portfolio_private.visitor_rate_windows r where r.network_hash=repeat('d',64)), 'expired network digest cleaned';

  update portfolio_private.visitor_counter set day=current_date, day_total=1000;
  result := public.portfolio_record_mark(repeat('e',64), repeat('f',64));
  assert result->>'error' = 'capacity', 'daily quota enforced';
  assert (public.portfolio_mark_count()->>'count')::bigint = before_count + 30;
  begin
    perform public.portfolio_record_mark('not-a-digest', network_hash);
    raise exception 'invalid hash unexpectedly accepted';
  exception when invalid_parameter_value then null;
  end;
end;
$$;
reset role;
do $$
begin
  assert not has_schema_privilege('anon','portfolio_private','USAGE');
  assert not has_schema_privilege('authenticated','portfolio_private','USAGE');
  assert not has_function_privilege('anon','public.portfolio_mark_count()','EXECUTE');
  assert not has_function_privilege('authenticated','public.portfolio_record_mark(text,text)','EXECUTE');
  assert (select count(*)=3 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='portfolio_private' and c.relkind='r' and c.relrowsecurity);
  assert not (select prosecdef from pg_proc where oid='public.portfolio_record_mark(text,text)'::regprocedure);
end;
$$;
rollback;
select 'All transaction, quota, cleanup, RLS, and privilege checks passed; synthetic marks rolled back' as result;
