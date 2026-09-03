import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useProfileSecurity } from '../../context/ProfileSecurityContext';
import LogoutModal from './LogoutModal';
import loaderIcon from '../../assets/icons/loader-animated.svg';
import './UserNavPills.scss';

const UserNavPills = ({ onMenuClose }) => {
  const { user, authLoading, logout, isAuthenticated } = useAuth();
  const { requireProfileAccess } = useProfileSecurity();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const userMenuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setIsLogoutModalOpen(false);
      setIsUserMenuOpen(false);
      if (onMenuClose) onMenuClose();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (authLoading) {
    return (
      <div className="user-nav-loader-capsule" aria-label="Loading">
        <img
          src={loaderIcon}
          alt="Loading"
          className="user-nav-loader-spinner"
        />
      </div>
    );
  }

  if (!user && !isAuthenticated) {
    return (
      <Link
        to="/login"
        className="cta-btn sm user-nav-login-btn"
        onClick={() => onMenuClose && onMenuClose()}
      >
        Log In
      </Link>
    );
  }

  const avatarUrl = user?.profilePictureUrl || user?.ProfilePictureUrl || null;
  const userName = user?.name || user?.Name || 'User';
  const rawBalance = user?.balance ?? user?.Balance ?? 0;
  const formattedBalance = Number(rawBalance || 0).toFixed(2);

  const handleProfileClick = () => {
    setIsUserMenuOpen(false);
    if (onMenuClose) onMenuClose();
  };

  return (
    <>
      <div className="user-nav-capsule-wrapper" ref={userMenuRef}>
        <button
          type="button"
          className="user-nav-capsule"
          onClick={() => setIsUserMenuOpen((prev) => !prev)}
          aria-expanded={isUserMenuOpen}
          aria-haspopup="true"
        >
          <div
            className="user-nav-capsule__avatar"
            title={`Profile - ${userName}`}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={userName}
                className="user-nav-capsule__avatar-img"
              />
            ) : (
              <span className="user-nav-capsule__avatar-fallback">
                {userName ? userName.charAt(0).toUpperCase() : 'U'}
              </span>
            )}
          </div>

          <span className="user-nav-capsule__info-row">
            <span className="user-nav-capsule__name">{userName}</span>

            <span className="user-nav-capsule__divider" />

            <span className="user-nav-capsule__balance">
              <span className="user-nav-capsule__balance-amount">{formattedBalance}</span>
              <span className="user-nav-capsule__balance-symbol">₼</span>
            </span>

            <svg
              className={`user-nav-capsule__chevron ${isUserMenuOpen ? 'open' : ''}`}
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </button>

        <div className={`user-nav-capsule__dropdown-wrapper ${isUserMenuOpen ? 'open' : ''}`}>
          <div className="user-nav-capsule__dropdown">
            <div className="user-nav-capsule__dropdown-inner">
              <button
                type="button"
                className="user-nav-capsule__dropdown-item"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  if (onMenuClose) onMenuClose();
                  requireProfileAccess('/profile');
                }}
              >
                Profile
              </button>
              <Link
                to="/promos"
                className="user-nav-capsule__dropdown-item"
                onClick={handleProfileClick}
              >
                Promos
              </Link>
              <Link
                to="/admin/dashboard"
                className="user-nav-capsule__dropdown-item"
                onClick={handleProfileClick}
              >
                Admin
              </Link>
              <button
                type="button"
                className="user-nav-capsule__dropdown-item"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  if (onMenuClose) onMenuClose();
                  setIsLogoutModalOpen(true);
                }}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </div>

      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        loading={isLoggingOut}
      />
    </>
  );
};

export default UserNavPills;
