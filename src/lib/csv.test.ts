import { describe, it, expect } from 'vitest';
import { sessionToCsv } from './csv';
import type { Session } from '../types';

function sessionWith(player: string): Session {
  return {
    id: 's1',
    date: '2026-05-19T10:00:00.000Z',
    player,
    benchmark: { kind: 'hc', hc: 4 },
    archived: false,
    holes: [
      {
        id: 'h1',
        number: 1,
        par: 4,
        completed: true,
        shots: [
          {
            id: 'x1',
            number: 1,
            category: 'drive',
            fromLie: 'tee',
            toLie: 'fairway',
            distance: 230,
            remainingAfter: 150,
            strokesGained: 0.1,
            penalty: 0,
          },
        ],
      },
    ],
  };
}

describe('sessionToCsv', () => {
  it('neutralises spreadsheet formula injection in fields', () => {
    const csv = sessionToCsv(sessionWith('=HYPERLINK("http://evil")'));
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).not.toMatch(/(^|,)=HYPERLINK/m);
  });

  it('emits a header and one row per shot', () => {
    const lines = sessionToCsv(sessionWith('alice')).trim().split('\n');
    expect(lines[0]).toContain('strokes_gained');
    expect(lines).toHaveLength(2);
  });
});
