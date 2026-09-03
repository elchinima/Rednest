import React, { useState, useEffect, useRef } from 'react';
import AnimatedModalWrapper from './AnimatedModalWrapper';
import logo from '../../assets/icons/rednest_logo.png';
import loaderIconRed from '../../assets/icons/loader-animated-red.svg';
import { fetchWithRefresh } from '../../utils/fetchWithRefresh';
import './ProfilePasswordModal.scss';

const EyeIcon = ({ visible }) => (
  visible ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
);

const ProfilePasswordModal = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'Security Check',
  description = 'Enter your account password to access Profile settings.',
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      setShowPassword(false);
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (loading) return;
    setError('');
    setPassword('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!password.trim()) {
      setError('Please enter your account password.');
      if (inputRef.current) inputRef.current.focus();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetchWithRefresh(`${apiUrl}/api/auth/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        skipAuthRedirect: true,
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setPassword('');
        setError('');
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError(data.message || 'Incorrect password. Please try again.');
        if (inputRef.current) {
          inputRef.current.select();
        }
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedModalWrapper isOpen={isOpen} onClose={handleClose} targetBorderRadius="24px">
      <div className="profile-auth-card-split" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="profile-auth-close-btn"
          onClick={handleClose}
          disabled={loading}
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="profile-auth-card-left">
          <div className="profile-auth-card-left__content">
            <img src={logo} alt="Rednest" className="profile-auth-card-left__logo" />
            <h2>Rednest</h2>
            <p>Confirm your password to securely access your personal details and account settings.</p>
          </div>
        </div>

        <div className="profile-auth-card-right">
          <div className="profile-auth-header">
            <img src={logo} alt="Rednest" className="profile-auth-header__mobile-logo" />
            <h2>{title}</h2>
            <p>{description}</p>
          </div>

          <form onSubmit={handleSubmit} className="profile-auth-form" noValidate>
            <div className="profile-auth-input-group">
              <label htmlFor="profile-auth-password">Password</label>
              <div className="profile-auth-input-wrap">
                <input
                  ref={inputRef}
                  id="profile-auth-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  className={error ? 'has-error' : ''}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="profile-auth-toggle-pwd"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon visible={showPassword} />
                </button>
              </div>
            </div>

            {error && (
              <div className="profile-auth-error" role="alert">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="profile-auth-actions">
              <button
                type="button"
                className="profile-auth-cancel-btn"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="profile-auth-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <img
                    src={loaderIconRed}
                    alt="Loading..."
                    className="profile-auth-btn-spinner"
                  />
                ) : (
                  'Continue'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AnimatedModalWrapper>
  );
};

export default ProfilePasswordModal;
