import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { TabBar, type Tab } from './components/TabBar';
import { JeuPage } from './components/jeu/JeuPage';
import { EvolutionPage } from './components/evolution/EvolutionPage';
import { Home } from './components/Home';
import { GpsProvider } from './lib/gpsContext';
import { useWakeLock } from './lib/geo';

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
            <EvolutionPage />
          )}
        </div>
        <TabBar tab={tab} onChange={setTab} />
      </div>
    </GpsProvider>
  );
}
