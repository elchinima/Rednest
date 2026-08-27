import React, { useState, useEffect } from 'react';
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

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.06,
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

  const [settingDefaultId, setSettingDefaultId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');

  const showToast = (msg, type = 'success', duration = 3500) => {
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
      showToast('Payment card added successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to add card.', 'error');
    } finally {
      setAddLoading(false);
    }
  };

  const handleSetDefault = async (card) => {
    if (card.isDefault || card.IsDefault || settingDefaultId) return;
    setSettingDefaultId(card.id || card.Id);

    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/payment-methods/${card.id || card.Id}/default`, {
        method: 'PATCH',
      });

      if (!res.ok) {
        throw new Error('Failed to set default payment method.');
      }

      setCards((prev) =>
        prev.map((c) => ({
          ...c,
          isDefault: (c.id || c.Id) === (card.id || card.Id),
          IsDefault: (c.id || c.Id) === (card.id || card.Id),
        }))
      );
      showToast('Default payment card updated.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to set default card.', 'error');
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleDeleteCard = async () => {
    if (!cardToDelete) return;
    setDeleteLoading(true);

    try {
      const cardId = cardToDelete.id || cardToDelete.Id;
      const res = await fetchWithRefresh(`${apiUrl}/api/payment-methods/${cardId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete payment card.');
      }

      setIsDeleteModalOpen(false);
      setCardToDelete(null);
      await fetchCards();
      showToast('Payment card removed successfully.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to delete card.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="payment-methods-page">
      <Navbar />

      <main className="payment-methods-content">
        <div className="payment-methods-container">
          <div className="pm-top-nav">
            <Link to="/profile" className="pm-back-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to Profile
            </Link>
          </div>

          <div className="pm-header">
            <div className="pm-header__left">
              <h1 className="pm-title">Payment Methods</h1>
              <p className="pm-subtitle">
                Manage your saved Visa and Mastercard cards for quick and secure checkout
              </p>
            </div>
            <button
              type="button"
              className="cta-btn primary sm pm-add-btn"
              onClick={() => setIsAddModalOpen(true)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Card
            </button>
          </div>

          <AnimatePresence>
            {toastMessage && (
              <motion.div
                className={`pm-toast pm-toast--${toastType}`}
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
              >
                {toastType === 'success' ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                )}
                <span>{toastMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {loading ? (
            <div className="pm-loading">
              <img src={loaderIcon} alt="Loading" className="pm-spinner" />
              <p>Loading your payment methods...</p>
            </div>
          ) : error ? (
            <div className="pm-error">
              <div className="pm-error__icon">⚠️</div>
              <h3>Unable to load cards</h3>
              <p>{error}</p>
              <button type="button" className="cta-btn secondary sm" onClick={fetchCards}>
                Try Again
              </button>
            </div>
          ) : cards.length === 0 ? (
            <div className="pm-empty">
              <div className="pm-empty__icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
              </div>
              <h3>No Saved Cards</h3>
              <p>
                You haven't saved any Visa or Mastercard payment methods yet. Add a card to make ordering faster!
              </p>
              <button
                type="button"
                className="cta-btn primary sm"
                onClick={() => setIsAddModalOpen(true)}
              >
                Add Your First Card
              </button>
            </div>
          ) : (
            <div className="pm-cards-grid">
              <AnimatePresence>
                {cards.map((card, idx) => {
                  const id = card.id || card.Id;
                  const isDef = card.isDefault || card.IsDefault;
                  const brand = (card.cardBrand || card.CardBrand || '').toLowerCase();
                  const last4 = card.last4 || card.Last4 || (card.cardNumber || '').slice(-4) || '••••';
                  const maskedNumber = card.cardNumber || card.CardNumber || `•••• •••• •••• ${last4}`;
                  const expiry = card.expiryDate || card.ExpiryDate || 'MM/YY';
                  const holder = card.cardholderName || card.CardholderName || user?.name || 'CARDHOLDER';
                  const label = card.cardName || card.CardName || (brand === 'visa' ? 'Visa Card' : 'Mastercard');

                  return (
                    <motion.div
                      key={id}
                      className={`pm-card-item pm-card-item--${brand}`}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      custom={idx}
                      layout
                    >
                      <div className="pm-card-item__top">
                        <div className="pm-card-item__header-row">
                          <div className="pm-card-item__label-wrap">
                            <span className="pm-card-item__label-title">{label}</span>
                            {isDef && <span className="pm-card-item__default-badge">DEFAULT</span>}
                          </div>

                          <div className="pm-card-item__brand-logo">
                            {brand === 'visa' && <span className="visa-logo">VISA</span>}
                            {brand === 'mastercard' && (
                              <div className="mc-logo">
                                <span className="mc-circle mc-circle--red" />
                                <span className="mc-circle mc-circle--yellow" />
                              </div>
                            )}
                            {brand !== 'visa' && brand !== 'mastercard' && <span className="generic-logo">CARD</span>}
                          </div>
                        </div>

                        <div className="pm-card-item__chip-row">
                          <div className="pm-card-item__chip" />
                          <svg className="pm-card-item__contactless" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M8.5 16.5a5 5 0 0 1 0-9" />
                            <path d="M12 19a8.5 8.5 0 0 1 0-14" />
                            <path d="M15.5 21.5a12 12 0 0 1 0-19" />
                          </svg>
                        </div>

                        <div className="pm-card-item__number">{maskedNumber}</div>

                        <div className="pm-card-item__bottom-info">
                          <div className="pm-card-item__holder">
                            <span className="pm-card-item__small-label">CARDHOLDER</span>
                            <span className="pm-card-item__val">{holder}</span>
                          </div>
                          <div className="pm-card-item__expiry">
                            <span className="pm-card-item__small-label">EXPIRES</span>
                            <span className="pm-card-item__val">{expiry}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pm-card-item__actions">
                        {!isDef ? (
                          <button
                            type="button"
                            className="pm-action-btn pm-action-btn--default"
                            onClick={() => handleSetDefault(card)}
                            disabled={settingDefaultId === id}
                          >
                            {settingDefaultId === id ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <img src={loaderIcon} alt="Setting default" style={{ width: '14px', height: '14px' }} />
                                Setting...
                              </span>
                            ) : (
                              'Set as Default'
                            )}
                          </button>
                        ) : (
                          <span className="pm-action-current-default">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Primary Card
                          </span>
                        )}

                        <button
                          type="button"
                          className="pm-action-btn pm-action-btn--delete"
                          onClick={() => {
                            setCardToDelete(card);
                            setIsDeleteModalOpen(true);
                          }}
                          aria-label="Delete card"
                          title="Remove card"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>

      <Footer />

      <AddCardModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveCard}
        loading={addLoading}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteCard}
        itemName={
          cardToDelete
            ? `card ending in ${cardToDelete.last4 || cardToDelete.Last4 || (cardToDelete.cardNumber || '').slice(-4) || '••••'}`
            : 'this card'
        }
        loading={deleteLoading}
      />
    </div>
  );
};

export default PaymentMethods;
