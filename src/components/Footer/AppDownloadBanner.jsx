import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLang } from '../../utils/useLang';
import summerModel from '../../assets/images/footer_image_summer.png';
import winterModel from '../../assets/images/footer_image_winter.png';
import './AppDownloadBanner.scss';

const isWinterSeason = () => {
  const month = new Date().getMonth();
  return month >= 9 || month <= 2;
};

const BANNER_CONTENT = {
  ru: {
    title: 'Скачай приложение — забери кофе в подарок!',
    features: [
      {
        step: '1',
        title: '1. Скачай приложение',
        desc: 'Доступно на iOS и Android',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="3" ry="3"></rect>
            <line x1="12" y1="18" x2="12.01" y2="18"></line>
            <polyline points="9 9 12 12 15 9"></polyline>
            <line x1="12" y1="6" x2="12" y2="12"></line>
          </svg>
        )
      },
      {
        step: '2',
        title: '2. Крути Колесо Фортуны',
        desc: 'Выигрывай подарки каждый день',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="3"></circle>
            <line x1="12" y1="2" x2="12" y2="5"></line>
            <line x1="12" y1="19" x2="12" y2="22"></line>
            <line x1="2" y1="12" x2="5" y2="12"></line>
            <line x1="19" y1="12" x2="22" y2="12"></line>
            <line x1="4.93" y1="4.93" x2="7.05" y2="7.05"></line>
            <line x1="16.95" y1="16.95" x2="19.07" y2="19.07"></line>
            <line x1="4.93" y1="19.07" x2="7.05" y2="16.95"></line>
            <line x1="16.95" y1="7.05" x2="19.07" y2="4.93"></line>
          </svg>
        )
      },
      {
        step: '3',
        title: '3. Забирай призы и кэшбэк',
        desc: 'До 20% с каждой чашки кофе',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 12 20 22 4 22 4 12"></polyline>
            <rect x="2" y="7" width="20" height="5"></rect>
            <line x1="12" y1="22" x2="12" y2="7"></line>
            <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
            <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
          </svg>
        )
      }
    ],
    appStore: {
      subtitle: 'Загрузите в',
      title: 'App Store'
    },
    googlePlay: {
      subtitle: 'Доступно в',
      title: 'Google Play'
    }
  },
  az: {
    title: 'Tətbiqi yüklə — hədiyyə qəhvə qazan!',
    features: [
      {
        step: '1',
        title: '1. Tətbiqi yüklə',
        desc: 'iOS və Android üçün əlçatandır',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="3" ry="3"></rect>
            <line x1="12" y1="18" x2="12.01" y2="18"></line>
            <polyline points="9 9 12 12 15 9"></polyline>
            <line x1="12" y1="6" x2="12" y2="12"></line>
          </svg>
        )
      },
      {
        step: '2',
        title: '2. Bəxt Çarxını fırlat',
        desc: 'Hər gün yeni hədiyyələr qazan',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="3"></circle>
            <line x1="12" y1="2" x2="12" y2="5"></line>
            <line x1="12" y1="19" x2="12" y2="22"></line>
            <line x1="2" y1="12" x2="5" y2="12"></line>
            <line x1="19" y1="12" x2="22" y2="12"></line>
            <line x1="4.93" y1="4.93" x2="7.05" y2="7.05"></line>
            <line x1="16.95" y1="16.95" x2="19.07" y2="19.07"></line>
            <line x1="4.93" y1="19.07" x2="7.05" y2="16.95"></line>
            <line x1="16.95" y1="7.05" x2="19.07" y2="4.93"></line>
          </svg>
        )
      },
      {
        step: '3',
        title: '3. Mükafatlar və keşbek qazan',
        desc: 'Hər fincandan 20%-dək keşbek',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 12 20 22 4 22 4 12"></polyline>
            <rect x="2" y="7" width="20" height="5"></rect>
            <line x1="12" y1="22" x2="12" y2="7"></line>
            <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
            <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
          </svg>
        )
      }
    ],
    appStore: {
      subtitle: 'Yükləyin',
      title: 'App Store'
    },
    googlePlay: {
      subtitle: 'Yükləyin',
      title: 'Google Play'
    }
  },
  en: {
    title: 'Download the app — get a free coffee!',
    features: [
      {
        step: '1',
        title: '1. Download the app',
        desc: 'Available for iOS & Android',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="3" ry="3"></rect>
            <line x1="12" y1="18" x2="12.01" y2="18"></line>
            <polyline points="9 9 12 12 15 9"></polyline>
            <line x1="12" y1="6" x2="12" y2="12"></line>
          </svg>
        )
      },
      {
        step: '2',
        title: '2. Spin Fortune Wheel',
        desc: 'Win fresh prizes every day',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="3"></circle>
            <line x1="12" y1="2" x2="12" y2="5"></line>
            <line x1="12" y1="19" x2="12" y2="22"></line>
            <line x1="2" y1="12" x2="5" y2="12"></line>
            <line x1="19" y1="12" x2="22" y2="12"></line>
            <line x1="4.93" y1="4.93" x2="7.05" y2="7.05"></line>
            <line x1="16.95" y1="16.95" x2="19.07" y2="19.07"></line>
            <line x1="4.93" y1="19.07" x2="7.05" y2="16.95"></line>
            <line x1="16.95" y1="7.05" x2="19.07" y2="4.93"></line>
          </svg>
        )
      },
      {
        step: '3',
        title: '3. Get rewards & cashback',
        desc: 'Up to 20% on every order',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 12 20 22 4 22 4 12"></polyline>
            <rect x="2" y="7" width="20" height="5"></rect>
            <line x1="12" y1="22" x2="12" y2="7"></line>
            <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
            <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
          </svg>
        )
      }
    ],
    appStore: {
      subtitle: 'Download on the',
      title: 'App Store'
    },
    googlePlay: {
      subtitle: 'GET IT ON',
      title: 'Google Play'
    }
  }
};

