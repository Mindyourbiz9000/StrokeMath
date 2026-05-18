// ───────────────────────────────────────────────────────────────────────────
// Strokes Gained engine
//
// Strokes Gained (SG) for a single shot is:
//
//     SG = E(before) − E(after) − 1 − penaltyStrokes
//
// where E(x) is the *expected number of strokes to hole out* from position x
// for the chosen benchmark player. "before" is the lie/distance the shot was
// played from, "after" is where the ball came to rest (E = 0 when holed).
//
// The baseline tables below approximate Mark Broadie's PGA-Tour benchmark
// ("Every Shot Counts"), converted to metres. They define a *scratch / PRO*
// reference; higher handicaps are modelled by inflating expected strokes with
// a smooth, distance-aware factor (a long-iron approach costs a 20-handicap
// far more than a tap-in does).
//
// Numbers are deliberately tunable — this is the app's own model, not an
// official statistic — but they line up with the values shown in the POC
// (137 m fairway ≈ 2.98, 1 m putt ≈ 1.04, 6 m putt ≈ 1.76 for ~HC 3).
// ───────────────────────────────────────────────────────────────────────────

import type { Benchmark, Lie, Par } from '../types';

type Curve = ReadonlyArray<readonly [meters: number, expected: number]>;

// Expected strokes to hole out, scratch reference, by lie. Distance in metres.
const BASELINE: Record<Exclude<Lie, 'holed'>, Curve> = {
  green: [
    [0.0, 1.0],
    [0.5, 1.02],
    [1.0, 1.04],
    [1.5, 1.2],
    [2.0, 1.38],
    [3.0, 1.55],
    [4.0, 1.66],
    [5.0, 1.72],
    [6.0, 1.78],
    [8.0, 1.88],
    [10.0, 1.96],
    [15.0, 2.1],
    [20.0, 2.22],
    [27.0, 2.36],
  ],
  fairway: [
    [9, 2.18],
    [18, 2.4],
    [27, 2.52],
    [37, 2.58],
    [46, 2.62],
    [64, 2.67],
    [82, 2.75],
    [91, 2.8],
    [110, 2.85],
    [128, 2.91],
    [137, 2.95],
    [146, 2.99],
    [165, 3.08],
    [183, 3.17],
    [201, 3.27],
    [219, 3.38],
    [238, 3.5],
    [256, 3.62],
  ],
  rough: [
    [9, 2.4],
    [18, 2.59],
    [27, 2.72],
    [37, 2.8],
    [46, 2.85],
    [64, 2.91],
    [82, 2.98],
    [91, 3.02],
    [110, 3.08],
    [128, 3.15],
    [146, 3.23],
    [165, 3.32],
    [183, 3.42],
    [201, 3.53],
    [219, 3.65],
    [238, 3.78],
  ],
  sand: [
    [9, 2.53],
    [18, 2.82],
    [27, 2.93],
    [37, 3.0],
    [46, 3.05],
    [64, 3.13],
    [82, 3.21],
    [91, 3.26],
    [110, 3.33],
    [128, 3.4],
    [146, 3.48],
    [165, 3.57],
    [183, 3.67],
    [201, 3.79],
  ],
  recovery: [
    [9, 3.0],
    [18, 3.25],
    [37, 3.5],
    [64, 3.7],
    [91, 3.85],
    [128, 4.0],
    [165, 4.18],
    [201, 4.35],
  ],
  // The tee curve is keyed by *hole length* (par drives the default).
  tee: [
    [120, 3.1],
    [150, 3.4],
    [320, 3.92],
    [380, 3.99],
    [430, 4.12],
    [460, 4.55],
    [500, 4.62],
    [540, 4.78],
  ],
};

/** Linear interpolation / flat extrapolation on a baseline curve. */
function interp(curve: Curve, d: number): number {
  if (d <= curve[0][0]) return curve[0][1];
  const last = curve[curve.length - 1];
  if (d >= last[0]) return last[1];
  for (let i = 1; i < curve.length; i++) {
    const [x0, y0] = curve[i - 1];
    const [x1, y1] = curve[i];
    if (d <= x1) return y0 + ((y1 - y0) * (d - x0)) / (x1 - x0);
  }
  return last[1];
}

/** Typical hole length (m) by par, used when none is supplied. */
export function defaultHoleLength(par: Par): number {
  return par === 3 ? 155 : par === 4 ? 380 : 480;
}

/**
 * Handicap inflation factor for expected strokes.
 *
 * A scratch (hc 0) / PRO player scores the raw baseline. Higher handicaps
 * lose more strokes the longer/harder the shot, and almost nothing on
 * tap-ins — so the factor scales with the *difficulty* of the position,
 * proxied by how far the baseline already is above a holed ball.
 */
function hcFactor(benchmark: Benchmark, baselineExpected: number): number {
  if (benchmark.kind === 'pro') return 1;
  const hc = Math.max(0, Math.min(54, benchmark.hc));
  if (hc === 0) return 1;
  // Each handicap point adds ~1.6% of the "difficulty" above a holed ball.
  const difficulty = Math.max(0, baselineExpected - 1);
  const perPoint = 0.016;
  return 1 + (difficulty * perPoint * hc) / Math.max(0.5, baselineExpected);
}

/** Expected strokes to hole out for the benchmark from a lie + distance. */
export function expectedStrokes(
  benchmark: Benchmark,
  lie: Lie,
  distanceMeters: number,
): number {
  if (lie === 'holed') return 0;
  const base = interp(BASELINE[lie], Math.max(0, distanceMeters));
  return +(base * hcFactor(benchmark, base)).toFixed(4);
}

/** Benchmark expected strokes for the tee shot of a hole of `lengthM` metres. */
export function expectedStrokesTee(benchmark: Benchmark, lengthM: number): number {
  const base = interp(BASELINE.tee, Math.max(80, lengthM));
  return +(base * hcFactor(benchmark, base)).toFixed(4);
}

export interface SgInput {
  benchmark: Benchmark;
  fromLie: Lie;
  /** Distance to the hole *before* the shot (m). Ignored for tee shots. */
  distanceBefore: number;
  toLie: Lie;
  /** Distance to the hole *after* the shot (m). 0 when holed. */
  distanceAfter: number;
  /** Penalty strokes incurred on this shot (water, OB, …). */
  penalty?: number;
  /** Required when fromLie === 'tee': total hole length (m). */
  holeLength?: number;
}

/** Strokes gained for one shot. Positive = better than the benchmark. */
export function strokesGained(input: SgInput): number {
  const penalty = input.penalty ?? 0;
  const before =
    input.fromLie === 'tee'
      ? expectedStrokesTee(input.benchmark, input.holeLength ?? defaultHoleLength(4))
      : expectedStrokes(input.benchmark, input.fromLie, input.distanceBefore);
  const after =
    input.toLie === 'holed'
      ? 0
      : expectedStrokes(input.benchmark, input.toLie, input.distanceAfter);
  return +(before - after - 1 - penalty).toFixed(2);
}

/** Benchmark reference card values shown under "Niveau de comparaison". */
export function benchmarkReference(benchmark: Benchmark) {
  return {
    approach137: expectedStrokes(benchmark, 'fairway', 137),
    putt1: expectedStrokes(benchmark, 'green', 1),
    putt6: expectedStrokes(benchmark, 'green', 6),
  };
}
