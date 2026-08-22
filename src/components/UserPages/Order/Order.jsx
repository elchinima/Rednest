import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useBasket } from '../../../context/BasketContext';
import logo from '../../../assets/icons/rednest_logo.png';
import cashierIcon from '../../../assets/icons/cashier-register.svg';
import onlineIcon from '../../../assets/icons/online-card.svg';
import Footer from '../../Footer/Footer';
import UserNavPills from '../../Elements/UserNavPills';
import './Order.scss';

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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="order-step-badge">Checkout & Payment</div>
            <h1>Choose Payment Method</h1>
            <p className="order-hero-desc">
              Select how you would like to pay for your order.
            </p>
          </motion.div>

          <motion.div
            layout
            className={`order-methods-container ${selectedMethod ? 'is-collapsed' : 'is-expanded'}`}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="order-methods-grid">
              {/* Option 1: На кассе */}
              <motion.div
                layout
                className={`order-method-card ${selectedMethod === 'cashier' ? 'selected' : ''} ${selectedMethod && selectedMethod !== 'cashier' ? 'unselected' : ''}`}
                onClick={() => handleSelectMethod('cashier')}
                whileHover={{ scale: 1.015, y: -2 }}
                whileTap={{ scale: 0.985 }}
                transition={{ duration: 0.25 }}
              >
                <div className="order-method-card__top">
                  <div className="order-method-card__icon-wrap">
                    <img src={cashierIcon} alt="На кассе" className="order-method-card__icon" />
                  </div>
                  <div className="order-method-card__title-group">
                    <span className="order-method-card__badge">In-Store Pickup</span>
                    <h2 className="order-method-card__title">На кассе</h2>
                    <span className="order-method-card__subtitle">Pay at Cashier Counter</span>
                  </div>
                </div>

                <AnimatePresence>
                  {!selectedMethod && (
                    <motion.div
                      className="order-method-card__details"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <p className="order-method-card__desc">
                        Pay with cash or bank card in person when you pick up your fresh order at the barista counter.
                      </p>
                      <div className="order-method-card__features">
                        <span className="feature-pill">💵 Cash or Card</span>
                        <span className="feature-pill">☕ Pay on Pickup</span>
                        <span className="feature-pill">🧾 Printed Receipt</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="order-method-card__footer">
                  <span className="order-method-card__radio-btn">
                    {selectedMethod === 'cashier' ? '✓ Selected' : 'Choose Cashier'}
                  </span>
                </div>
              </motion.div>

              {/* Option 2: Онлайн */}
              <motion.div
                layout
                className={`order-method-card ${selectedMethod === 'online' ? 'selected' : ''} ${selectedMethod && selectedMethod !== 'online' ? 'unselected' : ''}`}
                onClick={() => handleSelectMethod('online')}
                whileHover={{ scale: 1.015, y: -2 }}
                whileTap={{ scale: 0.985 }}
                transition={{ duration: 0.25 }}
              >
                <div className="order-method-card__top">
                  <div className="order-method-card__icon-wrap">
                    <img src={onlineIcon} alt="Онлайн" className="order-method-card__icon" />
                  </div>
                  <div className="order-method-card__title-group">
                    <span className="order-method-card__badge badge-online">Instant & Contactless</span>
                    <h2 className="order-method-card__title">Онлайн</h2>
                    <span className="order-method-card__subtitle">Pay Online Instantly</span>
                  </div>
                </div>

                <AnimatePresence>
                  {!selectedMethod && (
                    <motion.div
                      className="order-method-card__details"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <p className="order-method-card__desc">
                        Pay securely online with your credit/debit card or Rednest balance for immediate preparation.
                      </p>
                      <div className="order-method-card__features">
                        <span className="feature-pill">💳 Card & Balance</span>
                        <span className="feature-pill">⚡ Immediate Queue</span>
                        <span className="feature-pill">🔒 Secure Payment</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="order-method-card__footer">
                  <span className="order-method-card__radio-btn">
                    {selectedMethod === 'online' ? '✓ Selected' : 'Choose Online'}
                  </span>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Selected State Panel (prepares for future steps) */}
          <AnimatePresence>
            {selectedMethod && (
              <motion.div
                className="order-step-content"
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.98 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="order-step-box">
                  <div className="order-step-header">
                    <div className="order-step-info">
                      <h3>Selected Payment: <span>{selectedMethod === 'cashier' ? 'На кассе' : 'Онлайн'}</span></h3>
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
                      <span className="value">{finalAmount} ₼</span>
                    </div>
                  </div>

                  <div className="order-actions-row">
                    <button
                      type="button"
                      className="cta-btn order-confirm-btn"
                      onClick={() => {
                        // Future implementation step
                        alert(`Order flow for "${selectedMethod === 'cashier' ? 'На кассе' : 'Онлайн'}" will be continued here.`);
                      }}
                    >
                      {selectedMethod === 'cashier' ? 'Confirm & Place Order (На кассе)' : 'Continue to Online Payment'}
                    </button>
                    <Link to="/basket" className="cta-btn secondary order-back-btn">
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
