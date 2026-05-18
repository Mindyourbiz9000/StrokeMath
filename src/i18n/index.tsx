import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { fr } from './fr';
import { en } from './en';

export type Lang = 'fr' | 'en';
type Key = keyof typeof fr;
type Dict = Record<Key, string>;

const DICTS: Record<Lang, Dict> = { fr, en };
const STORAGE_KEY = 'strokemath.lang';

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: Key, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

function detectLang(): Lang {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'fr' || saved === 'en') return saved;
  return navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'fr';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const t = useCallback<I18nValue['t']>(
    (key, vars) => {
      let s: string = DICTS[lang][key] ?? DICTS.fr[key] ?? String(key);
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        }
      }
      return s;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
