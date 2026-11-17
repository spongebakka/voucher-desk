-- Voucher Desk: shared log for the desk laptops.
-- Paste all of this into Supabase → SQL Editor → New query → Run. Safe to run twice.
-- One table holds every record (vouchers, end-of-shift checks, settings) as JSON,
-- so the app's saved data shape stays exactly the same as on the laptop.

create table if not exists public.records (
  kind       text   not null,              -- 'v' voucher, 'c' end-of-shift check, 's' settings
  id         text   not null,
  data       jsonb  not null,
  upd        bigint not null default 0,    -- when it was last edited on a laptop (ms)
  changed_at timestamptz not null default now(),  -- set by the database, used to fetch what's new
  primary key (kind, id)
);
create index if not exists records_changed_at on public.records (changed_at);

create or replace function public.records_touch() returns trigger
language plpgsql set search_path = '' as $$
begin new.changed_at := now(); return new; end $$;

drop trigger if exists records_touch on public.records;
create trigger records_touch before insert or update on public.records
for each row execute function public.records_touch();

-- Only someone signed in with the desk login can read or write. Nobody else, not even with the site's key.
alter table public.records enable row level security;
revoke all on public.records from anon;
grant select, insert, update on public.records to authenticated;

drop policy if exists "desk can read"   on public.records;
drop policy if exists "desk can add"    on public.records;
drop policy if exists "desk can change" on public.records;
create policy "desk can read"   on public.records for select to authenticated using (true);
create policy "desk can add"    on public.records for insert to authenticated with check (true);
create policy "desk can change" on public.records for update to authenticated using (true) with check (true);
