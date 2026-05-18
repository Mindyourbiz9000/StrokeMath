import { useGeolocation, useGpsWarmup } from '../../lib/geo';
import { TopBar } from './TopBar';
import { SessionSummary } from './SessionSummary';
import { BenchmarkSelector } from './BenchmarkSelector';
import { Readout } from './Readout';
import { ShotEntry } from './ShotEntry';
import { ShotHistory } from './ShotHistory';

export function JeuPage({ onConsult }: { onConsult: () => void }) {
  const geo = useGeolocation();
  // Keep a GPS lock warm once the player has been located once.
  useGpsWarmup(geo.status === 'ready' || geo.status === 'locating');

  return (
    <>
      <TopBar gps={geo.status} />
      <SessionSummary onConsult={onConsult} />
      <BenchmarkSelector />
      <Readout />
      <ShotEntry geo={geo} />
      <ShotHistory />
    </>
  );
}
