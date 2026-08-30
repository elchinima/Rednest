import React, { useState } from 'react';
import AnimatedModalWrapper from '../../Elements/AnimatedModalWrapper';
import loaderIconRed from '../../../assets/icons/loader-animated-red.svg';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';
import './ChangePasswordModal.scss';

const ButtonSpinner = () => (
  <img src={loaderIconRed} alt="Loading..." className="pwd-btn-spinner" style={{ width: '18px', height: '18px' }} />
);

const EyeIcon = ({ visible }) => (
  visible ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pwd-eye-icon">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pwd-eye-icon">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
);

const ChangePasswordModal = ({ isOpen, onClose, onSuccess }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setError('');
  };

  const handleClose = () => {
    if (loading) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError('');

    if (!currentPassword.trim()) {
      setError('Please enter your current password.');
      return;
    }

    if (!newPassword.trim()) {
      setError('Please enter a new password.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword === currentPassword) {
      setError('New password cannot be the same as current password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetchWithRefresh(`${apiUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        resetForm();
        onSuccess(data.message || 'Password changed successfully.');
        onClose();
      } else {
        setError(data.message || 'Failed to change password.');
      }
    } catch (err) {
      console.error('Password change error:', err);
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedModalWrapper isOpen={isOpen} onClose={handleClose} targetBorderRadius="24px">
      <div className="change-password-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="change-password-modal__close"
          onClick={handleClose}
          disabled={loading}
          aria-label="Close modal"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="change-password-modal__header">
          <div className="change-password-modal__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 className="change-password-modal__title">Change Password</h2>
          <p className="change-password-modal__desc">
            Enter your current password and choose a secure new one.
          </p>
        </div>

        <form className="change-password-modal__form" onSubmit={handleSubmit}>
          {error && (
            <div className="change-password-modal__error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="pwd-input-group">
            <label htmlFor="current-password">Current Password</label>
            <div className="pwd-input-wrap">
              <input
                id="current-password"
                type={showCurrent ? 'text' : 'password'}
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (error) setError('');
                }}
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="pwd-toggle-btn"
                onClick={() => setShowCurrent(!showCurrent)}
                tabIndex={-1}
                aria-label={showCurrent ? 'Hide password' : 'Show password'}
              >
                <EyeIcon visible={showCurrent} />
              </button>
            </div>
          </div>

          <div className="pwd-input-group">
            <label htmlFor="new-password">New Password</label>
            <div className="pwd-input-wrap">
              <input
                id="new-password"
                type={showNew ? 'text' : 'password'}
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (error) setError('');
                }}
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="pwd-toggle-btn"
                onClick={() => setShowNew(!showNew)}
                tabIndex={-1}
                aria-label={showNew ? 'Hide password' : 'Show password'}
              >
                <EyeIcon visible={showNew} />
              </button>
            </div>
          </div>

          <div className="pwd-input-group">
            <label htmlFor="confirm-password">Confirm New Password</label>
            <div className="pwd-input-wrap">
              <input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError('');
                }}
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="pwd-toggle-btn"
                onClick={() => setShowConfirm(!showConfirm)}
                tabIndex={-1}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                <EyeIcon visible={showConfirm} />
              </button>
            </div>
          </div>

          <div className="change-password-modal__actions">
            <button
              type="button"
              className="cta-btn sm change-password-modal__btn change-password-modal__btn--cancel"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="cta-btn sm change-password-modal__btn change-password-modal__btn--submit"
              disabled={loading}
            >
              {loading ? (
                <span className="pwd-loader-inner">
                  <ButtonSpinner />
                  Updating...
                </span>
              ) : (
                'Update Password'
              )}
            </button>
          </div>
        </form>
      </div>
    </AnimatedModalWrapper>
  );
};

export default ChangePasswordModal;
