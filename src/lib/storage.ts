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
const ROUNDS_KEY = 'strokemath.rounds';
const UNSYNCED_KEY = 'strokemath.unsynced';
const HISTORY_LIMIT = 50;
const ROUNDS_LIMIT = 30;

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

/** A finished round kept locally at full fidelity for sync + retry. */
export interface RoundRecord {
  session: Session;
  archived: ArchivedSession;
}

const isRoundRecord = (x: unknown): x is RoundRecord =>
  isObj(x) && isSession(x.session) && isArchived(x.archived);
const isRoundArray = (x: unknown): x is RoundRecord[] =>
  Array.isArray(x) && x.every(isRoundRecord);

export const currentStore = {
  load: (): Session | null => load(CURRENT_KEY, isSession),
  save: (s: Session | null) => save(CURRENT_KEY, s),
};

export const historyStore = {
  load: (): ArchivedSession[] => load(HISTORY_KEY, isArchivedArray) ?? [],
  save: (h: ArchivedSession[]) => save(HISTORY_KEY, h.slice(0, HISTORY_LIMIT)),
  clear: () => save(HISTORY_KEY, []),
};

/** Full finished rounds (holes + shots) — source for normalized cloud sync. */
export const roundsStore = {
  load: (): RoundRecord[] => load(ROUNDS_KEY, isRoundArray) ?? [],
  upsert: (rec: RoundRecord) => {
    const next = [
      rec,
      ...roundsStore.load().filter((r) => r.archived.id !== rec.archived.id),
    ];
    save(ROUNDS_KEY, next.slice(0, ROUNDS_LIMIT));
  },
  clear: () => save(ROUNDS_KEY, []),
};

/** Serialise everything in local storage (used by the crash-recovery export). */
export function exportBackup(): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      current: readRaw(CURRENT_KEY),
      history: readRaw(HISTORY_KEY),
      rounds: readRaw(ROUNDS_KEY),
    },
    null,
    2,
  );
}

// ── Cloud sync (normalized: sessions + holes + shots) ───────────────────────

function unsynced(): string[] {
  const x = readRaw(UNSYNCED_KEY);
  return Array.isArray(x)
    ? (x.filter((i) => typeof i === 'string') as string[])
    : [];
}
function setUnsynced(ids: string[]): void {
  try {
    localStorage.setItem(UNSYNCED_KEY, JSON.stringify([...new Set(ids)]));
  } catch {
    /* ignore */
  }
}

function holeRows(session: Session, userId: string) {
  return session.holes.map((h) => ({
    id: h.id,
    session_id: session.id,
    user_id: userId,
    number: h.number,
    par: h.par,
    length_m: h.lengthM ?? null,
    pin_lat: h.pin?.lat ?? null,
    pin_lng: h.pin?.lng ?? null,
  }));
}

function shotRows(session: Session, userId: string) {
  return session.holes.flatMap((h) =>
    h.shots.map((s) => ({
      id: s.id,
      hole_id: h.id,
      session_id: session.id,
      user_id: userId,
      number: s.number,
      category: s.category,
      from_lie: s.fromLie,
      to_lie: s.toLie,
      distance_m: s.distance,
      remaining_m: s.remainingAfter,
      penalty: s.penalty,
      strokes_gained: s.strokesGained,
      start_lat: s.start?.lat ?? null,
      start_lng: s.start?.lng ?? null,
      end_lat: s.end?.lat ?? null,
      end_lng: s.end?.lng ?? null,
    })),
  );
}

/**
 * Sync one finished round: upsert the aggregate `sessions` row, then replace
 * its `holes`/`shots` (delete + insert) so edits/deletions are reflected.
 * Idempotent and safe to retry. Failures enqueue the round id.
 */
export async function syncRound(
  rec: RoundRecord,
  userId: string,
): Promise<boolean> {
  if (!supabase || !userId) return false;
  const a = rec.archived;
  const sid = a.id;
  try {
    const sessionUpsert = await supabase.from('sessions').upsert(
      {
        id: sid,
        user_id: userId,
        played_at: a.date,
        player: a.player,
        benchmark: JSON.stringify(a.benchmark),
        holes_played: a.holesPlayed,
        shots_played: a.shotsPlayed,
        total_strokes_gained: a.totalStrokesGained,
        sectors: a.sectors,
        perf_hc: a.perfHc,
        deleted: false,
      },
      { onConflict: 'id' },
    );
    if (sessionUpsert.error) throw sessionUpsert.error;

    // Full replace of detail (handles shot deletion / renumber).
    const delShots = await supabase
      .from('shots')
      .delete()
      .eq('session_id', sid);
    if (delShots.error) throw delShots.error;
    const delHoles = await supabase
      .from('holes')
      .delete()
      .eq('session_id', sid);
    if (delHoles.error) throw delHoles.error;

    const holes = holeRows(rec.session, userId);
    if (holes.length) {
      const insH = await supabase.from('holes').insert(holes);
      if (insH.error) throw insH.error;
    }
    const shots = shotRows(rec.session, userId);
    if (shots.length) {
      const insS = await supabase.from('shots').insert(shots);
      if (insS.error) throw insS.error;
    }

    setUnsynced(unsynced().filter((id) => id !== sid));
    return true;
  } catch {
    setUnsynced([...unsynced(), sid]);
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

/** Pull the user's cloud rounds (aggregates) and merge with local by id. */
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
      const arch = rowToArchived(row);
      // Local wins on conflict (it may carry sectorShots the cloud lacks).
      if (arch && !byId.has(arch.id)) byId.set(arch.id, arch);
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
  for (const rec of roundsStore.load()) {
    if (!queued.size || queued.has(rec.archived.id)) {
      // eslint-disable-next-line no-await-in-loop
      await syncRound(rec, userId);
    }
  }
}

/** Login reconciliation: pull remote, merge, then push local detail. */
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
