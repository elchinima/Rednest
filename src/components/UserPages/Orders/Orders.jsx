import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useBasket } from '../../../context/BasketContext';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import featureCashIcon from '../../../assets/icons/feature-cash.svg';
import featureCardIcon from '../../../assets/icons/feature-card-visa-mc.svg';
import featureWalletIcon from '../../../assets/icons/feature-wallet.svg';
import featureStripeIcon from '../../../assets/icons/feature-stripe.svg';
import featureGPayIcon from '../../../assets/icons/feature-gpay.svg';
import featurePromoIcon from '../../../assets/icons/feature-promo.svg';
import cashierIcon from '../../../assets/icons/cashier-register.svg';
import onlineIcon from '../../../assets/icons/online-card.svg';
import cartIcon from '../../../assets/icons/cart-animated.svg';
import logo from '../../../assets/icons/rednest_logo.png';
import Navbar from '../../Elements/Navbar';
import Footer from '../../Footer/Footer';
import AnimatedModalWrapper from '../../Elements/AnimatedModalWrapper';
import { getProductIconUrl } from '../../../utils/productIcons';
import './Orders.scss';

const PAYMENT_METHODS = {
  0: { label: 'Cash Desk', icon: featureCashIcon },
  CashDeskCash: { label: 'Cash Desk', icon: featureCashIcon },
  1: { label: 'Card at Register', icon: featureCardIcon },
  CashDeskCard: { label: 'Card at Register', icon: featureCardIcon },
  2: { label: 'Wallet Balance', icon: featureWalletIcon },
  OnlineBalance: { label: 'Wallet Balance', icon: featureWalletIcon },
  3: { label: 'Bank Card', icon: featureCardIcon },
  OnlineCardDetails: { label: 'Bank Card', icon: featureCardIcon },
  4: { label: 'Stripe', icon: featureStripeIcon },
  OnlineStripe: { label: 'Stripe', icon: featureStripeIcon },
  5: { label: 'Google Pay', icon: featureGPayIcon },
  OnlineGooglePay: { label: 'Google Pay', icon: featureGPayIcon },
};

const getPaymentInfo = (method) => {
  if (method === undefined || method === null) {
    return { label: 'Pay at Cashier', icon: cashierIcon };
  }
  return PAYMENT_METHODS[method] || { label: String(method), icon: onlineIcon };
};

const formatBakuDate = (isoStr) => {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '—';
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Baku',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(d);
    const day = parts.find((p) => p.type === 'day')?.value || '00';
    const month = parts.find((p) => p.type === 'month')?.value || '00';
    const year = parts.find((p) => p.type === 'year')?.value || '0000';
    const hour = parts.find((p) => p.type === 'hour')?.value || '00';
    const minute = parts.find((p) => p.type === 'minute')?.value || '00';
    return `${day}.${month}.${year}, ${hour}:${minute}`;
  } catch {
    return new Date(isoStr).toLocaleDateString('ru-RU');
  }
};

const getShortId = (id) => {
  if (!id) return '00000000';
  const str = String(id).replace(/-/g, '');
  return str.slice(0, 8).toUpperCase();
};

const getStatusBadge = (status) => {
  const s = String(status || '').toLowerCase();
  if (s.includes('paid online') || s === 'paid online') {
    return { className: 'orders-status--paid-online', label: 'Paid Online', dotColor: '#10b981' };
  }
  if (s.includes('pending')) {
    return { className: 'orders-status--pending', label: 'Pending Payment', dotColor: '#f59e0b' };
  }
  if (s.includes('prep') || s.includes('process')) {
    return { className: 'orders-status--preparing', label: 'Preparing', dotColor: '#38bdf8' };
  }
  if (s.includes('ready')) {
    return { className: 'orders-status--ready', label: 'Ready for Pickup', dotColor: '#34d399' };
  }
  if (s.includes('cancel')) {
    return { className: 'orders-status--cancelled', label: 'Cancelled', dotColor: '#ef4444' };
  }
  return { className: 'orders-status--completed', label: 'Completed', dotColor: '#22c55e' };
};

