import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n';
import { useSession, holeState } from '../../state/session';
import { useToast } from '../Toast';
import { haversine, combinedAccuracy, type GpsController } from '../../lib/geo';
import { defaultHoleLength } from '../../lib/strokesGained';
import type { GeoPoint, Lie, Par, ShotCategory } from '../../types';

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
  const [startAcc, setStartAcc] = useState<number | null>(null);
  const [measured, setMeasured] = useState<number | null>(null);
  const [measuredAcc, setMeasuredAcc] = useState<number | null>(null);
  const [busy, setBusy] = useState<null | 'start' | 'stop'>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manual, setManual] = useState('');

  // Short game
  const [shortDist, setShortDist] = useState(20);

  // Putting (metres + centimetres)
  const [bM, setBM] = useState('');
  const [bC, setBC] = useState('');
  const [aM, setAM] = useState('');
  const [aC, setAC] = useState('');

  const holeLength = useMemo(() => defaultHoleLength(hole.par), [hole.par]);

  // Reset transient state whenever the category or hole/shot changes.
  useEffect(() => {
    setToLie(null);
    setStartPt(null);
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
    setStartAcc(null);
    setMeasured(null);
    setMeasuredAcc(null);
    setBusy(null);
    setManual('');
    setManualMode(false);
    setPenalty(0);
    setBM('');
    setBC('');
    setAM('');
    setAC('');
  };

  const onStart = async () => {
    setBusy('start');
    try {
      const r = await gps.capture();
      setStartPt(r.point);
      setStartAcc(r.accuracy);
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
      input: { category, toLie, measuredDistance: dist, penalty, holeLength },
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

  const commitPutt = () => {
    const before = Number(bM || 0) + Number(bC || 0) / 100;
    const after = Number(aM || 0) + Number(aC || 0) / 100;
    if (before <= 0) {
      toast(t('puttHint'));
      return;
    }
    dispatch({
      type: 'addShot',
      input: {
        category: 'putt',
        toLie: after <= 0 ? 'holed' : 'green',
        distanceBefore: before,
        distanceAfter: after,
        holeLength,
      },
    });
    toast(t('shotSaved'));
    resetAll();
  };

  const { count } = holeState(hole, holeLength);
  const canCommitGps =
    !!toLie && (manualMode ? manual !== '' : measured != null);

  return (
    <>
      {/* Par + hole length */}
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
          <span className="muted" style={{ alignSelf: 'center', fontSize: 11 }}>
            ≈ {holeLength} m
          </span>
        </div>
      </div>

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

      {/* Landing terrain + GPS capture */}
      {isGps && (
        <div className="card">
          <div className="section-label">{t('landingTerrain')}</div>
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

          <div
            className="section-label"
            style={{ marginTop: 16, justifyContent: 'space-between' }}
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

          {!manualMode && (
            <>
              <button
                className="btn green-fill"
                onClick={onStart}
                disabled={busy != null}
                style={{ marginTop: 8 }}
              >
                ▶ {busy === 'start' ? t('capturing') : t('start')}
                <span className="btn-sub">
                  {startPt
                    ? t('startRecorded', { m: startAcc ?? '?' })
                    : t('startSub')}
                </span>
              </button>
              <button
                className="btn red-outline"
                onClick={onStop}
                disabled={!startPt || busy != null}
                style={{ marginTop: 10 }}
              >
                ■ {busy === 'stop' ? t('capturing') : t('stop')}
                <span className="btn-sub">{t('stopSub')}</span>
              </button>

              {measured != null && (
                <div style={{ marginTop: 14, textAlign: 'center' }}>
                  <div className="bignum">{measured.toFixed(2)} M</div>
                  {measuredAcc != null && (
                    <div
                      className={`muted ${
                        measuredAcc <= 8 ? 'pos' : measuredAcc <= 16 ? 'gold' : 'neg'
                      }`}
                      style={{ fontSize: 12 }}
                    >
                      {t('distUncertainty', { m: measuredAcc })}
                    </div>
                  )}
                  <button
                    className="btn ghost"
                    style={{ marginTop: 10 }}
                    onClick={onStop}
                    disabled={busy != null}
                  >
                    {t('remeasure')}
                  </button>
                </div>
              )}
            </>
          )}

          {manualMode && (
            <label className="field" style={{ marginTop: 10, display: 'block' }}>
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
          )}

          <PenaltyStepper value={penalty} onChange={setPenalty} />
          <p className="hint">{t('stopHint')}</p>

          <button
            className="btn"
            style={{ marginTop: 10 }}
            disabled={!canCommitGps}
            onClick={commitGps}
          >
            {t('validateShot')}
          </button>
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
      {isPutt && (
        <div className="card">
          <div className="section-label">🥏 {t('puttingTitle')}</div>
          <div className="muted" style={{ fontSize: 11, letterSpacing: 1 }}>
            {t('beforePutt')}
          </div>
          <MeterCm m={bM} c={bC} setM={setBM} setC={setBC} />
          <div
            className="muted"
            style={{ fontSize: 11, letterSpacing: 1, marginTop: 10 }}
          >
            {t('afterPutt')}
          </div>
          <MeterCm m={aM} c={aC} setM={setAM} setC={setAC} />
          <button
            className="btn green-fill"
            style={{ marginTop: 14, fontSize: 16, padding: 16 }}
            onClick={commitPutt}
          >
            {t('validatePutt')}
          </button>
          <p className="hint">{t('puttHint')}</p>
        </div>
      )}
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

function MeterCm({
  m,
  c,
  setM,
  setC,
}: {
  m: string;
  c: string;
  setM: (v: string) => void;
  setC: (v: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="mc-grid">
      <div className="field">
        <label>{t('meters')}</label>
        <input
          inputMode="numeric"
          value={m}
          onChange={(e) => setM(e.target.value.replace(/\D/g, ''))}
          placeholder="0"
        />
      </div>
      <div className="sep">,</div>
      <div className="field">
        <label>CM</label>
        <input
          inputMode="numeric"
          value={c}
          onChange={(e) => setC(e.target.value.replace(/\D/g, '').slice(0, 2))}
          placeholder="00"
        />
      </div>
    </div>
  );
}
