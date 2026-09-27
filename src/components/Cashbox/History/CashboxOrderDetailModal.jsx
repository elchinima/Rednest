import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CashboxOrderDetailModal = ({
  order,
  isOpen,
  onClose,
  onUpdateOrder,
  t,
  canEdit = true,
}) => {
  const [activeTab, setActiveTab] = useState('info');
  const [selectedStatus, setSelectedStatus] = useState(order?.status || 'Success');
  const [note, setNote] = useState(order?.note || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [copiedUserId, setCopiedUserId] = useState(false);

  useEffect(() => {
    if (order) {
      setSelectedStatus(order.status || 'Success');
      setNote(order.note || '');
      setActiveTab('info');
    }
  }, [order]);

  const handleCopyUserId = (e, userId) => {
    e.stopPropagation();
    if (!userId) return;
    navigator.clipboard?.writeText(userId);
    setCopiedUserId(true);
    setTimeout(() => setCopiedUserId(false), 2000);
  };

  if (!isOpen || !order) return null;

  const handleSave = async () => {
    setIsUpdating(true);
    setUpdateError('');
    try {
      await onUpdateOrder(order.id, {
        status: selectedStatus,
        note: note.trim()
      });
      onClose();
    } catch (err) {
      setUpdateError(err.message || 'Failed to update order');
    } finally {
      setIsUpdating(false);
    }
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

  const formattedDate = new Date(order.createdAt).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <AnimatePresence>
      <div className="cb-detail-overlay" onClick={onClose}>
        <motion.div
          className="cb-detail-modal"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header without status badge next to title */}
          <div className="cb-detail-header">
            <div>
              <h2 className="cb-detail-title">{t?.history?.orderDetails || 'Details'}</h2>
              <p className="cb-detail-sub">
                ID:{' '}
                <code
                  className="cb-detail-id-code"
                  title="Click to copy full ID"
                  onClick={() => navigator.clipboard?.writeText(order.id)}
                >
                  <span className="cb-detail-id-full">{order.id}</span>
                  <span className="cb-detail-id-short">#{order.id.slice(0, 8)}</span>
                </code>
              </p>
            </div>
            <button type="button" className="cb-detail-close-btn" onClick={onClose}>
              ✕
            </button>
          </div>

          <div className="cb-detail-nav">
            <button
              type="button"
              className={`cb-detail-tab-btn ${activeTab === 'info' ? 'cb-detail-tab-btn--active' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>{t?.history?.tabInfo || 'Info'}</span>
            </button>

            <button
              type="button"
              className={`cb-detail-tab-btn ${activeTab === 'items' ? 'cb-detail-tab-btn--active' : ''}`}
              onClick={() => setActiveTab('items')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <span>{t?.history?.tabProducts || 'Məhsullar'}</span>
              <span className="cb-detail-tab-count">{order.products?.length || 0}</span>
            </button>

            <button
              type="button"
              className={`cb-detail-tab-btn ${activeTab === 'status' ? 'cb-detail-tab-btn--active' : ''}`}
              onClick={() => setActiveTab('status')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{t?.history?.tabStatus || 'Status'}</span>
            </button>
          </div>

          <div className="cb-detail-body">
            {activeTab === 'info' && (
              <motion.div
                key="info"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="cb-tab-pane"
              >
                <div className="cb-detail-meta-grid">
                  <div className="cb-detail-meta-item">
                    <span className="cb-detail-meta-label">{t?.history?.status || 'Status'}</span>
                    <div className="cb-detail-status-inline">
                      {getStatusBadge(order.status)}
                    </div>
                  </div>

                  <div className="cb-detail-meta-item">
                    <span className="cb-detail-meta-label">{t?.history?.date || 'Date'}</span>
                    <span className="cb-detail-meta-val">{formattedDate}</span>
                  </div>

                  <div className="cb-detail-meta-item">
                    <span className="cb-detail-meta-label">{t?.history?.payment || 'Payment'}</span>
                    <span className="cb-detail-meta-val">
                      {order.payMethod === 'Card' ? (t?.history?.card || 'Card') : (t?.history?.cash || 'Cash')}
                    </span>
                  </div>

                  <div className="cb-detail-meta-item">
                    <span className="cb-detail-meta-label">{t?.history?.createdBy || t?.history?.cashier || 'Cashier'}</span>
                    <div className="cb-detail-user-pill">
                      {order.cashierAvatar ? (
                        <img
                          src={order.cashierAvatar}
                          alt={order.cashierName || 'Cashier'}
                          className="cb-detail-user-avatar"
                        />
                      ) : (
                        <span className="cb-detail-user-avatar-fallback">
                          {(order.cashierName || 'C')[0]?.toUpperCase()}
                        </span>
                      )}
                      <div className="cb-detail-user-info">
                        <span className="cb-detail-user-name">{order.cashierName || '—'}</span>
                        {order.userId && (
                          <button
                            type="button"
                            className="cb-detail-user-id-btn"
                            onClick={(e) => handleCopyUserId(e, order.userId)}
                            title={`Click to copy: ${order.userId}`}
                          >
                            <span>ID: {order.userId.slice(0, 8)}...</span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 11, height: 11 }}>
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            {copiedUserId && <span className="cb-detail-copied-badge">Copied</span>}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {order.editedBy && (
                    <div className="cb-detail-meta-item cb-detail-meta-item--edited">
                      <span className="cb-detail-meta-label">{t?.history?.editedBy || 'Edited by'}</span>
                      <div className="cb-detail-user-pill">
                        {order.editorAvatar ? (
                          <img
                            src={order.editorAvatar}
                            alt={order.editedBy}
                            className="cb-detail-user-avatar"
                          />
                        ) : (
                          <span className="cb-detail-user-avatar-fallback cb-detail-user-avatar-fallback--editor">
                            {(order.editedBy || 'E')[0]?.toUpperCase()}
                          </span>
                        )}
                        <div className="cb-detail-user-info">
                          <span className="cb-detail-user-name">{order.editedBy}</span>
                          {order.editedAt && (
                            <span className="cb-detail-user-sub">
                              {new Date(order.editedAt).toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {order.promoCode && (
                    <div className="cb-detail-meta-item">
                      <span className="cb-detail-meta-label">{t?.promoCodeLabel || 'Promo Code'}</span>
                      <span className="cb-detail-meta-val cb-detail-promo-tag">{order.promoCode}</span>
                    </div>
                  )}
                </div>

                {order.note && (
                  <div className="cb-detail-note-card">
                    <span className="cb-detail-meta-label">{t?.history?.note || 'Note'}</span>
                    <p className="cb-detail-note-text">{order.note}</p>
                  </div>
                )}

                <div className="cb-detail-totals">
                  <div className="cb-detail-total-row">
                    <span>{t?.history?.subtotal || 'Subtotal:'}</span>
                    <span>{order.initialAmount?.toFixed(2) || order.totalAmount?.toFixed(2)} ₼</span>
                  </div>
                  {order.discountAmount > 0 && (
                    <div className="cb-detail-total-row cb-detail-total-row--discount">
                      <span>{t?.history?.discount || 'Discount:'}</span>
                      <span>-{order.discountAmount.toFixed(2)} ₼</span>
                    </div>
                  )}
                  <div className="cb-detail-total-row cb-detail-total-row--final">
                    <span>{t?.history?.total || 'Total Paid:'}</span>
                    <span>{order.totalAmount?.toFixed(2)} ₼</span>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'items' && (
              <motion.div
                key="items"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="cb-tab-pane"
              >
                <div className="cb-detail-products-section">
                  <div className="cb-detail-products-list">
                    {order.products?.map((item, idx) => (
                      <div key={item.productId || idx} className="cb-detail-product-row">
                        <div className="cb-detail-product-left">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="cb-detail-prod-img" />
                          ) : (
                            <div className="cb-detail-prod-fallback">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                                <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                                <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                                <line x1="6" y1="1" x2="6" y2="4" />
                                <line x1="10" y1="1" x2="10" y2="4" />
                                <line x1="14" y1="1" x2="14" y2="4" />
                              </svg>
                            </div>
                          )}
                          <div>
                            <div className="cb-detail-prod-name">{item.name}</div>
                            <div className="cb-detail-prod-cat">{item.category}</div>
                          </div>
                        </div>
                        <div className="cb-detail-product-right">
                          <div className="cb-detail-prod-calc">
                            {item.quantity} × {item.price.toFixed(2)} ₼
                          </div>
                          <div className="cb-detail-prod-total">
                            {(item.quantity * item.price).toFixed(2)} ₼
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="cb-detail-totals">
                  <div className="cb-detail-total-row">
                    <span>{t?.history?.subtotal || 'Subtotal:'}</span>
                    <span>{order.initialAmount?.toFixed(2) || order.totalAmount?.toFixed(2)} ₼</span>
                  </div>
                  {order.discountAmount > 0 && (
                    <div className="cb-detail-total-row cb-detail-total-row--discount">
                      <span>{t?.history?.discount || 'Discount:'}</span>
                      <span>-{order.discountAmount.toFixed(2)} ₼</span>
                    </div>
                  )}
                  <div className="cb-detail-total-row cb-detail-total-row--final">
                    <span>{t?.history?.total || 'Total Paid:'}</span>
                    <span>{order.totalAmount?.toFixed(2)} ₼</span>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'status' && (
              <motion.div
                key="status"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="cb-tab-pane"
              >
                <div className="cb-detail-management">
                  <div className="cb-detail-current-status-card">
                    <span className="cb-detail-meta-label">{t?.history?.status || 'Current Status'}</span>
                    <div style={{ marginTop: 6 }}>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>

                  {canEdit && (
                    <>
                      <div className="cb-detail-form-group">
                        <label className="cb-detail-label">{t?.history?.changeStatus || 'Change Status'}</label>
                        <div className="cb-detail-status-chips">
                          {['Success', 'Refunded', 'Cancelled', 'Pending'].map((st) => (
                            <button
                              key={st}
                              type="button"
                              className={`cb-detail-status-chip cb-detail-status-chip--${st.toLowerCase()} ${
                                selectedStatus === st ? 'cb-detail-status-chip--selected' : ''
                              }`}
                              onClick={() => setSelectedStatus(st)}
                            >
                              {st === 'Success' && (t?.history?.statusSuccess || 'Success')}
                              {st === 'Refunded' && (t?.history?.statusRefunded || 'Refunded')}
                              {st === 'Cancelled' && (t?.history?.statusCancelled || 'Cancelled')}
                              {st === 'Pending' && (t?.history?.statusPending || 'Pending')}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="cb-detail-form-group">
                        <label className="cb-detail-label">{t?.history?.note || 'Note'}</label>
                        <textarea
                          rows={3}
                          className="cb-detail-textarea"
                          placeholder={t?.history?.addNote || 'Add optional note...'}
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  {order.editedBy && (
                    <div className="cb-detail-edited-info">
                      <div className="cb-detail-edited-avatar-wrap">
                        {order.editorAvatar ? (
                          <img
                            src={order.editorAvatar}
                            alt={order.editedBy}
                            className="cb-detail-edited-mini-avatar"
                          />
                        ) : (
                          <span className="cb-detail-edited-mini-fallback">
                            {(order.editedBy || 'E')[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="cb-detail-edited-text">
                        <span>{t?.history?.editedBy || 'Edited by:'} <strong>{order.editedBy}</strong></span>
                        {order.editedAt && (
                          <span className="cb-detail-edited-date">
                            {' '}({new Date(order.editedAt).toLocaleString()})
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {updateError && <div className="cb-detail-error">{updateError}</div>}
                </div>
              </motion.div>
            )}
          </div>

          <div className="cb-detail-footer">
            <button type="button" className="cb-detail-cancel-btn" onClick={onClose}>
              {t?.closeModal || 'Close'}
            </button>
            {canEdit && (
              <button
                type="button"
                className="cb-detail-save-btn"
                onClick={handleSave}
                disabled={isUpdating}
              >
                {isUpdating ? (t?.searching || 'Saving...') : (t?.history?.saveChanges || 'Save Changes')}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CashboxOrderDetailModal;
