import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n';
import { useSession } from '../../state/session';
import { useToast } from '../Toast';
import { haversine, combinedAccuracy, type GpsController } from '../../lib/geo';
import { defaultHoleLength } from '../../lib/strokesGained';
import { PuttEntry } from './PuttEntry';
import { HoleSetup } from './HoleSetup';
import type { GeoPoint, Lie, ShotCategory } from '../../types';

const CATEGORIES: { id: ShotCategory; t: string; s: string }[] = [
  { id: 'drive', t: 'catDrive', s: 'catDriveSub' },
  { id: 'approach', t: 'catApproach', s: 'catApproachSub' },
  { id: 'short', t: 'catShort', s: 'catShortSub' },
  { id: 'bunker', t: 'catBunker', s: 'catBunkerSub' },
  { id: 'putt', t: 'catPutt', s: 'catPuttSub' },
];

const LANDING: { lie: Lie; t: string; danger?: boolean }[] = [
  { lie: 'fairway', t: 'lieFairway' },
  { lie: 'rough', t: 'lieRough' },
  { lie: 'sand', t: 'lieBunker' },
  { lie: 'green', t: 'lieGreen' },
  { lie: 'recovery', t: 'lieObstacle', danger: true },
  { lie: 'holed', t: 'lieHoled' },
];

