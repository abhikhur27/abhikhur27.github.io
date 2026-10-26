-- Private application data. No browser role can read or write these tables.
create schema portfolio_private;
revoke all on schema portfolio_private from public, anon, authenticated;
grant usage on schema portfolio_private to service_role;

create table portfolio_private.visitor_marks (
  visitor_hash text primary key check (visitor_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

create table portfolio_private.visitor_counter (
  singleton boolean primary key default true check (singleton),
  total bigint not null default 0 check (total >= 0),
  day date not null default current_date,
  day_total integer not null default 0 check (day_total >= 0)
);
insert into portfolio_private.visitor_counter (singleton) values (true);

create table portfolio_private.visitor_rate_windows (
  network_hash text not null check (network_hash ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  attempts integer not null default 1 check (attempts > 0),
  primary key (network_hash, window_start)
);
create index visitor_rate_windows_expiry_idx
  on portfolio_private.visitor_rate_windows (window_start);

alter table portfolio_private.visitor_marks enable row level security;
alter table portfolio_private.visitor_counter enable row level security;
alter table portfolio_private.visitor_rate_windows enable row level security;
revoke all on all tables in schema portfolio_private from public, anon, authenticated;
grant select, insert, update, delete on all tables in schema portfolio_private to service_role;

create function public.portfolio_mark_count()
returns jsonb
language sql
security invoker
stable
set search_path = ''
as $$
  select jsonb_build_object('count', total)
  from portfolio_private.visitor_counter where singleton = true;
$$;

create function public.portfolio_record_mark(p_visitor_hash text, p_network_hash text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_total bigint;
  v_day date;
  v_day_total integer;
  v_attempts integer;
  v_window timestamptz := date_trunc('hour', now());
begin
  if p_visitor_hash is null or p_visitor_hash !~ '^[0-9a-f]{64}$'
     or p_network_hash is null or p_network_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid mark digest' using errcode = '22023';
  end if;

  -- One small transaction serializes deduplication, throttles, and increment.
  -- This low-volume guestbook deliberately favors correctness over throughput.
  perform pg_advisory_xact_lock(1756507079, 1);
  delete from portfolio_private.visitor_rate_windows
  where (network_hash, window_start) in (
    select network_hash, window_start
    from portfolio_private.visitor_rate_windows
    where window_start < now() - interval '2 days'
    order by window_start limit 256
  );

  select total, day, day_total into v_total, v_day, v_day_total
  from portfolio_private.visitor_counter where singleton = true for update;
  if exists (select 1 from portfolio_private.visitor_marks where visitor_hash = p_visitor_hash) then
    return jsonb_build_object('count', v_total, 'marked', true, 'alreadyMarked', true);
  end if;
  if v_day <> current_date then v_day_total := 0; end if;

  -- Hard daily/all-time ceilings bound runaway writes on the free project.
  if v_day_total >= 1000 or v_total >= 1000000 then
    return jsonb_build_object('error', 'capacity', 'retryAfter', 3600);
  end if;
  select attempts into v_attempts from portfolio_private.visitor_rate_windows
    where network_hash = p_network_hash and window_start = v_window;
  if coalesce(v_attempts, 0) >= 30 then
    return jsonb_build_object('error', 'rate_limit', 'retryAfter', 3600);
  end if;
  -- Keep the rate-limit table bounded even if many forged networks arrive.
  if v_attempts is null and (select count(*) from portfolio_private.visitor_rate_windows) >= 10000 then
    return jsonb_build_object('error', 'rate_limit', 'retryAfter', 3600);
  end if;
  insert into portfolio_private.visitor_rate_windows (network_hash, window_start)
    values (p_network_hash, v_window)
    on conflict (network_hash, window_start) do update
      set attempts = portfolio_private.visitor_rate_windows.attempts + 1;
  insert into portfolio_private.visitor_marks (visitor_hash) values (p_visitor_hash);
  update portfolio_private.visitor_counter
    set total = total + 1, day = current_date, day_total = v_day_total + 1
    where singleton = true returning total into v_total;
  return jsonb_build_object('count', v_total, 'marked', true, 'alreadyMarked', false);
end;
$$;

revoke all on function public.portfolio_mark_count() from public, anon, authenticated;
revoke all on function public.portfolio_record_mark(text, text) from public, anon, authenticated;
grant execute on function public.portfolio_mark_count() to service_role;
grant execute on function public.portfolio_record_mark(text, text) to service_role;
