import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../context/AuthContext';
import Footer from '../../Footer/Footer';
import UserNavPills from '../../Elements/UserNavPills';
import AnimatedModalWrapper from '../../Elements/AnimatedModalWrapper';
import ImageCropperModal from './ImageCropperModal';
import ChangePasswordModal from './ChangePasswordModal';
import logo from '../../../assets/icons/rednest_logo.png';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import './Profile.scss';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const Profile = () => {
  const { user, logout, updateUser, authLoading } = useAuth();
  const navigate = useNavigate();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false);
  const [isAddressesModalOpen, setIsAddressesModalOpen] = useState(false);
  const [isPaymentsModalOpen, setIsPaymentsModalOpen] = useState(false);
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);
  const [isDeleteAvatarModalOpen, setIsDeleteAvatarModalOpen] = useState(false);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState('');
  const [cropperFileName, setCropperFileName] = useState('');

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarDeleting, setAvatarDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const fileInputRef = useRef(null);
  const apiUrl = import.meta.env.VITE_API_URL || '';

  const avatarUrl = user?.profilePictureUrl || user?.ProfilePictureUrl || null;
  const userName = user?.name || user?.Name || 'User';
  const userEmail = user?.email || user?.Email || 'user@rednest.com';

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3500);
  };

  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(''), 4000);
  };

  const validateFile = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      showError(`"${file.name}" has an invalid format. Allowed: PNG, JPG, JPEG.`);
      return false;
    }
    if (file.size > MAX_SIZE_BYTES) {
      showError(`"${file.name}" exceeds ${MAX_SIZE_MB} MB.`);
      return false;
    }
    return true;
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    if (!validateFile(file)) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCropperImageSrc(reader.result);
      setCropperFileName(file.name);
      setIsCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedFile) => {
    setAvatarUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', croppedFile);

      const res = await fetch(`${apiUrl}/api/auth/profile/picture`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        updateUser({
          profilePictureUrl: data.profilePictureUrl,
          ProfilePictureUrl: data.profilePictureUrl,
        });
        showSuccess('Profile photo updated successfully.');
        setIsCropModalOpen(false);
        setCropperImageSrc('');
      } else {
        const data = await res.json().catch(() => ({}));
        showError(data.message || 'Failed to upload photo.');
      }
    } catch {
      showError('Connection error. Please try again.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleConfirmDeleteAvatar = async () => {
    setAvatarDeleting(true);
    setError('');

    try {
      const res = await fetch(`${apiUrl}/api/auth/profile/picture`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        updateUser({
          profilePictureUrl: null,
          ProfilePictureUrl: null,
        });
        showSuccess('Profile photo removed.');
        setIsDeleteAvatarModalOpen(false);
      } else {
        const data = await res.json().catch(() => ({}));
        showError(data.message || 'Failed to remove photo.');
      }
    } catch {
      showError('Connection error. Please try again.');
    } finally {
      setAvatarDeleting(false);
    }
  };

  const handleToggle2FA = () => {
    setTwoFactorEnabled((prev) => {
      const next = !prev;
      if (next) {
        showSuccess('Two-Factor Authentication simulated: Enabled.');
      } else {
        showSuccess('Two-Factor Authentication simulated: Disabled.');
      }
      return next;
    });
  };

  return (
    <motion.div
      className="profile-page"
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
          <UserNavPills onMenuClose={() => setIsMenuOpen(false)} />
        </div>

        <div className={`menu-overlay ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(false)} />
        <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? '✕' : '☰'}
        </button>
      </header>

      <main className="profile-main">
        <div className="profile-container">
          <motion.div
            className="profile-hero-text"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1>My Profile</h1>
            <p className="profile-hero-desc">
              Manage your account security and personal details
            </p>
          </motion.div>

          <motion.div
            className="profile-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="profile-card__avatar-section">
              <div className="profile-avatar-wrapper">
                <div className={`profile-avatar-circle ${avatarUploading ? 'loading' : ''}`}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={userName} className="profile-avatar-img" />
                  ) : (
                    <div className="profile-avatar-placeholder">
                      {userName ? userName.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}

                  {avatarUploading && (
                    <div className="profile-avatar-overlay">
                      <img src={loaderIcon} alt="Uploading" className="profile-avatar-loader" />
                    </div>
                  )}
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />

              <div className="profile-avatar-actions">
                {!avatarUrl ? (
                  <button
                    type="button"
                    className="cta-btn sm profile-btn profile-btn--add"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-icon">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add
                  </button>
                ) : (
                  <div className="profile-avatar-btn-group">
                    <button
                      type="button"
                      className="cta-btn sm profile-btn profile-btn--change"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={avatarUploading || avatarDeleting}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-icon">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                      Change
                    </button>
                    <button
                      type="button"
                      className="cta-btn sm profile-btn profile-btn--delete"
                      onClick={() => setIsDeleteAvatarModalOpen(true)}
                      disabled={avatarUploading || avatarDeleting}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-icon">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="profile-card__info-section">
              <div className="profile-field-group">
                <label className="profile-field-label">Name</label>
                <div className="profile-field-input-wrap">
                  <input
                    type="text"
                    className="profile-field-input"
                    value={userName}
                    readOnly
                    disabled
                  />
                  <span className="profile-field-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Locked
                  </span>
                </div>
              </div>

              <div className="profile-field-group">
                <label className="profile-field-label">Email</label>
                <div className="profile-field-input-wrap">
                  <input
                    type="email"
                    className="profile-field-input"
                    value={userEmail}
                    readOnly
                    disabled
                  />
                  <span className="profile-field-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Locked
                  </span>
                </div>
              </div>

              <div className="profile-field-group profile-action-row">
                <div className="profile-action-text">
                  <div className="profile-action-title">Change Password</div>
                  <p className="profile-action-desc">
                    Update your account password for enhanced security
                  </p>
                </div>
                <button
                  type="button"
                  className="cta-btn sm profile-action-btn"
                  onClick={() => setIsPasswordModalOpen(true)}
                >
                  Change Password
                </button>
              </div>

              <div className="profile-field-group profile-action-row">
                <div className="profile-action-text">
                  <div className="profile-action-title">Active Sessions</div>
                  <p className="profile-action-desc">
                    View and manage devices currently signed in to your account
                  </p>
                </div>
                <button
                  type="button"
                  className="cta-btn sm profile-action-btn"
                  onClick={() => setIsSessionsModalOpen(true)}
                >
                  Active Sessions
                </button>
              </div>

              <div className="profile-field-group profile-action-row">
                <div className="profile-action-text">
                  <div className="profile-action-title">Two-Factor Authentication (2FA)</div>
                  <p className="profile-action-desc">
                    Add an additional layer of security during sign in
                  </p>
                </div>
                <div className="profile-2fa-toggle-wrap">
                  <span className={`profile-2fa-status ${twoFactorEnabled ? 'active' : ''}`}>
                    {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <button
                    type="button"
                    className={`profile-switch ${twoFactorEnabled ? 'profile-switch--on' : ''}`}
                    onClick={handleToggle2FA}
                    aria-label="Toggle Two-Factor Authentication"
                  >
                    <span className="profile-switch__handle" />
                  </button>
                </div>
              </div>

              <div className="profile-field-group profile-action-row">
                <div className="profile-action-text">
                  <div className="profile-action-title">Delivery Addresses</div>
                  <p className="profile-action-desc">
                    Manage your saved shipping and delivery addresses
                  </p>
                </div>
                <button
                  type="button"
                  className="cta-btn sm profile-action-btn"
                  onClick={() => setIsAddressesModalOpen(true)}
                >
                  Addresses
                </button>
              </div>

              <div className="profile-field-group profile-action-row">
                <div className="profile-action-text">
                  <div className="profile-action-title">Payment Methods</div>
                  <p className="profile-action-desc">
                    Manage your saved payment cards and billing methods
                  </p>
                </div>
                <button
                  type="button"
                  className="cta-btn sm profile-action-btn"
                  onClick={() => setIsPaymentsModalOpen(true)}
                >
                  Payment Methods
                </button>
              </div>

              <div className="profile-field-group profile-action-row">
                <div className="profile-action-text">
                  <div className="profile-action-title">Order History</div>
                  <p className="profile-action-desc">
                    View your past coffee orders and purchase receipts
                  </p>
                </div>
                <button
                  type="button"
                  className="cta-btn sm profile-action-btn"
                  onClick={() => setIsOrdersModalOpen(true)}
                >
                  Orders
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={(msg) => showSuccess(msg)}
      />

      <AnimatedModalWrapper
        isOpen={isSessionsModalOpen}
        onClose={() => setIsSessionsModalOpen(false)}
        targetBorderRadius="24px"
      >
        <div className="profile-modal">
          <div className="profile-modal__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <h3 className="profile-modal__title">Active Sessions</h3>
          <p className="profile-modal__text">
            Active session management and device tracking will be available in an upcoming update.
          </p>
          <div className="profile-modal__actions">
            <button
              type="button"
              className="cta-btn sm profile-modal__btn"
              onClick={() => setIsSessionsModalOpen(false)}
            >
              Got it
            </button>
          </div>
        </div>
      </AnimatedModalWrapper>

      <AnimatedModalWrapper
        isOpen={isAddressesModalOpen}
        onClose={() => setIsAddressesModalOpen(false)}
        targetBorderRadius="24px"
      >
        <div className="profile-modal">
          <div className="profile-modal__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <h3 className="profile-modal__title">Delivery Addresses</h3>
          <p className="profile-modal__text">
            Saved address management will be available in an upcoming update.
          </p>
          <div className="profile-modal__actions">
            <button
              type="button"
              className="cta-btn sm profile-modal__btn"
              onClick={() => setIsAddressesModalOpen(false)}
            >
              Got it
            </button>
          </div>
        </div>
      </AnimatedModalWrapper>

      <AnimatedModalWrapper
        isOpen={isPaymentsModalOpen}
        onClose={() => setIsPaymentsModalOpen(false)}
        targetBorderRadius="24px"
      >
        <div className="profile-modal">
          <div className="profile-modal__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
          </div>
          <h3 className="profile-modal__title">Payment Methods</h3>
          <p className="profile-modal__text">
            Payment method management will be available in an upcoming update.
          </p>
          <div className="profile-modal__actions">
            <button
              type="button"
              className="cta-btn sm profile-modal__btn"
              onClick={() => setIsPaymentsModalOpen(false)}
            >
              Got it
            </button>
          </div>
        </div>
      </AnimatedModalWrapper>

      <AnimatedModalWrapper
        isOpen={isOrdersModalOpen}
        onClose={() => setIsOrdersModalOpen(false)}
        targetBorderRadius="24px"
      >
        <div className="profile-modal">
          <div className="profile-modal__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <h3 className="profile-modal__title">Order History</h3>
          <p className="profile-modal__text">
            Order history and tracking will be available in an upcoming update.
          </p>
          <div className="profile-modal__actions">
            <button
              type="button"
              className="cta-btn sm profile-modal__btn"
              onClick={() => setIsOrdersModalOpen(false)}
            >
              Got it
            </button>
          </div>
        </div>
      </AnimatedModalWrapper>

      <AnimatedModalWrapper
        isOpen={isDeleteAvatarModalOpen}
        onClose={() => !avatarDeleting && setIsDeleteAvatarModalOpen(false)}
        targetBorderRadius="24px"
      >
        <div className="profile-modal">
          <div className="profile-modal__icon profile-modal__icon--danger">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </div>
          <h3 className="profile-modal__title">Delete Profile Photo?</h3>
          <p className="profile-modal__text">
            This will permanently remove your photo from storage. You can upload a new one anytime.
          </p>
          <div className="profile-modal__actions">
            <button
              type="button"
              className="cta-btn sm profile-modal__btn profile-modal__btn--cancel"
              onClick={() => setIsDeleteAvatarModalOpen(false)}
              disabled={avatarDeleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="cta-btn sm profile-modal__btn profile-modal__btn--confirm-delete"
              onClick={handleConfirmDeleteAvatar}
              disabled={avatarDeleting}
            >
              {avatarDeleting ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 48 48"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ flexShrink: 0 }}
                  >
                    <g>
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        values="0 24 24; 360 24 24"
                        dur="1s"
                        repeatCount="indefinite"
                      />
                      <circle
                        cx="24"
                        cy="24"
                        r="19.2"
                        stroke="#ef4444"
                        strokeOpacity="0.25"
                        strokeWidth="4.5"
                      />
                      <path
                        d="M24 4.8 A19.2 19.2 0 0 1 43.2 24"
                        stroke="#ef4444"
                        strokeWidth="4.5"
                        strokeLinecap="round"
                      />
                    </g>
                  </svg>
                  Deleting...
                </span>
              ) : (
                'Delete'
              )}
            </button>
          </div>
        </div>
      </AnimatedModalWrapper>



      <ImageCropperModal
        isOpen={isCropModalOpen}
        imageSrc={cropperImageSrc}
        fileName={cropperFileName}
        onClose={() => {
          setIsCropModalOpen(false);
          setCropperImageSrc('');
        }}
        onCrop={handleCropComplete}
        loading={avatarUploading}
      />

      <div className="profile-toast-container">
        <AnimatePresence>
          {error && (
            <motion.div
              className="profile-toast profile-toast--error"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.25 }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
              <button
                type="button"
                className="profile-toast__close"
                onClick={() => setError('')}
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </motion.div>
          )}
          {success && (
            <motion.div
              className="profile-toast profile-toast--success"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.25 }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{success}</span>
              <button
                type="button"
                className="profile-toast__close"
                onClick={() => setSuccess('')}
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Footer />
    </motion.div>
  );
};

export default Profile;