const AppDownloadBanner = () => {
  const currentLang = useLang() || 'ru';
  const content = useMemo(() => {
    return BANNER_CONTENT[currentLang] || BANNER_CONTENT.ru;
  }, [currentLang]);

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 900;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 900);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isWinter = isWinterSeason();
  const modelImg = isWinter ? winterModel : summerModel;
  const modelAlt = isWinter ? 'Rednest Winter Coffee App' : 'Rednest Summer Coffee App';

  return (
    <motion.section 
      className="rednest-app-banner"
      initial={{ opacity: 0, y: 35 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div className="banner-inner">
        <div className="banner-ambient-glow" />

        {!isMobile && (
          <div className="banner-model-col">
            <div className="model-glow-ring" />
            <img 
              src={modelImg} 
              alt={modelAlt} 
              className="model-img" 
              loading="lazy"
            />
          </div>
        )}

        <div className="banner-center-col">
          <h3 className="banner-title">
            {content.title}
          </h3>

          <div className="banner-features-track">
            {content.features.map((feature, idx) => (
              <motion.div 
                key={idx}
                className="banner-feature-card"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ 
                  duration: 0.5, 
                  delay: 0.08 * (idx + 1),
                  ease: 'easeOut' 
                }}
                animate={{
                  x: [0, 8, 0],
                }}
                transitionRepeat={{
                  repeat: Infinity,
                  duration: 4 + idx * 0.7,
                  ease: 'easeInOut'
                }}
                whileHover={{ 
                  x: 12, 
                  scale: 1.015,
                  transition: { duration: 0.2 }
                }}
              >
                <div className="feature-icon-box">
                  {feature.icon}
                </div>
                <div className="feature-text">
                  <span className="feature-title">{feature.title}</span>
                  <span className="feature-desc">{feature.desc}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="banner-stores-col">
          <a 
            href="https://apps.apple.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="store-btn apple-btn"
            aria-label="Download Rednest App on App Store"
          >
            <svg viewBox="0 0 24 24" className="store-icon" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.42c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.63 1.35-.57.65-1.07 1.72-.94 2.74 1 .08 2.03-.49 2.65-1.24z"/>
            </svg>
            <div className="store-text">
              <span className="store-sub">{content.appStore.subtitle}</span>
              <span className="store-name">{content.appStore.title}</span>
            </div>
          </a>

          <a 
            href="https://play.google.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="store-btn google-btn"
            aria-label="Download Rednest App on Google Play"
          >
            <svg viewBox="0 0 24 24" className="store-icon" fill="currentColor">
              <path d="M3.609 1.814L13.793 12 3.61 22.186c-.365-.32-.61-.795-.61-1.35V3.164c0-.555.245-1.03.61-1.35zm11.242 11.244l2.128 2.127-11.83 6.786 9.702-8.913zm0-2.116L4.747 2.03l11.83 6.784-2.126 2.128zm1.06 1.058l3.15 1.807c.883.506.883 1.332 0 1.838l-3.15 1.808-1.92-1.92 1.92-1.733z"/>
            </svg>
            <div className="store-text">
              <span className="store-sub">{content.googlePlay.subtitle}</span>
              <span className="store-name">{content.googlePlay.title}</span>
            </div>
          </a>
        </div>
      </div>
    </motion.section>
  );
};

export default AppDownloadBanner;
