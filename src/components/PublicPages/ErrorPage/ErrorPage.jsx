import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import logo from '../../../assets/icons/rednest_logo.png';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import Footer from '../../Footer/Footer';
import { useAuth } from '../../../context/AuthContext';
import './ErrorPage.scss';

// Comprehensive catalog of standard HTTP status configurations
const HTTP_ERROR_REGISTRY = {
  400: {
    badge: '400 • Bad Request',
    badgeClass: 'error-badge--warning',
    title: 'Bad Request',
    desc: 'The server could not understand your request. Please verify your input and try again.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  401: {
    badge: '401 • Unauthorized',
    badgeClass: 'error-badge--auth',
    title: 'Authentication Required',
    desc: 'You need to be signed in with valid credentials to access this area.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  403: {
    badge: '403 • Forbidden',
    badgeClass: 'error-badge--danger',
    title: 'Access Denied',
    desc: "You don't have the required permissions to view or perform this action.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </svg>
    ),
  },
  404: {
    badge: '404 • Page Not Found',
    badgeClass: 'error-badge--404',
    title: 'Page Not Found',
    desc: 'The page or resource you are looking for might have been removed, had its name changed, or is temporarily unavailable.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
  },
  405: {
    badge: '405 • Method Not Allowed',
    badgeClass: 'error-badge--warning',
    title: 'Method Not Allowed',
    desc: 'The HTTP method used is not supported for the requested resource.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  408: {
    badge: '408 • Request Timeout',
    badgeClass: 'error-badge--warning',
    title: 'Request Timeout',
    desc: 'The server timed out waiting for the request to complete. Please check your network connection.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 14 14" />
      </svg>
    ),
  },
  409: {
    badge: '409 • Conflict',
    badgeClass: 'error-badge--warning',
    title: 'Request Conflict',
    desc: 'The request could not be completed due to a conflict with the current state of the resource.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  413: {
    badge: '413 • Payload Too Large',
    badgeClass: 'error-badge--warning',
    title: 'Payload Too Large',
    desc: 'The file or request payload sent exceeds the maximum allowed upload limit.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
  },
  422: {
    badge: '422 • Unprocessable',
    badgeClass: 'error-badge--warning',
    title: 'Unprocessable Content',
    desc: 'The request was well-formed but contained semantic errors that prevented processing.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  429: {
    badge: '429 • Slow Down',
    badgeClass: 'error-badge--429',
    title: 'Too Many Requests',
    desc: "You've sent too many requests in a short time. Please take a sip of coffee and wait a moment before trying again.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    defaultRetrySeconds: 30,
  },
  500: {
    badge: '500 • Server Error',
    badgeClass: 'error-badge--500',
    title: 'Internal Server Error',
    desc: 'Our server encountered an unexpected error. Our engineering team has been notified.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    defaultRetrySeconds: 10,
  },
  502: {
    badge: '502 • Bad Gateway',
    badgeClass: 'error-badge--server',
    title: 'Bad Gateway',
    desc: 'The server received an invalid response from the upstream gateway. Please try again momentarily.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
        <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
        <line x1="6" y1="6" x2="6.01" y2="6" />
        <line x1="6" y1="18" x2="6.01" y2="18" />
      </svg>
    ),
    defaultRetrySeconds: 10,
  },
  503: {
    badge: '503 • Service Unavailable',
    badgeClass: 'error-badge--server',
    title: 'Service Unavailable',
    desc: 'The server is temporarily unavailable or undergoing maintenance. We will be back online shortly.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
        <line x1="12" y1="2" x2="12" y2="12" />
      </svg>
    ),
    defaultRetrySeconds: 15,
  },
  504: {
    badge: '504 • Gateway Timeout',
    badgeClass: 'error-badge--server',
    title: 'Gateway Timeout',
    desc: 'The upstream server took too long to respond. Please refresh the page in a few moments.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 14 14" />
      </svg>
    ),
    defaultRetrySeconds: 10,
  },
};

