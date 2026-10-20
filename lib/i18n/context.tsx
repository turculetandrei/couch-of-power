'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { dictionaries, type Dict, type Locale } from './dict';
import { storage } from '@/lib/storage';

interface I18n {
  t: Dict;
  locale: Locale;
  setLocale: (l: Locale) => void;
}

const Ctx = createContext<I18n>({ t: dictionaries.ro, locale: 'ro', setLocale: () => {} });

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ro');

  useEffect(() => {
    const saved = storage.get<Locale>('cop:lang');
    if (saved === 'en' || saved === 'ro') setLocaleState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    storage.set('cop:lang', l);
  }, []);

  return <Ctx.Provider value={{ t: dictionaries[locale], locale, setLocale }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
export const useT = () => useContext(Ctx).t;
