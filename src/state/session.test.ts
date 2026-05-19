import { describe, it, expect } from 'vitest';
import { buildShot } from './session';
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
