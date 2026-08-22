import React, { useState, useEffect } from 'react';
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

const springTransition = { type: 'spring', stiffness: 260, damping: 25 };
const smoothEase = [0.16, 1, 0.3, 1];

const cardVariants = {
  hidden: (i) => ({
    opacity: 0,
    y: 40,
    scale: 0.92,
    rotateX: 6,
  }),
  visible: (i) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: {
      delay: 0.15 + i * 0.12,
      duration: 0.55,
      ease: smoothEase,
    },
  }),
};

const pillContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

const pillVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 400, damping: 22 },
  },
  exit: { opacity: 0, scale: 0.85, y: -4, transition: { duration: 0.15 } },
};

const detailsVariants = {
  hidden: { opacity: 0, height: 0, y: -8 },
  visible: {
    opacity: 1,
    height: 'auto',
    y: 0,
    transition: { duration: 0.35, ease: smoothEase },
  },
  exit: {
    opacity: 0,
    height: 0,
    y: -8,
    transition: { duration: 0.25, ease: [0.4, 0, 1, 1] },
  },
};

const stepPanelVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: smoothEase,
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
  exit: {
    opacity: 0,
    y: 20,
    scale: 0.97,
    transition: { duration: 0.3, ease: [0.4, 0, 1, 1] },
  },
};

const stepChildVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: smoothEase } },
};

const FeaturePill = ({ icon, label }) => (
  <motion.span className="feature-pill" variants={pillVariants}>
    <img src={icon} alt="" className="feature-pill__icon" />
    <span>{label}</span>
  </motion.span>
);

