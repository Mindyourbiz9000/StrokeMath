import type { ArchivedSession, Session } from '../types';
import { supabase } from './supabase';

const CURRENT_KEY = 'strokemath.current';
const HISTORY_KEY = 'strokemath.history';
const HISTORY_LIMIT = 50;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — ignore, in-memory state still works */
  }
}

export const currentStore = {
  load: (): Session | null => read<Session | null>(CURRENT_KEY, null),
  save: (s: Session | null) => write(CURRENT_KEY, s),
};

export const historyStore = {
  load: (): ArchivedSession[] => read<ArchivedSession[]>(HISTORY_KEY, []),
  save: (h: ArchivedSession[]) => write(HISTORY_KEY, h.slice(0, HISTORY_LIMIT)),
  clear: () => write(HISTORY_KEY, []),
};

/**
 * Best-effort upsert of a finished session to Supabase. Never throws — a
 * failed sync just leaves the round in local history to retry later.
 */
export async function syncSession(s: ArchivedSession): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('sessions').upsert(
      {
        id: s.id,
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

export async function deleteAllRemote(): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('sessions').delete().neq('id', '');
  } catch {
    /* ignore */
  }
}
