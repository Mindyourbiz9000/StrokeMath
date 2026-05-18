import { useI18n } from '../../i18n';
import { useSession } from '../../state/session';
import { useToast } from '../Toast';
import { sessionToCsv, downloadCsv } from '../../lib/csv';
import { shortDate } from '../../lib/format';
import type { GeoStatus } from '../../lib/geo';

export function TopBar({ gps }: { gps: GeoStatus }) {
  const { t } = useI18n();
  const { session, startNewRound } = useSession();
  const toast = useToast();

  const pillClass =
    gps === 'ready' || gps === 'locating'
      ? 'gps-pill live'
      : gps === 'denied' || gps === 'unavailable'
        ? 'gps-pill denied'
        : 'gps-pill';

  const pillText =
    gps === 'ready'
      ? t('gpsReady')
      : gps === 'locating'
        ? t('gpsLocating')
        : gps === 'denied'
          ? t('gpsDenied')
          : gps === 'unavailable'
            ? t('gpsUnavailable')
            : t('gpsPaused', { mode: t('modePutting') });

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

  return (
    <div className="topbar" style={{ marginTop: 12 }}>
      <div className={pillClass}>
        <span className="dot" />
        {pillText}
      </div>
      <button className="btn-sq" onClick={exportCsv}>
        📄{'\n'}
        {t('csv')}
      </button>
      <button className="btn-sq danger" onClick={onNewGame}>
        {t('newGame')}
      </button>
    </div>
  );
}