const Order = () => {
  const { user } = useAuth();
  const { items, grandTotal, discountedTotal, promoDiscountAmount } = useBasket();
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isMenuOpen) {
      document.body.classList.add('mobile-menu-open');
    } else {
      document.body.classList.remove('mobile-menu-open');
    }
    return () => document.body.classList.remove('mobile-menu-open');
  }, [isMenuOpen]);

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

          <motion.div
            layout
            className={`order-methods-container ${selectedMethod ? 'is-collapsed' : 'is-expanded'}`}
            transition={{ duration: 0.45, ease: smoothEase }}
          >
            <div className="order-methods-grid">
              <motion.div
                layout
                custom={0}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className={`order-method-card ${selectedMethod === 'cashier' ? 'selected' : ''} ${selectedMethod && selectedMethod !== 'cashier' ? 'unselected' : ''}`}
                onClick={() => handleSelectMethod('cashier')}
                whileHover={!selectedMethod ? { scale: 1.02, y: -4, transition: { duration: 0.25 } } : {}}
                whileTap={!selectedMethod ? { scale: 0.98 } : {}}
              >
                <div className="order-method-card__top">
                  <motion.div
                    className="order-method-card__icon-wrap"
                    whileHover={{ rotate: [0, -6, 6, 0], transition: { duration: 0.5 } }}
                  >
                    <img src={cashierIcon} alt="Pay at Cashier" className="order-method-card__icon" />
                  </motion.div>
                  <div className="order-method-card__title-group">
                    <span className="order-method-card__badge">In-Store Pickup</span>
                    <h2 className="order-method-card__title">Pay at Cashier</h2>
                    <span className="order-method-card__subtitle">Pay at Cashier Counter</span>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {!selectedMethod && (
                    <motion.div
                      className="order-method-card__details"
                      variants={detailsVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                    >
                      <p className="order-method-card__desc">
                        Pay with cash or bank card in person when you pick up your fresh order at the barista counter.
                      </p>
                      <motion.div
                        className="order-method-card__features"
                        variants={pillContainerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                      >
                        <FeaturePill icon={featureCashIcon} label="Cash Payment" />
                        <FeaturePill icon={featureNfcIcon} label="Card & NFC" />
                        <FeaturePill icon={featurePromoIcon} label="Use Promo Codes" />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div className="order-method-card__footer" layout>
                  <motion.span
                    className="order-method-card__radio-btn"
                    layout
                    key={selectedMethod === 'cashier' ? 'selected' : 'choose'}
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={springTransition}
                  >
                    {selectedMethod === 'cashier' ? '✓ Selected' : 'Choose Cashier'}
                  </motion.span>
                </motion.div>
              </motion.div>

              <motion.div
                layout
                custom={1}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className={`order-method-card ${selectedMethod === 'online' ? 'selected' : ''} ${selectedMethod && selectedMethod !== 'online' ? 'unselected' : ''}`}
                onClick={() => handleSelectMethod('online')}
                whileHover={!selectedMethod ? { scale: 1.02, y: -4, transition: { duration: 0.25 } } : {}}
                whileTap={!selectedMethod ? { scale: 0.98 } : {}}
              >
                <div className="order-method-card__top">
                  <motion.div
                    className="order-method-card__icon-wrap"
                    whileHover={{ rotate: [0, -6, 6, 0], transition: { duration: 0.5 } }}
                  >
                    <img src={onlineIcon} alt="Pay Online" className="order-method-card__icon" />
                  </motion.div>
                  <div className="order-method-card__title-group">
                    <span className="order-method-card__badge badge-online">Instant & Contactless</span>
                    <h2 className="order-method-card__title">Pay Online</h2>
                    <span className="order-method-card__subtitle">Pay Online Instantly</span>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {!selectedMethod && (
                    <motion.div
                      className="order-method-card__details"
                      variants={detailsVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                    >
                      <p className="order-method-card__desc">
                        Pay securely online with your credit/debit card or Rednest balance for immediate preparation.
                      </p>
                      <motion.div
                        className="order-method-card__features"
                        variants={pillContainerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                      >
                        <FeaturePill icon={featureCardVisaMcIcon} label="Visa or Mastercard" />
                        <FeaturePill icon={featureWalletIcon} label="Pay via Balance" />
                        <FeaturePill icon={featureStripeIcon} label="Pay via Stripe" />
                        <FeaturePill icon={featureGPayIcon} label="Google Pay" />
                        <FeaturePill icon={featureCashbackIcon} label="Earn Cashback" />
                        <FeaturePill icon={featurePromoIcon} label="Use Promo Codes" />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div className="order-method-card__footer" layout>
                  <motion.span
                    className="order-method-card__radio-btn"
                    layout
                    key={selectedMethod === 'online' ? 'selected' : 'choose'}
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={springTransition}
                  >
                    {selectedMethod === 'online' ? '✓ Selected' : 'Choose Online'}
                  </motion.span>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {selectedMethod && (
              <motion.div
                className="order-step-content"
                variants={stepPanelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                key={selectedMethod}
              >
                <div className="order-step-box">
                  <motion.div className="order-step-header" variants={stepChildVariants}>
                    <div className="order-step-info">
                      <h3>Selected Payment: <span>{selectedMethod === 'cashier' ? 'Pay at Cashier' : 'Pay Online'}</span></h3>
                      <p>
                        {selectedMethod === 'cashier'
                          ? 'Your order will be sent to the baristas and marked for in-store payment upon pickup.'
                          : 'Proceeding with secure online payment for immediate order confirmation.'}
                      </p>
                    </div>
                    <motion.button
                      type="button"
                      className="order-change-btn"
                      onClick={() => setSelectedMethod(null)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Change Method
                    </motion.button>
                  </motion.div>

                  <motion.div className="order-summary-pill-row" variants={stepChildVariants}>
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
                      <motion.span
                        className="value"
                        key={finalAmount}
                        initial={{ scale: 1.15, color: '#f87171' }}
                        animate={{ scale: 1, color: '#ef4444' }}
                        transition={{ duration: 0.4 }}
                      >
                        {finalAmount} ₼
                      </motion.span>
                    </div>
                  </motion.div>

                  <motion.div className="order-actions-row" variants={stepChildVariants}>
                    <motion.button
                      type="button"
                      className="cta-btn order-confirm-btn"
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        alert(`Order flow for "${selectedMethod === 'cashier' ? 'Pay at Cashier' : 'Pay Online'}" will be continued here.`);
                      }}
                    >
                      {selectedMethod === 'cashier' ? 'Confirm & Place Order (Pay at Cashier)' : 'Continue to Online Payment'}
                    </motion.button>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                      <Link to="/basket" className="cta-btn secondary order-back-btn">
                        Back to Basket
                      </Link>
                    </motion.div>
                  </motion.div>
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
