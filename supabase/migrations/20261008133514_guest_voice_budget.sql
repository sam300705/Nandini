-- Public teddy budget is enforced server-side; no client can query this usage table.
create table if not exists public.guest_voice_usage (
  used_on date not null,
  ip_hash text not null check (length(ip_hash) = 64),
  turn_count integer not null default 1 check (turn_count between 0 and 4),
  last_turn timestamptz not null default now(),
  primary key(used_on, ip_hash)
);
alter table public.guest_voice_usage enable row level security;
revoke all on public.guest_voice_usage from anon, authenticated;
create or replace function public.reserve_guest_voice_turn(p_hash text)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare today date := (now() at time zone 'utc')::date; spent bigint; accepted text;
begin
  if p_hash is null or length(p_hash) <> 64 or p_hash !~ '^[0-9a-f]{64}$' then return false; end if;
  perform pg_advisory_xact_lock(hashtext('nandini_guest_voice_' || today::text));
  select coalesce(sum(turn_count), 0) into spent from public.guest_voice_usage where used_on = today;
  if spent >= 24 then return false; end if;
  insert into public.guest_voice_usage(used_on, ip_hash, turn_count, last_turn)
    values (today, p_hash, 1, now())
  on conflict(used_on, ip_hash) do update
    set turn_count = guest_voice_usage.turn_count + 1, last_turn = now()
    where guest_voice_usage.turn_count < 4
      and guest_voice_usage.last_turn <= now() - interval '30 seconds'
  returning ip_hash into accepted;
  return accepted is not null;
end $$;
revoke all on function public.reserve_guest_voice_turn(text) from public, anon, authenticated;
grant execute on function public.reserve_guest_voice_turn(text) to service_role;