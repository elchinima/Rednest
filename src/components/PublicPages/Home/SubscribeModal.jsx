import React, { useState, useEffect, useRef } from 'react';
import logo from '../../../assets/icons/rednest_logo.png';
import AnimatedModalWrapper from '../../Elements/AnimatedModalWrapper';
import './SubscribeModal.scss';

const LoaderIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g>
      <animateTransform attributeName="transform" type="rotate" values="0 24 24; 360 24 24" dur="1s" repeatCount="indefinite" />
      <circle cx="24" cy="24" r="16" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M24 8 A16 16 0 0 1 40 24" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </g>
  </svg>
);

const SubscribeModal = ({ isOpen, onClose, email, onSuccess }) => {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [timer, setTimer] = useState(900);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState('');
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  const apiUrl = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    let interval = null;
    if (isOpen) {
      setDigits(['', '', '', '']);
      setTimer(900);
      setResendCooldown(60);
      setError('');
      setSuccessInfo('');
      interval = setInterval(() => {
        setTimer((prev) => (prev > 0 ? prev - 1 : 0));
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRefs[0].current) {
      setTimeout(() => inputRefs[0].current?.focus(), 150);
    }
  }, [isOpen]);

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleDigitChange = (index, value) => {
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }

    if (cleanVal.length > 1) {
      const pasted = cleanVal.slice(0, 4).split('');
      const next = [...digits];
      for (let i = 0; i < 4; i++) {
        next[i] = pasted[i] || '';
      }
      setDigits(next);
      const focusIndex = Math.min(pasted.length, 3);
      inputRefs[focusIndex].current?.focus();
      return;
    }

    const next = [...digits];
    next[index] = cleanVal.slice(-1);
    setDigits(next);

    if (index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pastedData) {
      const next = ['', '', '', ''];
      for (let i = 0; i < pastedData.length; i++) {
        next[i] = pastedData[i];
      }
      setDigits(next);
      const focusIndex = Math.min(pastedData.length, 3);
      inputRefs[focusIndex].current?.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length < 4) {
      setError('Please enter the 4-digit code.');
      return;
    }

    if (loading) return;
    setLoading(true);
    setError('');
    setSuccessInfo('');

    try {
      const response = await fetch(`${apiUrl}/api/auth/subscribe/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Verification failed');
      }

      onSuccess(data.message || 'Successfully subscribed to the Rednest Club!');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setError('');
    setSuccessInfo('');

    try {
      const response = await fetch(`${apiUrl}/api/auth/subscribe/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to resend code');
      }

      setSuccessInfo('A new confirmation code has been sent to your email.');
      setResendCooldown(60);
      setTimer(900);
      setDigits(['', '', '', '']);
      inputRefs[0].current?.focus();
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <AnimatedModalWrapper isOpen={isOpen} onClose={onClose}>
      <div 
        className="subscribe-modal-content"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="subscribe-modal-close" onClick={onClose} aria-label="Close modal">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className="subscribe-modal-header">
          <img src={logo} alt="Rednest Logo" className="subscribe-modal-logo" />
          <h2>Join the Rednest Club</h2>
          <p>Enter the 4-digit confirmation code sent to <strong>{email}</strong></p>
        </div>

        <form className="subscribe-modal-form" onSubmit={handleVerify}>
          <div className="two-factor-inputs" onPaste={handlePaste}>
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={inputRefs[idx]}
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="two-factor-digit"
                autoComplete="one-time-code"
              />
            ))}
          </div>

          <div className="subscribe-timer-info">
            {timer > 0 ? (
              <span>Code expires in <strong className="timer-value">{formatTimer(timer)}</strong></span>
            ) : (
              <span className="timer-expired">Code has expired. Please request a new one.</span>
            )}
          </div>

          {successInfo && (
            <div className="subscribe-success-msg">{successInfo}</div>
          )}

          {error && (
            <div className="subscribe-error-msg">{error}</div>
          )}

          <button type="submit" className="cta-btn subscribe-submit-btn" disabled={loading || digits.join('').length < 4}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <LoaderIcon /> Confirming...
              </span>
            ) : 'Confirm Subscription'}
          </button>

          <div className="subscribe-modal-actions">
            <button
              type="button"
              className="subscribe-resend-btn"
              onClick={handleResend}
              disabled={resendCooldown > 0 || resending}
            >
              {resending ? 'Sending...' : resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
            </button>
          </div>
        </form>
      </div>
    </AnimatedModalWrapper>
  );
};

export default SubscribeModal;
