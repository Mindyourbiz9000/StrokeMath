// Domain model for StrokeMath.

/** Where the ball lies. Drives both UI and the strokes-gained baseline. */
export type Lie = 'tee' | 'fairway' | 'rough' | 'sand' | 'recovery' | 'green' | 'holed';

/** High-level shot category shown in the UI ("Catégorie du coup"). */
export type ShotCategory = 'drive' | 'approach' | 'short' | 'bunker' | 'putt';

/** Par of the hole being played (only relevant for the tee shot baseline). */
export type Par = 3 | 4 | 5;

export interface GeoPoint {
  lat: number;
  lng: number;
  /** GPS accuracy in metres, when the device reports it. */
  accuracy?: number;
  /** Epoch ms when the fix was taken. */
  t: number;
}

export interface Shot {
  id: string;
  /** 1-based index within the hole. */
  number: number;
  category: ShotCategory;
  /** Lie the shot was played from. */
  fromLie: Lie;
  /** Lie the ball came to rest on (or 'holed'). */
  toLie: Lie;
  /** Distance the ball travelled for this shot, in metres. */
  distance: number;
  /** Remaining distance to the hole after the shot, in metres (0 if holed). */
  remainingAfter: number;
  /** Strokes gained for this shot vs the active benchmark. */
  strokesGained: number;
  /** Penalty strokes attached to this shot (e.g. water / OB). */
  penalty: number;
  start?: GeoPoint;
  end?: GeoPoint;
}

export interface Hole {
  id: string;
  /** 1-based hole number within the session. */
  number: number;
  par: Par;
  shots: Shot[];
  completed: boolean;
  /** GPS position of the flag, if captured — enables exact distance-to-pin. */
  pin?: GeoPoint;
  /** Manual hole length (m); overrides the par-based default for the tee. */
  lengthM?: number;
}

export interface Session {
  id: string;
  /** ISO date the session was created. */
  date: string;
  player: string;
  /** Benchmark the session is scored against. */
  benchmark: Benchmark;
  holes: Hole[];
  /** Set once the session is closed; immutable afterwards. */
  archived: boolean;
}

/**
 * Comparison level. `hc` is the playing handicap (0 = scratch).
 * `kind: 'pro'` uses the raw PGA-tour baseline.
 */
export type Benchmark =
  | { kind: 'hc'; hc: number }
  | { kind: 'pro' };

export interface SectorAverages {
  drive: number;
  approach: number;
  short: number;
  putt: number;
}

/** A finished session as stored in history / Supabase. */
export interface ArchivedSession {
  id: string;
  date: string;
  player: string;
  benchmark: Benchmark;
  holesPlayed: number;
  shotsPlayed: number;
  totalStrokesGained: number;
  sectors: SectorAverages;
  /** Shots played per sector — lets the chart show true SG *per shot*. */
  sectorShots?: SectorAverages;
  /** Approx. performance handicap implied by this round's scoring. */
  perfHc: number;
}