export function ShotEntry({ gps }: { gps: GpsController }) {
  const { t } = useI18n();
  const { session, dispatch } = useSession();
  const toast = useToast();

  const hole = session.holes[session.holes.length - 1];
  const [category, setCategory] = useState<ShotCategory>('drive');
  const [toLie, setToLie] = useState<Lie | null>(null);
  const [penalty, setPenalty] = useState(0);

  // GPS capture
  const [startPt, setStartPt] = useState<GeoPoint | null>(null);
  const [endPt, setEndPt] = useState<GeoPoint | null>(null);
  const [startAcc, setStartAcc] = useState<number | null>(null);
  const [measured, setMeasured] = useState<number | null>(null);
  const [measuredAcc, setMeasuredAcc] = useState<number | null>(null);
  const [busy, setBusy] = useState<null | 'start' | 'stop'>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manual, setManual] = useState('');

  // Short game
  const [shortDist, setShortDist] = useState(20);

  const holeLength = useMemo(() => defaultHoleLength(hole.par), [hole.par]);

  // Reset transient state whenever the category or hole/shot changes.
  useEffect(() => {
    setToLie(null);
    setStartPt(null);
    setEndPt(null);
    setStartAcc(null);
    setMeasured(null);
    setMeasuredAcc(null);
    setBusy(null);
    setManual('');
    setManualMode(false);
    setPenalty(0);
  }, [category, hole.id, hole.shots.length]);

  const isGps = category === 'drive' || category === 'approach';
  const isShort = category === 'short' || category === 'bunker';
  const isPutt = category === 'putt';

  const resetAll = () => {
    setToLie(null);
    setStartPt(null);
    setEndPt(null);
    setStartAcc(null);
    setMeasured(null);
    setMeasuredAcc(null);
    setBusy(null);
    setManual('');
    setManualMode(false);
    setPenalty(0);
  };

  const onStart = async () => {
    setBusy('start');
    try {
      const r = await gps.capture();
      setStartPt(r.point);
      setStartAcc(r.accuracy);
      setEndPt(null);
      setMeasured(null);
      setMeasuredAcc(null);
    } catch {
      toast(t('gpsDenied'));
      setManualMode(true);
    } finally {
      setBusy(null);
    }
  };

  const onStop = async () => {
    if (!startPt) {
      toast(t('errNeedStart'));
      return;
    }
    setBusy('stop');
    try {
      const r = await gps.capture();
      setEndPt(r.point);
      setMeasured(+haversine(startPt, r.point).toFixed(2));
      setMeasuredAcc(combinedAccuracy(startAcc ?? undefined, r.accuracy));
    } catch {
      toast(t('gpsDenied'));
      setManualMode(true);
    } finally {
      setBusy(null);
    }
  };

  const commitGps = () => {
    const dist = manualMode
      ? manual
        ? Number(manual)
        : null
      : measured;
    if (dist == null || !toLie) return;
    dispatch({
      type: 'addShot',
      input: {
        category,
        toLie,
        measuredDistance: dist,
        penalty,
        holeLength,
        start: manualMode ? undefined : startPt ?? undefined,
        end: manualMode ? undefined : endPt ?? undefined,
      },
    });
    toast(t('shotSaved'));
    resetAll();
  };

  const commitShort = () => {
    if (!toLie) return;
    dispatch({
      type: 'addShot',
      input: {
        category,
        toLie,
        distanceBefore: shortDist,
        penalty,
        holeLength,
      },
    });
    toast(t('shotSaved'));
    resetAll();
  };

  const canCommitGps =
    !!toLie && (manualMode ? manual !== '' : measured != null);

  const resetGpsStart = () => {
    setStartPt(null);
    setEndPt(null);
    setStartAcc(null);
    setMeasured(null);
    setMeasuredAcc(null);
  };

  // The shot happens in the real world in this order, so the UI follows it:
  // aim (at the ball) → hit (walk to it) → result (distance known, pick lie).
  const gpsPhase: 'aim' | 'hit' | 'result' =
    measured != null ? 'result' : startPt ? 'hit' : 'aim';
  const accTone =
    measuredAcc == null
      ? ''
      : measuredAcc <= 8
        ? 'pos'
        : measuredAcc <= 16
          ? 'gold'
          : 'neg';

  const lieChips = (
    <div className="chips">
      {LANDING.map((l) => (
        <button
          key={l.lie}
          className={`chip ${l.danger ? 'danger' : ''} ${
            toLie === l.lie ? 'sel' : ''
          }`}
          onClick={() => setToLie(l.lie)}
        >
          {t(l.t as 'lieFairway')}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <HoleSetup gps={gps} />

      {/* Category */}
      <div className="card">
        <div className="section-label">🎯 {t('shotCategory')}</div>
        <div className="cat-grid">
          {CATEGORIES.map((c, i) => (
            <button
              key={c.id}
              className={`cat ${i === 4 ? 'wide' : ''} ${
                category === c.id ? 'sel' : ''
              }`}
              onClick={() => setCategory(c.id)}
            >
              <div className="t">{t(c.t as 'catDrive')}</div>
              <div className="s">{t(c.s as 'catDriveSub')}</div>
            </button>
          ))}
        </div>
      </div>

      {/* GPS shot — guided in real-world order: aim → hit → result */}
      {isGps && (
        <div className="card">
          <div
            className="section-label"
            style={{ justifyContent: 'space-between' }}
          >
            <span>📡 {t('gpsCapture')}</span>
            <button
              onClick={() => setManualMode((m) => !m)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                fontSize: 11,
              }}
            >
              {manualMode ? t('useGps') : t('manualEntry')}
            </button>
          </div>

          {manualMode ? (
            <>
              <label className="field" style={{ display: 'block' }}>
                <span className="muted" style={{ fontSize: 11 }}>
                  {t('meters')}
                </span>
                <input
                  inputMode="decimal"
                  value={manual}
                  onChange={(e) =>
                    setManual(e.target.value.replace(/[^0-9.]/g, ''))
                  }
                  placeholder="0"
                />
              </label>
              <div className="section-label" style={{ marginTop: 18 }}>
                {t('landingTerrain')}
              </div>
              {lieChips}
              <PenaltyStepper value={penalty} onChange={setPenalty} />
              <button
                className="btn green-fill tap"
                style={{ marginTop: 16 }}
                disabled={!canCommitGps}
                onClick={commitGps}
              >
                {t('validateShot')}
              </button>
            </>
          ) : gpsPhase === 'aim' ? (
            <>
              <div className="step-line">
                <span className="step-pill">1</span> {t('gpsStepAim')}
              </div>
              <p className="hint" style={{ marginTop: 0, marginBottom: 14 }}>
                {t('gpsAimHint')}
              </p>
              <button
                className="btn green-fill tap"
                onClick={onStart}
                disabled={busy != null}
              >
                ▶ {busy === 'start' ? t('capturing') : t('start')}
                <span className="btn-sub">{t('startSub')}</span>
              </button>
            </>
          ) : gpsPhase === 'hit' ? (
            <>
              <div className="step-done">
                ✓ {t('startRecorded', { m: startAcc ?? '?' })}
              </div>
              <div className="step-line" style={{ marginTop: 14 }}>
                <span className="step-pill">2</span> {t('gpsStepHit')}
              </div>
              <p className="hint" style={{ marginTop: 0, marginBottom: 14 }}>
                {t('gpsHitHint')}
              </p>
              <button
                className="btn green-fill tap"
                onClick={onStop}
                disabled={busy != null}
              >
                ■ {busy === 'stop' ? t('capturing') : t('stop')}
                <span className="btn-sub">{t('stopSub')}</span>
              </button>
              <button
                className="btn ghost"
                style={{ marginTop: 10 }}
                onClick={resetGpsStart}
                disabled={busy != null}
              >
                ↺ {t('redoStart')}
              </button>
            </>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginTop: 2 }}>
                <div className="bignum">
                  {measured!.toFixed(2)}{' '}
                  <span style={{ fontSize: 22 }}>m</span>
                </div>
                {measuredAcc != null && (
                  <div className={`muted ${accTone}`} style={{ fontSize: 12 }}>
                    {t('distUncertainty', { m: measuredAcc })}
                  </div>
                )}
                <button
                  className="btn ghost"
                  style={{ marginTop: 10, maxWidth: 200, marginInline: 'auto' }}
                  onClick={onStop}
                  disabled={busy != null}
                >
                  {t('remeasure')}
                </button>
              </div>

              <div className="step-line" style={{ marginTop: 18 }}>
                <span className="step-pill">3</span> {t('landingTerrain')}
              </div>
              {lieChips}

              <PenaltyStepper value={penalty} onChange={setPenalty} />
              <button
                className="btn green-fill tap"
                style={{ marginTop: 16 }}
                disabled={!canCommitGps}
                onClick={commitGps}
              >
                {t('validateShot')}
              </button>
            </>
          )}
        </div>
      )}

      {/* Short game / bunker */}
      {isShort && (
        <div className="card">
          <div className="section-label">🟢 {t('shortGame')}</div>
          <div className="bignum">{shortDist} M</div>
          <input
            type="range"
            min={1}
            max={30}
            value={shortDist}
            onChange={(e) => setShortDist(Number(e.target.value))}
          />
          <div className="range-ends">
            <span>1M</span>
            <span>30M</span>
          </div>
          <label className="field" style={{ display: 'block', marginTop: 12 }}>
            <span className="muted" style={{ fontSize: 11, letterSpacing: 1 }}>
              {t('arrivalLie')}
            </span>
            <select
              className="select"
              value={toLie ?? 'green'}
              onChange={(e) => setToLie(e.target.value as Lie)}
            >
              <option value="green">🟢 {t('lieGreen')}</option>
              <option value="fairway">{t('lieFairway')}</option>
              <option value="rough">{t('lieRough')}</option>
              <option value="sand">{t('lieBunker')}</option>
              <option value="holed">⛳ {t('lieHoled')}</option>
            </select>
          </label>
          <PenaltyStepper value={penalty} onChange={setPenalty} />
          <button
            className="btn green-fill"
            style={{ marginTop: 12, fontSize: 16, padding: 16 }}
            onClick={commitShort}
          >
            {t('validateShot')}
          </button>
        </div>
      )}

      {/* Putting */}
      {isPutt && <PuttEntry holeLength={holeLength} />}
    </>
  );
}

function PenaltyStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="stepper">
      <span className="sv">
        ⚠️ {t('penalty')} · {t('penaltyStrokes', { n: value })}
      </span>
      <span style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onChange(Math.max(0, value - 1))}>−</button>
        <button onClick={() => onChange(Math.min(3, value + 1))}>+</button>
      </span>
    </div>
  );
}
