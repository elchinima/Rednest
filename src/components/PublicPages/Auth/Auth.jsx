import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';

import logo from '../../../assets/icons/rednest_logo.png';
import loaderIconRed from '../../../assets/icons/loader-animated-red.svg';
import { useAuth } from '../../../context/AuthContext';
import { ensureClientHintsHeaders } from '../../../utils/clientHints';
import { useLang, setStoredLanguage } from '../../../utils/useLang';
import { getAuthTranslation } from './Lang';
import './Auth.scss';

const LoaderIcon = () => (
  <img src={loaderIconRed} alt="Loading..." style={{ width: '20px', height: '20px' }} />
);

const Auth = () => {
  const lang = useLang();
  const t = (id) => getAuthTranslation(lang, id);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [agree, setAgree] = useState(false);
  const [highlightAgree, setHighlightAgree] = useState(false);
  const agreeCheckboxRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successInfo, setSuccessInfo] = useState('');
  const [step, setStep] = useState('login');

  const [twoFactorDigits, setTwoFactorDigits] = useState(['', '', '', '']);
  const [twoFactorTimer, setTwoFactorTimer] = useState(900);
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotDigits, setForgotDigits] = useState(['', '', '', '', '', '', '']);
  const [forgotTimer, setForgotTimer] = useState(900);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const forgotRefs = [
    useRef(null), useRef(null), useRef(null), useRef(null),
    useRef(null), useRef(null), useRef(null)
  ];

  const { login, isAuthenticated, fetchCurrentUser } = useAuth();
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL || '';

  const handleLanguageChange = (newLang) => {
    setStoredLanguage(newLang);
  };

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
    let interval = null;
    if (step === 'forgot_reset') {
      interval = setInterval(() => {
        setForgotTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step]);

  useEffect(() => {
    let interval = null;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendCooldown]);

  useEffect(() => {
    if (step === '2fa' && inputRefs[0].current) {
      inputRefs[0].current.focus();
    }
  }, [step]);

  useEffect(() => {
    if (step === 'forgot_reset' && forgotRefs[0].current) {
      forgotRefs[0].current.focus();
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

  const handleForgotDigitChange = (index, value) => {
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal) {
      const nextDigits = [...forgotDigits];
      nextDigits[index] = '';
      setForgotDigits(nextDigits);
      return;
    }

    if (cleanVal.length > 1) {
      const pasted = cleanVal.slice(0, 7).split('');
      const nextDigits = [...forgotDigits];
      for (let i = 0; i < 7; i++) {
        nextDigits[i] = pasted[i] || '';
      }
      setForgotDigits(nextDigits);
      const focusIndex = Math.min(pasted.length, 6);
      forgotRefs[focusIndex].current?.focus();
      return;
    }

    const nextDigits = [...forgotDigits];
    nextDigits[index] = cleanVal.slice(-1);
    setForgotDigits(nextDigits);

    if (index < 6) {
      forgotRefs[index + 1].current?.focus();
    }
  };

  const handleForgotKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !forgotDigits[index] && index > 0) {
      forgotRefs[index - 1].current?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      forgotRefs[index - 1].current?.focus();
    } else if (e.key === 'ArrowRight' && index < 6) {
      forgotRefs[index + 1].current?.focus();
    }
  };

  const handleForgotPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 7);
    if (pastedData) {
      const nextDigits = ['', '', '', '', '', '', ''];
      for (let i = 0; i < pastedData.length; i++) {
        nextDigits[i] = pastedData[i];
      }
      setForgotDigits(nextDigits);
      const focusIndex = Math.min(pastedData.length, 6);
      forgotRefs[focusIndex].current?.focus();
    }
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!forgotEmail || !forgotEmail.includes('@')) {
      setError(t('auth_err_email'));
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessInfo('');

    try {
      const response = await fetch(`${apiUrl}/api/auth/forgot-password/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send reset code');
      }

      setStep('forgot_reset');
      setForgotDigits(['', '', '', '', '', '', '']);
      setForgotTimer(900);
      setResendCooldown(60);
      setSuccessInfo(t('auth_reset_code_sent'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendResetCode = async () => {
    if (loading || resendCooldown > 0) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/api/auth/forgot-password/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to resend code');
      }

      setForgotTimer(900);
      setResendCooldown(60);
      setSuccessInfo(t('auth_reset_code_sent'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    const code = forgotDigits.join('');
    if (code.length < 7) {
      setError(t('auth_err_code_7_length'));
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setError(t('auth_err_password_short'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('auth_err_password_mismatch'));
      return;
    }

    if (loading) return;
    setLoading(true);
    setError(null);
    setSuccessInfo('');

    try {
      const clientHeaders = await ensureClientHintsHeaders();
      const response = await fetch(`${apiUrl}/api/auth/forgot-password/reset`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...clientHeaders,
        },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          code,
          newPassword
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Password reset failed');
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

  const handleGoogleLogin = async () => {
    if (!agree) {
      setError(t('auth_err_agree'));
      setHighlightAgree(true);
      agreeCheckboxRef.current?.focus();
      setTimeout(() => setHighlightAgree(false), 1000);
      return;
    }
    if (loading) return;

    setLoading(true);
    setError(null);
    try {
      const redirectUri = `${window.location.origin}/google-auth`;
      const response = await fetch(`${apiUrl}/api/auth/google/url?redirect_uri=${encodeURIComponent(redirectUri)}`);
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Google authorization is currently unavailable');
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Failed to obtain Google authorization URL');
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    
    if (!agree) {
      setError(t('auth_err_agree'));
      setHighlightAgree(true);
      agreeCheckboxRef.current?.focus();
      return;
    }

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
      setError(t('auth_err_code_length'));
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
    
    if (!name.trim()) {
      setError(t('auth_err_name'));
      return;
    }

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
        <div className="auth-top-bar">
          <Link to="/" className="auth-back-link">
            &larr; {t('auth_back_home')}
          </Link>
          <div className="auth-lang-switcher">
            <select
              aria-label="Select language"
              value={lang}
              onChange={(e) => handleLanguageChange(e.target.value)}
            >
              <option value="az">Azərbaycan</option>
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
        
        <div className="auth-card-split">
          <div className="auth-card-left">
            <div className="auth-card-left-content">
              <Link to="/">
                <img src={logo} alt="Rednest" className="auth-brand-logo" />
              </Link>
              <h2>{t('auth_hero_title')}</h2>
              <p>{t('auth_hero_subtitle')}</p>
            </div>
          </div>
          
          <div className="auth-card-right">
            <div className="auth-header">
              <Link to="/" style={{ display: 'inline-block' }}>
                <img src={logo} alt="Rednest Logo" className="auth-logo mobile-only-logo" />
              </Link>
              <h2>
                {step === 'login' && t('auth_step_login_title')}
                {step === '2fa' && t('auth_step_2fa_title')}
                {step === 'name' && t('auth_step_name_title')}
                {step === 'forgot_email' && t('auth_step_forgot_title')}
                {step === 'forgot_reset' && t('auth_step_reset_title')}
              </h2>
              <p>
                {step === 'login' && t('auth_step_login_subtitle')}
                {step === '2fa' && `${t('auth_step_2fa_subtitle')} (${email})`}
                {step === 'name' && t('auth_step_name_subtitle')}
                {step === 'forgot_email' && t('auth_step_forgot_subtitle')}
                {step === 'forgot_reset' && `${t('auth_step_reset_subtitle')} (${forgotEmail})`}
              </p>
            </div>
            
            {step === 'login' && (
              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="input-group">
                  <label htmlFor="email">{t('auth_label_email')}</label>
                  <input 
                    type="email" 
                    id="email" 
                    name="email"
                    autoComplete="username email"
                    placeholder={t('auth_placeholder_email')} 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                </div>
                
                <div className="input-group">
                  <label htmlFor="password">{t('auth_label_password')}</label>
                  <input 
                    type="password" 
                    id="password" 
                    name="password"
                    autoComplete="current-password"
                    placeholder={t('auth_placeholder_password')} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                  />
                </div>
                
                <div className={`checkbox-group ${highlightAgree ? 'checkbox-group--highlight' : ''}`}>
                  <input 
                    ref={agreeCheckboxRef}
                    type="checkbox" 
                    id="agree" 
                    checked={agree}
                    onChange={(e) => {
                      setAgree(e.target.checked);
                      if (error && error.includes('Terms of Use')) {
                        setError(null);
                      }
                      if (highlightAgree) {
                        setHighlightAgree(false);
                      }
                    }}
                    required 
                  />
                  <label htmlFor="agree">
                    {t('auth_agree_terms')}{' '}
                    <Link to="/rules" className="terms-link">
                      {t('auth_terms_link')}
                    </Link>
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
                        ...
                      </span>
                    ) : t('auth_btn_continue')}
                  </button>

                  <button
                    type="button"
                    className="auth-google-btn"
                    title={!agree ? t('auth_err_agree') : t('auth_btn_google')}
                    aria-label="Sign in with Google"
                    onClick={handleGoogleLogin}
                    disabled={loading}
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
                    onClick={() => {
                      setForgotEmail(email || '');
                      setStep('forgot_email');
                      setError(null);
                      setSuccessInfo('');
                    }}
                  >
                    {lang === 'az' ? 'Şifrəni unutmusunuz?' : lang === 'en' ? 'Forgot password' : 'Забыли пароль?'}
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
                    <span>
                      {lang === 'az' ? 'Kodun vaxtı bitir:' : lang === 'en' ? 'Code expires in' : 'Код истекает через'}{' '}
                      <strong className="two-factor-timer">{formatTimer(twoFactorTimer)}</strong>
                    </span>
                  ) : (
                    <span className="two-factor-expired">
                      {lang === 'az' ? 'Kodun vaxtı bitdi. Yenisini istəyin.' : lang === 'en' ? 'Code has expired. Please request a new one.' : 'Срок действия кода истек. Запросите новый код.'}
                    </span>
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
                      ...
                    </span>
                  ) : t('auth_btn_verify')}
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
                    &larr; {lang === 'az' ? 'Girişə qayıt' : lang === 'en' ? 'Back to login' : 'Назад ко входу'}
                  </button>
                </div>
              </form>
            )}

            {step === 'name' && (
              <form className="auth-form" onSubmit={handleNameSubmit}>
                <div className="input-group">
                  <label htmlFor="name">{t('auth_label_name')}</label>
                  <input 
                    type="text" 
                    id="name" 
                    name="name"
                    autoComplete="name"
                    placeholder={t('auth_placeholder_name')} 
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
                      ...
                    </span>
                  ) : t('auth_btn_complete')}
                </button>
              </form>
            )}

            {step === 'forgot_email' && (
              <form className="auth-form" onSubmit={handleRequestReset}>
                <div className="input-group">
                  <label htmlFor="forgot-email">{t('auth_label_email')}</label>
                  <input 
                    type="email" 
                    id="forgot-email" 
                    name="email"
                    autoComplete="username email"
                    placeholder={t('auth_placeholder_email')} 
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required 
                    autoFocus
                  />
                </div>
                
                <div className="error-wrapper">
                  {error && <div className="auth-error">{error}</div>}
                </div>

                <button type="submit" className="cta-btn auth-submit-btn" disabled={loading || !forgotEmail.trim()}>
                  {loading ? (
                    <span className="auth-btn-loader">
                      <LoaderIcon />
                      ...
                    </span>
                  ) : t('auth_btn_send_code')}
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
                    &larr; {t('auth_btn_back_login')}
                  </button>
                </div>
              </form>
            )}

            {step === 'forgot_reset' && (
              <form className="auth-form" onSubmit={handleResetPassword}>
                <div className="input-group">
                  <label>{lang === 'az' ? '7 rəqəmli təsdiq kodu' : lang === 'en' ? '7-digit reset code' : '7-значный код сброса'}</label>
                  <div className="forgot-code-inputs" onPaste={handleForgotPaste}>
                    {forgotDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={forgotRefs[idx]}
                        type="text"
                        inputMode="numeric"
                        maxLength={7}
                        value={digit}
                        onChange={(e) => handleForgotDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleForgotKeyDown(idx, e)}
                        className="forgot-code-digit"
                        autoComplete="one-time-code"
                      />
                    ))}
                  </div>
                </div>

                <div className="two-factor-info">
                  {forgotTimer > 0 ? (
                    <span>
                      {lang === 'az' ? 'Kodun vaxtı bitir:' : lang === 'en' ? 'Code expires in' : 'Код истекает через'}{' '}
                      <strong className="two-factor-timer">{formatTimer(forgotTimer)}</strong>
                    </span>
                  ) : (
                    <span className="two-factor-expired">
                      {lang === 'az' ? 'Kodun vaxtı bitdi. Yenisini istəyin.' : lang === 'en' ? 'Code has expired. Please request a new one.' : 'Срок действия кода истек. Запросите новый код.'}
                    </span>
                  )}
                </div>

                <div className="input-group">
                  <label htmlFor="new-password">{t('auth_label_new_password')}</label>
                  <input
                    type="password"
                    id="new-password"
                    name="new-password"
                    autoComplete="new-password"
                    placeholder={t('auth_placeholder_new_password')}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="confirm-password">{t('auth_label_confirm_password')}</label>
                  <input
                    type="password"
                    id="confirm-password"
                    name="confirm-password"
                    autoComplete="new-password"
                    placeholder={t('auth_placeholder_confirm_password')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                {successInfo && (
                  <div className="two-factor-success">{successInfo}</div>
                )}

                <div className="error-wrapper">
                  {error && <div className="auth-error">{error}</div>}
                </div>

                <button 
                  type="submit" 
                  className="cta-btn auth-submit-btn" 
                  disabled={loading || forgotDigits.join('').length < 7 || !newPassword || !confirmPassword}
                >
                  {loading ? (
                    <span className="auth-btn-loader">
                      <LoaderIcon />
                      ...
                    </span>
                  ) : t('auth_btn_reset_password')}
                </button>

                <div className="two-factor-actions">
                  <button
                    type="button"
                    className="two-factor-resend-btn"
                    onClick={handleResendResetCode}
                    disabled={loading || resendCooldown > 0}
                  >
                    {resendCooldown > 0
                      ? `${t('auth_btn_resend_wait')} ${resendCooldown}s`
                      : t('auth_btn_resend')}
                  </button>

                  <button
                    type="button"
                    className="two-factor-back-btn"
                    onClick={() => {
                      setStep('forgot_email');
                      setError(null);
                      setSuccessInfo('');
                    }}
                  >
                    &larr; {lang === 'az' ? 'E-poçtu dəyiş' : lang === 'en' ? 'Change email' : 'Изменить email'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Auth;
