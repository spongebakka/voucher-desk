-- Voucher Desk: shared log for the desk laptops.
-- Paste all of this into Supabase → SQL Editor → New query → Run. Safe to run again.
-- The last line prints this restaurant's SETUP LINK: open it once on each desk laptop.
-- Keep that link private (it's the key to the log). Never put it in the repo.

create schema if not exists private;   -- not reachable from the website directly

-- Every record (vouchers, end-of-shift checks, settings) is one row of JSON,
-- so the saved data shape is exactly the same as on the laptop.
create table if not exists private.records (
  kind       text   not null,              -- 'v' voucher, 'c' end-of-shift check, 's' settings
  id         text   not null,
  data       jsonb  not null,
  upd        bigint not null default 0,    -- when it was last edited on a laptop (ms)
  changed_at timestamptz not null default now(),  -- set by the database, used to fetch what's new
  primary key (kind, id)
);
create index if not exists records_changed_at on private.records (changed_at);

create or replace function private.records_touch() returns trigger
language plpgsql set search_path = '' as $$
begin new.changed_at := now(); return new; end $$;
drop trigger if exists records_touch on private.records;
create trigger records_touch before insert or update on private.records
for each row execute function private.records_touch();

-- The desk key: a long random code made once. Only laptops opened with the setup link have it.
create table if not exists private.desk_key (key text not null);
insert into private.desk_key (key)
select replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
where not exists (select 1 from private.desk_key);

-- The website can only call these two functions, and both refuse a wrong key.
create or replace function public.desk_pull(p_key text, p_since timestamptz default null, p_offset int default 0)
returns table (kind text, id text, data jsonb, upd bigint, changed_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from private.desk_key k where k.key = p_key) then
    raise exception 'wrong desk key' using errcode = '28000';
  end if;
  return query
    select r.kind, r.id, r.data, r.upd, r.changed_at from private.records r
    where p_since is null or r.changed_at > p_since
    order by r.changed_at, r.kind, r.id
    limit 500 offset greatest(p_offset, 0);
end $$;

create or replace function public.desk_push(p_key text, p_rows jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from private.desk_key k where k.key = p_key) then
    raise exception 'wrong desk key' using errcode = '28000';
  end if;
  insert into private.records (kind, id, data, upd)
  select x->>'kind', x->>'id', x->'data', coalesce((x->>'upd')::bigint, 0)
  from jsonb_array_elements(p_rows) x
  on conflict (kind, id) do update set data = excluded.data, upd = excluded.upd;
end $$;

revoke all on function public.desk_pull(text, timestamptz, int) from public;
revoke all on function public.desk_push(text, jsonb) from public;
grant execute on function public.desk_pull(text, timestamptz, int) to anon, authenticated;
grant execute on function public.desk_push(text, jsonb) to anon, authenticated;

-- Your setup link (copy it from the result below):
select 'https://voucher-desk.netlify.app/#join=' || key as setup_link from private.desk_key limit 1;
