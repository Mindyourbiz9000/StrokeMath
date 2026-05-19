import { useI18n } from '../i18n';

export type Tab = 'play' | 'evolution' | 'faq';

export function TabBar({
  tab,
  onChange,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
}) {
  const { t } = useI18n();
  return (
    <nav className="tabbar">
      <button
        className={tab === 'play' ? 'active' : ''}
        onClick={() => onChange('play')}
      >
        <span className="ic">🏃</span>
        {t('tabPlay')}
      </button>
      <button
        className={tab === 'evolution' ? 'active' : ''}
        onClick={() => onChange('evolution')}
      >
        <span className="ic">📈</span>
        {t('tabEvolution')}
      </button>
      <button
        className={tab === 'faq' ? 'active' : ''}
        onClick={() => onChange('faq')}
      >
        <span className="ic">❓</span>
        {t('tabFaq')}
      </button>
    </nav>
  );
}
