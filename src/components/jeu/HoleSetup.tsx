import { useState } from 'react';
import { useI18n } from '../../i18n';
import { useSession, holeState } from '../../state/session';
import { useToast } from '../Toast';
import { defaultHoleLength } from '../../lib/strokesGained';
import { haversine, type GpsController } from '../../lib/geo';
import type { Par } from '../../types';

/**
 * Per-hole setup: par, optional hole length, and optional GPS flag capture.
 * The pin position turns every drive/approach into an exact distance-to-pin
 * (true Strokes Gained) instead of a shot-length approximation.
 */
export function HoleSetup({ gps }: { gps: GpsController }) {
  const { t } = useI18n();
  const { session, dispatch } = useSession();
  const toast = useToast();

  const hole = session.holes[session.holes.length - 1];
  const { count } = holeState(hole, defaultHoleLength(hole.par));
  const [pinBusy, setPinBusy] = useState(false);

  const capturePin = async () => {
    setPinBusy(true);
    try {
      const r = await gps.capture();
      dispatch({ type: 'setPin', pin: r.point });
      toast(t('pinSet', { m: r.accuracy }));
    } catch {
      toast(t('gpsDenied'));
    } finally {
      setPinBusy(false);
    }
  };

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

      {hole.pin ? (
        <div
          className="step-done"
          style={{ marginTop: 14, justifyContent: 'space-between' }}
        >
          <span>{t('pinSet', { m: Math.round(hole.pin.accuracy ?? 0) })}</span>
          <button
            onClick={() => dispatch({ type: 'setPin', pin: null })}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--neg)',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {t('pinClear')}
          </button>
        </div>
      ) : null}

      {hole.pin && gps.current && (
        <div
          className="topin-live"
          aria-live="polite"
          style={{ marginTop: 10 }}
        >
          {t('toPinLive', {
            m: Math.round(haversine(gps.current, hole.pin)),
          })}
        </div>
      )}

      {!hole.pin && (
        <button
          className="btn ghost"
          style={{ marginTop: 14 }}
          onClick={capturePin}
          disabled={pinBusy}
        >
          {pinBusy ? t('pinCapturing') : t('pinCapture')}
        </button>
      )}
      <p className="hint">{t('pinHint')}</p>
    </div>
  );
}
