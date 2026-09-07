import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import './Footer.scss';
import logo from '../../assets/icons/rednest_logo.png';

const getBakuYear = () => {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Baku', year: 'numeric' }).format(new Date());
  } catch {
    return new Date(Date.now() + 4 * 60 * 60 * 1000).getUTCFullYear().toString();
  }
};

let cachedFooterData = null;
let pendingFooterPromise = null;

const getLanguageContent = (data, lang) => {
  if (!data) return null;
  if (lang === 'en') {
    return data.footerEN || data.FooterEN || null;
  }
  if (lang === 'az') {
    return data.footerAZ || data.FooterAZ || null;
  }
  return data.footerRU || data.FooterRU || null;
};

const Footer = () => {
  const currentYear = getBakuYear();
  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem('rednest_language') || 'ru';
    } catch {
      return 'ru';
    }
  });
  const [footerData, setFooterData] = useState(() => cachedFooterData);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const apiUrl = import.meta.env.VITE_API_URL || '';

    if (cachedFooterData) {
      setFooterData(cachedFooterData);
      return;
    }

    if (!pendingFooterPromise) {
      pendingFooterPromise = fetch(`${apiUrl}/api/footer`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch');
          return res.json();
        })
        .then(data => {
          if (data) {
            cachedFooterData = data;
          }
          pendingFooterPromise = null;
          return data;
        })
        .catch(() => {
          pendingFooterPromise = null;
          return null;
        });
    }

    pendingFooterPromise.then(data => {
      if (isMounted && data) {
        setFooterData(data);
      }
    });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const handleLangSync = (e) => {
      const current = e?.detail || localStorage.getItem('rednest_language') || 'ru';
      setLanguage(current);
    };
    window.addEventListener('languagechange', handleLangSync);
    return () => window.removeEventListener('languagechange', handleLangSync);
  }, []);

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    try {
      localStorage.setItem('rednest_language', newLang);
      window.dispatchEvent(new CustomEvent('languagechange', { detail: newLang }));
    } catch {}
  };

  const activeContent = getLanguageContent(footerData, language);

  const description = activeContent?.description || activeContent?.Description || '';
  const quickLinksTitle = activeContent?.quickLinksTitle || activeContent?.QuickLinksTitle || '';
  const contactUsTitle = activeContent?.contactUsTitle || activeContent?.ContactUsTitle || '';
  const termsOfUseTitle = activeContent?.termsOfUseTitle || activeContent?.TermsOfUseTitle || '';
  const copyrightText = activeContent?.copyrightText || activeContent?.CopyrightText || '';

  const socialMedia = activeContent?.socialMedia || activeContent?.SocialMedia || {};
  const instagramUrl = socialMedia.instagram || socialMedia.Instagram || '';
  const tiktokUrl = socialMedia.tikTok || socialMedia.tiktok || socialMedia.TikTok || '';
  const whatsappUrl = socialMedia.whatsApp || socialMedia.whatsapp || socialMedia.WhatsApp || '';

  const quickLinks = activeContent?.quickLinks || activeContent?.QuickLinks || [];
  const contactUs = activeContent?.contactUs || activeContent?.ContactUs || {};
  const address = contactUs.address || contactUs.Address || '';
  const phone = contactUs.phone || contactUs.Phone || '';
  const email = contactUs.email || contactUs.Email || '';

  return (
    <motion.footer 
      className="footer"
      initial={{ opacity: 0, y: 50 }} 
      whileInView={{ opacity: 1, y: 0 }} 
      viewport={{ once: true, amount: 0.1 }} 
      transition={{ duration: 0.6 }}
    >
      <div className="footer-content">
        <div className="footer-top">
          <div className="footer-col brand-col">
            <div className="footer-brand">
              <img src={logo} alt="Rednest Logo" className="footer-logo" />
              <span>Rednest Coffee</span>
            </div>
            {description && (
              <p className="brand-desc">
                {description}
              </p>
            )}
            <div className="social-links">
              {instagramUrl && (
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Instagram">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                  <span>Instagram</span>
                </a>
              )}
              {tiktokUrl && (
                <a href={tiktokUrl} target="_blank" rel="noopener noreferrer" className="social-link" aria-label="TikTok">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path>
                  </svg>
                  <span>TikTok</span>
                </a>
              )}
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="social-link" aria-label="WhatsApp">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                  </svg>
                  <span>WhatsApp</span>
                </a>
              )}
            </div>
          </div>

          <div className="footer-col links-col">
            {quickLinksTitle && <h4>{quickLinksTitle}</h4>}
            <ul>
              {quickLinks.map((item, index) => (
                <li key={index}>
                  <Link to={item.link || item.Link || '/'}>{item.title || item.Title}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col contact-col">
            {contactUsTitle && <h4>{contactUsTitle}</h4>}
            <ul>
              {address && (
                <li>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  <span>{address}</span>
                </li>
              )}
              {phone && (
                <li>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                  <span>{phone}</span>
                </li>
              )}
              {email && (
                <li>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                  <span>{email}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="language-switcher">
            <select aria-label="Select language" value={language} onChange={(e) => handleLanguageChange(e.target.value)}>
              <option value="ru">Русский</option>
              <option value="en">English</option>
              <option value="az">Azərbaycan</option>
            </select>
          </div>
          <p className="copyright">&copy; {currentYear} Rednest{copyrightText ? `. ${copyrightText}` : ''}</p>
          {termsOfUseTitle && (
            <div className="terms-link">
              <Link to="/rules">{termsOfUseTitle}</Link>
            </div>
          )}
        </div>
      </div>
    </motion.footer>
  );
};

export default Footer;
