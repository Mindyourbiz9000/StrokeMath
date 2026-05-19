import { Line, Bar } from 'react-chartjs-2';
import { GREEN, GREEN_DIM, GRID, TICK } from './charts';
import { useI18n } from '../../i18n';
import { useSession } from '../../state/session';
import { sg, shortDate, benchmarkLabel } from '../../lib/format';
import type { SectorAverages } from '../../types';

export function EvolutionPage() {
  const { t } = useI18n();
  const { history, clearHistory } = useSession();

  const ordered = history.slice().reverse(); // oldest → newest for the line

  // Honest metric: total Strokes Gained per round over time.
  const hcData = {
    labels: ordered.map((s) => shortDate(s.date)),
    datasets: [
      {
        data: ordered.map((s) => s.totalStrokesGained),
        borderColor: GREEN,
        backgroundColor: GREEN_DIM,
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: GREEN,
      },
    ],
  };

  const sectors: (keyof SectorAverages)[] = [
    'drive',
    'approach',
    'short',
    'putt',
  ];
  // True average SG *per shot*: Σ sector SG ÷ Σ sector shots, across the
  // rounds that recorded shot counts. Falls back to the per-round mean for
  // legacy rounds saved before counts were tracked.
  const withCounts = history.filter((s) => s.sectorShots);
  const sectorAvg = sectors.map((k) => {
    if (withCounts.length > 0) {
      const sgSum = withCounts.reduce((a, s) => a + s.sectors[k], 0);
      const nSum = withCounts.reduce(
        (a, s) => a + (s.sectorShots?.[k] ?? 0),
        0,
      );
      return nSum > 0 ? +(sgSum / nSum).toFixed(3) : 0;
    }
    if (history.length === 0) return 0;
    const sum = history.reduce((acc, s) => acc + s.sectors[k], 0);
    return +(sum / history.length).toFixed(3);
  });

  const sectorData = {
    labels: [
      t('sectorDrive'),
      t('sectorApproach'),
      t('sectorShort'),
      t('sectorPutt'),
    ],
    datasets: [
      {
        data: sectorAvg,
        backgroundColor: ['#64d2ff', GREEN, '#bf5af2', '#2ee6d6'],
        borderRadius: 6,
      },
    ],
  };

  return (
    <>
      <div className="card">
        <div className="section-label">📈 {t('sgTrend')}</div>
        {history.length === 0 ? (
          <div className="empty">{t('noSessions')}</div>
        ) : (
          <Line
            data={hcData}
            options={{
              plugins: { legend: { display: false } },
              scales: {
                y: {
                  grid: { color: GRID },
                  ticks: { color: TICK },
                  title: { display: true, text: t('sgTrendAxis'), color: TICK },
                },
                x: { grid: { color: GRID }, ticks: { color: TICK } },
              },
            }}
            height={180}
          />
        )}
      </div>

      <div className="card">
        <div className="section-label">📊 {t('sgPerSector')}</div>
        <Bar
          data={sectorData}
          options={{
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) =>
                    t('sgPerShot', { v: sg(Number(ctx.parsed.y)) }),
                },
              },
            },
            scales: {
              y: {
                grid: { color: GRID },
                ticks: { color: TICK },
                title: { display: true, text: t('sgAxis'), color: TICK },
              },
              x: { grid: { color: GRID }, ticks: { color: TICK } },
            },
          }}
          height={180}
        />
      </div>

      <div className="card">
        <div
          className="section-label"
          style={{ justifyContent: 'space-between' }}
        >
          <span>📒 {t('last10')}</span>
          {history.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm(t('clearConfirm'))) clearHistory();
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--red)',
                fontSize: 11,
                letterSpacing: 1,
              }}
            >
              {t('clear')}
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <div className="empty">{t('noSessions')}</div>
        ) : (
          history.slice(0, 10).map((s) => (
            <div
              key={s.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: '1px solid var(--line-soft)',
              }}
            >
              <div>
                <div style={{ fontSize: 13 }}>{shortDate(s.date)}</div>
                <div style={{ fontSize: 12, color: 'var(--green-soft)' }}>
                  {s.player} ·{' '}
                  {t('roundLine', {
                    holes: s.holesPlayed,
                    shots: s.shotsPlayed,
                  })}
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                  {t('benchmarkShort', { b: benchmarkLabel(s.benchmark) })}
                </div>
              </div>
              <div
                className={s.totalStrokesGained >= 0 ? 'pos' : 'neg'}
                style={{ fontSize: 18, fontWeight: 800 }}
              >
                {sg(s.totalStrokesGained)}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="cta">
        <div className="tg">{t('insightsTag')}</div>
        <h3>{t('insightsTitle')}</h3>
        <p>{t('insightsBody')}</p>
      </div>
    </>
  );
}