const Orders = () => {
  const { user } = useAuth();
  const { addItem } = useBasket();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [reorderingId, setReorderingId] = useState(null);

  const apiUrl = import.meta.env.VITE_API_URL || '';

  const showToast = (msg, duration = 3000) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, duration);
  };

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/orders/history`);
      if (!res.ok) {
        throw new Error('Failed to load orders history');
      }
      const data = await res.json();
      const list = Array.isArray(data.orders) ? data.orders : [];
      setOrders(list);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err.message || 'Could not load your orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);


  const handleCopyId = (id) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    showToast(`Order ID copied to clipboard!`);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handleReorder = async (order) => {
    if (!order.items || order.items.length === 0) return;
    setReorderingId(order.id);

    try {
      for (const item of order.items) {
        const prodId = item.productId || item.id;
        const qty = item.quantity || 1;
        for (let q = 0; q < qty; q++) {
          await addItem(prodId);
        }
      }
      showToast(`Added ${order.items.length} item(s) to your basket!`);
    } catch (err) {
      console.error('Reorder error:', err);
      showToast('Could not add items to basket.');
    } finally {
      setReorderingId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const statusStr = String(order.status || '').toLowerCase();
      if (activeFilter === 'pending' && !statusStr.includes('pending')) {
        return false;
      }
      if (activeFilter === 'completed' && !statusStr.includes('complete')) {
        return false;
      }
      if (activeFilter === 'cancelled' && !statusStr.includes('cancel')) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const idMatches = String(order.id || '').toLowerCase().includes(query);
        const itemMatches = (order.items || []).some((it) =>
          String(it.name || '').toLowerCase().includes(query)
        );
        const promoMatches = String(order.payment?.promoCode || '').toLowerCase().includes(query);
        return idMatches || itemMatches || promoMatches;
      }

      return true;
    });
  }, [orders, activeFilter, searchQuery]);

  return (
    <motion.div
      className="orders-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Navbar />

      <main className="orders-main">
        <div className="orders-container">
          <motion.div
            className="orders-hero"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1>My Orders</h1>
            <p className="orders-hero__desc">
              Review your coffee receipts, order history, and track live statuses
            </p>
          </motion.div>

          <div className="orders-controls">
            <div className="orders-filters">
              <button
                type="button"
                className={`orders-filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setActiveFilter('all')}
              >
                All
              </button>
              <button
                type="button"
                className={`orders-filter-btn ${activeFilter === 'pending' ? 'active' : ''}`}
                onClick={() => setActiveFilter('pending')}
              >
                Pending
              </button>
              <button
                type="button"
                className={`orders-filter-btn ${activeFilter === 'completed' ? 'active' : ''}`}
                onClick={() => setActiveFilter('completed')}
              >
                Completed
              </button>
              <button
                type="button"
                className={`orders-filter-btn ${activeFilter === 'cancelled' ? 'active' : ''}`}
                onClick={() => setActiveFilter('cancelled')}
              >
                Cancelled
              </button>
            </div>

            {orders.length > 2 && (
              <div className="orders-search-box">
                <svg className="orders-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by order ID or item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="orders-search-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="orders-search-clear"
                    onClick={() => setSearchQuery('')}
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          </div>

          {loading ? (
            <div className="orders-loading-state">
              <img src={loaderIcon} alt="Loading..." className="orders-loader-icon" />
              <p>Loading your orders...</p>
            </div>
          ) : error ? (
            <div className="orders-error-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" width="36" height="36">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p>{error}</p>
              <button type="button" className="cta-btn sm" onClick={() => fetchOrders()}>
                Try Again
              </button>
            </div>
          ) : filteredOrders.length === 0 ? (
            <motion.div
              className="orders-empty-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}
            >
              <div className="orders-empty-icon">
                <img src={cartIcon} alt="No orders" className="orders-empty-icon-img" />
              </div>
              <h3>
                {searchQuery
                  ? 'No matching orders found'
                  : activeFilter !== 'all'
                    ? `No ${activeFilter} orders found`
                    : 'No orders placed yet'}
              </h3>
              <p>
                {searchQuery
                  ? 'Try searching with a different keyword or clear your search query.'
                  : 'Treat yourself to freshly roasted coffee, signature lattes, and artisan desserts!'}
              </p>
              <Link to="/catalog" className="cta-btn sm orders-empty-btn">
                <span>Browse Menu</span>
              </Link>
            </motion.div>
          ) : (
            <motion.div
              className="orders-list"
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <AnimatePresence>
                {filteredOrders.map((order, idx) => {
                  const statusInfo = getStatusBadge(order.status);
                  const payInfo = getPaymentInfo(order.payment?.paymentMethod);
                  const shortId = getShortId(order.id);
                  const itemCount = (order.items || []).reduce((s, it) => s + (it.quantity || 1), 0);
                  const discount = Number(order.payment?.discountAmount || 0);
                  const total = Number(order.payment?.totalAmount || 0).toFixed(2);
                  const originalTotal = Number(order.payment?.originalTotal || total).toFixed(2);
                  const isReordering = reorderingId === order.id;

                  return (
                    <motion.div
                      key={order.id}
                      className="order-card"
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, delay: idx * 0.05 }}
                    >
                      <div className="order-card__header">
                        <div className="order-card__id-group">
                          <div className="order-card__id-badge">
                            <span className="order-card__id">{shortId}</span>
                            <button
                              type="button"
                              className="order-card__copy-btn"
                              onClick={() => handleCopyId(order.id)}
                              title="Copy full Order ID"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                              <span>{copiedId === order.id ? 'Copied!' : 'Copy'}</span>
                            </button>
                          </div>
                          <span className="order-card__date">{formatBakuDate(order.createdAt)}</span>
                        </div>

                        <div className={`order-card__status-badge ${statusInfo.className}`}>
                          <span className="order-card__status-dot" style={{ backgroundColor: statusInfo.dotColor }} />
                          <span>{statusInfo.label}</span>
                        </div>
                      </div>

                      <div className="order-card__items-section">
                        <div className="order-card__items-list">
                          {(order.items || []).map((item, iIdx) => {
                            const unitPrice = Number(item.unitPrice || 0).toFixed(2);
                            const itemTotal = (Number(item.unitPrice || 0) * (item.quantity || 1)).toFixed(2);

                            return (
                              <div key={item.productId || iIdx} className="order-card__item-row">
                                <div className="order-card__item-thumb">
                                  {getProductIconUrl(item) || item.imageUrl ? (
                                    <img src={getProductIconUrl(item) || item.imageUrl} alt={item.name || 'Product'} />
                                  ) : (
                                    <div className="order-card__item-thumb-placeholder">☕</div>
                                  )}
                                </div>

                                <div className="order-card__item-info">
                                  <div className="order-card__item-name-row">
                                    <span className="order-card__item-name">{item.name || 'Artisan Coffee'}</span>
                                    {item.category && (
                                      <span className="order-card__item-category">{item.category}</span>
                                    )}
                                  </div>
                                  <div className="order-card__item-meta">
                                    <span className="order-card__item-qty">Qty: {item.quantity || 1}</span>
                                    <span className="order-card__item-unit">× {unitPrice} ₼</span>
                                  </div>
                                </div>

                                <div className="order-card__item-total">
                                  {itemTotal} ₼
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="order-card__footer">
                        <div className="order-card__payment-info">
                          <div className="order-card__method-pill">
                            <img src={payInfo.icon} alt="" className="order-card__method-icon" />
                            <span>{payInfo.label}</span>
                          </div>

                          {discount > 0 && (
                            <div className="order-card__discount-pill">
                              <img src={featurePromoIcon} alt="" className="order-card__method-icon" />
                              <span>
                                Saved −{discount.toFixed(2)} ₼
                                {order.payment?.promoPrizeName ? ` (${order.payment.promoPrizeName})` : ''}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="order-card__total-wrap">
                          <span className="order-card__total-label">Total Amount:</span>
                          <span className="order-card__total-value">{total} ₼</span>
                        </div>
                      </div>

                      <div className="order-card__actions">
                        <button
                          type="button"
                          className="cta-btn sm order-card__action-btn order-card__action-btn--receipt"
                          onClick={() => setSelectedReceiptOrder(order)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                          </svg>
                          <span>Receipt Details</span>
                        </button>

                        <button
                          type="button"
                          className="cta-btn sm order-card__action-btn order-card__action-btn--reorder"
                          onClick={() => handleReorder(order)}
                          disabled={isReordering}
                        >
                          {isReordering ? (
                            <span>Adding...</span>
                          ) : (
                            <>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              <span>Order Again</span>
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </main>

      <AnimatedModalWrapper
        isOpen={Boolean(selectedReceiptOrder)}
        onClose={() => setSelectedReceiptOrder(null)}
        targetBorderRadius="24px"
      >
        {selectedReceiptOrder && (
          <div className="orders-receipt-modal">
            <div className="orders-receipt-modal__header">
              <img src={logo} alt="Rednest" className="orders-receipt-modal__logo" />
              <h3 className="orders-receipt-modal__brand">REDNEST COFFEE</h3>
              <p className="orders-receipt-modal__sub">Specialty Coffee & Artisan Roasts</p>
              <span className="orders-receipt-modal__divider-line" />
            </div>

            <div className="orders-receipt-modal__meta">
              <div className="orders-receipt-modal__meta-row">
                <span>Receipt Number:</span>
                <strong>{getShortId(selectedReceiptOrder.id)}</strong>
              </div>
              <div className="orders-receipt-modal__meta-row">
                <span>Date & Time:</span>
                <span>{formatBakuDate(selectedReceiptOrder.createdAt)}</span>
              </div>
            </div>

            <div className="orders-receipt-modal__items">
              <div className="orders-receipt-modal__items-header">
                <span>ITEM</span>
                <span>QTY</span>
                <span>TOTAL</span>
              </div>

              {(selectedReceiptOrder.items || []).map((it, idx) => (
                <div key={it.productId || idx} className="orders-receipt-modal__item-row">
                  <div className="orders-receipt-modal__item-desc">
                    <span className="orders-receipt-modal__item-title">{it.name || 'Coffee Item'}</span>
                    <span className="orders-receipt-modal__item-sub">@ {Number(it.unitPrice || 0).toFixed(2)} ₼</span>
                  </div>
                  <span className="orders-receipt-modal__item-qty">{it.quantity || 1}</span>
                  <span className="orders-receipt-modal__item-price">
                    {(Number(it.unitPrice || 0) * (it.quantity || 1)).toFixed(2)} ₼
                  </span>
                </div>
              ))}
            </div>

            <div className="orders-receipt-modal__totals">
              <div className="orders-receipt-modal__totals-row">
                <span>Subtotal</span>
                <span>{Number(selectedReceiptOrder.payment?.originalTotal || selectedReceiptOrder.payment?.totalAmount || 0).toFixed(2)} ₼</span>
              </div>

              {Number(selectedReceiptOrder.payment?.discountAmount || 0) > 0 && (
                <div className="orders-receipt-modal__totals-row discount">
                  <span>
                    Discount {selectedReceiptOrder.payment?.promoPrizeName ? `(${selectedReceiptOrder.payment.promoPrizeName})` : ''}
                  </span>
                  <span>−{Number(selectedReceiptOrder.payment.discountAmount).toFixed(2)} ₼</span>
                </div>
              )}

              <div className="orders-receipt-modal__totals-row method">
                <span>Payment Method</span>
                <span>{getPaymentInfo(selectedReceiptOrder.payment?.paymentMethod).label}</span>
              </div>

              <div className="orders-receipt-modal__totals-row grand-total">
                <span>Total Amount Paid</span>
                <span>{Number(selectedReceiptOrder.payment?.totalAmount || 0).toFixed(2)} ₼</span>
              </div>
            </div>

            <div className="orders-receipt-modal__actions">
              <button
                type="button"
                className="cta-btn sm orders-receipt-modal__btn orders-receipt-modal__btn--close"
                onClick={() => setSelectedReceiptOrder(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="cta-btn sm orders-receipt-modal__btn orders-receipt-modal__btn--reorder"
                onClick={() => {
                  handleReorder(selectedReceiptOrder);
                  setSelectedReceiptOrder(null);
                }}
              >
                Reorder This
              </button>
            </div>
          </div>
        )}
      </AnimatedModalWrapper>

      <div className="orders-toast-container">
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              className="orders-toast"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.25 }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" width="18" height="18">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Footer />
    </motion.div>
  );
};

export default Orders;
