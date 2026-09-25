import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../../../utils/config';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';

const formatDate = (dateStr, lang = 'az') => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    const locale = lang === 'az' ? 'az-AZ' : lang === 'ru' ? 'ru-RU' : 'en-GB';
    const formatter = new Intl.DateTimeFormat(locale, {
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

const CashboxPromoModal = ({
  isOpen,
  onClose,
  appliedPromo = null,
  onApplyPromo,
  onRemovePromo,
  lang = 'az',
  t,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setHasSearched(false);
      setError('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSearch = useCallback(async (searchVal) => {
    const term = (searchVal !== undefined ? searchVal : query).trim();
    if (!term) return;

    setLoading(true);
    setError('');
    setHasSearched(true);

    try {
      const res = await fetchWithRefresh(`${API_URL}/api/cashbox/promos/search?query=${encodeURIComponent(term)}`);
      if (res.ok) {
        const data = await res.json();
        const promoList = Array.isArray(data) ? data : [];
        const activePromos = promoList.filter((promo) => promo.isActive && !promo.isExpired);
        setResults(activePromos);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.message || t?.promoSearchError || 'Failed to search promo codes.');
      }
    } catch (err) {
      console.error('Error searching promo codes in cashbox:', err);
      setError(t?.promoNetworkError || 'Network error while searching promo codes.');
    } finally {
      setLoading(false);
    }
  }, [query, t]);

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch();
  };

  const getTranslatedPrize = (name) => {
    if (!name) return t?.promoDiscount || 'Promo Discount';
    const n = String(name).toLowerCase();
    if (n.includes('free drink')) return t?.freeDrink || name;
    if (n.includes('free dessert')) return t?.freeDessert || name;
    if (n.includes('super prize')) return t?.superPrize || name;
    if (n.includes('25%')) return t?.discount25 || name;
    if (n.includes('50%')) return t?.discount50 || name;
    return name;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="cashbox-modal-backdrop cashbox-promo-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="cashbox-promo-modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cashbox-promo-modal__header">
              <div className="cashbox-promo-modal__title-group">
                <div className="cashbox-promo-modal__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 9a3 3 0 0 1 0 6v3a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3a3 3 0 0 1 0-6V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
                    <path d="M9 9h.01" />
                    <path d="M15 15h.01" />
                    <path d="M16 8L8 16" />
                  </svg>
                </div>
                <div>
                  <h3 className="cashbox-promo-modal__title">{t?.promoModalTitle || 'Promo Code Lookup'}</h3>
                  <p className="cashbox-promo-modal__subtitle">{t?.promoModalSubtitle || 'Search by barcode or promo code number'}</p>
                </div>
              </div>

              <button
                type="button"
                className="cashbox-promo-modal__close-btn"
                onClick={onClose}
                title={t?.closeModal || 'Close modal'}
                aria-label={t?.closeModal || 'Close modal'}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="cashbox-promo-modal__search-form">
              <div className="cashbox-promo-modal__input-wrap">
                <svg
                  className="cashbox-promo-modal__search-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>

                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t?.promoInputPlaceholder || 'Scan barcode or enter promo code...'}
                  className="cashbox-promo-modal__input"
                />

                {query && (
                  <button
                    type="button"
                    className="cashbox-promo-modal__clear-btn"
                    onClick={() => {
                      setQuery('');
                      setResults([]);
                      setHasSearched(false);
                      inputRef.current?.focus();
                    }}
                    title={t?.clearSearch || 'Clear search'}
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="cashbox-promo-modal__submit-btn"
                disabled={loading || !query.trim()}
              >
                {loading ? (t?.searching || 'Searching...') : (t?.search || 'Search')}
              </button>
            </form>

            <div className="cashbox-promo-modal__body">
              {error && (
                <div className="cashbox-promo-modal__error">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {!hasSearched && !loading && (
                <div className="cashbox-promo-modal__empty">
                  <div className="cashbox-promo-modal__empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="4" width="18" height="16" rx="2" />
                      <line x1="7" y1="8" x2="7" y2="16" />
                      <line x1="11" y1="8" x2="11" y2="16" />
                      <line x1="15" y1="8" x2="15" y2="16" />
                      <line x1="17" y1="8" x2="17" y2="16" />
                    </svg>
                  </div>
                  <p className="cashbox-promo-modal__empty-title">{t?.scanOrEnter || 'Scan or enter barcode / code'}</p>
                  <p className="cashbox-promo-modal__empty-text">
                    {t?.scanOrEnterDesc || 'Enter customer\'s promo code or barcode to check validity, discount amount, and account owner.'}
                  </p>
                </div>
              )}

              {loading && (
                <div className="cashbox-promo-modal__loading">
                  <div className="cashbox-promo-modal__spinner" />
                  <span>{t?.searchingDb || 'Searching promo codes in database...'}</span>
                </div>
              )}

              {hasSearched && !loading && results.length === 0 && !error && (
                <div className="cashbox-promo-modal__empty">
                  <div className="cashbox-promo-modal__empty-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                  </div>
                  <p className="cashbox-promo-modal__empty-title">{t?.noActivePromo || 'No active promo code found'}</p>
                  <p className="cashbox-promo-modal__empty-text">
                    {t?.noActivePromoDesc ? t.noActivePromoDesc(query) : `No active promo codes match "${query}".`}
                  </p>
                </div>
              )}

              {results.length > 0 && (
                <div className="cashbox-promo-modal__results">
                  {results.map((promo) => {
                    const isExpired = promo.isExpired;
                    const isActive = promo.isActive && !isExpired;
                    const prizeTitle = getTranslatedPrize(promo.prizeName);

                    const ownerDisplay = promo.userName === 'Unclaimed (Public Promo)'
                      ? (t?.unclaimedPublic || promo.userName)
                      : promo.userName === 'Anonymous Customer'
                        ? (t?.anonymousCustomer || promo.userName)
                        : (promo.userName || t?.accountOwner || 'User');

                    return (
                      <div
                        key={promo.id}
                        className={`cashbox-promo-card ${isActive ? 'cashbox-promo-card--active' : 'cashbox-promo-card--expired'}`}
                      >
                        <div className="cashbox-promo-card__header">
                          <div className="cashbox-promo-card__prize-title">
                            <h4>{prizeTitle}</h4>
                            {promo.prizeDescription && (
                              <p className="cashbox-promo-card__prize-desc">{promo.prizeDescription}</p>
                            )}
                          </div>

                          <div className="cashbox-promo-card__badges">
                            {isActive ? (
                              <span className="cashbox-promo-badge cashbox-promo-badge--active">
                                <span className="cashbox-promo-badge__dot" />
                                {t?.active || 'Active'}
                              </span>
                            ) : isExpired ? (
                              <span className="cashbox-promo-badge cashbox-promo-badge--expired">
                                <span className="cashbox-promo-badge__dot" />
                                {t?.expired || 'Expired'}
                              </span>
                            ) : (
                              <span className="cashbox-promo-badge cashbox-promo-badge--inactive">
                                <span className="cashbox-promo-badge__dot" />
                                {t?.inactive || 'Inactive'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="cashbox-promo-card__owner">
                          <div className="cashbox-promo-card__owner-avatar">
                            {promo.userAvatar ? (
                              <img src={promo.userAvatar} alt={ownerDisplay} />
                            ) : (
                              <span>{promo.userName?.charAt(0)?.toUpperCase() || 'U'}</span>
                            )}
                          </div>
                          <div className="cashbox-promo-card__owner-info">
                            <span className="cashbox-promo-card__owner-label">{t?.accountOwner || 'Account Owner'}</span>
                            <span className="cashbox-promo-card__owner-name">{ownerDisplay}</span>
                            {promo.userEmail && (
                              <span className="cashbox-promo-card__owner-email">{promo.userEmail}</span>
                            )}
                          </div>
                        </div>

                        <div className="cashbox-promo-card__codes">
                          <div className="cashbox-promo-card__code-box">
                            <span className="cashbox-promo-card__code-label">{t?.promoCodeLabel || 'Promo Code'}</span>
                            <span className="cashbox-promo-card__code-value">{promo.promoCode}</span>
                          </div>

                          {promo.barCode && (
                            <div className="cashbox-promo-card__code-box cashbox-promo-card__code-box--barcode">
                              <span className="cashbox-promo-card__code-label">{t?.barcodeLabel || 'Barcode Number'}</span>
                              <span className="cashbox-promo-card__code-value cashbox-promo-card__code-value--barcode">
                                {promo.barCode}
                              </span>
                            </div>
                          )}

                          {promo.discountPercent > 0 && (
                            <div className="cashbox-promo-card__discount-box">
                              <span className="cashbox-promo-card__code-label">{t?.discountLabel || 'Discount'}</span>
                              <span className="cashbox-promo-card__discount-value">-{promo.discountPercent}%</span>
                            </div>
                          )}

                          {promo.cashbackPercent > 0 && (
                            <div className="cashbox-promo-card__discount-box">
                              <span className="cashbox-promo-card__code-label">{t?.cashbackLabel || 'Cashback'}</span>
                              <span className="cashbox-promo-card__discount-value">+{promo.cashbackPercent}%</span>
                            </div>
                          )}
                        </div>

                        {isActive && (
                          <div className="cashbox-promo-card__actions">
                            {appliedPromo?.id === promo.id || (appliedPromo?.promoCode && String(appliedPromo.promoCode).toUpperCase() === String(promo.promoCode).toUpperCase()) ? (
                              <div className="cashbox-promo-card__applied-row">
                                <div className="cashbox-promo-card__applied-status">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                  <span>{t?.appliedToReceipt || 'Applied to Receipt'}</span>
                                </div>
                                <button
                                  type="button"
                                  className="cashbox-promo-card__remove-btn"
                                  onClick={() => onRemovePromo && onRemovePromo()}
                                  title={t?.removeFromReceipt || 'Remove from receipt'}
                                >
                                  {t?.remove || 'Remove'}
                                </button>
                              </div>
                            ) : (
                              <motion.button
                                type="button"
                                className="cashbox-promo-card__apply-btn"
                                whileTap={{ scale: 0.97 }}
                                onClick={() => {
                                  if (onApplyPromo) {
                                    onApplyPromo(promo);
                                    onClose();
                                  }
                                }}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span>{t?.applyToOrder || 'Apply to Order'}</span>
                              </motion.button>
                            )}
                          </div>
                        )}

                        <div className="cashbox-promo-card__footer">
                          <span>{t?.activated || 'Activated:'} {formatDate(promo.activatedAt, lang)}</span>
                          <span className={isExpired ? 'cashbox-promo-card__date--expired' : ''}>
                            {t?.expires || 'Expires:'} {formatDate(promo.expiresAt, lang)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CashboxPromoModal;
