import type { Benchmark } from '../types';

/** Signed strokes-gained string, e.g. "+1.20" / "-0.23". */
export function sg(value: number): string {
  return (value >= 0 ? '+' : '') + value.toFixed(2);
}

export function benchmarkLabel(b: Benchmark): string {
  return b.kind === 'pro' ? 'PRO' : `HC ${b.hc}`;
}

/** "7.50 m" — distance with one decimal. */
export function meters(value: number): string {
  return `${value.toFixed(2)} m`;
}

/** Short locale-aware date, e.g. "18/5/26". */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  const yy = String(d.getFullYear()).slice(-2);
  return `${d.getDate()}/${d.getMonth() + 1}/${yy}`;
}

export function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}
