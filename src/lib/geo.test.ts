import { describe, it, expect } from 'vitest';
import { haversine, combinedAccuracy } from './geo';

const at = (lat: number, lng: number) => ({ lat, lng, t: 0 });

describe('haversine', () => {
  it('is ~0 for identical points', () => {
    expect(haversine(at(48.8566, 2.3522), at(48.8566, 2.3522))).toBeLessThan(
      0.001,
    );
  });

  it('≈111 km for 1° of latitude', () => {
    const d = haversine(at(0, 0), at(1, 0));
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });

  it('measures a realistic golf shot to within a metre', () => {
    // ~137 m north of the origin point.
    const d = haversine(at(48.85, 2.35), at(48.851232, 2.35));
    expect(d).toBeGreaterThan(135);
    expect(d).toBeLessThan(139);
  });
});

describe('combinedAccuracy', () => {
  it('combines two fix accuracies in quadrature', () => {
    expect(combinedAccuracy(3, 4)).toBe(5);
    expect(combinedAccuracy(undefined, undefined)).toBe(0);
  });
});
