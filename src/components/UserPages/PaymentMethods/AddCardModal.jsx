import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import AnimatedModalWrapper from '../../Elements/AnimatedModalWrapper';
import loaderIconRed from '../../../assets/icons/loader-animated-red.svg';
import './AddCardModal.scss';

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

export const getCardBrand = (digits) => {
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

const AddCardModal = ({ isOpen, onClose, onSave, loading }) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [cardName, setCardName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [agreedToRules, setAgreedToRules] = useState(false);

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    if (isOpen) {
      setCardNumber('');
      setExpiryDate('');
      setCvc('');
      setCardholderName('');
      setCardName('');
      setIsDefault(false);
      setAgreedToRules(false);
      setErrors({});
      setTouched({});
    }
  }, [isOpen]);

  const cleanDigits = useMemo(() => cardNumber.replace(/\D/g, ''), [cardNumber]);
  const brand = useMemo(() => getCardBrand(cleanDigits), [cleanDigits]);

  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const parts = raw.match(/[\s\S]{1,4}/g) || [];
    setCardNumber(parts.join(' '));
  };

  const handleExpiryChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
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

  const validate = () => {
    const newErrors = {};

    if (!cleanDigits) {
      newErrors.cardNumber = 'Card number is required.';
    } else if (cleanDigits.length < 16) {
      newErrors.cardNumber = 'Card number must be 16 digits.';
    } else if (!brand) {
      newErrors.cardNumber = 'Only Visa and Mastercard cards are supported.';
    } else if (!checkLuhn(cleanDigits)) {
      newErrors.cardNumber = 'Invalid card number checksum.';
    }

    if (!expiryDate) {
      newErrors.expiryDate = 'Expiry date is required.';
    } else if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
      newErrors.expiryDate = 'Format must be MM/YY.';
    } else {
      const [mStr, yStr] = expiryDate.split('/');
      const month = parseInt(mStr, 10);
      const year = parseInt(yStr, 10) + 2000;
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      if (month < 1 || month > 12) {
        newErrors.expiryDate = 'Month must be 01–12.';
      } else if (year < currentYear || (year === currentYear && month < currentMonth)) {
        newErrors.expiryDate = 'Card has expired.';
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

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched({
      cardNumber: true,
      expiryDate: true,
      cvc: true,
      cardholderName: true,
      agreedToRules: true,
    });

    if (!validate()) return;

    onSave({
      cardNumber: cleanDigits,
      expiryDate: expiryDate.trim(),
      cvc: cvc.trim(),
      cardholderName: cardholderName.trim(),
      cardName: cardName.trim() || undefined,
      isDefault,
    });
  };

  const isFormValid = cleanDigits.length === 16 && brand && expiryDate.length === 5 && cvc.length === 3 && agreedToRules;

  return (
    <AnimatedModalWrapper
      isOpen={isOpen}
      onClose={() => !loading && onClose()}
      targetBorderRadius="24px"
    >
      <div className="add-card-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="add-card-modal__close-btn"
          onClick={onClose}
          disabled={loading}
          aria-label="Close modal"
        >
          ✕
        </button>

        <div className="add-card-modal__header">
          <div className="add-card-modal__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
          </div>
          <div>
            <h3 className="add-card-modal__title">Add Payment Card</h3>
            <p className="add-card-modal__subtitle">Enter your Visa or Mastercard details</p>
          </div>
        </div>

        <div className={`card-preview ${brand ? `card-preview--${brand.toLowerCase()}` : ''}`}>
          <div className="card-preview__top">
            <div className="card-preview__chip">
              <div className="card-preview__chip-lines" />
            </div>
            <div className="card-preview__contactless">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M8.5 16.5a5 5 0 0 1 0-9" />
                <path d="M12 19a8.5 8.5 0 0 1 0-14" />
                <path d="M15.5 21.5a12 12 0 0 1 0-19" />
              </svg>
            </div>
            <div className="card-preview__brand-badge">
              {brand === 'Visa' && <span className="brand-logo brand-logo--visa">VISA</span>}
              {brand === 'Mastercard' && (
                <div className="brand-logo--mc">
                  <span className="mc-circle mc-circle--red" />
                  <span className="mc-circle mc-circle--yellow" />
                </div>
              )}
              {!brand && <span className="brand-logo--generic">CARD</span>}
            </div>
          </div>

          <div className="card-preview__number">
            {cardNumber || '•••• •••• •••• ••••'}
          </div>

          <div className="card-preview__bottom">
            <div className="card-preview__holder">
              <span className="card-preview__label">CARDHOLDER</span>
              <span className="card-preview__val">{cardholderName || 'NAME SURNAME'}</span>
            </div>
            <div className="card-preview__expires">
              <span className="card-preview__label">EXPIRES</span>
              <span className="card-preview__val">{expiryDate || 'MM/YY'}</span>
            </div>
          </div>
        </div>

        <form className="add-card-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="card-number">Card Number</label>
            <div className="input-with-brand">
              <input
                id="card-number"
                type="text"
                inputMode="numeric"
                placeholder="4123 4567 8901 2345"
                value={cardNumber}
                onChange={handleCardNumberChange}
                onBlur={() => handleBlur('cardNumber')}
                className={`form-input ${touched.cardNumber && errors.cardNumber ? 'error' : ''}`}
                autoComplete="cc-number"
                disabled={loading}
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
              <label htmlFor="card-expiry">Expiry Date</label>
              <input
                id="card-expiry"
                type="text"
                inputMode="numeric"
                placeholder="MM/YY"
                value={expiryDate}
                onChange={handleExpiryChange}
                onBlur={() => handleBlur('expiryDate')}
                className={`form-input ${touched.expiryDate && errors.expiryDate ? 'error' : ''}`}
                autoComplete="cc-exp"
                disabled={loading}
              />
              {touched.expiryDate && errors.expiryDate && (
                <span className="error-text">{errors.expiryDate}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="card-cvc">CVC / CVV</label>
              <input
                id="card-cvc"
                type="password"
                inputMode="numeric"
                placeholder="•••"
                value={cvc}
                onChange={handleCvcChange}
                onBlur={() => handleBlur('cvc')}
                className={`form-input ${touched.cvc && errors.cvc ? 'error' : ''}`}
                autoComplete="cc-csc"
                disabled={loading}
              />
              {touched.cvc && errors.cvc && (
                <span className="error-text">{errors.cvc}</span>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="cardholder-name">Cardholder (Optional)</label>
              <input
                id="cardholder-name"
                type="text"
                placeholder="e.g. ELCHIN"
                value={cardholderName}
                onChange={handleCardholderChange}
                onBlur={() => handleBlur('cardholderName')}
                className="form-input"
                autoComplete="cc-name"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="card-label">Card Label (Optional)</label>
              <input
                id="card-label"
                type="text"
                placeholder="e.g. Salary Card"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                className="form-input"
                disabled={loading}
              />
            </div>
          </div>

          <div className="checkboxes-row">
            <label className="custom-checkbox-label">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                disabled={loading}
              />
              <span className="checkbox-box" />
              <span className="checkbox-text">Set as default</span>
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
                disabled={loading}
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

          <div className="add-card-modal__actions">
            <button
              type="button"
              className="cta-btn secondary sm"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="cta-btn primary sm"
              disabled={loading || !isFormValid}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff6b6b' }}>
                  <img src={loaderIconRed} alt="Saving" style={{ width: '16px', height: '16px' }} />
                  Saving Card...
                </span>
              ) : 'Add Card'}
            </button>
          </div>
        </form>
      </div>
    </AnimatedModalWrapper>
  );
};

export default AddCardModal;
