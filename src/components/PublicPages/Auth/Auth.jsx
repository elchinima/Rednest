import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';

import logo from '../../../assets/icons/rednest_logo.png';
import loaderIconRed from '../../../assets/icons/loader-animated-red.svg';
import { useAuth } from '../../../context/AuthContext';
import { ensureClientHintsHeaders } from '../../../utils/clientHints';
import './Auth.scss';

const LoaderIcon = () => (
  <img src={loaderIconRed} alt="Loading..." style={{ width: '20px', height: '20px' }} />
);

const Auth = () => {
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

  const { login, isAuthenticated, fetchCurrentUser } = useAuth();
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

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
        navigate('/', { replace: true });
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
        navigate('/', { replace: true });
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
        headers: { 
          'Content-Type': 'application/json'
        },
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
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      className="auth-page"
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      transition={{ duration: 0.25 }}
    >
      <div className="auth-overlay"></div>
      
      <div className="auth-container">
        <Link to="/" className="auth-back-link">
          &larr; Back to Home
        </Link>
        
        <div className="auth-card-split">
          <div className="auth-card-left">
            <div className="auth-card-left-content">
              <Link to="/">
                <img src={logo} alt="Rednest" className="auth-brand-logo" />
              </Link>
              <h2>Awaken Your Senses</h2>
              <p>Experience the rich, bold flavors of our premium coffee blends. Join our community today.</p>
            </div>
          </div>
          
          <div className="auth-card-right">
            <div className="auth-header">
              <Link to="/" style={{ display: 'inline-block' }}>
                <img src={logo} alt="Rednest Logo" className="auth-logo mobile-only-logo" />
              </Link>
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
              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="input-group">
                  <label htmlFor="email">Email</label>
                  <input 
                    type="email" 
                    id="email" 
                    name="email"
                    autoComplete="username email"
                    placeholder="Enter your email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                </div>
                
                <div className="input-group">
                  <label htmlFor="password">Password</label>
                  <input 
                    type="password" 
                    id="password" 
                    name="password"
                    autoComplete="current-password"
                    placeholder="Enter your password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                  />
                </div>
                
                <div className="checkbox-group">
                  <input 
                    type="checkbox" 
                    id="agree" 
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                    required 
                  />
                  <label htmlFor="agree">
                    I agree to the <Link to="/rules" className="terms-link">Terms of Use</Link>
                  </label>
                </div>
                
                <div className="error-wrapper">
                  {error && <div className="auth-error">{error}</div>}
                </div>

                <div className="auth-buttons-row">
                  <button type="submit" className="cta-btn auth-submit-btn" disabled={loading}>
                    {loading ? (
                      <span className="auth-btn-loader">
                        <LoaderIcon />
                        Processing...
                      </span>
                    ) : 'Continue'}
                  </button>

                  <button
                    type="button"
                    className="cta-btn auth-google-btn"
                    title="Sign in with Google"
                    aria-label="Sign in with Google"
                  >
                    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  </button>
                </div>

                <div className="auth-forgot-password-wrap">
                  <button
                    type="button"
                    className="auth-forgot-password-btn"
                  >
                    Forgot password
                  </button>
                </div>
              </form>
            )}

            {step === '2fa' && (
              <form className="auth-form" onSubmit={handleVerify2FA}>
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

                <div className="error-wrapper">
                  {error && <div className="auth-error">{error}</div>}
                </div>

                <button type="submit" className="cta-btn auth-submit-btn" disabled={loading || twoFactorDigits.join('').length < 4}>
                  {loading ? (
                    <span className="auth-btn-loader">
                      <LoaderIcon />
                      Verifying...
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
              <form className="auth-form" onSubmit={handleNameSubmit}>
                <div className="input-group">
                  <label htmlFor="name">Your Name</label>
                  <input 
                    type="text" 
                    id="name" 
                    name="name"
                    autoComplete="name"
                    placeholder="Enter your name" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required 
                    autoFocus
                  />
                </div>
                
                <div className="error-wrapper">
                  {error && <div className="auth-error">{error}</div>}
                </div>

                <button type="submit" className="cta-btn auth-submit-btn" disabled={loading}>
                  {loading ? (
                    <span className="auth-btn-loader">
                      <LoaderIcon />
                      Saving...
                    </span>
                  ) : 'Complete Registration'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Auth;
