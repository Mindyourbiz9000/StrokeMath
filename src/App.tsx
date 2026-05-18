import { useState } from 'react';
import { Header } from './components/Header';
import { TabBar, type Tab } from './components/TabBar';
import { JeuPage } from './components/jeu/JeuPage';
import { EvolutionPage } from './components/evolution/EvolutionPage';

export function App() {
  const [tab, setTab] = useState<Tab>('play');
  return (
    <div className="app">
      <Header />
      <div className="scroll" key={tab}>
        {tab === 'play' ? (
          <JeuPage onConsult={() => setTab('evolution')} />
        ) : (
          <EvolutionPage />
        )}
      </div>
      <TabBar tab={tab} onChange={setTab} />
    </div>
  );
}
