import { useI18n } from '../../i18n';
import { useSession } from '../../state/session';
import { sg } from '../../lib/format';
import type { Lie, Shot } from '../../types';

const CAT_KEY = {
  drive: 'sectorDrive',
  approach: 'sectorApproach',
  short: 'sectorShort',
  bunker: 'catBunker',
  putt: 'sectorPutt',
} as const;

const LIE_KEY: Record<Lie, string> = {
  tee: 'lieFairway',
  fairway: 'lieFairway',
  rough: 'lieRough',
  sand: 'lieBunker',
  recovery: 'lieObstacle',
  green: 'lieGreen',
  holed: 'lieHoled',
};

function lieClass(l: Lie): string {
  if (l === 'tee') return 'tag tee';
  if (l === 'sand') return 'tag sand';
  if (l === 'green' || l === 'holed') return 'tag green';
  if (l === 'recovery') return 'tag red';
  return 'tag';
}

export function ShotHistory() {
  const { t } = useI18n();
  const { session, dispatch } = useSession();
  const hole = session.holes[session.holes.length - 1];
  const shots = hole.shots;
  const total = +shots.reduce((s, x) => s + x.strokesGained, 0).toFixed(2);

  const completed = hole.completed;
  const canClose = shots.length > 0 && !completed;

  return (
    <>
      {canClose && (
        <button
          className="btn gold"
          onClick={() => dispatch({ type: 'completeHole' })}
        >
          {t('inHole')}
          <span className="btn-sub">{t('closeHole')}</span>
        </button>
      )}

      {completed && (
        <div className="recap">
          <div className="t">{t('holeComplete')}</div>
          <div className="s">
            {t('holeRecap', {
              n: hole.number,
              shots: shots.length,
              s: shots.length > 1 ? 'S' : '',
              sg: sg(total),
            })}
          </div>
          <button
            className="btn"
            onClick={() => dispatch({ type: 'nextHole' })}
          >
            {t('nextHole')}
          </button>
        </div>
      )}

      <div className="card">
        <div className="section-label">📋 {t('shotHistory')}</div>
        {shots.length === 0 ? (
          <div className="empty">{t('noShots')}</div>
        ) : (
          <table className="hist">
            <thead>
              <tr>
                <th>{t('colNum')}</th>
                <th>{t('colCatLie')}</th>
                <th>{t('colArrival')}</th>
                <th className="r">{t('colDist')}</th>
                <th className="r">{t('colSg')}</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {shots
                .slice()
                .reverse()
                .map((s: Shot) => (
                  <tr key={s.id}>
                    <td>{s.number}</td>
                    <td>
                      <span className="tag">
                        {t(CAT_KEY[s.category] as 'sectorDrive')}
                      </span>
                      <br />
                      <span className={lieClass(s.fromLie)}>
                        {t(LIE_KEY[s.fromLie] as 'lieFairway')}
                      </span>
                    </td>
                    <td>
                      <span className={lieClass(s.toLie)}>
                        {t(LIE_KEY[s.toLie] as 'lieFairway')}
                      </span>
                      {s.penalty > 0 && (
                        <span className="tag red">+{s.penalty}</span>
                      )}
                    </td>
                    <td className="r">{Math.round(s.distance)} m</td>
                    <td
                      className={`r ${
                        s.strokesGained >= 0 ? 'pos' : 'neg'
                      }`}
                    >
                      {sg(s.strokesGained)}
                    </td>
                    <td className="r">
                      <button
                        className="row-del"
                        aria-label={t('deleteShot')}
                        onClick={() => {
                          if (window.confirm(t('deleteShotConfirm')))
                            dispatch({ type: 'deleteShot', shotId: s.id });
                        }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
        {shots.length > 0 && (
          <>
            <div className="total-row">
              <span>{t('totalSg')}</span>
              <span className={`big ${total >= 0 ? 'pos' : 'neg'}`}>
                {sg(total)}
              </span>
            </div>
            {!completed && (
              <button
                className="btn ghost"
                style={{ marginTop: 12 }}
                onClick={() => dispatch({ type: 'undoShot' })}
              >
                ↩ {t('undo')}
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
}
