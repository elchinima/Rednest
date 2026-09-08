import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../../context/AuthContext';
import { ensureClientHintsHeaders } from '../../../utils/clientHints';
import { useLang } from '../../../utils/useLang';
import { getAuthTranslation } from './Lang';
import logo from '../../../assets/icons/rednest_logo.png';
import loaderIconRed from '../../../assets/icons/loader-animated-red.svg';
import './GoogleAuth.scss';

const GoogleAuth = () => {
  const lang = useLang();
  const t = (id) => getAuthTranslation(lang, id);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [status, setStatus] = useState('processing');
  const [errorMessage, setErrorMessage] = useState('');
  const exchangeAttempted = useRef(false);

  const apiUrl = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
      return;
    }

    if (exchangeAttempted.current) return;

    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (errorParam) {
      setStatus('error');
      setErrorMessage(errorDescription || 'Google authorization was canceled or denied.');
      return;
    }

    if (!code) {
      navigate('/login', { replace: true });
      return;
    }

    exchangeAttempted.current = true;

    const handleGoogleExchange = async () => {
      try {
        const clientHeaders = await ensureClientHintsHeaders();
        const redirectUri = `${window.location.origin}/google-auth`;

        const response = await fetch(`${apiUrl}/api/auth/google`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...clientHeaders,
          },
          body: JSON.stringify({
            code,
            redirectUri,
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (response.status === 404 || data.errorType === 'ACCOUNT_NOT_FOUND') {
            setStatus('account_not_found');
            setErrorMessage(data.message || 'Account not found. Please register first before signing in with Google.');
            return;
          }
          throw new Error(data.message || 'Failed to authenticate with Google. Please try again.');
        }

        localStorage.setItem('rednest_auth', 'true');
        if (data.user) {
          login(data.user);
        }
        navigate('/', { replace: true });
      } catch (err) {
        setStatus('error');
        setErrorMessage(err.message || 'An unexpected error occurred during Google sign-in.');
      }
    };

    handleGoogleExchange();
  }, [searchParams, navigate, isAuthenticated, login, apiUrl]);

  return (
    <motion.div
      className="google-auth-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="google-auth-card">
        <Link to="/" className="google-auth-brand">
          <img src={logo} alt="Rednest" className="google-auth-logo" />
        </Link>

        {status === 'processing' && (
          <div className="google-auth-state google-auth-state--processing">
            <div className="google-auth-spinner">
              <img src={loaderIconRed} alt="Processing..." />
            </div>
            <h2>{t('google_connecting_title')}</h2>
            <p>{t('google_connecting_desc')}</p>
          </div>
        )}

        {status === 'account_not_found' && (
          <div className="google-auth-state google-auth-state--not-found">
            <div className="google-auth-icon-badge google-auth-icon-badge--warning">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2>{t('google_not_found_title')}</h2>
            <p className="google-auth-error-desc">
              {errorMessage || t('google_not_found_desc')}
            </p>
            <div className="google-auth-actions">
              <Link to="/login" className="cta-btn google-auth-btn">
                {t('google_not_found_btn')}
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="google-auth-state google-auth-state--error">
            <div className="google-auth-icon-badge google-auth-icon-badge--danger">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h2>{t('google_error_title')}</h2>
            <p className="google-auth-error-desc">
              {errorMessage}
            </p>
            <div className="google-auth-actions">
              <Link to="/login" className="cta-btn google-auth-btn">
                {t('google_error_btn')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default GoogleAuth;
