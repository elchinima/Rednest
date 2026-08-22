import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';
import { encodeCode128 } from '../../../utils/code128';
import logo from '../../../assets/icons/rednest_logo.png';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import Footer from '../../Footer/Footer';
import UserNavPills from '../../Elements/UserNavPills';
import superPrizeIcon from '../../../assets/icons/super-prize.svg';
import freeDrinkIcon from '../../../assets/icons/free-drink.svg';
import freeDessertIcon from '../../../assets/icons/free-dessert.svg';
import discount25Icon from '../../../assets/icons/discount-25.svg';
import cashbackIcon from '../../../assets/icons/cashback.svg';
import discount50Icon from '../../../assets/icons/discount-50.svg';
import defaultGiftIcon from '../../../assets/icons/gift-animated.svg';
import ticketAnimatedIcon from '../../../assets/icons/ticket-animated.svg';
import fortuneWheelIcon from '../../../assets/icons/fortune-wheel.svg';
import './Promos.scss';

const PRIZE_TYPE_ICONS = {
  SuperPrize: superPrizeIcon,
  FreeDrink: freeDrinkIcon,
  FreeDessert: freeDessertIcon,
  Discount25: discount25Icon,
  CashbackOnPurchases: cashbackIcon,
  Discount50: discount50Icon,
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

const BarcodeVisual = ({ code }) => {
  const binaryString = React.useMemo(() => {
    return encodeCode128(code);
  }, [code]);

  if (!binaryString) return null;

  const quietZone = 10;
  const totalWidth = binaryString.length + quietZone * 2;
  const height = 44;

  return (
    <div className="promo-barcode-wrap" title={`Barcode: ${code}`}>
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="promo-barcode-svg"
        preserveAspectRatio="none"
      >
        <rect width={totalWidth} height={height} fill="#ffffff" />
        {binaryString.split('').map((bit, idx) => {
          if (bit === '1') {
            return (
              <rect
                key={idx}
                x={quietZone + idx}
                y={0}
                width={1}
                height={height}
                fill="#000000"
              />
            );
          }
          return null;
        })}
      </svg>
      <span className="promo-barcode-number">{code}</span>
    </div>
  );
};

const Promos = () => {
  const { user } = useAuth();
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [copiedCode, setCopiedCode] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || '';

  const fetchPromos = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/auth/promos`);
      if (!res.ok) {
        throw new Error('Failed to load promo codes');
      }
      const data = await res.json();
      setPromos(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Error loading promos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPromos();
    }
  }, [user]);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.classList.add('mobile-menu-open');
    } else {
      document.body.classList.remove('mobile-menu-open');
    }
    return () => document.body.classList.remove('mobile-menu-open');
  }, [isMenuOpen]);

  const handleCopy = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  const filteredPromos = promos.filter((p) => {
    if (filter === 'active') return p.isActive;
    if (filter === 'expired') return !p.isActive || p.isExpired;
    return true;
  });

  const activeCount = promos.filter((p) => p.isActive).length;
  const expiredCount = promos.filter((p) => !p.isActive || p.isExpired).length;

  return (
    <motion.div
      className="promos-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <header className="home-header">
        <div className="logo-container">
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src={logo} alt="Rednest Logo" className="logo" />
            <span className="brand-name">Rednest</span>
          </Link>
        </div>

        <div className={`nav-menu ${isMenuOpen ? 'open' : ''}`}>
          <nav className="nav-links">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/catalog" className="nav-link">Menu</Link>
          </nav>
          <UserNavPills onMenuClose={() => setIsMenuOpen(false)} />
        </div>

        <div className={`menu-overlay ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(false)} />
        <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? '✕' : '☰'}
        </button>
      </header>

      <main className="promos-main">
        <div className="promos-container">
          <motion.div
            className="promos-hero-text"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1>My Promo Codes</h1>
            <p className="promos-hero-desc">
              Your exclusive rewards, discounts, and wheel spin bonuses
            </p>
          </motion.div>

          <div className="promos-filters">
            <button
              type="button"
              className={`promos-filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({promos.length})
            </button>
            <button
              type="button"
              className={`promos-filter-btn ${filter === 'active' ? 'active' : ''}`}
              onClick={() => setFilter('active')}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              className={`promos-filter-btn ${filter === 'expired' ? 'active' : ''}`}
              onClick={() => setFilter('expired')}
            >
              Expired ({expiredCount})
            </button>
          </div>

          {loading ? (
            <div className="promos-loading-state">
              <img src={loaderIcon} alt="Loading..." className="promos-loader-icon" />
              <p>Loading your promo codes...</p>
            </div>
          ) : error ? (
            <div className="promos-error-state">
              <p>{error}</p>
              <button type="button" className="cta-btn sm" onClick={fetchPromos}>
                Try Again
              </button>
            </div>
          ) : filteredPromos.length === 0 ? (
            <motion.div
              className="promos-empty-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="promos-empty-icon">
                <img src={ticketAnimatedIcon} alt="Promo codes" className="promos-empty-icon-img" />
              </div>
              <h3>
                {filter === 'active'
                  ? 'No active promo codes right now'
                  : filter === 'expired'
                  ? 'No expired promo codes'
                  : 'No promo codes yet'}
              </h3>
              <p>
                {filter === 'active'
                  ? 'Spin the Wheel of Fortune to win free drinks, desserts, and discounts!'
                  : 'Play the Fortune mini-game to unlock exclusive Rednest perks and discounts.'}
              </p>
              <Link to="/fortune" className="cta-btn sm promos-empty-btn">
                <img src={fortuneWheelIcon} alt="" className="promos-empty-btn-icon" />
                <span>Spin Fortune Wheel</span>
              </Link>
            </motion.div>
          ) : (
            <motion.div
              className="promos-grid"
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <AnimatePresence>
                {filteredPromos.map((promo, idx) => {
                  const icon = PRIZE_TYPE_ICONS[promo.prizeType] || defaultGiftIcon;
                  const isCopied = copiedCode === promo.promoCode;
                  const isActive = promo.isActive;

                  return (
                    <motion.div
                      key={promo.id || idx}
                      className={`promo-ticket-card ${isActive ? 'promo-ticket--active' : 'promo-ticket--expired'}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.35, delay: idx * 0.05 }}
                    >
                      <div className="promo-ticket__header">
                        <div className="promo-ticket__icon-badge">
                          <img src={icon} alt={promo.prizeName} className="promo-ticket__icon-img" />
                        </div>
                        <div className="promo-ticket__title-group">
                          <span className={`promo-status-badge ${isActive ? 'badge-active' : 'badge-expired'}`}>
                            {isActive ? '● Active' : 'Expired / Used'}
                          </span>
                          <h3 className="promo-ticket__name">{promo.prizeName}</h3>
                          <p className="promo-ticket__desc">{promo.prizeDescription}</p>
                        </div>
                      </div>

                      <div className="promo-ticket__divider">
                        <span className="promo-ticket__notch promo-ticket__notch--left" />
                        <span className="promo-ticket__dashed-line" />
                        <span className="promo-ticket__notch promo-ticket__notch--right" />
                      </div>

                      <div className="promo-ticket__body">
                        <div className="promo-code-box">
                          <div className="promo-code-text-group">
                            <span className="promo-code-label">PROMO CODE</span>
                            <span className="promo-code-value">{promo.promoCode}</span>
                          </div>
                          <button
                            type="button"
                            className={`promo-copy-btn ${isCopied ? 'copied' : ''}`}
                            onClick={() => handleCopy(promo.promoCode)}
                            title="Copy code"
                          >
                            {isCopied ? (
                              <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>

                        {promo.barCode && (
                          <BarcodeVisual code={promo.barCode} />
                        )}

                        <div className="promo-dates-row">
                          <div className="promo-date-item">
                            <span className="promo-date-label">Activated:</span>
                            <span className="promo-date-val">{formatDate(promo.activatedAt)}</span>
                          </div>
                          <div className="promo-date-item">
                            <span className="promo-date-label">Expires:</span>
                            <span className="promo-date-val">{formatDate(promo.expiresAt)}</span>
                          </div>
                        </div>

                        {isActive && (
                          <div className="promo-ticket__actions">
                            <Link to="/catalog" className="promo-action-btn">
                              Use in Menu →
                            </Link>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </main>

      <Footer />
    </motion.div>
  );
};

export default Promos;
