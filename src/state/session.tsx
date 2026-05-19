import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import type {
  ArchivedSession,
  Benchmark,
  GeoPoint,
  Hole,
  Lie,
  Par,
  SectorAverages,
  Session,
  Shot,
  ShotCategory,
} from '../types';
import { uid } from '../lib/format';
import { haversine } from '../lib/geo';
import { strokesGained, defaultHoleLength } from '../lib/strokesGained';
import { loadBenchmarkPref, saveBenchmarkPref } from '../lib/prefs';
import {
  currentStore,
  historyStore,
  syncSession,
  syncAllLocal,
  deleteAllRemote,
} from '../lib/storage';
import { useAuth } from '../lib/auth';

const DEFAULT_PLAYER = 'Player';

/** Assumed distance left after a chip/pitch/bunker shot, by where it stopped. */
function assumedProximity(lie: Lie): number {
  switch (lie) {
    case 'green':
      return 2;
    case 'fairway':
      return 6;
    case 'rough':
      return 8;
    case 'sand':
      return 9;
    case 'holed':
      return 0;
    default:
      return 6;
  }
}

function newHole(number: number, par: Par): Hole {
  return { id: uid(), number, par, shots: [], completed: false };
}

function newSession(benchmark: Benchmark): Session {
  return {
    id: uid(),
    date: new Date().toISOString(),
    player: DEFAULT_PLAYER,
    benchmark,
    holes: [newHole(1, 4)],
    archived: false,
  };
}

/** Lie + remaining distance the next shot will be played from. */
export function holeState(hole: Hole, holeLength: number) {
  if (hole.shots.length === 0) {
    return { lie: 'tee' as Lie, remaining: holeLength, count: 0 };
  }
  const last = hole.shots[hole.shots.length - 1];
  return {
    lie: last.toLie,
    remaining: last.remainingAfter,
    count: hole.shots.length,
  };
}

export interface AddShotInput {
  category: ShotCategory;
  toLie: Lie;
  /** GPS-measured travel distance (drive / approach). */
  measuredDistance?: number;
  /** Distance to the hole before the shot (short game slider / putt). */
  distanceBefore?: number;
  /** Distance to the hole after the shot (putt only; 0 = holed). */
  distanceAfter?: number;
  penalty?: number;
  holeLength: number;
  /** GPS position the shot was played from (drive / approach). */
  start?: GeoPoint;
  /** GPS position the ball came to rest at (drive / approach). */
  end?: GeoPoint;
}

type Action =
  | { type: 'hydrate'; session: Session }
  | { type: 'setBenchmark'; benchmark: Benchmark }
  | { type: 'setPlayer'; player: string }
  | { type: 'setPar'; par: Par }
  | { type: 'setPin'; pin: GeoPoint | null }
  | { type: 'setHoleLength'; lengthM: number | null }
  | { type: 'addShot'; input: AddShotInput }
  | { type: 'undoShot' }
  | { type: 'completeHole' }
  | { type: 'nextHole' }
  | { type: 'newRound' };

function currentHole(s: Session): Hole {
  return s.holes[s.holes.length - 1];
}

export function buildShot(
  hole: Hole,
  input: AddShotInput,
  benchmark: Benchmark,
): Shot {
  const { lie: trackedLie, remaining } = holeState(hole, input.holeLength);
  const number = hole.shots.length + 1;

  // Resolve the lie the shot is played from.
  let fromLie: Lie;
  if (input.category === 'drive') fromLie = 'tee';
  else if (input.category === 'putt') fromLie = 'green';
  else if (input.category === 'bunker') fromLie = 'sand';
  else if (number === 1) fromLie = 'fairway';
  else fromLie = trackedLie;

  // Exact distance-to-pin when the flag has been GPS-captured for this hole.
  const pin = hole.pin;
  const toPin = (p?: GeoPoint) =>
    pin && p ? haversine(p, pin) : undefined;

  // Tee baseline: prefer GPS (tee→pin), then a manual hole length.
  const holeLength =
    toPin(input.start) ?? hole.lengthM ?? input.holeLength;

  let distance: number;
  let distanceBefore: number;
  let remainingAfter: number;

  if (input.category === 'putt') {
    distanceBefore = input.distanceBefore ?? remaining;
    remainingAfter = input.toLie === 'holed' ? 0 : input.distanceAfter ?? 0;
    distance = distanceBefore;
  } else if (input.category === 'short' || input.category === 'bunker') {
    distanceBefore = input.distanceBefore ?? remaining;
    remainingAfter =
      input.toLie === 'holed' ? 0 : assumedProximity(input.toLie);
    distance = distanceBefore;
  } else {
    // drive / approach via GPS
    distance = input.measuredDistance ?? 0;
    // distanceBefore is the start→pin distance when the pin is known;
    // otherwise fall back to the tracked remaining (or hole length off the tee).
    distanceBefore =
      toPin(input.start) ?? (fromLie === 'tee' ? holeLength : remaining);
    remainingAfter =
      input.toLie === 'holed'
        ? 0
        : (toPin(input.end) ?? Math.max(0, distanceBefore - distance));
  }

  const penalty = input.penalty ?? 0;
  const sgValue = strokesGained({
    benchmark,
    fromLie,
    distanceBefore,
    toLie: input.toLie,
    distanceAfter: remainingAfter,
    penalty,
    holeLength,
  });

  return {
    id: uid(),
    number,
    category: input.category,
    fromLie,
    toLie: input.toLie,
    distance,
    remainingAfter,
    strokesGained: sgValue,
    penalty,
    start: input.start,
    end: input.end,
  };
}

