import { useI18n } from '../../i18n';
import { useSession } from '../../state/session';
import { benchmarkReference } from '../../lib/strokesGained';
import type { Benchmark } from '../../types';

const HC_RANGE = Array.from({ length: 36 }, (_, i) => i + 1);

export function BenchmarkSelector() {
  const { t } = useI18n();
  const { session, dispatch } = useSession();
  const b = session.benchmark;
  const ref = benchmarkReference(b);

  const onChange = (v: string) => {
    const benchmark: Benchmark =
      v === 'pro' ? { kind: 'pro' } : { kind: 'hc', hc: Number(v) };
    dispatch({ type: 'setBenchmark', benchmark });
  };

  return (
    <div className="card">
      <div className="section-label">📐 {t('comparisonLevel')}</div>
      <label className="field">
        <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: 1 }}>
          {t('chooseHandicap')}
        </span>
        <select
          className="select"
          value={b.kind === 'pro' ? 'pro' : String(b.hc)}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="pro">{t('pro')}</option>
          {HC_RANGE.map((h) => (
            <option key={h} value={h}>
              {t('hc', { n: h })}
            </option>
          ))}
        </select>
      </label>
      <div
        className="sector-grid"
        style={{ marginTop: 12, gridTemplateColumns: '1fr 1fr 1fr' }}
      >
        <RefCard label={t('ref137')} value={ref.approach137} t={t('expectedShots')} />
        <RefCard label={t('refPutt1')} value={ref.putt1} t={t('expectedShots')} />
        <RefCard label={t('refPutt6')} value={ref.putt6} t={t('expectedShots')} />
      </div>
    </div>
  );
}

function RefCard({ label, value, t }: { label: string; value: number; t: string }) {
  return (
    <div className="sector" style={{ textAlign: 'center' }}>
      <div className="name">{label}</div>
      <div className="val gold">{value.toFixed(2)}</div>
      <div className="name">{t}</div>
    </div>
  );
}
