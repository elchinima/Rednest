import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../AdminLayout/AdminLayout';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';
import featureCashIcon from '../../../assets/icons/feature-cash.svg';
import featureCardIcon from '../../../assets/icons/feature-card-visa-mc.svg';
import featureWalletIcon from '../../../assets/icons/feature-wallet.svg';
import featureStripeIcon from '../../../assets/icons/feature-stripe.svg';
import featureGPayIcon from '../../../assets/icons/feature-gpay.svg';
import cashierIcon from '../../../assets/icons/cashier-register.svg';
import onlineIcon from '../../../assets/icons/online-card.svg';
import logo from '../../../assets/icons/rednest_logo.png';
import { getProductIconUrl } from '../../../utils/productIcons';
import './Orders.scss';

const PAGE_SIZE = 15;

const ORDER_STATUSES = [
  'Pending Payment',
  'Paid Online',
  'Preparing',
  'Ready for Pickup',
  'Completed',
  'Cancelled',
];

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
    return { label: 'Cashier Desk', icon: cashierIcon };
  }
  return PAYMENT_METHODS[method] || { label: String(method), icon: onlineIcon };
};

const formatCurrency = (val) => {
  const num = typeof val === 'number' ? val : parseFloat(val) || 0;
  return `${num.toFixed(2)} ₼`;
};

const formatBakuDate = (isoStr) => {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
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

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return 'Never';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  } catch {
    return '—';
  }
};

const getStatusBadge = (status) => {
  const s = String(status || '').toLowerCase();
  if (s.includes('paid online')) {
    return { className: 'status-badge status-badge--paid', label: 'Paid Online', dotColor: '#10b981' };
  }
  if (s.includes('pending')) {
    return { className: 'status-badge status-badge--pending', label: 'Pending Payment', dotColor: '#f59e0b' };
  }
  if (s.includes('prep') || s.includes('process')) {
    return { className: 'status-badge status-badge--preparing', label: 'Preparing', dotColor: '#38bdf8' };
  }
  if (s.includes('ready')) {
    return { className: 'status-badge status-badge--ready', label: 'Ready for Pickup', dotColor: '#34d399' };
  }
  if (s.includes('cancel')) {
    return { className: 'status-badge status-badge--cancelled', label: 'Cancelled', dotColor: '#ef4444' };
  }
  return { className: 'status-badge status-badge--completed', label: 'Completed', dotColor: '#22c55e' };
};

