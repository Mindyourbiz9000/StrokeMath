-- ShotIQ — Supabase schema (idempotent: safe to run repeatedly, and it
-- repairs tables created by earlier versions of this file).
--
-- The app is offline-first and playable as a guest with no account at all.
-- This table is the optional cloud mirror of finished rounds for signed-in
-- (Google OAuth) users, with per-user row isolation.

-- Fresh installs get the full table; existing tables are upgraded by the
-- ALTERs below (create-table-if-not-exists does NOT add missing columns).
create table if not exists public.sessions (
  id                    text primary key,
  user_id               uuid references auth.users (id) on delete cascade,
  played_at             timestamptz not null default now(),
  player                text not null default 'Player',
  benchmark             text not null default '{}',
  holes_played          integer not null default 0,
  shots_played          integer not null default 0,
  total_strokes_gained  numeric not null default 0,
  sectors               jsonb   not null default '{}'::jsonb,
  perf_hc               numeric not null default 0,
  deleted               boolean not null default false,
  created_at            timestamptz not null default now()
);

-- ── Repair migration for older tables (each step is a no-op if present) ─────
alter table public.sessions
  add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table public.sessions
  add column if not exists played_at timestamptz not null default now();
alter table public.sessions
  add column if not exists player text not null default 'Player';
alter table public.sessions
  add column if not exists benchmark text not null default '{}';
alter table public.sessions
  add column if not exists holes_played integer not null default 0;
alter table public.sessions
  add column if not exists shots_played integer not null default 0;
alter table public.sessions
  add column if not exists total_strokes_gained numeric not null default 0;
alter table public.sessions
  add column if not exists sectors jsonb not null default '{}'::jsonb;
alter table public.sessions
  add column if not exists perf_hc numeric not null default 0;
alter table public.sessions
  add column if not exists deleted boolean not null default false;
alter table public.sessions
  add column if not exists created_at timestamptz not null default now();

create index if not exists sessions_user_active_idx
  on public.sessions (user_id, deleted, played_at desc);

-- Row Level Security: each user can only see and write their own rounds.
alter table public.sessions enable row level security;

drop policy if exists "own sessions select" on public.sessions;
drop policy if exists "own sessions write"  on public.sessions;
drop policy if exists "anon read sessions"  on public.sessions;
drop policy if exists "anon write sessions" on public.sessions;

create policy "own sessions select"
  on public.sessions for select
  to authenticated using (auth.uid() = user_id);

create policy "own sessions write"
  on public.sessions for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Saved handicap / PRO preference: NO migration required. It is stored in
-- the signed-in user's auth metadata via supabase.auth.updateUser({ data:
-- { benchmark } }) — i.e. auth.users.raw_user_meta_data, managed by Supabase
-- Auth. Guests keep it in localStorage. (Per-sector shot counts used by the
-- Évolution chart are local-only and likewise need no column.)
-- ─────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────
-- Google OAuth setup (one-time, in the Supabase dashboard):
--   1. Authentication → Providers → Google → enable.
--   2. Add your Google OAuth client ID + secret
--      (Google Cloud Console → Credentials → OAuth 2.0 Client).
--   3. Authentication → URL Configuration → add your Vercel domain
--      (and http://localhost:5173) to the allowed redirect URLs.
-- ─────────────────────────────────────────────────────────────────────────
