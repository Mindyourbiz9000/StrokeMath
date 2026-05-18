import { useCallback, useEffect, useRef, useState } from 'react';
import type { GeoPoint } from '../types';

const EARTH_RADIUS_M = 6_371_000;

/** Great-circle distance between two points, in metres. */
export function haversine(a: GeoPoint, b: GeoPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Uncertainty (m) on a distance built from two fixes of given accuracies. */
export function combinedAccuracy(a?: number, b?: number): number {
  return Math.round(Math.hypot(a ?? 0, b ?? 0));
}

export type GeoStatus =
  | 'idle'
  | 'acquiring'
  | 'ready'
  | 'denied'
  | 'unavailable';

export type GeoPermission =
  | 'unknown'
  | 'prompt'
  | 'granted'
  | 'denied'
  | 'unsupported';

export interface CaptureResult {
  point: GeoPoint;
  /** Effective accuracy of the averaged fix, in metres. */
  accuracy: number;
  /** Number of GPS samples that went into the average. */
  samples: number;
}

interface CaptureOpts {
  /** Stop early once a fix at least this accurate arrives (m). */
  targetAccuracy?: number;
  /** Hard cap on how long to keep sampling (ms). */
  maxWaitMs?: number;
}

/**
 * Production GPS controller for on-course use.
 *
 * A single browser `getCurrentPosition` fix is typically 5–20 m off — far too
 * coarse to measure a golf shot. This keeps a continuous high-accuracy watch
 * warm and, on `capture()`, averages the best samples taken while the player
 * stands still, returning a fix plus its effective accuracy.
 */
export function useGps() {
  const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  const [status, setStatus] = useState<GeoStatus>(
    supported ? 'idle' : 'unavailable',
  );
  const [permission, setPermission] = useState<GeoPermission>(
    supported ? 'unknown' : 'unsupported',
  );
  const [current, setCurrent] = useState<GeoPoint | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const watchId = useRef<number | null>(null);
  const buffer = useRef<GeoPoint[]>([]);
  const mounted = useRef(true);

  // Reflect the browser permission state when the Permissions API exists.
  useEffect(() => {
    if (!supported || !('permissions' in navigator)) return;
    let perm: PermissionStatus | null = null;
    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((p) => {
        perm = p;
        const sync = () => mounted.current && setPermission(p.state as GeoPermission);
        sync();
        p.onchange = sync;
      })
      .catch(() => {});
    return () => {
      if (perm) perm.onchange = null;
    };
  }, [supported]);

  const handleSample = useCallback((pos: GeolocationPosition) => {
    const point: GeoPoint = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      t: Date.now(),
    };
    // Keep a short rolling buffer (~last 12 fixes) for averaging.
    const buf = buffer.current;
    buf.push(point);
    if (buf.length > 12) buf.shift();
    if (!mounted.current) return;
    setCurrent(point);
    setAccuracy(Math.round(point.accuracy ?? 0));
    setStatus('ready');
    setPermission('granted');
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    if (!mounted.current) return;
    if (err.code === err.PERMISSION_DENIED) {
      setStatus('denied');
      setPermission('denied');
    } else {
      setStatus('unavailable');
    }
  }, []);

  const startWatch = useCallback(() => {
    if (!supported || watchId.current != null) return;
    setStatus((s) => (s === 'ready' ? s : 'acquiring'));
    watchId.current = navigator.geolocation.watchPosition(
      handleSample,
      handleError,
      { enableHighAccuracy: true, maximumAge: 2_000, timeout: 25_000 },
    );
  }, [supported, handleSample, handleError]);

  const stopWatch = useCallback(() => {
    if (watchId.current != null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopWatch();
    };
  }, [stopWatch]);

  /** Explicitly trigger the OS permission prompt from a user gesture. */
  const requestPermission = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!supported) {
        reject(new Error('unsupported'));
        return;
      }
      setStatus('acquiring');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handleSample(pos);
          startWatch();
          resolve();
        },
        (err) => {
          handleError(err);
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
      );
    });
  }, [supported, handleSample, handleError, startWatch]);

  /**
   * Average the best recent samples into one fix. Resolves quickly once a
   * sufficiently accurate fix is in hand, otherwise keeps sampling up to
   * `maxWaitMs` and returns the best estimate available.
   */
  const capture = useCallback(
    (opts: CaptureOpts = {}): Promise<CaptureResult> => {
      const targetAccuracy = opts.targetAccuracy ?? 6;
      const maxWaitMs = opts.maxWaitMs ?? 5_000;

      return new Promise((resolve, reject) => {
        if (!supported) {
          reject(new Error('unsupported'));
          return;
        }
        startWatch();
        buffer.current = [];
        const startedAt = Date.now();

        const finish = () => {
          const all = buffer.current.slice();
          if (all.length === 0) {
            reject(new Error('no-fix'));
            return;
          }
          // Keep samples within 1.6× of the best accuracy, weight by 1/acc².
          const best = Math.min(...all.map((p) => p.accuracy ?? 9999));
          const kept = all.filter((p) => (p.accuracy ?? 9999) <= best * 1.6);
          let wsum = 0;
          let lat = 0;
          let lng = 0;
          for (const p of kept) {
            const w = 1 / Math.max(1, (p.accuracy ?? 9999) ** 2);
            wsum += w;
            lat += p.lat * w;
            lng += p.lng * w;
          }
          const point: GeoPoint = {
            lat: lat / wsum,
            lng: lng / wsum,
            accuracy: best,
            t: Date.now(),
          };
          resolve({
            point,
            accuracy: Math.round(best),
            samples: kept.length,
          });
        };

        const tick = () => {
          const buf = buffer.current;
          const best = buf.length
            ? Math.min(...buf.map((p) => p.accuracy ?? 9999))
            : Infinity;
          const elapsed = Date.now() - startedAt;
          // Good enough with a couple of corroborating samples, or timed out.
          if ((best <= targetAccuracy && buf.length >= 3) || elapsed >= maxWaitMs) {
            window.clearInterval(timer);
            finish();
          }
        };
        const timer = window.setInterval(tick, 350);
      });
    },
    [supported, startWatch],
  );

  return {
    supported,
    status,
    permission,
    current,
    accuracy,
    startWatch,
    stopWatch,
    requestPermission,
    capture,
  };
}

export type GpsController = ReturnType<typeof useGps>;

/** Keep the screen awake during a round (re-acquires after tab switches). */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let released = false;

    const acquire = async () => {
      try {
        lock = await (navigator as Navigator).wakeLock.request('screen');
      } catch {
        /* denied / not visible — harmless */
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !released) void acquire();
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      released = true;
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => {});
    };
  }, [active]);
}