const getInitials = (name, email) => {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'U';
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  }),
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [sortBy, setSortBy] = useState('latest');
  const [viewMode, setViewMode] = useState('table');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState(null);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const [copiedId, setCopiedId] = useState(null);

  const apiUrl = import.meta.env.VITE_API_URL || '';

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3500);
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/orders`);
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      } else {
        setError('Failed to load orders list from server.');
      }
    } catch {
      setError('Connection error while fetching orders.');
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (selectedReceiptOrder || orderToDelete) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedReceiptOrder, orderToDelete]);

  const copyToClipboard = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(`Copied: ${text.slice(0, 16)}...`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
        if (selectedReceiptOrder && selectedReceiptOrder.id === orderId) {
          setSelectedReceiptOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
        showToast(`Order status updated to "${newStatus}"`);
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.message || 'Failed to update order status');
      }
    } catch {
      showToast('Network error while updating status');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/orders/${orderToDelete.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== orderToDelete.id));
        if (selectedReceiptOrder && selectedReceiptOrder.id === orderToDelete.id) {
          setSelectedReceiptOrder(null);
        }
        showToast('Order deleted successfully');
        setOrderToDelete(null);
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.message || 'Failed to delete order');
      }
    } catch {
      showToast('Network error while deleting order');
    } finally {
      setIsDeleting(false);
    }
  };

  const stats = useMemo(() => {
    const totalCount = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.payment?.totalAmount || 0), 0);
    const activeCount = orders.filter((o) => {
      const s = (o.status || '').toLowerCase();
      return !s.includes('complete') && !s.includes('cancel');
    }).length;
    const completedCount = orders.filter((o) => {
      const s = (o.status || '').toLowerCase();
      return s.includes('complete');
    }).length;

    return {
      totalCount,
      totalRevenue,
      activeCount,
      completedCount,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let list = [...orders];

    if (searchInput.trim()) {
      const q = searchInput.toLowerCase().trim();
      list = list.filter((o) => {
        const idMatch = String(o.id || '').toLowerCase().includes(q);
        const nameMatch = (o.user?.name || '').toLowerCase().includes(q);
        const emailMatch = (o.user?.email || '').toLowerCase().includes(q);
        const promoMatch = (o.payment?.promoCode || '').toLowerCase().includes(q);
        const itemMatch = (o.items || []).some((item) =>
          (item.name || '').toLowerCase().includes(q)
        );
        return idMatch || nameMatch || emailMatch || promoMatch || itemMatch;
      });
    }

    if (statusFilter !== 'all') {
      list = list.filter((o) => {
        const s = (o.status || '').toLowerCase();
        return s === statusFilter.toLowerCase();
      });
    }

    if (paymentFilter !== 'all') {
      list = list.filter((o) => {
        const m = String(o.payment?.paymentMethod || '');
        return m.toLowerCase() === paymentFilter.toLowerCase();
      });
    }

    list.sort((a, b) => {
      if (sortBy === 'latest') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }
      if (sortBy === 'highest') {
        return (b.payment?.totalAmount || 0) - (a.payment?.totalAmount || 0);
      }
      if (sortBy === 'lowest') {
        return (a.payment?.totalAmount || 0) - (b.payment?.totalAmount || 0);
      }
      if (sortBy === 'items') {
        return (b.itemsCount || 0) - (a.itemsCount || 0);
      }
      return 0;
    });

    return list;
  }, [orders, searchInput, statusFilter, paymentFilter, sortBy]);

  const visibleOrders = useMemo(() => {
    return filteredOrders.slice(0, visibleCount);
  }, [filteredOrders, visibleCount]);

  const hasMore = visibleCount < filteredOrders.length;

  return (
    <AdminLayout>
      <div className="admin-orders">
        <AnimatePresence>
          {successToast && (
            <motion.div
              className="admin-orders__toast"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{successToast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="admin-orders__header"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div>
            <h1 className="admin-orders__title">Orders</h1>
            <p className="admin-orders__subtitle">
              Real-time feed of customer coffee receipts, orders, and payment statuses
            </p>
          </div>
        </motion.div>

        <div className="admin-orders__stats">
          <motion.div
            className="admin-orders__stat-card"
            style={{ '--accent': '#ef4444' }}
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="show"
          >
            <div className="admin-orders__stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <div className="admin-orders__stat-body">
              <span className="admin-orders__stat-value">{loading ? '...' : stats.totalCount}</span>
              <span className="admin-orders__stat-label">Total Orders</span>
              <span className="admin-orders__stat-sub">Across all users</span>
            </div>
          </motion.div>

          <motion.div
            className="admin-orders__stat-card"
            style={{ '--accent': '#fbbf24' }}
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="show"
          >
            <div className="admin-orders__stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                <path d="M12 18V6" />
              </svg>
            </div>
            <div className="admin-orders__stat-body">
              <span className="admin-orders__stat-value highlight">
                {loading ? '...' : formatCurrency(stats.totalRevenue)}
              </span>
              <span className="admin-orders__stat-label">Total Revenue</span>
              <span className="admin-orders__stat-sub">Gross sales volume</span>
            </div>
          </motion.div>

          <motion.div
            className="admin-orders__stat-card"
            style={{ '--accent': '#38bdf8' }}
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="show"
          >
            <div className="admin-orders__stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="admin-orders__stat-body">
              <span className="admin-orders__stat-value">{loading ? '...' : stats.activeCount}</span>
              <span className="admin-orders__stat-label">In Progress</span>
              <span className="admin-orders__stat-sub">Pending or preparing</span>
            </div>
          </motion.div>

          <motion.div
            className="admin-orders__stat-card"
            style={{ '--accent': '#10b981' }}
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="show"
          >
            <div className="admin-orders__stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div className="admin-orders__stat-body">
              <span className="admin-orders__stat-value">{loading ? '...' : stats.completedCount}</span>
              <span className="admin-orders__stat-label">Completed</span>
              <span className="admin-orders__stat-sub">Delivered & finalized</span>
            </div>
          </motion.div>
        </div>

        <div className="admin-orders__controls">
          <div className="admin-orders__search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              id="admin-orders-search"
              type="text"
              placeholder="Search by order ID, customer name, email, product, promo..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                className="admin-orders__search-clear"
                onClick={() => setSearchInput('')}
                aria-label="Clear search"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <div className="admin-orders__filters">
            <div className="admin-orders__select-wrap">
              <select
                id="admin-orders-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses ({orders.length})</option>
                {ORDER_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-orders__select-wrap">
              <select
                id="admin-orders-payment-filter"
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
              >
                <option value="all">All Payments</option>
                <option value="OnlineStripe">Stripe</option>
                <option value="OnlineCardDetails">Bank Card</option>
                <option value="OnlineBalance">Wallet Balance</option>
                <option value="OnlineGooglePay">Google Pay</option>
                <option value="CashDeskCash">Cash Desk</option>
                <option value="CashDeskCard">Card at Register</option>
              </select>
            </div>

            <div className="admin-orders__select-wrap">
              <select
                id="admin-orders-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="latest">Latest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest">Highest Amount</option>
                <option value="lowest">Lowest Amount</option>
                <option value="items">Most Items</option>
              </select>
            </div>

            <div className="admin-orders__view-toggle">
              <button
                className={`admin-orders__view-btn${viewMode === 'table' ? ' active' : ''}`}
                onClick={() => setViewMode('table')}
                title="Table View"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </button>
              <button
                className={`admin-orders__view-btn${viewMode === 'grid' ? ' active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="admin-orders__error-banner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
            <button onClick={fetchOrders}>Try Again</button>
          </div>
        )}

        {loading && (
          <div className="admin-orders__loading">
            <div className="admin-spinner" />
            <span>Loading orders feed...</span>
          </div>
        )}

        {!loading && filteredOrders.length === 0 && (
          <div className="admin-orders__empty">
            <div className="admin-orders__empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <h3>No orders found</h3>
            <p>
              {searchInput || statusFilter !== 'all' || paymentFilter !== 'all'
                ? 'No orders match your filter criteria.'
                : 'No orders have been placed in the system yet.'}
            </p>
            {(searchInput || statusFilter !== 'all' || paymentFilter !== 'all') && (
              <button
                className="admin-orders__btn-secondary"
                onClick={() => {
                  setSearchInput('');
                  setStatusFilter('all');
                  setPaymentFilter('all');
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        )}

        {!loading && filteredOrders.length > 0 && viewMode === 'table' && (
          <div className="admin-orders__table-card">
            <div className="admin-orders__table-responsive">
              <table className="admin-orders__table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Payment & Total</th>
                    <th>Status</th>
                    <th>Date & Time</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleOrders.map((order, i) => {
                    const badge = getStatusBadge(order.status);
                    const payInfo = getPaymentInfo(order.payment?.paymentMethod);
                    const shortId = order.id ? order.id.slice(0, 8).toUpperCase() : 'UNKNOWN';

                    return (
                      <motion.tr
                        key={order.id}
                        custom={i}
                        variants={fadeUp}
                        initial="hidden"
                        animate="show"
                      >
                        <td>
                          <div className="admin-orders__id-cell">
                            <button
                              className={`id-copy-tag${copiedId === order.id ? ' copied' : ''}`}
                              onClick={() => copyToClipboard(order.id, order.id)}
                              title="Click to copy full Order ID"
                            >
                              <code>#{shortId}</code>
                              {copiedId === order.id ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="9" y="9" width="13" height="13" rx="2" />
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>

                        <td>
                          <div className="admin-orders__customer-cell">
                            <div className="customer-avatar">
                              {order.user?.profilePictureUrl ? (
                                <img
                                  src={order.user.profilePictureUrl}
                                  alt={order.user.name || order.user.email}
                                />
                              ) : (
                                <span>{getInitials(order.user?.name, order.user?.email)}</span>
                              )}
                            </div>
                            <div className="customer-info">
                              <span className="customer-name">
                                {order.user?.name || 'Guest / Unnamed'}
                              </span>
                              <span className="customer-email">{order.user?.email || '—'}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="admin-orders__payment-cell">
                            <span className="total-val">
                              {formatCurrency(order.payment?.totalAmount)}
                            </span>
                            <div className="payment-method-row">
                              <img src={payInfo.icon} alt="" className="pay-icon" />
                              <span className="pay-label">{payInfo.label}</span>
                            </div>
                            {order.payment?.discountAmount > 0 && (
                              <span className="discount-tag">
                                Promo: -{formatCurrency(order.payment.discountAmount)}
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          <div className="admin-orders__status-cell">
                            <div className="status-changer-wrap">
                              <select
                                className={badge.className}
                                value={order.status}
                                disabled={updatingOrderId === order.id}
                                onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                              >
                                {ORDER_STATUSES.map((st) => (
                                  <option key={st} value={st}>
                                    {st}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="admin-orders__date-cell">
                            <span className="date-main">{formatBakuDate(order.createdAt)}</span>
                            <span className="date-rel">{formatRelativeTime(order.createdAt)}</span>
                          </div>
                        </td>

                        <td className="text-right">
                          <div className="admin-orders__actions">
                            <button
                              className="admin-orders__action-btn"
                              onClick={() => setSelectedReceiptOrder(order)}
                              title="View Full Receipt"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                              </svg>
                            </button>
                            <button
                              className="admin-orders__action-btn admin-orders__action-btn--delete"
                              onClick={() => setOrderToDelete(order)}
                              title="Delete Order"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && filteredOrders.length > 0 && viewMode === 'grid' && (
          <div className="admin-orders__grid">
            {visibleOrders.map((order, i) => {
              const badge = getStatusBadge(order.status);
              const payInfo = getPaymentInfo(order.payment?.paymentMethod);
              const shortId = order.id ? order.id.slice(0, 8).toUpperCase() : 'UNKNOWN';

              return (
                <motion.div
                  key={order.id}
                  className="admin-orders__grid-card"
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  animate="show"
                >
                  <div className="grid-card-top">
                    <div className="id-date">
                      <button
                        className={`id-copy-tag${copiedId === `grid-${order.id}` ? ' copied' : ''}`}
                        onClick={() => copyToClipboard(order.id, `grid-${order.id}`)}
                        title="Click to copy full Order ID"
                      >
                        <code>#{shortId}</code>
                        {copiedId === `grid-${order.id}` ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        )}
                      </button>
                      <span className="grid-date">{formatBakuDate(order.createdAt)}</span>
                    </div>

                    <div className="grid-status-wrap">
                      <select
                        className={badge.className}
                        value={order.status}
                        disabled={updatingOrderId === order.id}
                        onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                      >
                        {ORDER_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid-card-customer">
                    <div className="customer-avatar">
                      {order.user?.profilePictureUrl ? (
                        <img
                          src={order.user.profilePictureUrl}
                          alt={order.user.name || order.user.email}
                        />
                      ) : (
                        <span>{getInitials(order.user?.name, order.user?.email)}</span>
                      )}
                    </div>
                    <div className="customer-info">
                      <h4>{order.user?.name || 'Guest / Unnamed'}</h4>
                      <span>{order.user?.email || '—'}</span>
                    </div>
                  </div>

                  <div className="grid-card-items">
                    <div className="items-header">
                      <span className="count-tag">
                        {order.itemsCount} {order.itemsCount === 1 ? 'item' : 'items'}
                      </span>
                      {order.payment?.promoCode && (
                        <span className="promo-tag">Promo: {order.payment.promoCode}</span>
                      )}
                    </div>
                    <ul className="items-mini-list">
                      {(order.items || []).slice(0, 3).map((it, idx) => (
                        <li key={idx}>
                          <span className="it-qty">{it.quantity}x</span>
                          <span className="it-name">{it.name}</span>
                          <span className="it-price">{formatCurrency(it.unitPrice * it.quantity)}</span>
                        </li>
                      ))}
                      {order.items?.length > 3 && (
                        <li className="more-items">+{order.items.length - 3} more items...</li>
                      )}
                    </ul>
                  </div>

                  <div className="grid-card-footer">
                    <div className="payment-box">
                      <div className="pay-method">
                        <img src={payInfo.icon} alt="" className="pay-icon" />
                        <span>{payInfo.label}</span>
                      </div>
                      <strong className="total-amount">
                        {formatCurrency(order.payment?.totalAmount)}
                      </strong>
                    </div>

                    <div className="grid-actions">
                      <button
                        className="admin-orders__action-btn"
                        onClick={() => setSelectedReceiptOrder(order)}
                        title="View Full Receipt"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                      </button>
                      <button
                        className="admin-orders__action-btn admin-orders__action-btn--delete"
                        onClick={() => setOrderToDelete(order)}
                        title="Delete Order"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {hasMore && !loading && (
          <div className="admin-orders__load-more">
            <button
              className="admin-orders__btn-secondary"
              onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            >
              Load More Orders ({filteredOrders.length - visibleCount} remaining)
            </button>
          </div>
        )}

        <AnimatePresence>
          {selectedReceiptOrder && (
            <div
              className="admin-orders__modal-backdrop"
              onClick={() => setSelectedReceiptOrder(null)}
            >
              <motion.div
                className="admin-orders__modal admin-orders__modal--receipt"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="admin-orders__modal-header">
                  <div className="modal-title-wrap">
                    <div className="modal-logo-brand">
                      <img src={logo} alt="Rednest" className="modal-brand-logo" />
                      <h2>Order Receipt</h2>
                    </div>
                    <p className="order-id-sub">
                      ID: <code>{selectedReceiptOrder.id}</code>
                      <button
                        className={`copy-chip-btn${copiedId === 'modal-order-id' ? ' copied' : ''}`}
                        onClick={() => copyToClipboard(selectedReceiptOrder.id, 'modal-order-id')}
                      >
                        {copiedId === 'modal-order-id' ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        )}
                        <span>Copy ID</span>
                      </button>
                    </p>
                  </div>
                  <button
                    className="admin-orders__modal-close"
                    onClick={() => setSelectedReceiptOrder(null)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                <div className="admin-orders__modal-body">
                  <div className="receipt-meta-grid">
                    <div className="meta-card customer-card">
                      <span className="meta-label">Customer Info</span>
                      <div className="customer-preview">
                        <div className="customer-avatar customer-avatar--sm">
                          {selectedReceiptOrder.user?.profilePictureUrl ? (
                            <img
                              src={selectedReceiptOrder.user.profilePictureUrl}
                              alt={selectedReceiptOrder.user.name || selectedReceiptOrder.user.email}
                            />
                          ) : (
                            <span>{getInitials(selectedReceiptOrder.user?.name, selectedReceiptOrder.user?.email)}</span>
                          )}
                        </div>
                        <div className="customer-meta">
                          <strong>{selectedReceiptOrder.user?.name || 'Guest / Unnamed'}</strong>
                          <span>{selectedReceiptOrder.user?.email || '—'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="meta-card">
                      <span className="meta-label">Order Status</span>
                      <div className="status-changer-inline">
                        <select
                          className={getStatusBadge(selectedReceiptOrder.status).className}
                          value={selectedReceiptOrder.status}
                          disabled={updatingOrderId === selectedReceiptOrder.id}
                          onChange={(e) =>
                            handleUpdateStatus(selectedReceiptOrder.id, e.target.value)
                          }
                        >
                          {ORDER_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="meta-card">
                      <span className="meta-label">Created At (Baku Time)</span>
                      <strong className="meta-value">
                        {formatBakuDate(selectedReceiptOrder.createdAt)}
                      </strong>
                    </div>

                    <div className="meta-card">
                      <span className="meta-label">Payment Method</span>
                      <div className="pay-method-flex">
                        <img
                          src={getPaymentInfo(selectedReceiptOrder.payment?.paymentMethod).icon}
                          alt=""
                          className="pay-icon"
                        />
                        <span>{getPaymentInfo(selectedReceiptOrder.payment?.paymentMethod).label}</span>
                      </div>
                    </div>
                  </div>

                  <div className="receipt-items-section">
                    <h3>Ordered Items ({selectedReceiptOrder.items?.length || 0})</h3>
                    <div className="receipt-items-table-wrap">
                      <table className="receipt-items-table">
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Category</th>
                            <th className="text-center">Qty</th>
                            <th className="text-right">Unit Price</th>
                            <th className="text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedReceiptOrder.items || []).map((it, idx) => {
                            const itemIcon = getProductIconUrl(it) || it.imageUrl;
                            return (
                              <tr key={idx}>
                                <td>
                                  <div className="item-name-cell">
                                    {itemIcon ? (
                                      <img src={itemIcon} alt={it.name || 'Product'} className="item-thumb" />
                                    ) : null}
                                    <strong>{it.name || 'Product'}</strong>
                                  </div>
                                </td>
                                <td>
                                  <span className="category-pill">{it.category || 'General'}</span>
                                </td>
                                <td className="text-center">
                                  <span className="qty-tag">{it.quantity}</span>
                                </td>
                                <td className="text-right">{formatCurrency(it.unitPrice)}</td>
                                <td className="text-right highlight">
                                  {formatCurrency(it.unitPrice * it.quantity)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {(selectedReceiptOrder.notes?.CustomerNote ||
                    selectedReceiptOrder.notes?.KitchenNote ||
                    selectedReceiptOrder.notes?.Comment) && (
                    <div className="receipt-notes-section">
                      <h3>Order Notes & Instructions</h3>
                      <div className="notes-grid">
                        {selectedReceiptOrder.notes?.CustomerNote && (
                          <div className="note-card">
                            <span className="note-type">Customer Note</span>
                            <p>{selectedReceiptOrder.notes.CustomerNote}</p>
                          </div>
                        )}
                        {selectedReceiptOrder.notes?.KitchenNote && (
                          <div className="note-card">
                            <span className="note-type">Kitchen Note</span>
                            <p>{selectedReceiptOrder.notes.KitchenNote}</p>
                          </div>
                        )}
                        {selectedReceiptOrder.notes?.Comment && (
                          <div className="note-card">
                            <span className="note-type">Order Comment</span>
                            <p>{selectedReceiptOrder.notes.Comment}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="receipt-payment-summary">
                    <h3>Payment Breakdown</h3>
                    <div className="summary-rows">
                      <div className="summary-row">
                        <span>Original Subtotal</span>
                        <span>
                          {formatCurrency(
                            selectedReceiptOrder.payment?.originalTotal ||
                              selectedReceiptOrder.payment?.totalAmount
                          )}
                        </span>
                      </div>
                      {selectedReceiptOrder.payment?.discountAmount > 0 && (
                        <div className="summary-row discount">
                          <span>
                            Discount {selectedReceiptOrder.payment?.promoCode ? `(${selectedReceiptOrder.payment.promoCode})` : ''}
                          </span>
                          <span>-{formatCurrency(selectedReceiptOrder.payment.discountAmount)}</span>
                        </div>
                      )}
                      {selectedReceiptOrder.payment?.paymentIntentId && (
                        <div className="summary-row">
                          <span>Stripe Intent ID</span>
                          <code className="intent-code">{selectedReceiptOrder.payment.paymentIntentId}</code>
                        </div>
                      )}
                      <div className="summary-row total-row">
                        <span>Total Paid</span>
                        <span className="final-total">
                          {formatCurrency(selectedReceiptOrder.payment?.totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="receipt-modal-actions">
                    <button
                      type="button"
                      className="admin-orders__btn-secondary"
                      onClick={() => window.print()}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 6 2 18 2 18 9" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect x="6" y="14" width="12" height="8" />
                      </svg>
                      Print Receipt
                    </button>
                    <button
                      type="button"
                      className="cta-btn"
                      onClick={() => setSelectedReceiptOrder(null)}
                    >
                      Close Receipt
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {orderToDelete && (
            <div
              className="admin-orders__modal-backdrop"
              onClick={() => setOrderToDelete(null)}
            >
              <motion.div
                className="admin-orders__modal admin-orders__modal--delete"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="admin-orders__modal-header">
                  <h2>Delete Order</h2>
                  <button
                    className="admin-orders__modal-close"
                    onClick={() => setOrderToDelete(null)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                <div className="delete-modal-body">
                  <div className="delete-warning-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                  <h3>Are you sure you want to delete this order?</h3>
                  <p>
                    Order <code>#{orderToDelete.id.slice(0, 8).toUpperCase()}</code> for{' '}
                    <strong>{orderToDelete.user?.name || orderToDelete.user?.email || 'Customer'}</strong> with total{' '}
                    <strong>{formatCurrency(orderToDelete.payment?.totalAmount)}</strong> will be permanently removed from the database.
                  </p>

                  <div className="delete-modal-actions">
                    <button
                      type="button"
                      className="admin-orders__btn-secondary"
                      onClick={() => setOrderToDelete(null)}
                      disabled={isDeleting}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="delete-confirm-btn"
                      onClick={handleDeleteOrder}
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete Order'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
};

export default Orders;
