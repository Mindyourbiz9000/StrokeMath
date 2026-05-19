# ShotIQ — Strokes Gained Tracker

Mobile-first golf app to record **every shot of every hole by GPS**, compute
its distance and landing lie, and score your **Strokes Gained** against a
chosen handicap (or PRO/scratch) benchmark. Built as a polished rebuild of the
original POC.

- **Home** — generic marketing landing explaining the app, with guest-play
  and (optional) Google sign-in.
- **JEU** — GPS shot capture (START/STOP), shot categories (drive, approach,
  short game, greenside bunker, putting), landing-lie selection, penalties,
  per-hole shot history, live session summary, CSV export.
- **ÉVOLUTION** — performance-handicap trend, average SG per sector, last-10
  sessions history, all persisted (offline-first, optional Supabase sync).
- Play as a guest with no account (local data); sign in with Google to sync
  rounds to the cloud. French / English toggle, installable PWA, offline-ready.

## Tech stack

React + TypeScript + Vite · Chart.js · Supabase (optional) · PWA · Vercel.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173 (open on your phone via the LAN URL)
npm run build    # production build to dist/
npm run preview  # serve the production build
```

The app works **fully offline with no backend** — sessions are stored in
`localStorage`. Supabase is an optional cloud mirror.

## Supabase (optional cloud sync + Google login)

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor (creates the per-user
   `sessions` table with row-level security).
3. Enable Google auth: **Authentication → Providers → Google**, add your
   Google OAuth client ID + secret (Google Cloud Console → Credentials), then
   under **Authentication → URL Configuration** add your Vercel domain and
   `http://localhost:5173` to the redirect allow-list.
4. Copy `.env.example` → `.env.local` and fill:

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...        # Project Settings → API → anon public
   ```

Guests use local storage only. Once a user signs in with Google their local
history is pushed up and finished rounds upsert to `sessions` (each user sees
only their own rows). Without these vars the app stays fully local-only.

## Deploy to Vercel

Import the repo in Vercel (framework auto-detected via `vercel.json`). Add the
two `VITE_SUPABASE_*` env vars if using cloud sync. That's it.

## Strokes Gained model

`SG = E(before) − E(after) − 1 − penalties`, where `E` is the expected strokes
to hole out for the chosen benchmark. Baseline tables (in
`src/lib/strokesGained.ts`) approximate Mark Broadie's PGA-Tour benchmark
converted to metres; higher handicaps inflate expected strokes with a smooth,
difficulty-aware factor. The numbers are tunable — this is the app's own model,
not an official statistic — and line up with the POC's reference values
(137 m fairway ≈ 2.98, 1 m putt ≈ 1.04, 6 m putt ≈ 1.76 around HC 3).

Distance-to-pin is exact when the flag is GPS-captured for the hole (or a hole
length is entered): drive/approach shots store their start/end GPS points and
score against the pin. Without a pin it falls back to shot-length progression.

Short-game/bunker shots assume a representative finishing proximity by landing
lie (documented in `src/state/session.ts`) since the POC captures only the
shot's start distance and where it stopped.

## Future: native mobile

The codebase is a standard client-only web app, so wrapping it as a native
iOS/Android app later is straightforward with **Capacitor**:

```bash
npm i -D @capacitor/cli && npx cap init ShotIQ app.shotiq
npm i @capacitor/core @capacitor/ios @capacitor/android @capacitor/geolocation
npx cap add ios && npx cap add android
```

Swap the browser Geolocation calls in `src/lib/geo.ts` for
`@capacitor/geolocation` on native and `npx cap sync` after each build.
