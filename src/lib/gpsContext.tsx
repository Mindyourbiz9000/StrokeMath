import { createContext, useContext, type ReactNode } from 'react';
import { useGps, type GpsController } from './geo';

const GpsContext = createContext<GpsController | null>(null);

/**
 * Owns the single GPS watch for the whole app. Lives ABOVE the tab switch so
 * peeking at the Évolution tab doesn't tear down and re-acquire the fix
 * (which cost an extra lock + battery every time).
 */
export function GpsProvider({ children }: { children: ReactNode }) {
  const gps = useGps();
  return <GpsContext.Provider value={gps}>{children}</GpsContext.Provider>;
}

export function useGpsCtx(): GpsController {
  const ctx = useContext(GpsContext);
  if (!ctx) throw new Error('useGpsCtx must be used within GpsProvider');
  return ctx;
}
