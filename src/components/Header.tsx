import { useI18n, type Lang } from '../i18n';
import { useAuth } from '../lib/auth';

export function Header({ onHome }: { onHome: () => void }) {
  const { t, lang, setLang } = useI18n();
  const { cloudEnabled, user, displayName, signInWithGoogle, signOut } =
    useAuth();

  return (
    <header className="header">
      <div className="header-top">
        <button className="brand-link" onClick={onHome} aria-label="Home">
          <span className="brand-mark" />
          <span className="brand">{t('brand')}</span>
        </button>
        <div className="header-actions">
          <div className="lang-toggle">
            {(['fr', 'en'] as Lang[]).map((l) => (
              <button
                key={l}
                className={lang === l ? 'on' : ''}
                onClick={() => setLang(l)}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="account">
        {user ? (
          <>
            <span className="acc-name">
              <span className="acc-dot ok" /> {displayName}
            </span>
            <button className="acc-btn" onClick={() => void signOut()}>
              {t('signOut')}
            </button>
          </>
        ) : (
          <>
            <span className="acc-name">
              <span className="acc-dot" /> {t('guestLocal')}
            </span>
            {cloudEnabled && (
              <button
                className="acc-btn"
                onClick={() => void signInWithGoogle()}
              >
                {t('signInGoogle')}
              </button>
            )}
          </>
        )}
      </div>
    </header>
  );
}
