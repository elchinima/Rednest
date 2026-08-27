import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import Navbar from '../../Elements/Navbar';
import Footer from '../../Footer/Footer';
import DeleteConfirmModal from '../../Elements/DeleteConfirmModal';
import AddCardModal from './AddCardModal';
import './PaymentMethods.scss';

const apiUrl = import.meta.env.VITE_API_URL || '';

const formatBakuDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return '';
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.05,
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: 0.2 },
  },
};

const PaymentMethods = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [settingDefaultId, setSettingDefaultId] = useState(null);

  const showToast = (msg, type = 'success', duration = 3000) => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, duration);
  };

  const fetchCards = async () => {
    setLoading(true);
    setError(null);
    try {
      let res = await fetchWithRefresh(`${apiUrl}/api/payment-methods`);
      if (!res.ok && res.status === 404) {
        res = await fetchWithRefresh(`${apiUrl}/api/paymentmethods`);
      }
      if (!res.ok) {
        throw new Error('Failed to load saved payment methods.');
      }
      const data = await res.json();
      setCards(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching cards:', err);
      setError(err.message || 'Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleSaveCard = async (cardData) => {
    setAddLoading(true);
    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/payment-methods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to add card.');
      }

      setIsAddModalOpen(false);
      await fetchCards();
      showToast('Payment card added successfully!');
    } catch (err) {
      showToast(err.message || 'Failed to add card.', 'error');
    } finally {
      setAddLoading(false);
    }
  };

  const handleSetDefault = async (card) => {
    const cardId = card.id || card.Id;
    if (!card || card.isDefault || card.IsDefault || settingDefaultId) return;
    setSettingDefaultId(cardId);

    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/payment-methods/${cardId}/default`, {
        method: 'PATCH',
      });
      if (!res.ok) {
        throw new Error('Failed to set default payment method.');
      }

      setCards((prev) =>
        prev
          .map((c) => ({
            ...c,
            isDefault: (c.id || c.Id) === cardId,
            IsDefault: (c.id || c.Id) === cardId,
          }))
          .sort((a, b) => (b.isDefault || b.IsDefault ? 1 : 0) - (a.isDefault || a.IsDefault ? 1 : 0))
      );
      showToast(`"${card.cardName || card.CardName || 'Card'}" set as default payment method!`);
    } catch (err) {
      showToast(err.message || 'Error setting default payment method.', 'error');
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!cardToDelete || deleteLoading) return;
    setDeleteLoading(true);

    try {
      const cardId = cardToDelete.id || cardToDelete.Id;
      const res = await fetchWithRefresh(`${apiUrl}/api/payment-methods/${cardId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Failed to remove card.');
      }

      setCards((prev) => {
        const remaining = prev.filter((c) => (c.id || c.Id) !== cardId);
        const wasDefault = cardToDelete.isDefault || cardToDelete.IsDefault;
        if (wasDefault && remaining.length > 0 && !remaining.some((c) => c.isDefault || c.IsDefault)) {
          remaining[0].isDefault = true;
          remaining[0].IsDefault = true;
        }
        return remaining;
      });

      showToast('Payment card removed successfully.');
      setIsDeleteModalOpen(false);
      setCardToDelete(null);
    } catch (err) {
      showToast(err.message || 'Error deleting payment card.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const isEmpty = !loading && cards.length === 0;

  return (
    <motion.div
      className="payment-methods-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Navbar />

      <main className={`payment-methods-main ${isEmpty ? 'payment-methods-main--empty' : ''}`}>
        <div className={`payment-methods-container ${isEmpty ? 'payment-methods-container--empty' : ''}`}>
          <motion.div
            className="payment-methods-hero"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1>Payment Methods</h1>
            <p className="payment-methods-hero__desc">
              Manage your saved Visa and Mastercard cards, configure default payment method, and speed up checkout
            </p>

            <div className="payment-methods-hero__actions">
              <button
                type="button"
                className="cta-btn primary-red payment-methods-hero__add-btn"
                onClick={() => setIsAddModalOpen(true)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Add New Card</span>
              </button>
            </div>
          </motion.div>

          {loading ? (
            <div className="payment-methods-loading-state">
              <img src={loaderIcon} alt="Loading..." className="payment-methods-loader-icon" />
              <p>Loading your saved payment methods...</p>
            </div>
          ) : error ? (
            <div className="payment-methods-error-state">
              <p>{error}</p>
              <button
                type="button"
                className="cta-btn sm secondary"
                onClick={fetchCards}
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              <div className="payment-methods-grid">
                <AnimatePresence>
                  {cards.map((card, idx) => {
                    const id = card.id || card.Id;
                    const isDef = card.isDefault || card.IsDefault;
                    const brand = (card.cardBrand || card.CardBrand || 'Card').toLowerCase();
                    const last4 = card.last4 || card.Last4 || (card.cardNumber || '').slice(-4) || '••••';
                    const masked = card.cardNumber || card.CardNumber || `•••• •••• •••• ${last4}`;
                    const expiry = card.expiryDate || card.ExpiryDate || 'MM/YY';
                    const holder = card.cardholderName || card.CardholderName || user?.name || 'CARDHOLDER';
                    const title = card.cardName || card.CardName || (brand === 'visa' ? 'Visa Card' : brand === 'mastercard' ? 'Mastercard' : 'Bank Card');
                    const createdAt = card.createdAt || card.CreatedAt;

                    return (
                      <motion.div
                        key={id}
                        className={`payment-card ${isDef ? 'payment-card--default' : ''}`}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        custom={idx}
                        layout
                      >
                        <div className="payment-card__header">
                          <div className="payment-card__title-group">
                            <div className={`payment-card__icon-badge payment-card__icon-badge--${brand}`}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                                <line x1="1" y1="10" x2="23" y2="10" />
                              </svg>
                            </div>
                            <div className="payment-card__meta">
                              <h3 className="payment-card__title">{title}</h3>
                              {createdAt ? (
                                <span className="payment-card__date">
                                  Added {formatBakuDate(createdAt)}
                                </span>
                              ) : (
                                <span className="payment-card__date">
                                  {brand.toUpperCase()} Card
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="payment-card__badges">
                            {isDef && (
                              <span className="payment-card__badge-default">
                                <span className="pulsing-dot" />
                                Default
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="payment-card__body">
                          <div className="payment-card__number-row">
                            <div className="payment-card__number">
                              <span className="dots-group">•••• •••• ••••</span>
                              <span className="last-digits">{last4}</span>
                            </div>
                            <div className="payment-card__brand-tag">
                              {brand === 'visa' && <span className="tag-visa">VISA</span>}
                              {brand === 'mastercard' && <span className="tag-mc">MC</span>}
                              {brand !== 'visa' && brand !== 'mastercard' && <span className="tag-generic">CARD</span>}
                            </div>
                          </div>

                          <div className="payment-card__details-grid">
                            <div className="payment-card__detail-item">
                              <span className="payment-card__detail-label">Cardholder</span>
                              <span className="payment-card__detail-val">{holder}</span>
                            </div>

                            <div className="payment-card__detail-item">
                              <span className="payment-card__detail-label">Expires</span>
                              <span className="payment-card__detail-val">{expiry}</span>
                            </div>

                            <div className="payment-card__detail-item">
                              <span className="payment-card__detail-label">Brand</span>
                              <span className="payment-card__detail-val">{brand === 'visa' ? 'Visa' : brand === 'mastercard' ? 'Mastercard' : 'Bank Card'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="payment-card__footer">
                          <div className="payment-card__footer-left">
                            {!isDef && (
                              <button
                                type="button"
                                className="payment-card__action-btn payment-card__action-btn--default"
                                onClick={() => handleSetDefault(card)}
                                disabled={settingDefaultId === id}
                                title="Set as default payment method"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                  <polyline points="22 4 12 14.01 9 11.01" />
                                </svg>
                                <span>{settingDefaultId === id ? 'Setting...' : 'Set Default'}</span>
                              </button>
                            )}
                          </div>

                          <div className="payment-card__footer-right">
                            <button
                              type="button"
                              className="payment-card__action-btn payment-card__action-btn--delete"
                              onClick={() => {
                                setCardToDelete(card);
                                setIsDeleteModalOpen(true);
                              }}
                              title="Delete card"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </main>

      <AddCardModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveCard}
        loading={addLoading}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setCardToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        itemName={
          cardToDelete
            ? `${cardToDelete.cardName || cardToDelete.CardName || 'Card'} ending in ${cardToDelete.last4 || cardToDelete.Last4 || (cardToDelete.cardNumber || '').slice(-4) || '••••'}`
            : 'this card'
        }
        loading={deleteLoading}
      />

      <div className="payment-methods-toast-container">
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              className={`payment-methods-toast ${toastType === 'error' ? 'payment-methods-toast--error' : ''}`}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.25 }}
            >
              {toastType === 'error' ? (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              )}
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Footer />
    </motion.div>
  );
};

export default PaymentMethods;
