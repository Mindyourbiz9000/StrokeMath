import type { Session } from '../types';
import { benchmarkLabel } from './format';

function cell(v: string | number): string {
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Flatten a session to one CSV row per shot. */
export function sessionToCsv(session: Session): string {
  const header = [
    'session_date',
    'player',
    'benchmark',
    'hole',
    'par',
    'shot',
    'category',
    'from_lie',
    'to_lie',
    'distance_m',
    'remaining_m',
    'penalty',
    'strokes_gained',
  ];
  const rows: string[] = [header.join(',')];
  for (const hole of session.holes) {
    for (const shot of hole.shots) {
      rows.push(
        [
          session.date,
          session.player,
          benchmarkLabel(session.benchmark),
          hole.number,
          hole.par,
          shot.number,
          shot.category,
          shot.fromLie,
          shot.toLie,
          shot.distance.toFixed(1),
          shot.remainingAfter.toFixed(1),
          shot.penalty,
          shot.strokesGained.toFixed(2),
        ]
          .map(cell)
          .join(','),
      );
    }
  }
  return rows.join('\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
