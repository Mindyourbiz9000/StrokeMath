import { describe, it, expect } from 'vitest';
import {
  buildShot,
  rescoreHole,
  perfHc,
  archive,
  sectorShotCounts,
} from './session';
import type { Session } from '../types';
import { haversine } from '../lib/geo';
import type { Benchmark, GeoPoint, Hole } from '../types';

const HC4: Benchmark = { kind: 'hc', hc: 4 };
const pt = (lat: number, lng: number): GeoPoint => ({ lat, lng, t: 0 });

const tee = pt(48.0, 2.0);
const pin = pt(48.0034, 2.0); // ~378 m north of the tee
const ball = pt(48.002, 2.0009); // long but pushed right of the line

function hole(pinPos?: GeoPoint): Hole {
  return {
    id: 'h',
    number: 1,
    par: 4,
    shots: [],
    completed: false,
    pin: pinPos,
  };
}

describe('buildShot — pin-aware distance', () => {
  it('uses straight-line distance to the captured flag for the leave', () => {
    const shot = buildShot(
      hole(pin),
      {
        category: 'drive',
        toLie: 'fairway',
        measuredDistance: haversine(tee, ball),
        start: tee,
        end: ball,
        holeLength: 380,
      },
      HC4,
    );
    const trueLeave = haversine(ball, pin);
    expect(shot.remainingAfter).toBeGreaterThan(trueLeave - 3);
    expect(shot.remainingAfter).toBeLessThan(trueLeave + 3);
    expect(shot.start).toEqual(tee);
    expect(shot.end).toEqual(ball);
  });

  it('falls back to shot-length progression when no pin is set', () => {
    const dist = haversine(tee, ball);
    const shot = buildShot(
      hole(undefined),
      {
        category: 'drive',
        toLie: 'fairway',
        measuredDistance: dist,
        start: tee,
        end: ball,
        holeLength: 380,
      },
      HC4,
    );
    // No pin → naive: holeLength − measuredDistance.
    expect(shot.remainingAfter).toBeCloseTo(Math.max(0, 380 - dist), 1);
  });

  it('rescoreHole fixes earlier shots once the pin is set later', () => {
    // Drive entered before the flag was captured (no pin → approximation).
    const before = buildShot(
      hole(undefined),
      {
        category: 'drive',
        toLie: 'fairway',
        measuredDistance: haversine(tee, ball),
        start: tee,
        end: ball,
        holeLength: 380,
      },
      HC4,
    );
    const playedHole: Hole = { ...hole(pin), shots: [before] };
    const fixed = rescoreHole(playedHole, HC4);
    const trueLeave = haversine(ball, pin);
    expect(fixed.shots[0].remainingAfter).toBeGreaterThan(trueLeave - 3);
    expect(fixed.shots[0].remainingAfter).toBeLessThan(trueLeave + 3);
    expect(fixed.shots[0].strokesGained).not.toBe(before.strokesGained);
    expect(fixed.shots[0].id).toBe(before.id); // stable key
  });

  it('a holed shot always leaves 0 regardless of pin', () => {
    const shot = buildShot(
      hole(pin),
      {
        category: 'approach',
        toLie: 'holed',
        measuredDistance: 120,
        start: tee,
        end: pin,
        holeLength: 380,
      },
      HC4,
    );
    expect(shot.remainingAfter).toBe(0);
    expect(shot.toLie).toBe('holed');
  });
});

function roundWith(sg: number, shots: number): Session {
  return {
    id: 'r',
    date: '2026-05-19T10:00:00Z',
    player: 'p',
    benchmark: { kind: 'hc', hc: 10 },
    archived: false,
    holes: [
      {
        id: 'h',
        number: 1,
        par: 4,
        completed: true,
        shots: Array.from({ length: shots }, (_, i) => ({
          id: `s${i}`,
          number: i + 1,
          category: i === 0 ? 'drive' : i === shots - 1 ? 'putt' : 'approach',
          fromLie: 'fairway',
          toLie: i === shots - 1 ? 'holed' : 'fairway',
          distance: 100,
          remainingAfter: 0,
          strokesGained: sg / shots,
          penalty: 0,
        })),
      },
    ],
  };
}

describe('perfHc & archive', () => {
  it('better scoring yields a lower performance handicap', () => {
    const good = perfHc(roundWith(4, 8));
    const bad = perfHc(roundWith(-6, 8));
    expect(good).toBeLessThan(bad);
    expect(good).toBeGreaterThanOrEqual(0);
  });

  it('archive records per-sector shot counts', () => {
    const a = archive(roundWith(0, 5));
    expect(a.sectorShots).toBeDefined();
    const counts = sectorShotCounts(roundWith(0, 5));
    const total =
      counts.drive + counts.approach + counts.short + counts.putt;
    expect(total).toBe(5);
    expect(counts.drive).toBe(1);
    expect(counts.putt).toBe(1);
  });
});
