import { describe, it, expect } from 'vitest';
import {
  expectedStrokes,
  strokesGained,
  benchmarkReference,
  defaultHoleLength,
} from './strokesGained';
import type { Benchmark } from '../types';

const PRO: Benchmark = { kind: 'pro' };
const HC3: Benchmark = { kind: 'hc', hc: 3 };
const HC18: Benchmark = { kind: 'hc', hc: 18 };

describe('expectedStrokes', () => {
  it('is 0 when the ball is holed', () => {
    expect(expectedStrokes(HC3, 'holed', 0)).toBe(0);
  });

  it('increases monotonically with distance on the fairway', () => {
    let prev = -Infinity;
    for (const d of [10, 50, 100, 137, 180, 220]) {
      const e = expectedStrokes(PRO, 'fairway', d);
      expect(e).toBeGreaterThan(prev);
      prev = e;
    }
  });

  it('rough/sand cost more than fairway at the same distance', () => {
    const d = 120;
    expect(expectedStrokes(PRO, 'rough', d)).toBeGreaterThan(
      expectedStrokes(PRO, 'fairway', d),
    );
    expect(expectedStrokes(PRO, 'sand', d)).toBeGreaterThan(
      expectedStrokes(PRO, 'rough', d),
    );
  });

  it('a higher handicap never expects fewer strokes than a lower one', () => {
    for (const d of [1, 6, 50, 137]) {
      expect(expectedStrokes(HC18, 'fairway', d)).toBeGreaterThanOrEqual(
        expectedStrokes(HC3, 'fairway', d),
      );
    }
  });
});

describe('benchmarkReference', () => {
  it('matches the POC reference values closely for HC 3', () => {
    const r = benchmarkReference(HC3);
    expect(r.putt1).toBeCloseTo(1.04, 1);
    expect(r.putt6).toBeGreaterThan(1.6);
    expect(r.approach137).toBeGreaterThan(2.8);
    expect(r.approach137).toBeLessThan(3.3);
  });

  it('PRO uses the raw baseline (no handicap inflation)', () => {
    expect(benchmarkReference(PRO).putt1).toBeCloseTo(1.04, 2);
  });
});

describe('strokesGained', () => {
  it('a holed 1 m putt slightly beats the HC3 benchmark', () => {
    const sg = strokesGained({
      benchmark: HC3,
      fromLie: 'green',
      distanceBefore: 1,
      toLie: 'holed',
      distanceAfter: 0,
    });
    expect(sg).toBeGreaterThan(0);
    expect(sg).toBeLessThan(0.2);
  });

  it('a tee shot into trouble is a large loss', () => {
    const sg = strokesGained({
      benchmark: HC3,
      fromLie: 'tee',
      distanceBefore: 0,
      toLie: 'recovery',
      distanceAfter: 370,
      holeLength: 380,
    });
    expect(sg).toBeLessThan(-1);
  });

  it('a penalty stroke reduces SG by exactly that amount', () => {
    const base = strokesGained({
      benchmark: HC3,
      fromLie: 'fairway',
      distanceBefore: 150,
      toLie: 'green',
      distanceAfter: 8,
    });
    const penalised = strokesGained({
      benchmark: HC3,
      fromLie: 'fairway',
      distanceBefore: 150,
      toLie: 'green',
      distanceAfter: 8,
      penalty: 1,
    });
    expect(base - penalised).toBeCloseTo(1, 5);
  });

  it('a solid approach to the green gains strokes', () => {
    const sg = strokesGained({
      benchmark: HC3,
      fromLie: 'fairway',
      distanceBefore: 150,
      toLie: 'green',
      distanceAfter: 6,
    });
    expect(sg).toBeGreaterThan(0);
  });
});

describe('defaultHoleLength', () => {
  it('returns sensible lengths by par', () => {
    expect(defaultHoleLength(3)).toBeLessThan(defaultHoleLength(4));
    expect(defaultHoleLength(4)).toBeLessThan(defaultHoleLength(5));
  });
});
