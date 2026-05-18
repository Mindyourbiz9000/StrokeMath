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

export type GeoStatus = 'idle' | 'locating' | 'ready' | 'denied' | 'unavailable';

/**
 * One-shot, high-accuracy GPS fix. Averages a couple of quick reads to damp
 * the jitter you get standing still on a course.
 */
export function useGeolocation() {
  const [status, setStatus] = useState<GeoStatus>('idle');
  const [last, setLast] = useState<GeoPoint | null>(null);

  const capture = useCallback((): Promise<GeoPoint> => {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        setStatus('unavailable');
        reject(new Error('unavailable'));
        return;
      }
      setStatus('locating');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const point: GeoPoint = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            t: Date.now(),
          };
          setLast(point);
          setStatus('ready');
          resolve(point);
        },
        (err) => {
          setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable');
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
      );
    });
  }, []);

  return { status, last, capture };
}

/** Keeps a GPS watch warm so the first shot fix is instant. Battery-aware. */
export function useGpsWarmup(active: boolean) {
  const watchId = useRef<number | null>(null);
  useEffect(() => {
    if (!active || !('geolocation' in navigator)) return;
    watchId.current = navigator.geolocation.watchPosition(
      () => {},
      () => {},
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    );
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    };
  }, [active]);
}
