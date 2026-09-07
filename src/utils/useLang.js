import { useState, useEffect } from 'react';

export const useLang = () => {
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem('rednest_language') || 'ru';
    } catch {
      return 'ru';
    }
  });

  useEffect(() => {
    const handleLanguageChange = (e) => {
      const newLang = e?.detail || localStorage.getItem('rednest_language') || 'ru';
      setLang(newLang);
    };

    window.addEventListener('languagechange', handleLanguageChange);
    window.addEventListener('storage', handleLanguageChange);
    return () => {
      window.removeEventListener('languagechange', handleLanguageChange);
      window.removeEventListener('storage', handleLanguageChange);
    };
  }, []);

  return lang;
};
