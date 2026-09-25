import React, { useRef, useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../../../assets/icons/rednest_logo.png';
import premiumRoastIcon from '../../../assets/icons/premium_roast.svg';
import cozyAtmosphereIcon from '../../../assets/icons/cozy_atmosphere.svg';
import ecoFriendlyIcon from '../../../assets/icons/eco_friendly.svg';
import homeCardLoader from '../../../assets/icons/home-product-card-loader.svg';
import bgVideoUrl from '../../../assets/video/media_1.mp4';
import aboutImage from '../../../assets/images/about_image.png';
import SubscribeModal from './SubscribeModal';
import SubscribeErrorModal from './SubscribeErrorModal';
import SubscribeSuccessModal from './SubscribeSuccessModal';
import Footer from '../../Footer/Footer';
import Navbar from '../../Elements/Navbar';
import { useLang } from '../../../utils/useLang';
import { getHomeTranslation } from './Lang';
import './Home.scss';


let cachedBlobUrl = null;
let blobFetchPromise = null;

function getVideoBlobUrl() {
  if (cachedBlobUrl) return Promise.resolve(cachedBlobUrl);
  if (blobFetchPromise) return blobFetchPromise;

  blobFetchPromise = fetch(bgVideoUrl)
    .then(res => res.blob())
    .then(blob => {
      cachedBlobUrl = URL.createObjectURL(blob);
      return cachedBlobUrl;
    })
    .catch(() => {
      blobFetchPromise = null;
      return bgVideoUrl;
    });

  return blobFetchPromise;
}

const Home = () => {
  const navigate = useNavigate();
  const lang = useLang();
  const t = (dataId) => getHomeTranslation(lang, dataId);

  const videoRef = useRef(null);
  const [videoBlobSrc, setVideoBlobSrc] = useState(cachedBlobUrl || '');
  const featuresGridRef = useRef(null);

  const features = useMemo(() => [
    {
      id: 'feature_1',
      icon: premiumRoastIcon,
      alt: 'Premium Roast',
      titleKey: 'home_feature_1_title',
      descKey: 'home_feature_1_desc',
    },
    {
      id: 'feature_2',
      icon: cozyAtmosphereIcon,
      alt: 'Cozy Atmosphere',
      titleKey: 'home_feature_2_title',
      descKey: 'home_feature_2_desc',
    },
    {
      id: 'feature_3',
      icon: ecoFriendlyIcon,
      alt: 'Eco-Friendly',
      titleKey: 'home_feature_3_title',
      descKey: 'home_feature_3_desc',
    },
  ], []);


  useEffect(() => {
    const el = featuresGridRef.current;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let hasMoved = false;

    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      isDown = true;
      hasMoved = false;
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
      el.style.scrollSnapType = 'none';
      el.style.scrollBehavior = 'auto';
    };

    const onMouseMove = (e) => {
      if (!isDown) return;
      const x = e.pageX - el.offsetLeft;
      const walk = x - startX;
      if (Math.abs(walk) > 4) {
        hasMoved = true;
        el.style.cursor = 'grabbing';
      }
      el.scrollLeft = scrollLeft - walk;
    };

    const onMouseUp = () => {
      if (!isDown) return;
      isDown = false;
      el.style.cursor = '';
      el.style.scrollSnapType = 'x mandatory';
      el.style.scrollBehavior = 'smooth';
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const [subscribeEmail, setSubscribeEmail] = useState('');
  const [isSubscribeModalOpen, setIsSubscribeModalOpen] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorType, setErrorType] = useState('ACCOUNT_NOT_FOUND');
  const [successMessage, setSuccessMessage] = useState('');
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [favoriteProducts, setFavoriteProducts] = useState([]);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth > 768;
    }
    return true;
  });

  const [skeletonCount, setSkeletonCount] = useState(() => {
    if (typeof window === 'undefined') return 4;
    const w = window.innerWidth;
    if (w < 640) return 1;
    if (w < 980) return 2;
    if (w < 1280) return 3;
    return 4;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth > 768);
      const w = window.innerWidth;
      if (w < 640) setSkeletonCount(1);
      else if (w < 980) setSkeletonCount(2);
      else if (w < 1280) setSkeletonCount(3);
      else setSkeletonCount(4);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!videoBlobSrc) {
      getVideoBlobUrl().then(url => setVideoBlobSrc(url));
    }
  }, []);

  const apiUrl = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    let isMounted = true;
    const fetchFavorites = async () => {
      setFavoritesLoading(true);
      try {
        const res = await fetch(`${apiUrl}/api/products/favorites?limit=4&lang=${lang}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data)) {
            setFavoriteProducts(data);
          }
        }
      } catch (err) {
        console.error('Failed to load favorite products:', err);
      } finally {
        if (isMounted) {
          setFavoritesLoading(false);
        }
      }
    };

    fetchFavorites();
    return () => {
      isMounted = false;
    };
  }, [apiUrl, lang]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (videoRef.current) {
            if (entry.isIntersecting) {
              videoRef.current.play().catch(error => {
                console.log("Auto-play prevented", error);
              });
            } else {
              videoRef.current.pause();
            }
          }
        });
      },
      {
        rootMargin: '600px 0px 600px 0px',
        threshold: 0
      }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => {
      if (videoRef.current) {
        observer.unobserve(videoRef.current);
      }
    };
  }, []);

  const handleSubscribeSubmit = async (e) => {
    e.preventDefault();
    if (!subscribeEmail.trim() || subscribeLoading) return;
    setSubscribeLoading(true);

    try {
      const res = await fetch(`${apiUrl}/api/auth/subscribe/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: subscribeEmail.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        const err = new Error(data.message || 'Subscription request failed.');
        err.errorType = data.errorType || (res.status === 409 || data.message?.toLowerCase().includes('already') ? 'ALREADY_SUBSCRIBED' : 'ACCOUNT_NOT_FOUND');
        throw err;
      }

      setIsSubscribeModalOpen(true);
    } catch (err) {
      setErrorMessage(err.message || 'This email is not registered. Please create an account first.');
      setErrorType(err.errorType || (err.message?.toLowerCase().includes('already') ? 'ALREADY_SUBSCRIBED' : 'ACCOUNT_NOT_FOUND'));
      setIsErrorModalOpen(true);
    } finally {
      setSubscribeLoading(false);
    }
  };

  return (
    <motion.div 
      className="home-page"
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      transition={{ duration: 0.3 }}
    >
      <Navbar />

      <section className="hero-section">
        {videoBlobSrc && (
          <video ref={videoRef} autoPlay loop muted playsInline preload="auto" className="hero-video-bg" src={videoBlobSrc} />
        )}
        <div className="hero-overlay"></div>

        <div className="hero-content">
          <h1 className="hero-title" data-id="home_hero_title">
            {t('home_hero_title')}
          </h1>
          <p className="hero-subtitle" data-id="home_hero_subtitle">
            {t('home_hero_subtitle_1')}<br className="hero-subtitle-br" />
            {t('home_hero_subtitle_2')}
          </p>
          <div className="hero-actions">
            <Link to="/catalog" className="cta-btn lg" data-id="home_hero_btn">
              {t('home_hero_btn')}
            </Link>
          </div>
        </div>
      </section>

      <motion.section 
        className="features-section"
        initial={{ opacity: 0, y: 50 }} 
        whileInView={{ opacity: 1, y: 0 }} 
        viewport={{ once: true, amount: 0.2 }} 
        transition={{ duration: 0.6 }}
      >
        <div 
          className="features-grid"
          ref={featuresGridRef}
        >
          {features.map((feature) => (
            <div key={feature.id} className="feature-card">
              <div className="feature-icon">
                <img src={feature.icon} alt={feature.alt} className="feature-svg" />
              </div>
              <h3 data-id={feature.titleKey}>{t(feature.titleKey)}</h3>
              <p data-id={feature.descKey}>{t(feature.descKey)}</p>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section 
        className="popular-menu-section"
        initial={{ opacity: 0, y: 50 }} 
        whileInView={{ opacity: 1, y: 0 }} 
        viewport={{ once: true, amount: 0.2 }} 
        transition={{ duration: 0.6 }}
      >
        <div className="section-header">
          <h2 data-id="home_favorites_title">{t('home_favorites_title')}</h2>
          <p data-id="home_favorites_subtitle">{t('home_favorites_subtitle')}</p>
        </div>
        <div className="menu-grid">
          {favoritesLoading ? (
            Array.from({ length: skeletonCount }).map((_, i) => (
              <div key={i} className="home-skeleton-card">
                <img src={homeCardLoader} alt="Loading product" className="skeleton-svg-img" />
              </div>
            ))
          ) : favoriteProducts.length === 0 ? (
            <div className="empty-favorites">
              <p data-id="home_favorites_empty">{t('home_favorites_empty')}</p>
            </div>
          ) : (
            favoriteProducts.map((prod) => {
              const rawBasePrice = prod.prices?.price ?? prod.price;
              const basePriceNum = typeof rawBasePrice === 'number' ? rawBasePrice : parseFloat(rawBasePrice) || 0;
              const rawDiscountPrice = prod.prices?.discountPrice;
              const discountPriceNum = rawDiscountPrice !== undefined && rawDiscountPrice !== null && rawDiscountPrice !== ''
                ? (typeof rawDiscountPrice === 'number' ? rawDiscountPrice : parseFloat(rawDiscountPrice))
                : null;

              const hasDiscount = discountPriceNum !== null && !isNaN(discountPriceNum) && discountPriceNum > 0 && discountPriceNum < basePriceNum;
              const discountPercent = hasDiscount ? Math.round((1 - discountPriceNum / basePriceNum) * 100) : 0;
              const effectivePriceFormatted = hasDiscount ? discountPriceNum.toFixed(2) : basePriceNum.toFixed(2);
              const oldPriceFormatted = basePriceNum.toFixed(2);

              return (
                <div key={prod.id} className="menu-item-card">
                  <div className="favorite-badge" data-id="home_favorites_badge">{t('home_favorites_badge')}</div>
                  <img
                    src={prod.images?.image || prod.images?.icon || cappuccinoImg}
                    alt={prod.name}
                    className="menu-img-placeholder"
                    style={{ objectFit: 'cover' }}
                    loading="lazy"
                  />
                  <div className="menu-info">
                    <h4 title={prod.name}>{prod.name}</h4>
                    <p title={prod.description || ''}>{prod.description || 'Delicious handcrafted drink made with premium ingredients.'}</p>
                    <div className={`home-price-container ${hasDiscount ? 'has-discount' : 'no-discount'}`}>
                      {hasDiscount && (
                        <div className="home-old-price-pill">
                          <span className="discount-tag">-{discountPercent}%</span>
                          <span className="old-price">{oldPriceFormatted} ₼</span>
                        </div>
                      )}
                      <span className="price">{effectivePriceFormatted} ₼</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="section-actions">
          <Link to="/catalog" className="cta-btn secondary" data-id="home_favorites_btn">
            {t('home_favorites_btn')}
          </Link>
        </div>
      </motion.section>

      <motion.section 
        className="about-us-section"
        initial={{ opacity: 0, y: 50 }} 
        whileInView={{ opacity: 1, y: 0 }} 
        viewport={{ once: true, amount: 0.2 }} 
        transition={{ duration: 0.6 }}
      >
        <div className="about-grid">
          <div className="about-content">
            <h2 data-id="home_about_title">{t('home_about_title')}</h2>
            <p data-id="home_about_p1">
              {t('home_about_p1')}
            </p>
            <p data-id="home_about_p2">
              {t('home_about_p2')}
            </p>
          </div>
          {isDesktop && (
            <div className="about-visual">
              <img src={aboutImage} alt="The Rednest Experience" className="about-image" loading="lazy" />
            </div>
          )}
        </div>
      </motion.section>

      <motion.section 
        className="newsletter-section"
        initial={{ opacity: 0, y: 50 }} 
        whileInView={{ opacity: 1, y: 0 }} 
        viewport={{ once: true, amount: 0.2 }} 
        transition={{ duration: 0.6 }}
      >
        <div className="newsletter-container">
          <h2 data-id="home_club_title">{t('home_club_title')}</h2>
          <p data-id="home_club_desc">{t('home_club_desc')}</p>
          <form className="newsletter-form" onSubmit={handleSubscribeSubmit}>
            <input 
              type="email" 
              placeholder={t('home_club_placeholder')} 
              value={subscribeEmail}
              onChange={(e) => setSubscribeEmail(e.target.value)}
              required 
              data-id="home_club_placeholder"
            />
            <button type="submit" className="cta-btn" id="subscribe-btn" disabled={subscribeLoading} data-id="home_club_btn">
              {subscribeLoading ? t('home_club_btn_loading') : t('home_club_btn')}
            </button>
          </form>
        </div>
      </motion.section>

      <SubscribeModal
        isOpen={isSubscribeModalOpen}
        onClose={() => setIsSubscribeModalOpen(false)}
        email={subscribeEmail}
        onSuccess={(msg) => {
          setSuccessMessage(msg);
          setIsSuccessModalOpen(true);
          setSubscribeEmail('');
        }}
      />

      <SubscribeErrorModal
        isOpen={isErrorModalOpen}
        onClose={() => setIsErrorModalOpen(false)}
        message={errorMessage}
        errorType={errorType}
        onOpenRegister={() => navigate('/login')}
      />

      <SubscribeSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        message={successMessage}
      />

      <Footer />
    </motion.div>
  );
};

export default Home;
