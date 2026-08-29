import React, { useState } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import logo from '../../../assets/icons/rednest_logo.png';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import loaderIconRed from '../../../assets/icons/loader-animated-red.svg';
import { useAdminAuth } from '../../../context/AdminAuthContext';
import { useAuth } from '../../../context/AuthContext';
import './AdminLogin.scss';

const LoaderIcon = () => (
  <img src={loaderIconRed} alt="Loading..." style={{ width: '20px', height: '20px' }} />
);

const AdminLogin = () => {
  const { adminLogin, isAdminAuth } = useAdminAuth();
  const { isAuthenticated, authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return (
      <div className="admin-loading-screen">
        <img src={loaderIcon} alt="Loading..." className="admin-loading-spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isAdminAuth) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await adminLogin(password);
      if (res && res.ok) {
        navigate('/admin/dashboard', { replace: true });
      } else {
        setError(res?.message || 'Incorrect password. Please try again.');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="admin-login-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="admin-login-overlay" />

      <div className="admin-login-container">
        <div className="admin-login-card-split">
          <div className="admin-login-left">
            <div className="admin-login-left__content">
              <img src={logo} alt="Rednest" className="admin-login-left__logo" />
              <h2>Admin Panel</h2>
              <p>Manage your content, assets and storage from one secure place.</p>
            </div>
          </div>

          <div className="admin-login-right">
            <div className="admin-login-header">
              <img src={logo} alt="Rednest" className="admin-login-header__logo" />
              <h2>Welcome back</h2>
              <p>Enter your admin password to access the panel.</p>
            </div>

            <form className="admin-login-form" onSubmit={handleSubmit} id="admin-login-form">
              <div className="input-group">
                <label htmlFor="admin-password">Password</label>
                <input
                  id="admin-password"
                  type="password"
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="error-wrapper" style={{ minHeight: '24px', marginBottom: '0.5rem' }}>
                {error && (
                  <div className="admin-login-error">{error}</div>
                )}
              </div>

              <button
                id="admin-login-submit"
                type="submit"
                className="cta-btn admin-login-submit"
                disabled={loading}
              >
                {loading ? (
                  <span className="admin-login-submit__loader">
                    <LoaderIcon />
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AdminLogin;
