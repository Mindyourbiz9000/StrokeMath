import { useState } from 'react';
import { useI18n } from '../../i18n';
import { useSession, holeState } from '../../state/session';
import { defaultHoleLength } from '../../lib/strokesGained';
import type { Par } from '../../types';

/**
 * Per-hole setup: par + an optional (collapsed) hole-length override.
 * The par-based default already feeds the tee-shot baseline; the manual
 * field is hidden behind a small link so most rounds need only one tap.
 */
export function HoleSetup() {
  const { t } = useI18n();
  const { session, dispatch } = useSession();

  const hole = session.holes[session.holes.length - 1];
  const def = defaultHoleLength(hole.par);
  const { count } = holeState(hole, def);
  const [editing, setEditing] = useState<boolean>(!!hole.lengthM);
  const shown = hole.lengthM ?? def;

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

      {editing ? (
        <label className="field" style={{ display: 'block', marginTop: 14 }}>
          <span
            className="muted"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 11,
            }}
          >
            <span>{t('holeLength')}</span>
            <button
              onClick={() => {
                dispatch({ type: 'setHoleLength', lengthM: null });
                setEditing(false);
              }}
              className="inline-link"
            >
              {t('useDefault')}
            </button>
          </span>
          <input
            inputMode="numeric"
            value={hole.lengthM ?? ''}
            placeholder={String(def)}
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
      ) : (
        <div className="length-row">
          <span className="muted">≈ {shown} m</span>
          <button
            className="inline-link"
            onClick={() => setEditing(true)}
          >
            {t('editHoleLength')}
          </button>
        </div>
      )}
    </div>
  );
}
