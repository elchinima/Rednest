import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import logo from '../../../assets/icons/rednest_logo.png';
import AnimatedModalWrapper from '../../Elements/AnimatedModalWrapper';
import { useAuth } from '../../../context/AuthContext';
import { ensureClientHintsHeaders } from '../../../utils/clientHints';
import './AuthModal.scss';

const LoaderIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g>
      <animateTransform attributeName="transform" type="rotate" values="0 24 24; 360 24 24" dur="1s" repeatCount="indefinite" />
      <circle cx="24" cy="24" r="16" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M24 8 A16 16 0 0 1 40 24" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </g>
  </svg>
);

const AuthModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successInfo, setSuccessInfo] = useState('');
  const [step, setStep] = useState('login');
  
  const [twoFactorDigits, setTwoFactorDigits] = useState(['', '', '', '']);
  const [twoFactorTimer, setTwoFactorTimer] = useState(900);
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  const { login, fetchCurrentUser } = useAuth();
  const apiUrl = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    let interval = null;
    if (step === '2fa') {
      interval = setInterval(() => {
        setTwoFactorTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step]);

  useEffect(() => {
    if (step === '2fa' && inputRefs[0].current) {
      inputRefs[0].current.focus();
    }
  }, [step]);

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleDigitChange = (index, value) => {
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal) {
      const nextDigits = [...twoFactorDigits];
      nextDigits[index] = '';
      setTwoFactorDigits(nextDigits);
      return;
    }

    if (cleanVal.length > 1) {
      const pasted = cleanVal.slice(0, 4).split('');
      const nextDigits = [...twoFactorDigits];
      for (let i = 0; i < 4; i++) {
        nextDigits[i] = pasted[i] || '';
      }
      setTwoFactorDigits(nextDigits);
      const focusIndex = Math.min(pasted.length, 3);
      inputRefs[focusIndex].current?.focus();
      return;
    }

    const nextDigits = [...twoFactorDigits];
    nextDigits[index] = cleanVal.slice(-1);
    setTwoFactorDigits(nextDigits);

    if (index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !twoFactorDigits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pastedData) {
      const nextDigits = ['', '', '', ''];
      for (let i = 0; i < pastedData.length; i++) {
        nextDigits[i] = pastedData[i];
      }
      setTwoFactorDigits(nextDigits);
      const focusIndex = Math.min(pastedData.length, 3);
      inputRefs[focusIndex].current?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    setError(null);
    setSuccessInfo('');

    try {
      const clientHeaders = await ensureClientHintsHeaders();
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          ...clientHeaders,
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authorization / Registration Error');
      }

      if (data.requires2FA) {
        setStep('2fa');
        setTwoFactorDigits(['', '', '', '']);
        setTwoFactorTimer(900);
        setResendCooldown(60);
      } else if (!data.hasName) {
        setStep('name');
      } else {
        localStorage.setItem('rednest_auth', 'true');
        if (data.user) {
          login(data.user);
        } else {
          await fetchCurrentUser();
        }
        onClose();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    const code = twoFactorDigits.join('');
    if (code.length < 4) {
      setError('Please enter the full 4-digit code.');
      return;
    }

    if (loading) return;
    setLoading(true);
    setError(null);
    setSuccessInfo('');

    try {
      const clientHeaders = await ensureClientHintsHeaders();
      const response = await fetch(`${apiUrl}/api/auth/2fa/verify`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...clientHeaders,
        },
        body: JSON.stringify({ email, code })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Verification failed');
      }

      if (!data.hasName) {
        setStep('name');
      } else {
        localStorage.setItem('rednest_auth', 'true');
        if (data.user) {
          login(data.user);
        } else {
          await fetchCurrentUser();
        }
        onClose();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNameSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/api/auth/name`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update name');
      }

      const data = await response.json().catch(() => ({}));
      localStorage.setItem('rednest_auth', 'true');
      if (data && (data.name || data.Name)) {
        login(data);
      } else {
        await fetchCurrentUser();
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedModalWrapper isOpen={isOpen} onClose={onClose}>
      <div 
        className="auth-modal-content"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="auth-modal-close" onMouseDown={onClose} onClick={onClose} aria-label="Close modal">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        
        <div className="auth-modal-header">
          <img src={logo} alt="Rednest Logo" className="auth-modal-logo" />
          <h2>
            {step === 'login' && 'Welcome to Rednest'}
            {step === '2fa' && 'Two-Factor Authentication'}
            {step === 'name' && 'Welcome to Rednest'}
          </h2>
          <p>
            {step === 'login' && 'Enter your email and password to log in or create a new account.'}
            {step === '2fa' && `Enter the 4-digit code sent to ${email}`}
            {step === 'name' && 'Almost there! Enter your name to complete registration.'}
          </p>
        </div>
        
        {step === 'login' && (
          <form className="auth-modal-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="modal-email">Email</label>
              <input 
                type="email" 
                id="modal-email" 
                placeholder="Enter your email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            
            <div className="input-group">
              <label htmlFor="modal-password">Password</label>
              <input 
                type="password" 
                id="modal-password" 
                placeholder="Enter your password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
            
            <div className="checkbox-group">
              <input 
                type="checkbox" 
                id="modal-agree" 
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                required 
              />
              <label htmlFor="modal-agree">
                I agree to the <Link to="/rules" onClick={onClose} className="terms-link">Terms of Use</Link>
              </label>
            </div>

            {error && (
              <div className="auth-modal-error">{error}</div>
            )}
            
            <button type="submit" className="cta-btn auth-modal-submit-btn" disabled={loading}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <LoaderIcon /> Processing...
                </span>
              ) : 'Continue'}
            </button>
          </form>
        )}

        {step === '2fa' && (
          <form className="auth-modal-form" onSubmit={handleVerify2FA}>
            <div className="two-factor-inputs" onPaste={handlePaste}>
              {twoFactorDigits.map((digit, idx) => (
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

            <div className="two-factor-info">
              {twoFactorTimer > 0 ? (
                <span>Code expires in <strong className="two-factor-timer">{formatTimer(twoFactorTimer)}</strong></span>
              ) : (
                <span className="two-factor-expired">Code has expired. Please request a new one.</span>
              )}
            </div>

            {successInfo && (
              <div className="two-factor-success">{successInfo}</div>
            )}

            {error && (
              <div className="auth-modal-error">{error}</div>
            )}

            <button type="submit" className="cta-btn auth-modal-submit-btn" disabled={loading || twoFactorDigits.join('').length < 4}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <LoaderIcon /> Verifying...
                </span>
              ) : 'Verify & Sign In'}
            </button>

            <div className="two-factor-actions">
              <button
                type="button"
                className="two-factor-back-btn"
                onClick={() => {
                  setStep('login');
                  setError(null);
                  setSuccessInfo('');
                }}
              >
                &larr; Back to login
              </button>
            </div>
          </form>
        )}

        {step === 'name' && (
          <form className="auth-modal-form" onSubmit={handleNameSubmit}>
            <div className="input-group">
              <label htmlFor="modal-name">Your Name</label>
              <input 
                type="text" 
                id="modal-name" 
                placeholder="Enter your name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required 
                autoFocus
              />
            </div>

            {error && (
              <div className="auth-modal-error">{error}</div>
            )}
            
            <button type="submit" className="cta-btn auth-modal-submit-btn" disabled={loading}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <LoaderIcon /> Saving...
                </span>
              ) : 'Complete Registration'}
            </button>
          </form>
        )}
      </div>
    </AnimatedModalWrapper>
  );
};

export default AuthModal;
