import { useI18n, type Lang } from '../i18n';
import { useAuth } from '../lib/auth';

export function Home({
  onEnter,
  onFaq,
}: {
  onEnter: () => void;
  onFaq: () => void;
}) {
  const { t, lang, setLang } = useI18n();
  const { cloudEnabled, user, displayName, signInWithGoogle } = useAuth();

  const steps = [
    { t: 'homeStep1Title', b: 'homeStep1Body' },
    { t: 'homeStep2Title', b: 'homeStep2Body' },
    { t: 'homeStep3Title', b: 'homeStep3Body' },
  ] as const;

  const features = [
    { t: 'homeF1', b: 'homeF1b' },
    { t: 'homeF2', b: 'homeF2b' },
    { t: 'homeF3', b: 'homeF3b' },
    { t: 'homeF4', b: 'homeF4b' },
  ] as const;

  return (
    <div className="home">
      <nav className="home-nav">
        <div className="brand-link">
          <span className="brand-mark" />
          <span className="brand">{t('brand')}</span>
        </div>
        <div className="home-nav-right">
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
          <button className="link-btn" onClick={onFaq}>
            {t('faqLink')}
          </button>
          {cloudEnabled && !user && (
            <button className="link-btn" onClick={() => void signInWithGoogle()}>
              {t('signIn')}
            </button>
          )}
          {user && <span className="link-btn">{displayName}</span>}
        </div>
      </nav>

      <section className="hero">
        <div className="eyebrow">{t('appTitle')}</div>
        <h1>{t('homeHeroTitle')}</h1>
        <p className="lead">{t('homeHeroSub')}</p>
        <div className="hero-cta">
          <button className="btn-primary" onClick={onEnter}>
            {t('homeStart')}
          </button>
          {cloudEnabled && !user && (
            <button
              className="btn-secondary"
              onClick={() => void signInWithGoogle()}
            >
              {t('homeSignIn')}
            </button>
          )}
        </div>
        <div className="hero-note">{t('homeGuestNote')}</div>
      </section>

      <section className="home-section">
        <div className="kicker">{t('homeHow')}</div>
        <div className="steps">
          {steps.map((s, i) => (
            <div className="step" key={i}>
              <div className="step-num">{i + 1}</div>
              <h3>{t(s.t)}</h3>
              <p>{t(s.b)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="kicker">{t('homeSeeIt')}</div>
        <div className="screens">
          {[
            { src: '/screens/screen1.png', cap: t('homeShot1') },
            { src: '/screens/screen2.png', cap: t('homeShot2') },
            { src: '/screens/screen3.png', cap: t('homeShot3') },
          ].map((s) => (
            <figure className="screen" key={s.src}>
              <img src={s.src} alt={s.cap} loading="lazy" />
              <figcaption>{s.cap}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="kicker">{t('homeFeatures')}</div>
        <div className="feature-grid">
          {features.map((f, i) => (
            <div className="feature" key={i}>
              <h4>{t(f.t)}</h4>
              <p>{t(f.b)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="home-final">
        <h2>{t('homeCta')}</h2>
        <button className="btn-primary lg" onClick={onEnter}>
          {t('homeOpen')}
        </button>
      </section>

      <footer className="home-footer">
        <span className="brand-mark sm" />
        {t('footerRights')} · © {new Date().getFullYear()}
        <span className="muted"> · </span>
        <button className="link-btn" onClick={onFaq}>
          {t('faqLink')}
        </button>
      </footer>
    </div>
  );
}
