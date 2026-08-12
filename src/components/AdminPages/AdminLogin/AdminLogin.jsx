import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAdminAuth } from '../../../context/AdminAuthContext';
import './AdminLogin.scss';

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
        setError('Неверный пароль. Попробуйте снова.');
      }
    } catch {
      setError('Ошибка соединения с сервером.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login">
      <div className="admin-login__bg">
        <div className="admin-login__orb admin-login__orb--1" />
        <div className="admin-login__orb admin-login__orb--2" />
        <div className="admin-login__orb admin-login__orb--3" />
      </div>

      <motion.div
        className="admin-login__card"
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="admin-login__logo">
          <div className="admin-login__logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <span className="admin-login__logo-text">Rednest</span>
        </div>

        <h1 className="admin-login__title">Панель администратора</h1>
        <p className="admin-login__subtitle">Введите пароль для входа</p>

        <form className="admin-login__form" onSubmit={handleSubmit} id="admin-login-form">
          <div className="admin-login__field">
            <label htmlFor="admin-password" className="admin-login__label">
              Пароль
            </label>
            <input
              id="admin-password"
              type="password"
              className="admin-login__input"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <motion.p
              className="admin-login__error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {error}
            </motion.p>
          )}

          <motion.button
            id="admin-login-submit"
            type="submit"
            className="admin-login__btn"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
          >
            {loading ? (
              <span className="admin-login__btn-spinner" />
            ) : (
              'Войти'
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
