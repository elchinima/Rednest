import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import loaderIconRed from '../../../assets/icons/loader-animated-red.svg';
import featureCardVisaMcIcon from '../../../assets/icons/feature-card-visa-mc.svg';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';
import AnimatedModalWrapper from '../../Elements/AnimatedModalWrapper';
import PaymentErrorModal from '../PaymentMethods/PaymentErrorModal';
import './StripePaymentModal.scss';

const checkLuhn = (numStr) => {
  let sum = 0;
  let alternate = false;
  for (let i = numStr.length - 1; i >= 0; i--) {
    let n = parseInt(numStr.charAt(i), 10);
    if (isNaN(n)) return false;
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
};

const getCardBrand = (digits) => {
  if (!digits) return null;
  if (digits.startsWith('4')) return 'Visa';
  if (digits.length >= 2) {
    const firstTwo = parseInt(digits.slice(0, 2), 10);
    if (firstTwo >= 51 && firstTwo <= 55) return 'Mastercard';
  }
  if (digits.length >= 4) {
    const firstFour = parseInt(digits.slice(0, 4), 10);
    if (firstFour >= 2221 && firstFour <= 2720) return 'Mastercard';
  }
  return null;
};

const StripePaymentModal = ({
  isOpen,
  onClose,
  serviceId,
  finalAmount,
  promoCode,
  onOrderSuccess,
}) => {
  const [savedCards, setSavedCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [viewMode, setViewMode] = useState('select');
  const [selectedCardId, setSelectedCardId] = useState(null);

  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [cardName, setCardName] = useState('');
  const [saveCard, setSaveCard] = useState(true);
  const [agreedToRules, setAgreedToRules] = useState(false);

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || '';

  const fetchCards = async () => {
    setLoadingCards(true);
    try {
      let res = await fetchWithRefresh(`${apiUrl}/api/payment-methods`);
      if (!res.ok && res.status === 404) {
        res = await fetchWithRefresh(`${apiUrl}/api/paymentmethods`);
      }
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setSavedCards(list);
        if (list.length > 0) {
          const def = list.find((c) => c.isDefault || c.IsDefault) || list[0];
          setSelectedCardId(def.id || def.Id);
          setViewMode('select');
        } else {
          setViewMode('new');
        }
      } else {
        setViewMode('new');
      }
    } catch {
      setViewMode('new');
    } finally {
      setLoadingCards(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCardNumber('');
      setExpiryDate('');
      setCvc('');
      setCardholderName('');
      setCardName('');
      setSaveCard(true);
      setAgreedToRules(false);
      setErrors({});
      setTouched({});
      setErrorMessage('');
      setIsProcessing(false);
      fetchCards();
    }
  }, [isOpen]);

  const cleanDigits = useMemo(() => cardNumber.replace(/\D/g, ''), [cardNumber]);
  const brand = useMemo(() => getCardBrand(cleanDigits), [cleanDigits]);

  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 2) {
      raw = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    }
    setExpiryDate(raw);
  };

  const handleCvcChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 3);
    setCvc(raw);
  };

  const handleCardholderChange = (e) => {
    const val = e.target.value.toUpperCase();
    setCardholderName(val);
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const validateNewCardForm = () => {
    const newErrors = {};

    if (!cleanDigits) {
      newErrors.cardNumber = 'Card number is required.';
    } else if (cleanDigits.length !== 16) {
      newErrors.cardNumber = 'Card number must be 16 digits.';
    } else if (!checkLuhn(cleanDigits)) {
      newErrors.cardNumber = 'Invalid card number.';
    } else if (!brand) {
      newErrors.cardNumber = 'Only Visa and Mastercard are accepted.';
    }

    if (!expiryDate) {
      newErrors.expiryDate = 'Expiry date is required.';
    } else if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
      newErrors.expiryDate = 'Format must be MM/YY.';
    } else {
      const [m, y] = expiryDate.split('/').map((x) => parseInt(x, 10));
      if (m < 1 || m > 12) {
        newErrors.expiryDate = 'Invalid month.';
      } else {
        const now = new Date();
        const currentYear = now.getFullYear() % 100;
        const currentMonth = now.getMonth() + 1;
        if (y < currentYear || (y === currentYear && m < currentMonth)) {
          newErrors.expiryDate = 'Card has expired.';
        }
      }
    }

    if (!cvc) {
      newErrors.cvc = 'CVC is required.';
    } else if (cvc.length !== 3) {
      newErrors.cvc = 'Must be 3 digits.';
    }

    if (cardholderName && cardholderName.trim().length < 3) {
      newErrors.cardholderName = 'Please enter a valid cardholder name.';
    }

    if (!agreedToRules) {
      newErrors.agreedToRules = 'You must agree to the payment rules.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePayWithSavedCard = async (e) => {
    e.preventDefault();
    if (!selectedCardId || isProcessing) return;

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/orders/cashier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: 'OnlineCardDetails',
          promoCode,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onOrderSuccess(data);
      } else {
        const msg = data.message || 'Payment failed. Please try again.';
        setErrorMessage(msg);
        setIsErrorModalOpen(true);
      }
    } catch (err) {
      const msg = err.message || 'Payment processing error.';
      setErrorMessage(msg);
      setIsErrorModalOpen(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayWithNewCard = async (e) => {
    e.preventDefault();
    setTouched({
      cardNumber: true,
      expiryDate: true,
      cvc: true,
      cardholderName: true,
      agreedToRules: true,
    });

    if (!validateNewCardForm() || isProcessing) return;

    setIsProcessing(true);
    setErrorMessage('');

    try {
      if (saveCard) {
        if (savedCards.length >= 3) {
          setErrorMessage('You can only save up to 3 payment cards. Please uncheck "Save card" or delete an existing card.');
          setIsErrorModalOpen(true);
          setIsProcessing(false);
          return;
        }

        try {
          const saveRes = await fetchWithRefresh(`${apiUrl}/api/payment-methods`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cardNumber: cleanDigits,
              expiryDate: expiryDate.trim(),
              cvc: cvc.trim(),
              cardholderName: cardholderName.trim(),
              cardName: cardName.trim() || undefined,
              isDefault: savedCards.length === 0,
            }),
          });

          if (!saveRes.ok) {
            const errData = await saveRes.json().catch(() => ({}));
            if (errData.message) {
              setErrorMessage(errData.message);
              setIsErrorModalOpen(true);
              setIsProcessing(false);
              return;
            }
          }
        } catch (saveErr) {
          console.error('Failed to save card:', saveErr);
        }
      }

      const orderRes = await fetchWithRefresh(`${apiUrl}/api/orders/cashier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: 'OnlineCardDetails',
          promoCode,
        }),
      });

      const orderData = await orderRes.json();
      if (orderRes.ok && orderData.success) {
        onOrderSuccess(orderData);
      } else {
        const msg = orderData.message || 'Payment failed. Please check your card information.';
        setErrorMessage(msg);
        setIsErrorModalOpen(true);
      }
    } catch (err) {
      const msg = err.message || 'An error occurred during payment processing.';
      setErrorMessage(msg);
      setIsErrorModalOpen(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const isNewCardValid = cleanDigits.length === 16 && brand && expiryDate.length === 5 && cvc.length === 3 && agreedToRules;

  return (
    <>
      <AnimatedModalWrapper isOpen={isOpen} onClose={onClose} targetBorderRadius="24px">
        <div className="stripe-modal" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="stripe-modal__close"
            onClick={onClose}
            disabled={isProcessing}
            aria-label="Close modal"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <div className="stripe-modal__header">
            <div className="stripe-modal__icon">
              <img src={featureCardVisaMcIcon} alt="Card Payment" />
            </div>
            <h3 className="stripe-modal__title">Card & Online Payment</h3>
            <p className="stripe-modal__desc">
              Amount to pay: <span className="stripe-modal__amount">{finalAmount} ₼</span>
            </p>
          </div>

          {loadingCards ? (
            <div className="stripe-modal__loading">
              <img src={loaderIcon} alt="Loading" className="stripe-spinner-lg" />
              <p>Loading payment options...</p>
            </div>
          ) : viewMode === 'select' && savedCards.length > 0 ? (
            <form onSubmit={handlePayWithSavedCard} className="saved-cards-form">
              <div className="saved-cards-header-row">
                <span className="saved-cards-header-title">Select Saved Card</span>
                <button
                  type="button"
                  className="add-new-card-link-btn"
                  onClick={() => setViewMode('new')}
                  disabled={isProcessing}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Use New Card</span>
                </button>
              </div>

              <div className="saved-cards-list">
                {savedCards.map((card) => {
                  const id = card.id || card.Id;
                  const isSelected = selectedCardId === id;
                  const isDef = card.isDefault || card.IsDefault;
                  const cardBrand = (card.cardBrand || card.CardBrand || 'Card').toLowerCase();
                  const last4 = id ? String(id).padStart(4, '0') : '••••';
                  const title = card.cardName || card.CardName || (cardBrand === 'visa' ? 'Visa Card' : cardBrand === 'mastercard' ? 'Mastercard' : 'Bank Card');
                  const expiry = card.expiryDate || card.ExpiryDate || 'MM/YY';

                  return (
                    <div
                      key={id}
                      className={`saved-card-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedCardId(id)}
                    >
                      <div className="saved-card-item__radio">
                        <span className={`saved-card-radio-circle ${isSelected ? 'active' : ''}`}>
                          {isSelected && <span className="saved-card-radio-dot" />}
                        </span>
                      </div>

                      <div className={`saved-card-item__icon-badge saved-card-item__icon-badge--${cardBrand}`}>
                        {cardBrand === 'visa' ? 'VISA' : cardBrand === 'mastercard' ? 'MC' : 'CARD'}
                      </div>

                      <div className="saved-card-item__info">
                        <div className="saved-card-item__title-row">
                          <span className="saved-card-item__title">{title}</span>
                          {isDef && <span className="saved-card-item__badge-default">DEFAULT</span>}
                        </div>
                        <div className="saved-card-item__sub-row">
                          <span className="saved-card-item__number">•••• {last4}</span>
                          <span className="saved-card-item__expiry">{expiry}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="stripe-checkout-actions">
                <button
                  type="button"
                  className="cta-btn sm stripe-modal-btn stripe-modal-btn--cancel"
                  onClick={onClose}
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cta-btn sm stripe-modal-btn stripe-modal-btn--submit"
                  disabled={!selectedCardId || isProcessing}
                >
                  {isProcessing ? (
                    <span className="stripe-btn-loading">
                      <img src={loaderIconRed} alt="Loading" className="stripe-spinner" />
                      Processing...
                    </span>
                  ) : (
                    `Pay ${finalAmount} ₼`
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handlePayWithNewCard} className="new-card-form" noValidate>
              {savedCards.length > 0 && (
                <button
                  type="button"
                  className="back-to-saved-link"
                  onClick={() => setViewMode('select')}
                  disabled={isProcessing}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  <span>Choose from saved cards</span>
                </button>
              )}

              <div className="form-group">
                <label htmlFor="checkout-card-number">Card Number</label>
                <div className="input-with-brand">
                  <input
                    id="checkout-card-number"
                    type="text"
                    inputMode="numeric"
                    placeholder="4123 4567 8901 2345"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    onBlur={() => handleBlur('cardNumber')}
                    className={`form-input ${touched.cardNumber && errors.cardNumber ? 'error' : ''}`}
                    autoComplete="cc-number"
                    disabled={isProcessing}
                  />
                  <div className="brand-indicator">
                    {brand === 'Visa' && <span className="badge-visa">VISA</span>}
                    {brand === 'Mastercard' && <span className="badge-mc">MC</span>}
                  </div>
                </div>
                {touched.cardNumber && errors.cardNumber && (
                  <span className="error-text">{errors.cardNumber}</span>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="checkout-card-expiry">Expiry Date</label>
                  <input
                    id="checkout-card-expiry"
                    type="text"
                    inputMode="numeric"
                    placeholder="MM/YY"
                    value={expiryDate}
                    onChange={handleExpiryChange}
                    onBlur={() => handleBlur('expiryDate')}
                    className={`form-input ${touched.expiryDate && errors.expiryDate ? 'error' : ''}`}
                    autoComplete="cc-exp"
                    disabled={isProcessing}
                  />
                  {touched.expiryDate && errors.expiryDate && (
                    <span className="error-text">{errors.expiryDate}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="checkout-card-cvc">CVC / CVV</label>
                  <input
                    id="checkout-card-cvc"
                    type="password"
                    inputMode="numeric"
                    placeholder="•••"
                    value={cvc}
                    onChange={handleCvcChange}
                    onBlur={() => handleBlur('cvc')}
                    className={`form-input ${touched.cvc && errors.cvc ? 'error' : ''}`}
                    autoComplete="cc-csc"
                    disabled={isProcessing}
                  />
                  {touched.cvc && errors.cvc && (
                    <span className="error-text">{errors.cvc}</span>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="checkout-cardholder-name">Cardholder (Optional)</label>
                  <input
                    id="checkout-cardholder-name"
                    type="text"
                    placeholder="e.g. ELCHIN"
                    value={cardholderName}
                    onChange={handleCardholderChange}
                    onBlur={() => handleBlur('cardholderName')}
                    className="form-input"
                    autoComplete="cc-name"
                    disabled={isProcessing}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="checkout-card-label">Card Label (Optional)</label>
                  <input
                    id="checkout-card-label"
                    type="text"
                    placeholder="e.g. Salary Card"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="form-input"
                    disabled={isProcessing}
                  />
                </div>
              </div>

              <div className="checkboxes-row">
                <label className="custom-checkbox-label">
                  <input
                    type="checkbox"
                    checked={saveCard}
                    onChange={(e) => setSaveCard(e.target.checked)}
                    disabled={isProcessing}
                  />
                  <span className="checkbox-box" />
                  <span className="checkbox-text">Save card for future payments</span>
                </label>

                <label className="custom-checkbox-label terms-label">
                  <input
                    type="checkbox"
                    checked={agreedToRules}
                    onChange={(e) => {
                      setAgreedToRules(e.target.checked);
                      if (e.target.checked) {
                        setErrors((prev) => ({ ...prev, agreedToRules: null }));
                      }
                    }}
                    disabled={isProcessing}
                  />
                  <span className="checkbox-box" />
                  <span className="checkbox-text">
                    Agree to{' '}
                    <Link to="/rules" target="_blank" rel="noopener noreferrer" className="terms-link">
                      Payment Rules
                    </Link>
                  </span>
                </label>
              </div>
              {touched.agreedToRules && errors.agreedToRules && (
                <span className="error-text" style={{ marginTop: '-4px', display: 'block' }}>{errors.agreedToRules}</span>
              )}

              <div className="stripe-checkout-actions">
                <button
                  type="button"
                  className="cta-btn sm stripe-modal-btn stripe-modal-btn--cancel"
                  onClick={onClose}
                  disabled={isProcessing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cta-btn sm stripe-modal-btn stripe-modal-btn--submit"
                  disabled={!isNewCardValid || isProcessing}
                >
                  {isProcessing ? (
                    <span className="stripe-btn-loading">
                      <img src={loaderIconRed} alt="Loading" className="stripe-spinner" />
                      Processing...
                    </span>
                  ) : (
                    `Pay ${finalAmount} ₼`
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </AnimatedModalWrapper>

      <PaymentErrorModal
        isOpen={isErrorModalOpen}
        onClose={() => setIsErrorModalOpen(false)}
        message={errorMessage}
        title="Payment Error"
      />
    </>
  );
};

export default StripePaymentModal;
