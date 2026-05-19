import type { Benchmark } from '../types';
import { supabase } from './supabase';

const KEY = 'shotiq.benchmark';

export function isBenchmark(x: unknown): x is Benchmark {
  if (typeof x !== 'object' || x === null) return false;
  const b = x as Record<string, unknown>;
  if (b.kind === 'pro') return true;
  return b.kind === 'hc' && typeof b.hc === 'number' && Number.isFinite(b.hc);
}

/**
 * The player's preferred benchmark so they don't reselect their handicap
 * every round. Prefers a cloud value (passed from the signed-in user's
 * metadata) and falls back to localStorage.
 */
export function loadBenchmarkPref(cloud?: unknown): Benchmark | null {
  if (isBenchmark(cloud)) return cloud;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isBenchmark(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveBenchmarkPref(b: Benchmark): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(b));
  } catch {
    /* quota / private mode */
  }
  // Best-effort cloud persistence for signed-in users.
  const sb = supabase;
  if (sb) {
    sb.auth
      .getUser()
      .then(({ data }) => {
        if (data.user) void sb.auth.updateUser({ data: { benchmark: b } });
      })
      .catch(() => {});
  }
}