/** Reconstruct the AddShotInput that produced a stored shot. */
function shotToInput(shot: Shot, fallbackLen: number): AddShotInput {
  const base = {
    toLie: shot.toLie,
    penalty: shot.penalty,
    holeLength: fallbackLen,
  };
  if (shot.category === 'putt') {
    return {
      ...base,
      category: 'putt',
      distanceBefore: shot.distance,
      distanceAfter: shot.remainingAfter,
    };
  }
  if (shot.category === 'short' || shot.category === 'bunker') {
    return { ...base, category: shot.category, distanceBefore: shot.distance };
  }
  return {
    ...base,
    category: shot.category,
    measuredDistance: shot.distance,
    start: shot.start,
    end: shot.end,
  };
}

/**
 * Re-score every shot of a hole from its stored inputs. Used when the pin or
 * hole length is set *after* shots were entered (you capture the flag at the
 * green), or when the benchmark changes — otherwise earlier shots keep their
 * approximate SG forever.
 */
export function rescoreHole(hole: Hole, benchmark: Benchmark): Hole {
  const fallbackLen = defaultHoleLength(hole.par);
  let rebuilt: Hole = { ...hole, shots: [] };
  for (const original of hole.shots) {
    const ns = buildShot(rebuilt, shotToInput(original, fallbackLen), benchmark);
    rebuilt = {
      ...rebuilt,
      shots: [
        ...rebuilt.shots,
        { ...ns, id: original.id, number: original.number },
      ],
    };
  }
  return rebuilt;
}

function rescoreCurrentHole(state: Session): Session {
  const holes = state.holes.slice();
  holes[holes.length - 1] = rescoreHole(
    holes[holes.length - 1],
    state.benchmark,
  );
  return { ...state, holes };
}

function reducer(state: Session, action: Action): Session {
  switch (action.type) {
    case 'hydrate':
      return action.session;
    case 'setBenchmark': {
      if (
        state.benchmark.kind === action.benchmark.kind &&
        (action.benchmark.kind === 'pro' ||
          (state.benchmark as { hc: number }).hc ===
            (action.benchmark as { hc: number }).hc)
      ) {
        return state;
      }
      // Re-score the whole round so every shot reflects the new benchmark.
      const next = { ...state, benchmark: action.benchmark };
      return {
        ...next,
        holes: next.holes.map((h) => rescoreHole(h, action.benchmark)),
      };
    }
    case 'setPlayer':
      return state.player === action.player
        ? state
        : { ...state, player: action.player };
    case 'setPar': {
      const holes = state.holes.slice();
      holes[holes.length - 1] = { ...currentHole(state), par: action.par };
      return rescoreCurrentHole({ ...state, holes });
    }
    case 'setPin': {
      const holes = state.holes.slice();
      holes[holes.length - 1] = {
        ...currentHole(state),
        pin: action.pin ?? undefined,
      };
      return rescoreCurrentHole({ ...state, holes });
    }
    case 'setHoleLength': {
      const holes = state.holes.slice();
      holes[holes.length - 1] = {
        ...currentHole(state),
        lengthM: action.lengthM ?? undefined,
      };
      return rescoreCurrentHole({ ...state, holes });
    }
    case 'addShot': {
      const hole = currentHole(state);
      if (hole.completed) return state;
      const shot = buildShot(hole, action.input, state.benchmark);
      const holes = state.holes.slice();
      holes[holes.length - 1] = { ...hole, shots: [...hole.shots, shot] };
      return { ...state, holes };
    }
    case 'undoShot': {
      const hole = currentHole(state);
      if (hole.shots.length === 0) return state;
      const holes = state.holes.slice();
      holes[holes.length - 1] = {
        ...hole,
        shots: hole.shots.slice(0, -1),
        completed: false,
      };
      return { ...state, holes };
    }
    case 'completeHole': {
      const hole = currentHole(state);
      if (hole.shots.length === 0) return state;
      const holes = state.holes.slice();
      holes[holes.length - 1] = { ...hole, completed: true };
      return { ...state, holes };
    }
    case 'nextHole': {
      const hole = currentHole(state);
      const holes = state.holes.slice();
      if (!hole.completed) holes[holes.length - 1] = { ...hole, completed: true };
      holes.push(newHole(hole.number + 1, hole.par));
      return { ...state, holes };
    }
    case 'newRound':
      return newSession(state.benchmark);
    default:
      return state;
  }
}

