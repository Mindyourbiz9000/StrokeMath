import { useI18n, type Lang } from '../i18n';
import { useSession } from '../state/session';

export function Header() {
  const { t, lang, setLang } = useI18n();
  const { session } = useSession();
  return (
    <header className="header">
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
      <div className="kicker">⛳ {t('appTitle')}</div>
      <div className="brand">{t('brand')}</div>
      <div className="tagline">{t('tagline')}</div>
      <div className="user">
        👤 {t('player', { name: session.player })}
      </div>
    </header>
  );
}
