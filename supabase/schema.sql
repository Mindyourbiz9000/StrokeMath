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

-- ── Normalized per-shot detail (holes + shots) ─────────────────────────────
-- The sessions row stays as a fast aggregate cache for the Évolution
-- list/charts; these tables hold the raw data for SQL stats / future
-- server-side re-scoring. user_id is denormalized onto every row so RLS
-- stays a single cheap predicate. Stable client ids → idempotent upserts.

create table if not exists public.holes (
  id          text primary key,
  session_id  text not null references public.sessions (id) on delete cascade,
  user_id     uuid references auth.users (id) on delete cascade,
  number      integer not null,
  par         integer not null,
  length_m    numeric,
  pin_lat     double precision,
  pin_lng     double precision,
  created_at  timestamptz not null default now()
);

create table if not exists public.shots (
  id              text primary key,
  hole_id         text not null references public.holes (id) on delete cascade,
  session_id      text not null references public.sessions (id) on delete cascade,
  user_id         uuid references auth.users (id) on delete cascade,
  number          integer not null,
  category        text not null,
  from_lie        text not null,
  to_lie          text not null,
  distance_m      numeric not null default 0,
  remaining_m     numeric not null default 0,
  penalty         integer not null default 0,
  strokes_gained  numeric not null default 0,
  start_lat       double precision,
  start_lng       double precision,
  end_lat         double precision,
  end_lng         double precision,
  created_at      timestamptz not null default now()
);

create index if not exists holes_session_idx on public.holes (session_id);
create index if not exists shots_session_idx on public.shots (session_id);
create index if not exists shots_hole_idx    on public.shots (hole_id);
create index if not exists shots_user_cat_idx on public.shots (user_id, category);

alter table public.holes enable row level security;
alter table public.shots enable row level security;

drop policy if exists "own holes" on public.holes;
drop policy if exists "own shots" on public.shots;

create policy "own holes" on public.holes
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own shots" on public.shots
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

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