// ── Derived selectors ──────────────────────────────────────────────────────

export function allShots(s: Session): Shot[] {
  return s.holes.flatMap((h) => h.shots);
}

export function sectorOf(c: ShotCategory): keyof SectorAverages {
  if (c === 'drive') return 'drive';
  if (c === 'approach') return 'approach';
  if (c === 'putt') return 'putt';
  return 'short'; // short + bunker
}

export function sectorShotCounts(s: Session): SectorAverages {
  const acc: SectorAverages = { drive: 0, approach: 0, short: 0, putt: 0 };
  for (const shot of allShots(s)) acc[sectorOf(shot.category)] += 1;
  return acc;
}

export function sectorTotals(s: Session): SectorAverages {
  const acc: SectorAverages = { drive: 0, approach: 0, short: 0, putt: 0 };
  for (const shot of allShots(s)) acc[sectorOf(shot.category)] += shot.strokesGained;
  return {
    drive: +acc.drive.toFixed(2),
    approach: +acc.approach.toFixed(2),
    short: +acc.short.toFixed(2),
    putt: +acc.putt.toFixed(2),
  };
}

export function totalSg(s: Session): number {
  return +allShots(s)
    .reduce((sum, sh) => sum + sh.strokesGained, 0)
    .toFixed(2);
}

export function holesPlayed(s: Session): number {
  return s.holes.filter((h) => h.completed).length;
}

/** Performance handicap implied by this round (lower = better). */
export function perfHc(s: Session): number {
  const shots = allShots(s);
  if (shots.length === 0) return s.benchmark.kind === 'pro' ? 0 : s.benchmark.hc;
  const avg = totalSg(s) / shots.length;
  const base = s.benchmark.kind === 'pro' ? 0 : s.benchmark.hc;
  return Math.max(0, Math.min(54, Math.round(base - avg * 10)));
}

export function archive(s: Session): ArchivedSession {
  return {
    id: s.id,
    date: s.date,
    player: s.player,
    benchmark: s.benchmark,
    holesPlayed: Math.max(holesPlayed(s), s.holes.some((h) => h.shots.length) ? 1 : 0),
    shotsPlayed: allShots(s).length,
    totalStrokesGained: totalSg(s),
    sectors: sectorTotals(s),
    sectorShots: sectorShotCounts(s),
    perfHc: perfHc(s),
  };
}

// ── Context ────────────────────────────────────────────────────────────────

interface SessionCtx {
  session: Session;
  history: ArchivedSession[];
  dispatch: React.Dispatch<Action>;
  startNewRound: () => void;
  clearHistory: () => void;
}

const Ctx = createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, dispatch] = useReducer(
    reducer,
    null,
    () =>
      currentStore.load() ??
      newSession(loadBenchmarkPref() ?? { kind: 'hc', hc: 4 }),
  );
  const [history, setHistory] = useReducer(
    (_: ArchivedSession[], next: ArchivedSession[]) => next,
    null,
    () => historyStore.load(),
  );

  const { user, displayName } = useAuth();

  useEffect(() => {
    currentStore.save(session);
  }, [session]);

  // Remember the chosen handicap/PRO (local + cloud when signed in).
  useEffect(() => {
    saveBenchmarkPref(session.benchmark);
  }, [session.benchmark]);

  // Tag the round with the signed-in name, restore the account's saved
  // benchmark, and push local history once on login.
  useEffect(() => {
    if (!user) return;
    if (displayName) dispatch({ type: 'setPlayer', player: displayName });
    const saved = loadBenchmarkPref(user.user_metadata?.benchmark);
    if (saved) dispatch({ type: 'setBenchmark', benchmark: saved });
    void syncAllLocal();
  }, [user, displayName]);

  const value = useMemo<SessionCtx>(() => {
    const persistArchive = (s: Session) => {
      if (allShots(s).length === 0) return;
      const archived = archive(s);
      const next = [
        archived,
        ...historyStore.load().filter((h) => h.id !== archived.id),
      ];
      historyStore.save(next);
      setHistory(next);
      void syncSession(archived);
    };

    return {
      session,
      history,
      dispatch,
      startNewRound: () => {
        persistArchive(session);
        dispatch({ type: 'newRound' });
      },
      clearHistory: () => {
        historyStore.clear();
        setHistory([]);
        void deleteAllRemote();
      },
    };
  }, [session, history]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
