import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import LogoutModal from './LogoutModal';
import loaderIcon from '../../assets/icons/loader-animated.svg';
import './UserNavPills.scss';

const UserNavPills = ({ onMenuClose }) => {
  const { user, authLoading, logout, isAuthenticated } = useAuth();
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
      <span className="cta-btn sm no-hover user-nav-loader-pill">
        <img
          src={loaderIcon}
          alt="Loading"
          style={{ width: '20px', height: '20px', filter: 'brightness(0)' }}
        />
      </span>
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
      <div className="user-nav-pills-container">
        <div className="user-nav-top-row">
          <Link
            to="/profile"
            className="user-nav-pill user-nav-avatar-pill"
            title={`Profile - ${userName}`}
            onClick={handleProfileClick}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={userName}
                className="user-nav-avatar-img"
              />
            ) : (
              <span className="user-nav-avatar-fallback">
                {userName ? userName.charAt(0).toUpperCase() : 'U'}
              </span>
            )}
          </Link>

          <Link
            to="/profile"
            className="cta-btn sm user-nav-pill user-nav-balance-pill user-nav-balance-pill--mobile"
            title="Your Balance"
            onClick={handleProfileClick}
          >
            <span className="user-nav-balance-amount">{formattedBalance}</span>
            <span className="user-nav-balance-symbol">₼</span>
          </Link>
        </div>

        <div className="user-nav-dropdown-wrapper" ref={userMenuRef}>
          <button
            type="button"
            className="cta-btn sm user-nav-pill user-nav-name-pill"
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            aria-expanded={isUserMenuOpen}
            aria-haspopup="true"
          >
            <span className="user-nav-name-text">Hello, {userName}</span>
            <svg
              className={`user-nav-chevron ${isUserMenuOpen ? 'open' : ''}`}
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
          </button>

          <AnimatePresence>
            {isUserMenuOpen && (
              <motion.div
                className="user-nav-menu-dropdown"
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                <Link
                  to="/profile"
                  className="cta-btn sm user-nav-menu-item"
                  onClick={handleProfileClick}
                >
                  Profile
                </Link>
                <button
                  type="button"
                  className="cta-btn sm user-nav-menu-item"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    if (onMenuClose) onMenuClose();
                    setIsLogoutModalOpen(true);
                  }}
                >
                  Log Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Link
          to="/profile"
          className="cta-btn sm user-nav-pill user-nav-balance-pill user-nav-balance-pill--desktop"
          title="Your Balance"
          onClick={handleProfileClick}
        >
          <span className="user-nav-balance-amount">{formattedBalance}</span>
          <span className="user-nav-balance-symbol">₼</span>
        </Link>
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
