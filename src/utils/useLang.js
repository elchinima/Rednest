import { useState, useEffect } from 'react';

export const getStoredLanguage = () => {
  try {
    return localStorage.getItem('rednest_language') || 'az';
  } catch {
    return 'az';
  }
};

export const setStoredLanguage = (newLang) => {
  try {
    localStorage.setItem('rednest_language', newLang);
    localStorage.setItem('rednest_language_updated_at', new Date().toISOString());
    window.dispatchEvent(new CustomEvent('languagechange', { detail: newLang }));
  } catch {}
};

export const useLang = () => {
  const [lang, setLang] = useState(getStoredLanguage);

  useEffect(() => {
    const handleLanguageChange = (e) => {
      const newLang = e?.detail || getStoredLanguage();
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

export default useLang;
