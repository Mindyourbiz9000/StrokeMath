import { useI18n } from '../../i18n';
import {
  allShots,
  holesPlayed,
  sectorTotals,
  totalSg,
  useSession,
} from '../../state/session';
import { sg } from '../../lib/format';

function Sector({ name, value }: { name: string; value: number }) {
  return (
    <div className="sector">
      <div className="name">{name}</div>
      <div className={`val ${value >= 0 ? 'pos' : 'neg'}`}>{sg(value)}</div>
    </div>
  );
}

export function SessionSummary({ onConsult }: { onConsult: () => void }) {
  const { t } = useI18n();
  const { session } = useSession();
  const sectors = sectorTotals(session);
  const total = totalSg(session);
  const holes = Math.max(
    holesPlayed(session),
    session.holes.some((h) => h.shots.length) ? 1 : 0,
  );
  const shots = allShots(session).length;

  return (
    <div className="card">
      <div className="section-label">📊 {t('sessionSummary')}</div>
      <div className="summary-meta">
        <span>{t('holesCount', { n: holes, s: holes > 1 ? 'S' : '' })}</span>
        <span>·</span>
        <span>{t('shotsCount', { n: shots, s: shots > 1 ? 'S' : '' })}</span>
      </div>
      <div className="sector-grid">
        <Sector name={`⛳ ${t('sectorDrive')}`} value={sectors.drive} />
        <Sector name={`🎯 ${t('sectorApproach')}`} value={sectors.approach} />
        <Sector name={`🟢 ${t('sectorShort')}`} value={sectors.short} />
        <Sector name={`🥏 ${t('sectorPutt')}`} value={sectors.putt} />
      </div>
      <div className="total-row">
        <span>{t('totalSgSession')}</span>
        <span className={`big ${total >= 0 ? 'pos' : 'neg'}`}>{sg(total)}</span>
      </div>
      <button
        className="btn ghost"
        style={{ marginTop: 12 }}
        onClick={onConsult}
      >
        📋 {t('consultReport')}
      </button>
    </div>
  );
}
