import { useEffect } from 'react';
import { useGps, useWakeLock } from '../../lib/geo';
import { TopBar } from './TopBar';
import { SessionSummary } from './SessionSummary';
import { BenchmarkSelector } from './BenchmarkSelector';
import { Readout } from './Readout';
import { ShotEntry } from './ShotEntry';
import { ShotHistory } from './ShotHistory';

export function JeuPage({ onConsult }: { onConsult: () => void }) {
  const gps = useGps();
  // Keep the screen awake while playing so a round isn't interrupted.
  useWakeLock(true);

  // Warm the GPS watch as soon as permission is already granted.
  useEffect(() => {
    if (gps.permission === 'granted') gps.startWatch();
  }, [gps.permission, gps.startWatch]);

  return (
    <>
      <TopBar gps={gps} />
      <SessionSummary onConsult={onConsult} />
      <BenchmarkSelector />
      <Readout />
      <ShotEntry gps={gps} />
      <ShotHistory />
    </>
  );
}
