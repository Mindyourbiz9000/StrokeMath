import { useI18n } from '../../i18n';
import { useSession, allShots } from '../../state/session';
import { sg } from '../../lib/format';

export function Readout() {
  const { t } = useI18n();
  const { session } = useSession();
  const shots = allShots(session);
  const last = shots[shots.length - 1];
  const dist = last?.distance ?? 0;
  const sgv = last?.strokesGained ?? 0;
  const positive = sgv >= 0;

  return (
    <div className="card">
      <div className="readout" aria-live="polite">
        <div>
          <div className="label">{t('distance')}</div>
          <div className="num pos">{dist.toFixed(2)}</div>
          <div className="unit">{t('meters')}</div>
        </div>
        <div>
          <div className="label">{t('strokesGained')}</div>
          <div className={`num ${positive ? 'pos' : 'neg'}`}>{sg(sgv)}</div>
          <div className={`trend ${positive ? 'pos' : 'neg'}`}>
            {positive ? '▲' : '▼'} {positive ? t('gain') : t('loss')}
          </div>
        </div>
      </div>
    </div>
  );
}
