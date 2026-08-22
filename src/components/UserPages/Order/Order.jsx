import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useBasket } from '../../../context/BasketContext';
import logo from '../../../assets/icons/rednest_logo.png';
import cashierIcon from '../../../assets/icons/cashier-register.svg';
import onlineIcon from '../../../assets/icons/online-card.svg';
import featureCashIcon from '../../../assets/icons/feature-cash.svg';
import featureNfcIcon from '../../../assets/icons/feature-nfc.svg';
import featurePromoIcon from '../../../assets/icons/feature-promo.svg';
import featureCardVisaMcIcon from '../../../assets/icons/feature-card-visa-mc.svg';
import featureWalletIcon from '../../../assets/icons/feature-wallet.svg';
import featureStripeIcon from '../../../assets/icons/feature-stripe.svg';
import featureGPayIcon from '../../../assets/icons/feature-gpay.svg';
import featureCashbackIcon from '../../../assets/icons/feature-cashback.svg';
import Footer from '../../Footer/Footer';
import UserNavPills from '../../Elements/UserNavPills';
import './Order.scss';

const springTransition = { type: 'spring', stiffness: 280, damping: 24 };
const smoothEase = [0.16, 1, 0.3, 1];

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 28,
    scale: 0.96,
  },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: 0.1 + i * 0.1,
      duration: 0.45,
      ease: smoothEase,
    },
  }),
};

const stepPanelVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: smoothEase,
    },
  },
  exit: {
    opacity: 0,
    y: 12,
    scale: 0.98,
    transition: { duration: 0.25, ease: [0.4, 0, 1, 1] },
  },
};

const FeaturePill = ({ icon, label }) => (
  <span className="feature-pill">
    <img src={icon} alt="" className="feature-pill__icon" />
    <span>{label}</span>
  </span>
);

