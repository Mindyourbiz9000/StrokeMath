import { useI18n } from '../../i18n';
import { useSession, holeState } from '../../state/session';
import { defaultHoleLength } from '../../lib/strokesGained';
import type { Par } from '../../types';

/**
 * Per-hole setup: par + optional hole length (used as the tee baseline).
 * Walking to the flag to GPS the pin isn't a realistic on-course flow, so
 * that button is removed; the `hole.pin` data model stays in place for a
 * future map-tap pin placement.
 */
export function HoleSetup() {
  const { t } = useI18n();
  const { session, dispatch } = useSession();

  const hole = session.holes[session.holes.length - 1];
  const { count } = holeState(hole, defaultHoleLength(hole.par));

  return (
    <div className="card">
      <div className="section-label">⛳ {t('par')}</div>
      <div className="chips">
        {([3, 4, 5] as Par[]).map((p) => (
          <button
            key={p}
            className={`chip ${hole.par === p ? 'sel' : ''}`}
            disabled={count > 0}
            onClick={() => dispatch({ type: 'setPar', par: p })}
          >
            {t(`par${p}` as 'par3' | 'par4' | 'par5')}
          </button>
        ))}
      </div>

      <label className="field" style={{ display: 'block', marginTop: 14 }}>
        <span className="muted" style={{ fontSize: 11 }}>
          {t('holeLength')}
        </span>
        <input
          inputMode="numeric"
          value={hole.lengthM ?? ''}
          placeholder={String(defaultHoleLength(hole.par))}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '');
            dispatch({
              type: 'setHoleLength',
              lengthM: v ? Number(v) : null,
            });
          }}
          style={{ fontSize: 20 }}
        />
      </label>
      <p className="hint">{t('holeLengthHint')}</p>
    </div>
  );
}
