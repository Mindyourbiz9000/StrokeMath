import type {
  ArchivedSession,
  Benchmark,
  Hole,
  Session,
  Shot,
} from '../types';
import { supabase } from './supabase';

const CURRENT_KEY = 'strokemath.current';
const HISTORY_KEY = 'strokemath.history';
const HISTORY_LIMIT = 50;

// Bump when the persisted shape changes incompatibly. Stored data is wrapped
// in an envelope; a mismatched or invalid payload is discarded rather than
// fed to the reducer (which would crash mid-round for returning users).
const SCHEMA_VERSION = 2;

interface Envelope<T> {
  v: number;
  data: T;
}

function readRaw(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function load<T>(key: string, validate: (x: unknown) => x is T): T | null {
  const parsed = readRaw(key);
  if (!parsed || typeof parsed !== 'object') return null;
  const env = parsed as Partial<Envelope<unknown>>;
  if (env.v !== SCHEMA_VERSION) {
    // Unknown / older shape — drop it so we never hydrate bad state.
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return null;
  }
  return validate(env.data) ? env.data : null;
}

function save(key: string, data: unknown): void {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({ v: SCHEMA_VERSION, data } satisfies Envelope<unknown>),
    );
  } catch {
    /* quota / private mode — in-memory state still works */
  }
}

// ── Runtime validators (hand-rolled; no extra dependency) ───────────────────

const isObj = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null;
const isNum = (x: unknown): x is number =>
  typeof x === 'number' && Number.isFinite(x);
const isStr = (x: unknown): x is string => typeof x === 'string';

function isBenchmark(x: unknown): x is Benchmark {
  if (!isObj(x)) return false;
  if (x.kind === 'pro') return true;
  return x.kind === 'hc' && isNum(x.hc);
}

function isShot(x: unknown): x is Shot {
  return (
    isObj(x) &&
    isStr(x.id) &&
    isNum(x.number) &&
    isStr(x.category) &&
    isStr(x.fromLie) &&
    isStr(x.toLie) &&
    isNum(x.distance) &&
    isNum(x.remainingAfter) &&
    isNum(x.strokesGained) &&
    isNum(x.penalty)
  );
}

function isHole(x: unknown): x is Hole {
  return (
    isObj(x) &&
    isStr(x.id) &&
    isNum(x.number) &&
    isNum(x.par) &&
    Array.isArray(x.shots) &&
    x.shots.every(isShot) &&
    typeof x.completed === 'boolean'
  );
}

function isSession(x: unknown): x is Session {
  return (
    isObj(x) &&
    isStr(x.id) &&
    isStr(x.date) &&
    isStr(x.player) &&
    isBenchmark(x.benchmark) &&
    Array.isArray(x.holes) &&
    x.holes.length > 0 &&
    x.holes.every(isHole)
  );
}

function isArchived(x: unknown): x is ArchivedSession {
  return (
    isObj(x) &&
    isStr(x.id) &&
    isStr(x.date) &&
    isStr(x.player) &&
    isBenchmark(x.benchmark) &&
    isNum(x.holesPlayed) &&
    isNum(x.shotsPlayed) &&
    isNum(x.totalStrokesGained) &&
    isObj(x.sectors) &&
    isNum(x.perfHc)
  );
}

const isArchivedArray = (x: unknown): x is ArchivedSession[] =>
  Array.isArray(x) && x.every(isArchived);

export const currentStore = {
  load: (): Session | null => load(CURRENT_KEY, isSession),
  save: (s: Session | null) => save(CURRENT_KEY, s),
};

export const historyStore = {
  load: (): ArchivedSession[] => load(HISTORY_KEY, isArchivedArray) ?? [],
  save: (h: ArchivedSession[]) => save(HISTORY_KEY, h.slice(0, HISTORY_LIMIT)),
  clear: () => save(HISTORY_KEY, []),
};

/** Serialise everything in local storage (used by the crash-recovery export). */
export function exportBackup(): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      current: readRaw(CURRENT_KEY),
      history: readRaw(HISTORY_KEY),
    },
    null,
    2,
  );
}

/**
 * Best-effort upsert of a finished session to Supabase. Only runs when a
 * user is signed in (guests stay local-only). Never throws — a failed sync
 * just leaves the round in local history to retry later.
 */
export async function syncSession(s: ArchivedSession): Promise<void> {
  if (!supabase) return;
  try {
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) return;
    await supabase.from('sessions').upsert(
      {
        id: s.id,
        user_id: userId,
        played_at: s.date,
        player: s.player,
        benchmark: JSON.stringify(s.benchmark),
        holes_played: s.holesPlayed,
        shots_played: s.shotsPlayed,
        total_strokes_gained: s.totalStrokesGained,
        sectors: s.sectors,
        perf_hc: s.perfHc,
      },
      { onConflict: 'id' },
    );
  } catch {
    /* offline / RLS — keep local copy */
  }
}

/** Push every locally-stored finished round to the cloud (called on login). */
export async function syncAllLocal(): Promise<void> {
  if (!supabase) return;
  for (const s of historyStore.load()) {
    // eslint-disable-next-line no-await-in-loop
    await syncSession(s);
  }
}

export async function deleteAllRemote(): Promise<void> {
  if (!supabase) return;
  try {
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) return;
    await supabase.from('sessions').delete().eq('user_id', userId);
  } catch {
    /* ignore */
  }
}