const ErrorPage = ({ defaultCode = '429' }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, authLoading } = useAuth();

  const codeParam = searchParams.get('code') || defaultCode;
  const numCode = parseInt(codeParam, 10) || 500;

  // Fallback if status code is not explicitly in dictionary
  const fallbackConfig = {
    badge: `${numCode} • ${numCode >= 500 ? 'Server Error' : 'Request Error'}`,
    badgeClass: numCode >= 500 ? 'error-badge--server' : 'error-badge--warning',
    title: numCode >= 500 ? 'Server Error' : 'Unexpected Error',
    desc: 'An unexpected issue occurred while processing your request.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    defaultRetrySeconds: numCode === 429 ? 30 : 0,
  };

  const baseConfig = HTTP_ERROR_REGISTRY[numCode] || fallbackConfig;

  // Backend override: highest priority given to backend title/message
  const backendTitle = searchParams.get('title');
  const backendMessage = searchParams.get('message');

  const title = backendTitle || baseConfig.title;
  const description = backendMessage || baseConfig.desc;

  const retryParam = parseInt(searchParams.get('retry'), 10);
  const initialRetry = !isNaN(retryParam) && retryParam > 0
    ? retryParam
    : (baseConfig.defaultRetrySeconds || 0);

  const [timeLeft, setTimeLeft] = useState(initialRetry);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (initialRetry <= 0) return;

    setTimeLeft(initialRetry);
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [initialRetry, codeParam]);

  const handleRetry = () => {
    setIsRetrying(true);
    setTimeout(() => {
      navigate(-1);
    }, 600);
  };

  const progressPercent = initialRetry > 0
    ? Math.max(0, Math.min(100, ((initialRetry - timeLeft) / initialRetry) * 100))
    : 100;

  return (
    <motion.div
      className="error-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <header className="home-header">
        <div className="logo-container">
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src={logo} alt="Rednest Logo" className="logo" />
            <span className="brand-name">Rednest</span>
          </Link>
        </div>

        <div className={`nav-menu ${isMenuOpen ? 'open' : ''}`}>
          <nav className="nav-links">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/catalog" className="nav-link">Menu</Link>
          </nav>
          {authLoading ? (
            <span className="cta-btn sm no-hover" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default', pointerEvents: 'none' }}>
              <img src={loaderIcon} alt="Loading" style={{ width: '20px', height: '20px', filter: 'brightness(0)' }} />
            </span>
          ) : user ? (
            <Link to="/profile" className="cta-btn sm" style={{ textDecoration: 'none' }}>
              Hello, {user.name}
            </Link>
          ) : (
            <Link to="/login" className="cta-btn sm" style={{ textDecoration: 'none' }}>
              Log In
            </Link>
          )}
        </div>

        <div className={`menu-overlay ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(false)} />
        <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? '✕' : '☰'}
        </button>
      </header>

      <main className="error-main">
        <div className="error-ambient-bg" />

        <motion.div
          className="error-card"
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className={`error-badge ${baseConfig.badgeClass}`}>
            <span className="error-badge__dot" />
            <span>{baseConfig.badge}</span>
          </div>

          <div className="error-icon-wrapper">
            {baseConfig.icon}
          </div>

          <h1 className="error-code-title">{numCode}</h1>
          <h2 className="error-title">{title}</h2>
          <p className="error-description">{description}</p>

          {initialRetry > 0 && (
            <div className="error-countdown-container">
              <div className="error-countdown-header">
                <span>Cooldown active</span>
                <span className="countdown-timer-value">
                  {timeLeft > 0 ? `${timeLeft}s remaining` : 'Ready to retry'}
                </span>
              </div>
              <div className="error-countdown-bar-wrap">
                <div
                  className="error-countdown-bar-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          <div className="error-actions">
            <button
              type="button"
              className="cta-btn"
              onClick={handleRetry}
              disabled={timeLeft > 0 || isRetrying}
            >
              {isRetrying ? 'Retrying...' : (timeLeft > 0 ? `Wait ${timeLeft}s` : 'Try Again')}
            </button>

            <Link to="/" className="cta-btn secondary">
              Back to Home
            </Link>

            <Link to="/catalog" className="cta-btn secondary">
              Explore Menu
            </Link>
          </div>
        </motion.div>
      </main>

      <Footer />
    </motion.div>
  );
};

export default ErrorPage;
