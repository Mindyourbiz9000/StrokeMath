import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n';
import { useSession, holeState } from '../../state/session';
import { useToast } from '../Toast';

const round1 = (x: number) => Math.round(x * 10) / 10;
const clamp = (x: number) => Math.min(30, Math.max(0.1, round1(x)));

const PUTT_CHIPS = [0.5, 1, 1.5, 2, 3, 4, 6, 8, 12];
const LEAVE_CHIPS = [0.2, 0.3, 0.5, 0.7, 1, 1.5, 2];

/**
 * Tap-first putt logging: pick a distance (chips + ±10 cm + fine slider, no
 * keyboard), then Holed or Missed. A missed putt carries its leave straight
 * into the next putt's distance.
 */
export function PuttEntry({ holeLength }: { holeLength: number }) {
  const { t } = useI18n();
  const { session, dispatch } = useSession();
  const toast = useToast();

  const hole = session.holes[session.holes.length - 1];
  const { lie, remaining, count } = holeState(hole, holeLength);
  const seed =
    lie === 'green' && remaining > 0 && remaining <= 25 ? round1(remaining) : 3;

  const [len, setLen] = useState(seed);
  const [phase, setPhase] = useState<'putt' | 'leave'>('putt');
  const [leave, setLeave] = useState(0.5);

  // Reset to the hole's seed distance when switching holes.
  useEffect(() => {
    setLen(seed);
    setPhase('putt');
    setLeave(0.5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hole.id]);

  const save = (holed: boolean) => {
    dispatch({
      type: 'addShot',
      input: {
        category: 'putt',
        toLie: holed ? 'holed' : 'green',
        distanceBefore: len,
        distanceAfter: holed ? 0 : leave,
        holeLength,
      },
    });
    toast(t('shotSaved'));
    if (holed) {
      setLen(seed);
    } else {
      setLen(leave); // the leave becomes the next putt
    }
    setPhase('putt');
    setLeave(0.5);
  };

  const value = phase === 'putt' ? len : leave;
  const setValue = phase === 'putt' ? setLen : setLeave;
  const chips = phase === 'putt' ? PUTT_CHIPS : LEAVE_CHIPS;

  return (
    <div className="card">
      <div className="section-label">🥏 {t('puttingTitle')}</div>

      <div className="muted center" style={{ fontSize: 12, letterSpacing: 1 }}>
        {phase === 'putt'
          ? `${t('puttLength')} · ${t('puttNo', { n: count + 1 })}`
          : t('leaveLabel')}
      </div>

      <div className="bignum" style={{ marginTop: 6 }}>
        {value.toFixed(2)}{' '}
        <span style={{ fontSize: 22 }}>m</span>
      </div>

      <div className="stepper" style={{ justifyContent: 'center', gap: 18 }}>
        <button onClick={() => setValue(clamp(value - 0.1))} aria-label="-10cm">
          −
        </button>
        <span className="muted" style={{ fontSize: 12 }}>
          ± 10 cm
        </span>
        <button onClick={() => setValue(clamp(value + 0.1))} aria-label="+10cm">
          +
        </button>
      </div>

      <input
        type="range"
        min={0.1}
        max={25}
        step={0.1}
        value={Math.min(value, 25)}
        onChange={(e) => setValue(clamp(Number(e.target.value)))}
      />
      <div className="range-ends">
        <span>0.1 m</span>
        <span>25 m</span>
      </div>

      <div className="chips" style={{ marginTop: 14, justifyContent: 'center' }}>
        {chips.map((c) => (
          <button
            key={c}
            className={`chip ${value === c ? 'sel' : ''}`}
            onClick={() => setValue(c)}
          >
            {c} m
          </button>
        ))}
      </div>

      {phase === 'putt' ? (
        <>
          <button
            className="btn green-fill"
            style={{ marginTop: 18 }}
            onClick={() => save(true)}
          >
            {t('holedIt')}
          </button>
          <button
            className="btn ghost"
            style={{ marginTop: 10 }}
            onClick={() => {
              setLeave(0.5);
              setPhase('leave');
            }}
          >
            {t('missedPutt')}
          </button>
        </>
      ) : (
        <>
          <button
            className="btn green-fill"
            style={{ marginTop: 18 }}
            onClick={() => save(false)}
          >
            {t('confirmLeave')}
          </button>
          <button
            className="btn ghost"
            style={{ marginTop: 10 }}
            onClick={() => setPhase('putt')}
          >
            {t('back')}
          </button>
        </>
      )}

      <p className="hint center">{t('puttTapHint')}</p>
    </div>
  );
}
