import { lazy, Suspense, useEffect, useState } from 'react';
import { Header } from './components/Header';
import { TabBar, type Tab } from './components/TabBar';
import { JeuPage } from './components/jeu/JeuPage';
import { Home } from './components/Home';
import { PwaStatus } from './components/PwaStatus';
import { GpsProvider } from './lib/gpsContext';
import { useWakeLock } from './lib/geo';

// Évolution pulls in Chart.js — load it only when that tab is opened.
const EvolutionPage = lazy(() =>
  import('./components/evolution/EvolutionPage').then((m) => ({
    default: m.EvolutionPage,
  })),
);

type View = 'home' | 'app';
const ENTERED_KEY = 'shotiq.entered';

export function App() {
  const [view, setView] = useState<View>(() =>
    localStorage.getItem(ENTERED_KEY) === '1' ? 'app' : 'home',
  );
  const [tab, setTab] = useState<Tab>('play');

  useEffect(() => {
    if (view === 'app') localStorage.setItem(ENTERED_KEY, '1');
  }, [view]);

  // Keep the screen awake for the whole round, not per tab/component.
  useWakeLock(view === 'app');

  if (view === 'home') {
    return <Home onEnter={() => setView('app')} />;
  }

  return (
    <GpsProvider>
      <div className="app">
        <Header onHome={() => setView('home')} />
        <div className="scroll" key={tab}>
          {tab === 'play' ? (
            <JeuPage onConsult={() => setTab('evolution')} />
          ) : (
            <Suspense fallback={<div className="empty">…</div>}>
              <EvolutionPage />
            </Suspense>
          )}
        </div>
        <TabBar tab={tab} onChange={setTab} />
        <PwaStatus />
      </div>
    </GpsProvider>
  );
}
