import { useI18n } from '../../i18n';
import { useSession } from '../../state/session';
import { useToast } from '../Toast';
import { sessionToCsv, downloadCsv } from '../../lib/csv';
import { shortDate } from '../../lib/format';
import type { GpsController } from '../../lib/geo';

export function TopBar({ gps }: { gps: GpsController }) {
  const { t } = useI18n();
  const { session, startNewRound } = useSession();
  const toast = useToast();

  const acc = gps.accuracy;
  const live = gps.status === 'ready';
  const acquiring = gps.status === 'acquiring';
  const denied = gps.status === 'denied' || gps.permission === 'denied';

  const pillClass = denied
    ? 'gps-pill denied'
    : live || acquiring
      ? 'gps-pill live'
      : 'gps-pill';

  const pillText = denied
    ? t('gpsDenied')
    : acquiring
      ? t('gpsAcquiring')
      : live && acc != null
        ? t('gpsAccuracy', { m: acc })
        : t('gpsReady');

  const accClass =
    acc == null ? '' : acc <= 6 ? 'pos' : acc <= 12 ? 'gold' : 'neg';

  const exportCsv = () => {
    const csv = sessionToCsv(session);
    downloadCsv(`strokemath-${shortDate(session.date).replace(/\//g, '-')}.csv`, csv);
  };

  const onNewGame = () => {
    if (window.confirm(t('newGameConfirm'))) {
      startNewRound();
      toast(t('sessionSaved'));
    }
  };

  const enableGps = () => {
    gps.requestPermission().catch(() => toast(t('gpsDenied')));
  };

  return (
    <>
      <div className="topbar" style={{ marginTop: 12 }}>
        <div className={pillClass}>
          <span className="dot" />
          <span className={accClass}>{pillText}</span>
        </div>
        <button className="btn-sq" onClick={exportCsv}>
          📄{'\n'}
          {t('csv')}
        </button>
        <button className="btn-sq danger" onClick={onNewGame}>
          {t('newGame')}
        </button>
      </div>

      {gps.permission !== 'granted' && gps.status !== 'ready' && (
        <div className="card" style={{ borderColor: 'var(--gold)' }}>
          <button className="btn gold" onClick={enableGps}>
            {t('gpsEnable')}
          </button>
          <p className="hint">
            {denied ? t('gpsDeniedHelp') : t('gpsEnableHint')}
          </p>
        </div>
      )}
    </>
  );
}
