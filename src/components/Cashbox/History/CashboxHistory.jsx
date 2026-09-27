import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../../../utils/config';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';
import { useAuth } from '../../../context/AuthContext';
import { useLang } from '../../../utils/useLang';
import { getCashboxTranslation } from '../Lang';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import CashboxTopBar from '../components/CashboxTopBar';
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState('');

  const [selectedOrder, setSelectedOrder] = useState(null);
  const cashierName = user?.name || user?.username || user?.Name || t?.unknownUser || 'Unknown User';
  const cashierAvatar = user?.profilePictureUrl || user?.ProfilePictureUrl || user?.avatarUrl || user?.avatar || null;

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
  }, [page, pageSize, lang, t]);

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

      <CashboxTopBar
        cashierName={cashierName}
        cashierAvatar={cashierAvatar}
        t={t}
        isHistory={true}
      />

      <main className="cb-history-main">
        {summary && (
          <div className="cb-history-metrics">
            <div className="cb-metric-card">
              <div className="cb-metric-card__icon cb-metric-card__icon--rev">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <div className="cb-metric-card__info">
                <span className="cb-metric-card__label">{t?.history?.totalRevenue || 'Total Revenue'}</span>
                <span className="cb-metric-card__value">{summary.totalRevenue?.toFixed(2)} ₼</span>
              </div>
            </div>

            <div className="cb-metric-card">
              <div className="cb-metric-card__icon cb-metric-card__icon--orders">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div className="cb-metric-card__info">
                <span className="cb-metric-card__label">{t?.history?.totalOrders || 'Total Orders'}</span>
                <span className="cb-metric-card__value">{summary.totalOrders}</span>
              </div>
            </div>

            <div className="cb-metric-card">
              <div className="cb-metric-card__icon cb-metric-card__icon--cash">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <circle cx="12" cy="12" r="2" />
                  <path d="M6 12h.01M18 12h.01" />
                </svg>
              </div>
              <div className="cb-metric-card__info">
                <span className="cb-metric-card__label">{t?.history?.cashTotal || 'Cash'}</span>
                <span className="cb-metric-card__value">{summary.cashRevenue?.toFixed(2)} ₼</span>
              </div>
            </div>

            <div className="cb-metric-card">
              <div className="cb-metric-card__icon cb-metric-card__icon--card">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
              </div>
              <div className="cb-metric-card__info">
                <span className="cb-metric-card__label">{t?.history?.cardTotal || 'Card'}</span>
                <span className="cb-metric-card__value">{summary.cardRevenue?.toFixed(2)} ₼</span>
              </div>
            </div>
          </div>
        )}



        {loading && orders.length === 0 ? (
          <div className="cb-history-loading">
            <img src={loaderIcon} alt="Loading..." className="cb-history-spinner" />
            <p>{t?.history?.loadingHistory || 'Loading history...'}</p>
          </div>
        ) : error ? (
          <div className="cb-history-error">
            <div className="cb-history-error__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 44, height: 44 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3>{error}</h3>
            <button type="button" className="cb-history-retry-btn" onClick={fetchHistory}>
              {t?.history?.refresh || 'Retry'}
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="cb-history-empty">
            <div className="cb-history-empty__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 48, height: 48 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <h3>{t?.history?.noOrdersFound || 'No Orders Found'}</h3>
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
                        <div
                          className="cb-history-cashier-pill"
                          title={order.userId ? `User ID: ${order.userId}${order.cashierEmail ? ` (${order.cashierEmail})` : ''}` : (order.cashierEmail || '')}
                        >
                          {order.cashierAvatar ? (
                            <img
                              src={order.cashierAvatar}
                              alt={order.cashierName || 'Cashier'}
                              className="cb-history-cashier-avatar"
                            />
                          ) : (
                            <span className="cb-history-cashier-avatar-fallback">
                              {(order.cashierName || 'C')[0]?.toUpperCase()}
                            </span>
                          )}
                          <span className="cb-history-cashier-name">{order.cashierName || '—'}</span>
                        </div>
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
                          {order.payMethod === 'Card' ? (t?.history?.card || 'Card') : (t?.history?.cash || 'Cash')}
                        </span>
                      </td>

                      <td className="cb-history-cell-status">{getStatusBadge(order.status)}</td>

                      <td className="cb-history-cell-total">
                        <div className="cb-history-total-group">
                          <span className="cb-history-amount">{order.totalAmount?.toFixed(2)} ₼</span>
                          {order.promoCode && (
                            <span className="cb-history-promo-applied" title={`Promo: ${order.promoCode}`}>
                              {order.promoCode}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="cb-history-cell-actions-td" style={{ textAlign: 'right' }}>
                        <div className="cb-history-cell-actions">
                          <button
                            type="button"
                            className="cb-history-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrder(order);
                            }}
                            title={t?.history?.viewDetails || 'Details'}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            <span>{t?.history?.viewDetails || 'Details'}</span>
                          </button>
                        </div>
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
                        <div className="cb-history-card__cashier" title={order.userId ? `User ID: ${order.userId}` : ''}>
                          {order.cashierAvatar ? (
                            <img
                              src={order.cashierAvatar}
                              alt={order.cashierName || ''}
                              className="cb-history-card__cashier-avatar"
                            />
                          ) : (
                            <span className="cb-history-card__cashier-avatar-fallback">
                              {(order.cashierName || 'C')[0]?.toUpperCase()}
                            </span>
                          )}
                          <span>{order.cashierName || '—'}</span>
                        </div>
                        <span>•</span>
                        <span>{dateStr}</span>
                        <span>•</span>
                        <span>{order.payMethod === 'Card' ? (t?.history?.card || 'Card') : (t?.history?.cash || 'Cash')}</span>
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
    </div>
  );
};

export default CashboxHistory;
