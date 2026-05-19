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
const UNSYNCED_KEY = 'strokemath.unsynced';

function unsynced(): string[] {
  const x = readRaw(UNSYNCED_KEY);
  return Array.isArray(x) ? (x.filter((i) => typeof i === 'string') as string[]) : [];
}
function setUnsynced(ids: string[]): void {
  try {
    localStorage.setItem(UNSYNCED_KEY, JSON.stringify([...new Set(ids)]));
  } catch {
    /* ignore */
  }
}

export async function syncSession(
  s: ArchivedSession,
  userId: string,
): Promise<boolean> {
  if (!supabase || !userId) return false;
  try {
    const { error } = await supabase.from('sessions').upsert(
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
        deleted: false,
      },
      { onConflict: 'id' },
    );
    if (error) {
      setUnsynced([...unsynced(), s.id]);
      return false;
    }
    setUnsynced(unsynced().filter((id) => id !== s.id));
    return true;
  } catch {
    setUnsynced([...unsynced(), s.id]);
    return false;
  }
}

interface RemoteRow {
  id: string;
  played_at: string;
  player: string;
  benchmark: string;
  holes_played: number;
  shots_played: number;
  total_strokes_gained: number;
  sectors: ArchivedSession['sectors'];
  perf_hc: number;
}

function rowToArchived(r: RemoteRow): ArchivedSession | null {
  try {
    return {
      id: r.id,
      date: r.played_at,
      player: r.player,
      benchmark: JSON.parse(r.benchmark),
      holesPlayed: r.holes_played,
      shotsPlayed: r.shots_played,
      totalStrokesGained: Number(r.total_strokes_gained),
      sectors: r.sectors,
      perfHc: Number(r.perf_hc),
    };
  } catch {
    return null;
  }
}

/** Pull the user's cloud rounds and merge with local (union by id). */
export async function pullAndMerge(userId: string): Promise<ArchivedSession[]> {
  const local = historyStore.load();
  if (!supabase || !userId) return local;
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select(
        'id,played_at,player,benchmark,holes_played,shots_played,total_strokes_gained,sectors,perf_hc',
      )
      .eq('user_id', userId)
      .eq('deleted', false);
    if (error || !data) return local;
    const byId = new Map<string, ArchivedSession>();
    for (const s of local) byId.set(s.id, s);
    for (const row of data as RemoteRow[]) {
      const a = rowToArchived(row);
      // Local wins on conflict (it may carry sectorShots the cloud lacks).
      if (a && !byId.has(a.id)) byId.set(a.id, a);
    }
    const merged = [...byId.values()].sort(
      (x, y) => +new Date(y.date) - +new Date(x.date),
    );
    historyStore.save(merged);
    return merged;
  } catch {
    return local;
  }
}

/** Push local rounds the cloud is missing + retry anything queued. */
export async function pushUnsynced(userId: string): Promise<void> {
  if (!supabase || !userId) return;
  const queued = new Set(unsynced());
  for (const s of historyStore.load()) {
    if (!queued.size || queued.has(s.id)) {
      // eslint-disable-next-line no-await-in-loop
      await syncSession(s, userId);
    }
  }
}

/** Login reconciliation: pull remote, merge, then push local-only. */
export async function reconcile(userId: string): Promise<ArchivedSession[]> {
  const merged = await pullAndMerge(userId);
  await pushUnsynced(userId);
  return merged;
}

/** Soft-delete the user's cloud rounds (recoverable, multi-device safe). */
export async function softDeleteRemote(userId: string): Promise<void> {
  if (!supabase || !userId) return;
  setUnsynced([]);
  try {
    await supabase
      .from('sessions')
      .update({ deleted: true })
      .eq('user_id', userId);
  } catch {
    /* ignore */
  }
}
