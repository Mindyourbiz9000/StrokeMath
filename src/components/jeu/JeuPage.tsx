import { useEffect } from 'react';
import { useGpsCtx } from '../../lib/gpsContext';
import { TopBar } from './TopBar';
import { SessionSummary } from './SessionSummary';
import { BenchmarkSelector } from './BenchmarkSelector';
import { Readout } from './Readout';
import { ShotEntry } from './ShotEntry';
import { ShotHistory } from './ShotHistory';

export function JeuPage({ onConsult }: { onConsult: () => void }) {
  const gps = useGpsCtx();

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
