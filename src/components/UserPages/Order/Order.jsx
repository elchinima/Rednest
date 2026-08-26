import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useBasket } from '../../../context/BasketContext';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import Footer from '../../Footer/Footer';
import Navbar from '../../Elements/Navbar';
import AnimatedModalWrapper from '../../Elements/AnimatedModalWrapper';
import './Order.scss';

const StripePaymentModal = React.lazy(() => import('./StripePaymentModal'));

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

const ONLINE_PAYMENT_SERVICES = [
  {
    id: 'OnlineStripe',
    name: 'Stripe',
    title: 'Pay with Stripe',
    desc: 'Fast and secure international payment',
    icon: featureStripeIcon,
    badge: 'Popular',
  },
  {
    id: 'OnlineBalance',
    name: 'Rednest Balance',
    title: 'Rednest Balance',
    desc: 'Instant payment from your account balance',
    icon: featureWalletIcon,
    badge: 'Instant',
    isBalance: true,
  },
  {
    id: 'OnlineCardDetails',
    name: 'Visa & Mastercard',
    title: 'Visa or Mastercard',
    desc: 'Debit or credit card payment',
    icon: featureCardVisaMcIcon,
    badge: 'Cards',
  },
  {
    id: 'OnlineGooglePay',
    name: 'Google Pay',
    title: 'Google Pay',
    desc: 'One-tap checkout with Google Pay',
    icon: featureGPayIcon,
    badge: '1-Tap',
  },
];

