import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import logo from '../../../assets/icons/rednest_logo.png';
import { useAdminAuth } from '../../../context/AdminAuthContext';
import './AdminLogin.scss';

const LoaderIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
    <g>
      <animateTransform attributeName="transform" type="rotate" values="0 24 24; 360 24 24" dur="1s" repeatCount="indefinite" />
      <circle cx="24" cy="24" r="16" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M24 8 A16 16 0 0 1 40 24" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </g>
  </svg>
);

const AdminLogin = () => {
  const { adminLogin } = useAdminAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const success = await adminLogin(password);
      if (success) {
        navigate('/admin/dashboard', { replace: true });
      } else {
        setError('Incorrect password. Please try again.');
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