const Order = () => {
  const { user } = useAuth();
  const { items, grandTotal, discountedTotal, promoDiscountAmount } = useBasket();
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const stepBoxRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isMenuOpen) {
      document.body.classList.add('mobile-menu-open');
    } else {
      document.body.classList.remove('mobile-menu-open');
    }
    return () => document.body.classList.remove('mobile-menu-open');
  }, [isMenuOpen]);

  useEffect(() => {
    if (selectedMethod && stepBoxRef.current) {
      const timer = setTimeout(() => {
        stepBoxRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedMethod]);

  const finalAmount = discountedTotal || grandTotal || '0.00';
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleSelectMethod = (method) => {
    setSelectedMethod(method);
  };

  return (
    <motion.div
      className="order-page"
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
            <Link to="/basket" className="nav-link">Basket {itemCount > 0 ? `(${itemCount})` : ''}</Link>
          </nav>
          <UserNavPills onMenuClose={() => setIsMenuOpen(false)} />
        </div>

        <div className={`menu-overlay ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(false)} />
        <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? '✕' : '☰'}
        </button>
      </header>

      <main className="order-main">
        <div className="order-container">
          <motion.div
            className="order-hero-text"
            initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.6, ease: smoothEase }}
          >
            <motion.div
              className="order-step-badge"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, ...springTransition }}
            >
              Checkout & Payment
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5, ease: smoothEase }}
            >
              Choose Payment Method
            </motion.h1>
            <motion.p
              className="order-hero-desc"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.4 }}
            >
              Select how you would like to pay for your order.
            </motion.p>
          </motion.div>

          <div className="order-methods-container">
            <div className="order-methods-grid">
              <motion.div
                custom={0}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className={`order-method-card ${selectedMethod === 'cashier' ? 'selected' : ''} ${selectedMethod && selectedMethod !== 'cashier' ? 'unselected' : ''}`}
                onClick={() => handleSelectMethod('cashier')}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="order-method-card__top">
                  <div className="order-method-card__icon-wrap">
                    <img src={cashierIcon} alt="Pay at Cashier" className="order-method-card__icon" />
                  </div>
                  <div className="order-method-card__title-group">
                    <span className="order-method-card__badge">In-Store Pickup</span>
                    <h2 className="order-method-card__title">Pay at Cashier</h2>
                    <span className="order-method-card__subtitle">Pay at Cashier Counter</span>
                  </div>
                </div>

                <div className="order-method-card__details">
                  <p className="order-method-card__desc">
                    Pay with cash or bank card in person when you pick up your fresh order at the barista counter.
                  </p>
                  <AnimatePresence initial={false}>
                    {!selectedMethod && (
                      <motion.div
                        className="order-method-card__features-wrap"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.35, ease: smoothEase }}
                      >
                        <div className="order-method-card__features">
                          <FeaturePill icon={featureCashIcon} label="Cash Payment" />
                          <FeaturePill icon={featureNfcIcon} label="Card & NFC" />
                          <FeaturePill icon={featurePromoIcon} label="Use Promo Codes" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="order-method-card__footer">
                  <span className={`order-method-card__radio-btn ${selectedMethod === 'cashier' ? 'selected' : ''}`}>
                    {selectedMethod === 'cashier' ? '✓ Selected' : 'Choose Cashier'}
                  </span>
                </div>
              </motion.div>

              <motion.div
                custom={1}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className={`order-method-card ${selectedMethod === 'online' ? 'selected' : ''} ${selectedMethod && selectedMethod !== 'online' ? 'unselected' : ''}`}
                onClick={() => handleSelectMethod('online')}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="order-method-card__top">
                  <div className="order-method-card__icon-wrap">
                    <img src={onlineIcon} alt="Pay Online" className="order-method-card__icon" />
                  </div>
                  <div className="order-method-card__title-group">
                    <span className="order-method-card__badge badge-online">Instant & Contactless</span>
                    <h2 className="order-method-card__title">Pay Online</h2>
                    <span className="order-method-card__subtitle">Pay Online Instantly</span>
                  </div>
                </div>

                <div className="order-method-card__details">
                  <p className="order-method-card__desc">
                    Pay securely online with your credit/debit card or Rednest balance for immediate preparation.
                  </p>
                  <AnimatePresence initial={false}>
                    {!selectedMethod && (
                      <motion.div
                        className="order-method-card__features-wrap"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.35, ease: smoothEase }}
                      >
                        <div className="order-method-card__features">
                          <FeaturePill icon={featureCardVisaMcIcon} label="Visa or Mastercard" />
                          <FeaturePill icon={featureWalletIcon} label="Pay via Balance" />
                          <FeaturePill icon={featureStripeIcon} label="Pay via Stripe" />
                          <FeaturePill icon={featureGPayIcon} label="Google Pay" />
                          <FeaturePill icon={featureCashbackIcon} label="Earn Cashback" />
                          <FeaturePill icon={featurePromoIcon} label="Use Promo Codes" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="order-method-card__footer">
                  <span className={`order-method-card__radio-btn ${selectedMethod === 'online' ? 'selected' : ''}`}>
                    {selectedMethod === 'online' ? '✓ Selected' : 'Choose Online'}
                  </span>
                </div>
              </motion.div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {selectedMethod && (
              <motion.div
                ref={stepBoxRef}
                className="order-step-content"
                variants={stepPanelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                key={selectedMethod}
              >
                <div className="order-step-box">
                  <div className="order-step-header">
                    <div className="order-step-info">
                      <h3>Selected Payment: <span>{selectedMethod === 'cashier' ? 'Pay at Cashier' : 'Pay Online'}</span></h3>
                      <p>
                        {selectedMethod === 'cashier'
                          ? 'Your order will be sent to the baristas and marked for in-store payment upon pickup.'
                          : 'Proceeding with secure online payment for immediate order confirmation.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="order-change-btn"
                      onClick={() => setSelectedMethod(null)}
                    >
                      Change Method
                    </button>
                  </div>

                  <div className="order-summary-pill-row">
                    <div className="order-summary-pill">
                      <span className="label">Items:</span>
                      <span className="value">{itemCount} items</span>
                    </div>
                    {promoDiscountAmount > 0 && (
                      <div className="order-summary-pill promo">
                        <span className="label">Discount:</span>
                        <span className="value">−{promoDiscountAmount.toFixed(2)} ₼</span>
                      </div>
                    )}
                    <div className="order-summary-pill total">
                      <span className="label">Total to Pay:</span>
                      <span className="value">
                        {finalAmount} ₼
                      </span>
                    </div>
                  </div>

                  <div className="order-actions-row">
                    <button
                      type="button"
                      className="order-confirm-btn"
                      onClick={() => {
                        alert(`Order flow for "${selectedMethod === 'cashier' ? 'Pay at Cashier' : 'Pay Online'}" will be continued here.`);
                      }}
                    >
                      {selectedMethod === 'cashier' ? 'Confirm & Place Order (Pay at Cashier)' : 'Continue to Online Payment'}
                    </button>
                    <Link to="/basket" className="order-back-btn">
                      Back to Basket
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <Footer />
    </motion.div>
  );
};

export default Order;
