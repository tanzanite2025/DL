import React, { createContext, useContext, useState } from 'react';
import { translations, Language } from './translations';

interface I18nContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['zh']) => string;
}

const I18nContext = createContext<I18nContextProps | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(
    (localStorage.getItem('dalang_erp_lang') as Language) || 'zh'
  );

  const setLanguage = (lang: Language) => {
    localStorage.setItem('dalang_erp_lang', lang);
    setLanguageState(lang);
  };

  const t = (key: keyof typeof translations['zh']): string => {
    const dict = translations[language];
    if (!dict[key]) {
      console.error(`[CRITICAL] Missing translation key: "${key}" for language "${language}"`);
      return translations['zh'][key] || String(key);
    }
    return dict[key];
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
