import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';
import { encodeCode128 } from '../../../utils/code128';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import loaderIconRed from '../../../assets/icons/loader-animated-red.svg';
import Footer from '../../Footer/Footer';
import Navbar from '../../Elements/Navbar';
import superPrizeIcon from '../../../assets/icons/super-prize.svg';
import freeDrinkIcon from '../../../assets/icons/free-drink.svg';
import freeDessertIcon from '../../../assets/icons/free-dessert.svg';
import discount25Icon from '../../../assets/icons/discount-25.svg';
import cashbackIcon from '../../../assets/icons/cashback.svg';
import discount50Icon from '../../../assets/icons/discount-50.svg';
import defaultGiftIcon from '../../../assets/icons/gift-animated.svg';
import ticketAnimatedIcon from '../../../assets/icons/ticket-animated.svg';
import fortuneWheelDarkIcon from '../../../assets/icons/fortune-wheel-dark.svg';
import './Promos.scss';

const PRIZE_TYPE_ICONS = {
  SuperPrize: superPrizeIcon,
  FreeDrink: freeDrinkIcon,
  FreeDessert: freeDessertIcon,
  Discount25: discount25Icon,
  Discount50: discount50Icon,
  DiscountCustom: discount25Icon,
  CashbackOnPurchases: cashbackIcon,
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Baku',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return formatter.format(d);
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

  const [inputCode, setInputCode] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activationMessage, setActivationMessage] = useState(null);

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
    if (activationMessage) {
      const timer = setTimeout(() => {
        setActivationMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [activationMessage]);

  const handleCopy = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode(null), 2000;
    });
  };

  const handleActivatePromo = async (e) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    setIsActivating(true);
    setActivationMessage(null);

    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/auth/promos/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promoCode: inputCode.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setActivationMessage({
          type: 'error',
          text: data.message || 'Failed to activate promo code. Please check the code.',
        });
        return;
      }

      setActivationMessage({
        type: 'success',
        text: data.message || 'Promo code successfully activated! You can now use it on your next order.',
      });
      setInputCode('');
      fetchPromos();
    } catch (err) {
      setActivationMessage({
        type: 'error',
        text: err.message || 'Network error occurred. Please try again.',
      });
    } finally {
      setIsActivating(false);
    }
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
      <Navbar />

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

          <motion.div
            className="promos-activate-card"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="promos-activate-card__content">
              <div className="promos-activate-card__text">
                <div className="promos-activate-card__badge">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  <span>Redeem Code</span>
                </div>
                <h3>Have a Promo Code?</h3>
                <p>Enter your gift or event promo code to claim your special discount or reward.</p>
              </div>

              <form onSubmit={handleActivatePromo} className="promos-activate-card__form">
                <div className="promos-activate-card__input-wrap">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" className="input-icon">
                    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
                    <line x1="12" y1="9" x2="12" y2="15" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Enter code (e.g. RED-DISC-7X9K)"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                    disabled={isActivating}
                    maxLength={32}
                  />
                  {inputCode && (
                    <button
                      type="button"
                      className="input-clear-btn"
                      onClick={() => setInputCode('')}
                      aria-label="Clear code"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  className="promos-activate-card__btn"
                  disabled={isActivating || !inputCode.trim()}
                >
                  {isActivating ? (
                    <>
                      <img src={loaderIconRed} alt="" className="spinner-inline" />
                      <span>Activating...</span>
                    </>
                  ) : (
                    <span>Activate</span>
                  )}
                </button>
              </form>
            </div>

            <AnimatePresence>
              {activationMessage && (
                <motion.div
                  className={`promos-activate-feedback ${activationMessage.type === 'success' ? 'promos-activate-feedback--success' : 'promos-activate-feedback--error'}`}
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 14 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                >
                  {activationMessage.type === 'success' ? (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  )}
                  <span>{activationMessage.text}</span>
                  <button
                    type="button"
                    className="close-msg"
                    onClick={() => setActivationMessage(null)}
                  >
                    ✕
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
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
                <img src={fortuneWheelDarkIcon} alt="" className="promos-empty-btn-icon" />
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
