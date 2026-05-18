-- StrokeMath — Supabase schema
-- Run in the Supabase SQL editor (or `supabase db push`).
--
-- The app is offline-first: this table is an optional cloud mirror of the
-- finished sessions that otherwise live in the browser's localStorage.

create table if not exists public.sessions (
  id                    text primary key,
  played_at             timestamptz not null default now(),
  player                text not null default 'pierrick',
  benchmark             text not null,
  holes_played          integer not null default 0,
  shots_played          integer not null default 0,
  total_strokes_gained  numeric not null default 0,
  sectors               jsonb   not null default '{}'::jsonb,
  perf_hc               numeric not null default 0,
  created_at            timestamptz not null default now()
);

create index if not exists sessions_played_at_idx
  on public.sessions (played_at desc);

-- Row Level Security. The shipped client uses the anon key only, so we open
-- read/write to anon for the single-player POC. Tighten this (add a user_id
-- column + auth.uid() policies) when multi-user accounts land.
alter table public.sessions enable row level security;

drop policy if exists "anon read sessions"  on public.sessions;
drop policy if exists "anon write sessions" on public.sessions;

create policy "anon read sessions"
  on public.sessions for select
  to anon using (true);

create policy "anon write sessions"
  on public.sessions for all
  to anon using (true) with check (true);
