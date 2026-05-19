import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { useI18n } from '../i18n';

/** "New version available" prompt + an offline indicator. */
export function PwaStatus() {
  const { t } = useI18n();
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const update = registerSW({ onNeedRefresh: () => setNeedRefresh(true) });
    (window as unknown as { __sw_update?: () => void }).__sw_update = () =>
      void update(true);

    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (needRefresh) {
    return (
      <div className="pwa-bar update" role="status">
        <span>{t('pwaUpdate')}</span>
        <button
          onClick={() =>
            (
              window as unknown as { __sw_update?: () => void }
            ).__sw_update?.()
          }
        >
          {t('pwaReload')}
        </button>
      </div>
    );
  }
  if (offline) {
    return (
      <div className="pwa-bar offline" role="status">
        {t('pwaOffline')}
      </div>
    );
  }
  return null;
}
