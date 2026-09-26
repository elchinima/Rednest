import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CashboxOrderDetailModal = ({
  order,
  isOpen,
  onClose,
  onUpdateOrder,
  t,
  canEdit = true,
}) => {
  const [selectedStatus, setSelectedStatus] = useState(order?.status || 'Success');
  const [note, setNote] = useState(order?.note || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');

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
          <div className="cb-detail-header">
            <div>
              <div className="cb-detail-title-row">
                <h2 className="cb-detail-title">{t?.history?.orderDetails || 'Order Details'}</h2>
                {getStatusBadge(order.status)}
              </div>
              <p className="cb-detail-sub">
                ID: <code>{order.id}</code>
              </p>
            </div>
            <button type="button" className="cb-detail-close-btn" onClick={onClose}>
              ✕
            </button>
          </div>

          <div className="cb-detail-body">
            <div className="cb-detail-meta-grid">
              <div className="cb-detail-meta-item">
                <span className="cb-detail-meta-label">{t?.history?.date || 'Date'}</span>
                <span className="cb-detail-meta-val">{formattedDate}</span>
              </div>
              <div className="cb-detail-meta-item">
                <span className="cb-detail-meta-label">{t?.history?.payment || 'Payment'}</span>
                <span className="cb-detail-meta-val">
                  {order.payMethod === 'Card' ? '💳 ' + (t?.history?.card || 'Card') : '💵 ' + (t?.history?.cash || 'Cash')}
                </span>
              </div>
              <div className="cb-detail-meta-item">
                <span className="cb-detail-meta-label">{t?.history?.cashier || 'Cashier'}</span>
                <span className="cb-detail-meta-val">{order.cashierName || '—'}</span>
              </div>
              {order.promoCode && (
                <div className="cb-detail-meta-item">
                  <span className="cb-detail-meta-label">{t?.promoCodeLabel || 'Promo Code'}</span>
                  <span className="cb-detail-meta-val cb-detail-promo-tag">🎟️ {order.promoCode}</span>
                </div>
              )}
            </div>

            <div className="cb-detail-products-section">
              <h3 className="cb-detail-section-title">
                {t?.history?.items || 'Items'} ({order.products?.length || 0})
              </h3>
              <div className="cb-detail-products-list">
                {order.products?.map((item, idx) => (
                  <div key={item.productId || idx} className="cb-detail-product-row">
                    <div className="cb-detail-product-left">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="cb-detail-prod-img" />
                      ) : (
                        <div className="cb-detail-prod-fallback">☕</div>
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

            {canEdit && (
              <div className="cb-detail-management">
                <h3 className="cb-detail-section-title">{t?.history?.changeStatus || 'Update Order'}</h3>

                <div className="cb-detail-form-group">
                  <label className="cb-detail-label">{t?.history?.status || 'Status'}</label>
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
                    rows={2}
                    className="cb-detail-textarea"
                    placeholder={t?.history?.addNote || 'Add optional note...'}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>

                {order.editedBy && (
                  <div className="cb-detail-edited-info">
                    ℹ️ {t?.history?.editedBy || 'Edited by:'} <strong>{order.editedBy}</strong>
                    {order.editedAt && ` (${new Date(order.editedAt).toLocaleString()})`}
                  </div>
                )}

                {updateError && <div className="cb-detail-error">{updateError}</div>}
              </div>
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