const Order = () => {
  const { user, updateUser } = useAuth();
  const { items, clearBasket } = useBasket();
  const [products, setProducts] = useState({});
  const [productsLoading, setProductsLoading] = useState(true);
  const [activePromo, setActivePromo] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [isOnlinePaymentModalOpen, setIsOnlinePaymentModalOpen] = useState(false);
  const [isStripeModalOpen, setIsStripeModalOpen] = useState(false);
  const [selectedOnlineService, setSelectedOnlineService] = useState('OnlineStripe');
  const [onlineModalError, setOnlineModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccessData, setOrderSuccessData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const stepBoxRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const response = await fetch(`${apiUrl}/api/products`);
        if (response.ok) {
          const data = await response.json();
          const productMap = {};
          data.forEach(categoryGroup => {
            categoryGroup.items.forEach(item => {
              productMap[item.id] = { ...item, category: item.category || categoryGroup.category };
            });
          });
          setProducts(productMap);
        }
      } catch (err) {
        console.error('Failed to fetch products in Order:', err);
      } finally {
        setProductsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!user) return;
    const apiUrl = import.meta.env.VITE_API_URL || '';
    fetchWithRefresh(`${apiUrl}/api/auth/promo`)
      .then(r => r.json())
      .then(data => {
        if (data && data.hasPromo && data.isActive) {
          setActivePromo(data);
        }
      })
      .catch(() => {});
  }, [user]);


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

  const enrichedItems = useMemo(() => {
    return items
      .map(item => {
        const product = products[item.productId];
        if (!product) return null;
        const unitPrice = parseFloat(product.price);
        const totalPrice = (unitPrice * item.quantity).toFixed(2);
        return { ...item, product, unitPrice, totalPrice };
      })
      .filter(Boolean);
  }, [items, products]);

  const grandTotal = useMemo(() => {
    return enrichedItems
      .reduce((sum, item) => sum + parseFloat(item.totalPrice), 0)
      .toFixed(2);
  }, [enrichedItems]);

  const promoDiscountAmount = useMemo(() => {
    if (!activePromo || !activePromo.isActive || enrichedItems.length === 0) return 0;
    const numericTotal = parseFloat(grandTotal) || 0;
    if (numericTotal <= 0) return 0;

    const pType = String(activePromo.prizeType || '').toLowerCase();
    const pName = String(activePromo.prizeName || '').toUpperCase();

    if (pType === 'cashbackonpurchases' || pType === '4' || pName.includes('CASHBACK')) {
      return 0;
    }

    if (pType === 'discount25' || pType === '3' || pName.includes('25%')) {
      return Math.round(numericTotal * 25) / 100;
    }
    if (pType === 'discount50' || pType === '5' || pName.includes('50%')) {
      return Math.round(numericTotal * 50) / 100;
    }
    if (pType === 'superprize' || pType === '0' || pName.includes('SUPER')) {
      return Math.min(numericTotal, 25.00);
    }
    if (pType === 'freedrink' || pType === '1' || pName.includes('DRINK')) {
      const drinks = enrichedItems.filter(x => {
        const cat = (x.product?.category || '').toLowerCase();
        return cat.includes('drink');
      });
      if (drinks.length === 0) return 0;
      const totalQty = drinks.reduce((sum, x) => sum + x.quantity, 0);
      const totalPrice = drinks.reduce((sum, x) => sum + x.unitPrice * x.quantity, 0);
      return Math.round((totalPrice / totalQty) * 100) / 100;
    }
    if (pType === 'freedessert' || pType === '2' || pName.includes('DESSERT')) {
      const desserts = enrichedItems.filter(x => {
        const cat = (x.product?.category || '').toLowerCase();
        return cat.includes('dessert');
      });
      if (desserts.length === 0) return 0;
      const totalQty = desserts.reduce((sum, x) => sum + x.quantity, 0);
      const totalPrice = desserts.reduce((sum, x) => sum + x.unitPrice * x.quantity, 0);
      return Math.round((totalPrice / totalQty) * 100) / 100;
    }

    return 0;
  }, [activePromo, enrichedItems, grandTotal]);

  const finalAmount = Math.max(0, parseFloat(grandTotal) - promoDiscountAmount).toFixed(2);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleSelectMethod = (method) => {
    setSelectedMethod(method);
    setErrorMessage('');
  };

  const handlePlaceOrder = async (paymentMethod = 'CashDeskCash') => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage('');
    setOnlineModalError('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetchWithRefresh(`${apiUrl}/api/orders/cashier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        if (data.remainingBalance !== undefined && data.remainingBalance !== null && updateUser) {
          updateUser({ balance: data.remainingBalance });
        }
        clearBasket();
        setIsOnlinePaymentModalOpen(false);
        setOrderSuccessData({
          id: data.id,
          status: data.status || (paymentMethod === 'OnlineBalance' ? 'Paid Online' : 'Pending Payment'),
          createdAt: data.createdAt,
          items: data.items || [],
          payment: data.payment || {},
          notes: data.notes || {},
          cashbackEarned: data.cashbackEarned || 0,
        });
      } else {
        const msg = data.message || 'Failed to place order. Please try again.';
        setErrorMessage(msg);
        setOnlineModalError(msg);
      }
    } catch (err) {
      console.error('Error placing order:', err);
      const msg = 'An error occurred while placing your order. Please check your connection.';
      setErrorMessage(msg);
      setOnlineModalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStripeOrderSuccess = (data) => {
    if (data.remainingBalance !== undefined && data.remainingBalance !== null && updateUser) {
      updateUser({ balance: data.remainingBalance });
    }
    clearBasket();
    setIsStripeModalOpen(false);
    setOrderSuccessData({
      id: data.id,
      status: data.status || 'Paid Online',
      createdAt: data.createdAt,
      items: data.items || [],
      payment: data.payment || {},
      notes: data.notes || {},
      cashbackEarned: data.cashbackEarned || 0,
    });
  };

  const handleSelectOnlineServiceSubmit = () => {
    setIsOnlinePaymentModalOpen(false);
    if (selectedOnlineService === 'OnlineBalance') {
      handlePlaceOrder('OnlineBalance');
    } else {
      setIsStripeModalOpen(true);
    }
  };

  const handleCloseSuccessModal = () => {
    setOrderSuccessData(null);
    navigate('/catalog');
  };

  const formatPaymentMethod = (pm) => {
    switch (pm) {
      case 'OnlineStripe':
        return 'Stripe';
      case 'OnlineBalance':
        return 'Rednest Account Balance';
      case 'OnlineCardDetails':
        return 'Visa / Mastercard';
      case 'OnlineGooglePay':
        return 'Google Pay';
      case 'CashDeskCard':
        return 'Pay at Cashier (Card / NFC)';
      case 'CashDeskCash':
      default:
        return 'Pay at Cashier';
    }
  };

  return (
    <motion.div
      className="order-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Navbar />

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

          {itemCount === 0 && !orderSuccessData && !productsLoading ? (
            <motion.div
              className="order-empty-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <p>Your basket is empty. Add items from the menu to place an order.</p>
              <Link to="/catalog" className="cta-btn sm order-empty-btn">
                Browse Menu
              </Link>
            </motion.div>
          ) : (
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
          )}

          <AnimatePresence mode="wait">
            {selectedMethod && itemCount > 0 && (
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

                  {errorMessage && (
                    <div className="order-error-message">
                      ⚠️ {errorMessage}
                    </div>
                  )}

                  <div className="order-actions-row">
                    <button
                      type="button"
                      className="order-confirm-btn"
                      disabled={isSubmitting || itemCount === 0}
                      onClick={() => {
                        if (selectedMethod === 'cashier') {
                          handlePlaceOrder('CashDeskCash');
                        } else {
                          setIsOnlinePaymentModalOpen(true);
                        }
                      }}
                    >
                      {isSubmitting ? (
                        <span className="order-btn-loading">
                          <img src={loaderIcon} alt="Loading" className="order-spinner" />
                          Placing Order...
                        </span>
                      ) : (
                        selectedMethod === 'cashier' ? 'Confirm & Place Order' : 'Continue to Online Payment'
                      )}
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

      <AnimatedModalWrapper
        isOpen={isOnlinePaymentModalOpen}
        onClose={() => setIsOnlinePaymentModalOpen(false)}
        targetBorderRadius="24px"
      >
        <div className="online-payment-modal" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="online-payment-modal__close"
            onClick={() => setIsOnlinePaymentModalOpen(false)}
            aria-label="Close modal"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <div className="online-payment-modal__header">
            <div className="online-payment-modal__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <h3 className="online-payment-modal__title">Online Payment Service</h3>
            <p className="online-payment-modal__desc">
              Select a payment method <span className="online-payment-modal__amount">{finalAmount} ₼</span>
            </p>
          </div>

          <div className="online-payment-modal__services">
            {ONLINE_PAYMENT_SERVICES.map((service) => {
              const isSelected = selectedOnlineService === service.id;
              const userBalance = typeof user?.balance === 'number' ? user.balance : parseFloat(user?.balance || '0');

              return (
                <div
                  key={service.id}
                  className={`online-payment-service-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedOnlineService(service.id)}
                >
                  <div className="online-payment-service-card__icon-wrap">
                    <img src={service.icon} alt={service.title} className="online-payment-service-card__icon" />
                  </div>

                  <div className="online-payment-service-card__info">
                    <span className="online-payment-service-card__title">{service.title}</span>
                    <span className="online-payment-service-card__desc">
                      {service.desc}
                    </span>
                    {service.badge && (
                      <div className="online-payment-service-card__badge-row">
                        <span className="online-payment-service-card__badge">
                          {service.isBalance ? `Balance: ${userBalance.toFixed(2)} ₼` : service.badge}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="online-payment-service-card__radio">
                    <span className={`online-radio-dot ${isSelected ? 'active' : ''}`}>
                      {isSelected && <span className="online-radio-dot__inner" />}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="online-payment-modal__actions">
            <button
              type="button"
              className="cta-btn sm online-payment-modal__btn online-payment-modal__btn--cancel"
              onClick={() => setIsOnlinePaymentModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="cta-btn sm online-payment-modal__btn online-payment-modal__btn--submit"
              onClick={handleSelectOnlineServiceSubmit}
            >
              {selectedOnlineService === 'OnlineBalance' ? 'Pay with Balance' : 'Continue to Payment'}
            </button>
          </div>
        </div>
      </AnimatedModalWrapper>

      <AnimatedModalWrapper
        isOpen={Boolean(orderSuccessData)}
        onClose={handleCloseSuccessModal}
        targetBorderRadius="24px"
      >
        {orderSuccessData && (
          <div className="order-success-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="order-success-modal__close"
              onClick={handleCloseSuccessModal}
              aria-label="Close modal"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className="order-success-modal__header">
              <div className="order-success-modal__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <div className="order-success-modal__status-badge">
                <span className="pulsing-dot" />
                {orderSuccessData.status || 'Pending Payment'}
              </div>

              <h2 className="order-success-modal__title">Order Placed Successfully!</h2>
              <p className="order-success-modal__desc">
                Order sent to barista. Show your order number at the counter.
              </p>
            </div>

            <div className="order-success-modal__number-card">
              <div className="order-success-modal__number-info">
                <span className="order-success-modal__number-label">Order Number</span>
                <span className="order-success-modal__number-sub">Mention this at counter</span>
              </div>
              <span className="order-success-modal__number-value">
                {orderSuccessData.id ? String(orderSuccessData.id).replace(/-/g, '').slice(-7).toUpperCase() : ''}
              </span>
            </div>

            <div className="order-success-modal__details">
              <div className="order-success-modal__detail-row">
                <span className="order-success-modal__detail-label">Items</span>
                <span className="order-success-modal__detail-value">
                  {orderSuccessData.items?.reduce((sum, p) => sum + p.quantity, 0) || 0} items
                </span>
              </div>

              {orderSuccessData.payment?.discountAmount > 0 && (
                <div className="order-success-modal__detail-row discount">
                  <span className="order-success-modal__detail-label">Promo Discount</span>
                  <span className="order-success-modal__detail-value">−{orderSuccessData.payment.discountAmount.toFixed(2)} ₼</span>
                </div>
              )}

              {orderSuccessData.cashbackEarned > 0 && (
                <div className="order-success-modal__detail-row cashback">
                  <span className="order-success-modal__detail-label">Cashback Added</span>
                  <span className="order-success-modal__detail-value">+{Number(orderSuccessData.cashbackEarned).toFixed(2)} ₼</span>
                </div>
              )}

              <div className="order-success-modal__detail-row">
                <span className="order-success-modal__detail-label">Payment Method</span>
                <span className="order-success-modal__detail-value">
                  {formatPaymentMethod(orderSuccessData.payment?.paymentMethod)}
                </span>
              </div>

              <div className="order-success-modal__detail-row total">
                <span className="order-success-modal__detail-label">Total to Pay</span>
                <span className="order-success-modal__detail-value">{orderSuccessData.payment?.totalAmount?.toFixed(2)} ₼</span>
              </div>
            </div>

            <div className="order-success-modal__actions">
              <button
                type="button"
                className="cta-btn sm order-success-modal__btn order-success-modal__btn--cancel"
                onClick={handleCloseSuccessModal}
              >
                Back to Menu
              </button>
              <button
                type="button"
                className="cta-btn sm order-success-modal__btn order-success-modal__btn--submit"
                onClick={() => {
                  setOrderSuccessData(null);
                  navigate('/orders');
                }}
              >
                View Orders
              </button>
            </div>
          </div>
        )}
      </AnimatedModalWrapper>

      {isStripeModalOpen && (
        <React.Suspense fallback={null}>
          <StripePaymentModal
            isOpen={isStripeModalOpen}
            onClose={() => setIsStripeModalOpen(false)}
            serviceId={selectedOnlineService}
            finalAmount={finalAmount}
            onOrderSuccess={handleStripeOrderSuccess}
          />
        </React.Suspense>
      )}

      <Footer />
    </motion.div>
  );
};

export default Order;
