import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../../../utils/config';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';
import { useAuth } from '../../../context/AuthContext';
import { useLang } from '../../../utils/useLang';
import { getCashboxTranslation } from '../Lang';
import logo from '../../../assets/icons/rednest_logo.png';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import CashboxOrderDetailModal from './CashboxOrderDetailModal';
import './CashboxHistory.scss';

const CashboxHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const lang = useLang();
  const t = useMemo(() => getCashboxTranslation(lang), [lang]);

  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [payMethodFilter, setPayMethodFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState('');

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const userRole = (user?.role || user?.Role || '').toLowerCase().replace(/[\s_-]+/g, '');
  const isAdminOrSuperAdmin = userRole === 'admin' || userRole === 'superadmin';

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        lang: lang || 'az',
      });

      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (payMethodFilter !== 'all') params.append('payMethod', payMethodFilter);
      if (dateRange !== 'all') params.append('dateRange', dateRange);

      const res = await fetchWithRefresh(`${API_URL}/api/cashbox/history?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Access denied. Lead Staff, Admin or Super Admin role required.');
        }
        throw new Error(`Failed to load history (${res.status})`);
      }

      const data = await res.json();
      setOrders(data.orders || []);
      setTotalCount(data.totalCount || 0);
      setTotalPages(data.totalPages || 1);
      setSummary(data.summary || null);
    } catch (err) {
      console.error('Failed to fetch cashbox history:', err);
      setError(err.message || (t?.history?.loadError || 'Failed to load history'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, statusFilter, payMethodFilter, dateRange, lang, t]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleUpdateOrder = async (orderId, updateData) => {
    const res = await fetchWithRefresh(`${API_URL}/api/cashbox/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to update order');
    }

    showToast(t?.history?.statusUpdated || 'Status successfully updated');
    fetchHistory();
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetchWithRefresh(`${API_URL}/api/cashbox/orders/${orderToDelete.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to delete order');
      }

      showToast(t?.history?.orderDeleted || 'Order deleted successfully');
      setOrderToDelete(null);
      fetchHistory();
    } catch (err) {
      alert(err.message || 'Failed to delete order');
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text);
    showToast(`Copied ID: ${text.slice(0, 8)}...`);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Success':
        return <span className="cb-hist-badge cb-hist-badge--success">{t?.history?.statusSuccess || 'Success'}</span>;
      case 'Cancelled':
        return <span className="cb-hist-badge cb-hist-badge--danger">{t?.history?.statusCancelled || 'Cancelled'}</span>;
      case 'Refunded':
        return <span className="cb-hist-badge cb-hist-badge--warning">{t?.history?.statusRefunded || 'Refunded'}</span>;
      case 'Pending':
        return <span className="cb-hist-badge cb-hist-badge--info">{t?.history?.statusPending || 'Pending'}</span>;
      case 'Processing':
        return <span className="cb-hist-badge cb-hist-badge--info">{t?.history?.statusProcessing || 'Processing'}</span>;
      default:
        return <span className="cb-hist-badge">{status}</span>;
    }
  };

  return (
    <div className="cb-history-page">
      <AnimatePresence>
        {toast && (
          <motion.div
            className="cb-history-toast"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="cb-history-header">
        <div className="cb-history-header__left">
          <div className="cb-history-brand" onClick={() => navigate('/cashbox')}>
            <img src={logo} alt="Rednest" className="cb-history-brand__logo" />
            <div className="cb-history-brand__text-group">
              <div className="cb-history-brand__title-row">
                <span className="cb-history-brand__name">Rednest</span>
                <span className="cb-history-brand__badge">POS</span>
              </div>
              <span className="cb-history-brand__subtitle">{t?.history?.title || 'Cashbox History'}</span>
            </div>
          </div>
        </div>

        <div className="cb-history-header__right">
          <button
            type="button"
            className="cb-history-back-btn"
            onClick={() => navigate('/cashbox')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>{t?.history?.backToCashbox || 'Back to Cashbox'}</span>
          </button>

          <div className="cb-history-user-chip">
            <div className="cb-history-user-avatar">
              {user?.profilePictureUrl ? (
                <img src={user.profilePictureUrl} alt={user?.name || 'User'} />
              ) : (
                <span>{(user?.name || user?.username || 'U')[0].toUpperCase()}</span>
              )}
            </div>
            <div className="cb-history-user-details">
              <span className="cb-history-user-name">{user?.name || user?.username || 'Staff'}</span>
              <span className="cb-history-user-role">{user?.role || user?.Role || 'Lead Staff'}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="cb-history-main">
        {summary && (
          <div className="cb-history-metrics">
            <div className="cb-metric-card">
              <div className="cb-metric-card__icon cb-metric-card__icon--rev">💰</div>
              <div className="cb-metric-card__info">
                <span className="cb-metric-card__label">{t?.history?.totalRevenue || 'Total Revenue'}</span>
                <span className="cb-metric-card__value">{summary.totalRevenue?.toFixed(2)} ₼</span>
              </div>
            </div>

            <div className="cb-metric-card">
              <div className="cb-metric-card__icon cb-metric-card__icon--orders">📋</div>
              <div className="cb-metric-card__info">
                <span className="cb-metric-card__label">{t?.history?.totalOrders || 'Total Orders'}</span>
                <span className="cb-metric-card__value">{summary.totalOrders}</span>
              </div>
            </div>

            <div className="cb-metric-card">
              <div className="cb-metric-card__icon cb-metric-card__icon--cash">💵</div>
              <div className="cb-metric-card__info">
                <span className="cb-metric-card__label">{t?.history?.cashTotal || 'Cash'}</span>
                <span className="cb-metric-card__value">{summary.cashRevenue?.toFixed(2)} ₼</span>
              </div>
            </div>

            <div className="cb-metric-card">
              <div className="cb-metric-card__icon cb-metric-card__icon--card">💳</div>
              <div className="cb-metric-card__info">
                <span className="cb-metric-card__label">{t?.history?.cardTotal || 'Card'}</span>
                <span className="cb-metric-card__value">{summary.cardRevenue?.toFixed(2)} ₼</span>
              </div>
            </div>
          </div>
        )}

        <div className="cb-history-toolbar">
          <div className="cb-history-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="cb-history-search__icon">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="cb-history-search__input"
              placeholder={t?.history?.searchPlaceholder || 'Search Order ID, promo code, note...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" className="cb-history-search__clear" onClick={() => setSearch('')}>
                ✕
              </button>
            )}
          </div>

          <div className="cb-history-filters">
            <select
              className="cb-history-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">{t?.history?.allStatuses || 'All Statuses'}</option>
              <option value="Success">{t?.history?.statusSuccess || 'Success'}</option>
              <option value="Cancelled">{t?.history?.statusCancelled || 'Cancelled'}</option>
              <option value="Refunded">{t?.history?.statusRefunded || 'Refunded'}</option>
              <option value="Pending">{t?.history?.statusPending || 'Pending'}</option>
            </select>

            <select
              className="cb-history-select"
              value={payMethodFilter}
              onChange={(e) => {
                setPayMethodFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">{t?.history?.allMethods || 'All Methods'}</option>
              <option value="Cash">💵 {t?.history?.cash || 'Cash'}</option>
              <option value="Card">💳 {t?.history?.card || 'Card'}</option>
            </select>

            <div className="cb-history-date-chips">
              {[
                { id: 'all', label: t?.history?.allTime || 'All' },
                { id: 'today', label: t?.history?.today || 'Today' },
                { id: 'yesterday', label: t?.history?.yesterday || 'Yesterday' },
                { id: 'week', label: t?.history?.thisWeek || '7 Days' },
                { id: 'month', label: t?.history?.thisMonth || '30 Days' },
              ].map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  className={`cb-history-chip ${dateRange === chip.id ? 'cb-history-chip--active' : ''}`}
                  onClick={() => {
                    setDateRange(chip.id);
                    setPage(1);
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="cb-history-refresh-btn"
              onClick={fetchHistory}
              title={t?.history?.refresh || 'Refresh'}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={loading ? 'cb-history-spin' : ''}
              >
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
          </div>
        </div>

        {loading && orders.length === 0 ? (
          <div className="cb-history-loading">
            <img src={loaderIcon} alt="Loading..." className="cb-history-spinner" />
            <p>{t?.history?.loadingHistory || 'Loading history...'}</p>
          </div>
        ) : error ? (
          <div className="cb-history-error">
            <div className="cb-history-error__icon">⚠️</div>
            <h3>{error}</h3>
            <button type="button" className="cb-history-retry-btn" onClick={fetchHistory}>
              {t?.history?.refresh || 'Retry'}
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="cb-history-empty">
            <div className="cb-history-empty__icon">🧾</div>
            <h3>{t?.history?.noOrdersFound || 'No Orders Found'}</h3>
            <p>{t?.history?.noOrdersDesc || 'Try adjusting your search query or filters.'}</p>
          </div>
        ) : (
          <div className="cb-history-table-container">
            <table className="cb-history-table">
              <thead>
                <tr>
                  <th>{t?.history?.orderId || 'Order #'}</th>
                  <th>{t?.history?.date || 'Date'}</th>
                  <th>{t?.history?.cashier || 'Cashier'}</th>
                  <th>{t?.history?.items || 'Items'}</th>
                  <th>{t?.history?.payment || 'Payment'}</th>
                  <th>{t?.history?.status || 'Status'}</th>
                  <th>{t?.history?.total || 'Total'}</th>
                  <th style={{ textAlign: 'right' }}>{t?.history?.actions || 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const dateStr = new Date(order.createdAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={order.id} className="cb-history-row" onClick={() => setSelectedOrder(order)}>
                      <td className="cb-history-cell-id">
                        <span
                          className="cb-history-id-code"
                          title="Click to copy full ID"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(order.id);
                          }}
                        >
                          #{order.id.slice(0, 8)}
                        </span>
                      </td>

                      <td className="cb-history-cell-date">{dateStr}</td>

                      <td className="cb-history-cell-cashier">
                        <span className="cb-history-cashier-pill">{order.cashierName || '—'}</span>
                      </td>

                      <td className="cb-history-cell-items">
                        <div className="cb-history-items-summary">
                          <span className="cb-history-items-count">
                            {t?.history?.itemCount ? t.history.itemCount(order.itemCount) : `${order.itemCount} items`}
                          </span>
                          <span className="cb-history-items-preview">
                            {order.products?.map((p) => `${p.name} (${p.quantity})`).join(', ')}
                          </span>
                        </div>
                      </td>

                      <td className="cb-history-cell-pay">
                        <span className={`cb-hist-pay-badge cb-hist-pay-badge--${order.payMethod.toLowerCase()}`}>
                          {order.payMethod === 'Card' ? '💳 ' + (t?.history?.card || 'Card') : '💵 ' + (t?.history?.cash || 'Cash')}
                        </span>
                      </td>

                      <td className="cb-history-cell-status">{getStatusBadge(order.status)}</td>

                      <td className="cb-history-cell-total">
                        <div className="cb-history-total-group">
                          <span className="cb-history-amount">{order.totalAmount?.toFixed(2)} ₼</span>
                          {order.promoCode && (
                            <span className="cb-history-promo-applied" title={`Promo: ${order.promoCode}`}>
                              🎟️ {order.promoCode}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="cb-history-cell-actions" style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="cb-history-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrder(order);
                          }}
                          title={t?.history?.viewDetails || 'Details'}
                        >
                          👁️ {t?.history?.viewDetails || 'Details'}
                        </button>

                        {isAdminOrSuperAdmin && (
                          <button
                            type="button"
                            className="cb-history-action-btn cb-history-action-btn--delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOrderToDelete(order);
                            }}
                            title={t?.history?.deleteOrder || 'Delete'}
                          >
                            🗑️
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="cb-history-cards">
              {orders.map((order) => {
                const dateStr = new Date(order.createdAt).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div key={order.id} className="cb-history-card" onClick={() => setSelectedOrder(order)}>
                    <div className="cb-history-card__header">
                      <span className="cb-history-id-code">#{order.id.slice(0, 8)}</span>
                      {getStatusBadge(order.status)}
                    </div>

                    <div className="cb-history-card__items-preview">
                      {order.products?.map((p) => `${p.name} × ${p.quantity}`).join(', ')}
                    </div>

                    <div className="cb-history-card__footer">
                      <div className="cb-history-card__meta">
                        <span>{dateStr}</span>
                        <span>•</span>
                        <span>{order.payMethod === 'Card' ? '💳 ' + (t?.history?.card || 'Card') : '💵 ' + (t?.history?.cash || 'Cash')}</span>
                      </div>
                      <div className="cb-history-card__amount">
                        {order.totalAmount?.toFixed(2)} ₼
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {totalPages > 1 && (
          <div className="cb-history-pagination">
            <button
              type="button"
              className="cb-page-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ←
            </button>
            <span className="cb-page-info">
              {t?.history?.pageOf ? t.history.pageOf(page, totalPages) : `Page ${page} of ${totalPages}`}
            </span>
            <button
              type="button"
              className="cb-page-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              →
            </button>
          </div>
        )}
      </main>

      <CashboxOrderDetailModal
        order={selectedOrder}
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        onUpdateOrder={handleUpdateOrder}
        t={t}
        canEdit={true}
      />

      <AnimatePresence>
        {orderToDelete && (
          <div className="cb-detail-overlay" onClick={() => setOrderToDelete(null)}>
            <motion.div
              className="cb-delete-modal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="cb-delete-icon">⚠️</div>
              <h3>{t?.history?.confirmDelete || 'Delete this order?'}</h3>
              <p>
                #{orderToDelete.id.slice(0, 8)} ({orderToDelete.totalAmount?.toFixed(2)} ₼)
              </p>
              <p className="cb-delete-sub">{t?.history?.deleteWarning || 'This action cannot be undone.'}</p>
              <div className="cb-delete-actions">
                <button
                  type="button"
                  className="cb-detail-cancel-btn"
                  onClick={() => setOrderToDelete(null)}
                  disabled={isDeleting}
                >
                  {t?.cancel || 'Cancel'}
                </button>
                <button
                  type="button"
                  className="cb-detail-delete-confirm-btn"
                  onClick={handleDeleteOrder}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : (t?.history?.deleteOrder || 'Delete')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CashboxHistory;
