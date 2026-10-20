-- Couch of Power: one row per room. The whole authoritative state (including secret slips
-- and player tokens) lives in `state`. Only the server (service role) may touch this table.
create table if not exists public.rooms (
  code        text primary key check (code ~ '^[A-HJ-NP-Z2-9]{5}$'),
  state       jsonb not null,
  version     integer not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- RLS on and deliberately NO policies: the anon/publishable key can neither read nor write.
alter table public.rooms enable row level security;
revoke all on public.rooms from anon, authenticated;

create index if not exists rooms_updated_at_idx on public.rooms (updated_at);

-- Housekeeping: drop rooms idle for more than 2 days (run manually or via pg_cron).
create or replace function public.cleanup_rooms() returns void
language sql security definer set search_path = public as $$
  delete from public.rooms where updated_at < now() - interval '2 days';
$$;
revoke all on function public.cleanup_rooms() from anon, authenticated, public;
