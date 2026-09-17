import { useState, useEffect } from 'react';
import { API_URL } from './config';
import { useLang, getStoredLanguage } from './useLang';

const STORAGE_KEY = 'rednest_footer_cache';

const loadStoredCache = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

let cachedFooterData = loadStoredCache();
let pendingFooterPromise = null;
const listeners = new Set();

export const getLanguageContent = (data, lang) => {
  if (!data) return null;
  if (lang === 'en') {
    return data.footerEN || data.FooterEN || null;
  }
  if (lang === 'az') {
    return data.footerAZ || data.FooterAZ || null;
  }
  return data.footerRU || data.FooterRU || null;
};

export const getSocialMediaLinks = (data, lang) => {
  if (!data) return { instagramUrl: '', tiktokUrl: '', whatsappUrl: '' };

  const currentLang = lang || getStoredLanguage();
  const activeContent = getLanguageContent(data, currentLang);

  const sm = activeContent?.socialMedia || activeContent?.SocialMedia;
  const smAZ = data.footerAZ?.socialMedia || data.footerAZ?.SocialMedia || data.FooterAZ?.socialMedia || data.FooterAZ?.SocialMedia;
  const smRU = data.footerRU?.socialMedia || data.footerRU?.SocialMedia || data.FooterRU?.socialMedia || data.FooterRU?.SocialMedia;
  const smEN = data.footerEN?.socialMedia || data.footerEN?.SocialMedia || data.FooterEN?.socialMedia || data.FooterEN?.SocialMedia;

  const rawInstagram = sm?.instagram || sm?.Instagram || smAZ?.instagram || smAZ?.Instagram || smRU?.instagram || smRU?.Instagram || smEN?.instagram || smEN?.Instagram || '';
  const rawTikTok = sm?.tikTok || sm?.tiktok || sm?.TikTok || smAZ?.tikTok || smAZ?.tiktok || smAZ?.TikTok || smRU?.tikTok || smRU?.tiktok || smRU?.TikTok || smEN?.tikTok || smEN?.tiktok || smEN?.TikTok || '';
  const rawWhatsApp = sm?.whatsApp || sm?.whatsapp || sm?.WhatsApp || smAZ?.whatsApp || smAZ?.whatsapp || smAZ?.WhatsApp || smRU?.whatsApp || smRU?.whatsapp || smRU?.WhatsApp || smEN?.whatsApp || smEN?.whatsapp || smEN?.WhatsApp || '';

  const normalizeUrl = (url, type) => {
    if (!url) return '';
    const trimmed = String(url).trim();
    if (!trimmed) return '';
    if (type === 'whatsapp') {
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('//')) {
        return trimmed;
      }
      const digits = trimmed.replace(/[^\d]/g, '');
      return digits ? `https://wa.me/${digits}` : trimmed;
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('//')) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  return {
    instagramUrl: normalizeUrl(rawInstagram, 'instagram'),
    tiktokUrl: normalizeUrl(rawTikTok, 'tiktok'),
    whatsappUrl: normalizeUrl(rawWhatsApp, 'whatsapp')
  };
};

export const fetchFooterData = async () => {
  if (pendingFooterPromise) return pendingFooterPromise;

  pendingFooterPromise = fetch(`${API_URL}/api/footer`, {
    headers: { 'Accept': 'application/json' }
  })
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch footer');
      return res.json();
    })
    .then(data => {
      if (data) {
        cachedFooterData = data;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch {}
        listeners.forEach(cb => {
          try {
            cb(data);
          } catch {}
        });
      }
      pendingFooterPromise = null;
      return data;
    })
    .catch(() => {
      pendingFooterPromise = null;
      return cachedFooterData;
    });

  return pendingFooterPromise;
};

export const useFooterData = () => {
  const lang = useLang();
  const [data, setData] = useState(() => cachedFooterData);

  useEffect(() => {
    let isMounted = true;
    const handleUpdate = (updated) => {
      if (isMounted) setData(updated);
    };

    listeners.add(handleUpdate);

    fetchFooterData().then(res => {
      if (isMounted && res) {
        setData(res);
      }
    });

    return () => {
      isMounted = false;
      listeners.delete(handleUpdate);
    };
  }, []);

  const activeContent = getLanguageContent(data, lang);
  const { instagramUrl, tiktokUrl, whatsappUrl } = getSocialMediaLinks(data, lang);

  return {
    footerData: data,
    activeContent,
    instagramUrl,
    tiktokUrl,
    whatsappUrl,
    language: lang
  };
};

export default useFooterData;
