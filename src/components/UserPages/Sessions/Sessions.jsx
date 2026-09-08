import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useProfileSecurity } from '../../../context/ProfileSecurityContext';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import loaderIconRed from '../../../assets/icons/loader-animated-red.svg';
import Navbar from '../../Elements/Navbar';
import Footer from '../../Footer/Footer';
import { useLang } from '../../../utils/useLang';
import { getSessionsTranslation } from './Lang';
import './Sessions.scss';

const apiUrl = import.meta.env.VITE_API_URL || '';

const DeviceIcon = ({ type }) => {
  const dt = (type || '').toLowerCase();
  if (dt === 'mobile' || dt === 'phone') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
    );
  }
  if (dt === 'tablet' || dt === 'ipad') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
};

const formatBakuDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    const formatter = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Asia/Baku',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return formatter.format(d);
  } catch {
    return '—';
  }
};

const Sessions = () => {
  const { user } = useAuth();
  const { requireProfileAccess } = useProfileSecurity();
  const navigate = useNavigate();
  const lang = useLang();
  const t = (id) => getSessionsTranslation(lang, id);

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revokingId, setRevokingId] = useState(null);
  const [copiedIp, setCopiedIp] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, duration = 3000) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, duration);
  };

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/auth/sessions`);
      if (!res.ok) {
        throw new Error('Failed to load active sessions');
      }
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError(err.message || 'Error loading sessions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const handleRevoke = async (sessionId) => {
    if (!sessionId || revokingId) return;
    setRevokingId(sessionId);
    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/auth/sessions/${sessionId}/revoke`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to revoke session');
      }

      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, isActive: false } : s))
      );
      showToast(t('sessions_toast_revoked'));
    } catch (err) {
      showToast(err.message || t('sessions_toast_revoke_error'));
    } finally {
      setRevokingId(null);
    }
  };

  const handleCopyIp = (ip) => {
    if (!ip) return;
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    showToast(t('sessions_toast_ip_copied'));
    setTimeout(() => {
      setCopiedIp(null);
    }, 2000);
  };

  return (
    <motion.div
      className="sessions-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Navbar />

      <main className="sessions-main">
        <div className="sessions-container">
          <motion.div
            className="sessions-hero"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1>{t('sessions_hero_title')}</h1>
            <p className="sessions-hero__desc">
              {t('sessions_hero_desc')}
            </p>
          </motion.div>

          {loading ? (
            <div className="sessions-loading-state">
              <img src={loaderIcon} alt="Loading..." className="sessions-loader-icon" />
              <p>{t('sessions_loading')}</p>
            </div>
          ) : error ? (
            <div className="sessions-error-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" width="40" height="40">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p>{error}</p>
              <button type="button" className="cta-btn sm" onClick={fetchSessions}>
                {t('sessions_try_again')}
              </button>
            </div>
          ) : sessions.length === 0 ? (
            <motion.div
              className="sessions-empty-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}
            >
              <div className="sessions-empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <h3>{t('sessions_empty_title')}</h3>
              <p>{t('sessions_empty_desc')}</p>
              <button type="button" className="cta-btn sm sessions-empty-btn" onClick={() => requireProfileAccess('/profile')}>
                {t('sessions_empty_btn')}
              </button>
            </motion.div>
          ) : (
            <motion.div
              className="sessions-list"
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <AnimatePresence>
                {sessions.map((session, idx) => {
                  const isCurrent = session.isCurrent;
                  const isActive = session.isActive;
                  const isRevoking = revokingId === session.id;

                  return (
                    <motion.div
                      key={session.id || idx}
                      className={`session-card ${isCurrent ? 'session-card--current' : ''} ${!isActive ? 'session-card--inactive' : ''}`}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, delay: idx * 0.04 }}
                    >
                      <div className="session-card__header">
                        <div className="session-card__device-wrap">
                          <div className="session-card__icon-badge">
                            <DeviceIcon type={session.deviceType} />
                          </div>
                          <div className="session-card__device-meta">
                            <div className="session-card__title-row">
                              <h3 className="session-card__device-name">
                                {session.deviceName || t('sessions_unknown_device')}
                              </h3>
                            </div>
                            <span className="session-card__device-sub">
                              {session.operatingSystem || t('sessions_unknown_os')} • {session.deviceType || 'Desktop'}
                            </span>
                          </div>
                        </div>

                        <div className="session-card__badges">
                          {session.authType === 'Google' ? (
                            <span className="session-badge session-badge--google" title="Signed in with Google">
                              <svg viewBox="0 0 24 24" width="12" height="12" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }}>
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                              </svg>
                              Google
                            </span>
                          ) : (
                            <span className="session-badge session-badge--password" title="Signed in with Password">
                              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }}>
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                              </svg>
                              Password
                            </span>
                          )}
                          {isCurrent && (
                            <span className="session-badge session-badge--current">
                              <span className="pulsing-dot" /> {t('sessions_badge_current')}
                            </span>
                          )}
                          <span
                            className={`session-badge ${
                              isActive ? 'session-badge--active' : 'session-badge--inactive'
                            }`}
                          >
                            {isActive ? t('sessions_badge_active') : t('sessions_badge_terminated')}
                          </span>
                        </div>
                      </div>

                      <div className="session-card__details-grid">
                        <div className="session-card__detail-item">
                          <span className="session-card__detail-label">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            {t('sessions_detail_location')}
                          </span>
                          <span className="session-card__detail-value">
                            {session.country || t('sessions_unknown_location')}
                          </span>
                        </div>

                        <div className="session-card__detail-item">
                          <span className="session-card__detail-label">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                              <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                              <line x1="6" y1="6" x2="6.01" y2="6" />
                              <line x1="6" y1="18" x2="6.01" y2="18" />
                            </svg>
                            {t('sessions_detail_ip')}
                          </span>
                          <span className="session-card__detail-value session-card__detail-value--ip">
                            <span>{session.lastLoginIp || '—'}</span>
                            {session.lastLoginIp && (
                              <button
                                type="button"
                                className="session-ip-copy-btn"
                                onClick={() => handleCopyIp(session.lastLoginIp)}
                                title="Copy IP"
                              >
                                {copiedIp === session.lastLoginIp ? (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" width="13" height="13">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                ) : (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                  </svg>
                                )}
                              </button>
                            )}
                          </span>
                        </div>

                        <div className="session-card__detail-item">
                          <span className="session-card__detail-label">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 14 14" />
                            </svg>
                            {t('sessions_detail_created')}
                          </span>
                          <span className="session-card__detail-value">
                            {formatBakuDate(session.createdAt)}
                          </span>
                        </div>

                        <div className="session-card__detail-item">
                          <span className="session-card__detail-label">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                            </svg>
                            {t('sessions_detail_active')}
                          </span>
                          <span className="session-card__detail-value">
                            {formatBakuDate(session.lastActiveAt)}
                          </span>
                        </div>
                      </div>

                      <div className="session-card__footer">
                        {isCurrent ? (
                          <div className="session-card__current-note">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" width="15" height="15">
                              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                            <span>{t('sessions_current_note')}</span>
                          </div>
                        ) : isActive ? (
                          <button
                            type="button"
                            className="session-card__revoke-btn"
                            onClick={() => handleRevoke(session.id)}
                            disabled={isRevoking}
                          >
                            {isRevoking ? (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ff6b6b' }}>
                                <img
                                  src={loaderIconRed}
                                  alt=""
                                  style={{
                                    width: '14px',
                                    height: '14px',
                                  }}
                                />
                                <span>{t('sessions_btn_revoking')}</span>
                              </span>
                            ) : (
                              <>
                                <svg
                                  viewBox="0 0 24 24"
                                  width="14"
                                  height="14"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <circle cx="12" cy="12" r="10" />
                                  <line x1="15" y1="9" x2="9" y2="15" />
                                  <line x1="9" y1="9" x2="15" y2="15" />
                                </svg>
                                <span>{t('sessions_btn_revoke')}</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="session-card__terminated-note">
                            {t('sessions_terminated_note')}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}

          <motion.div
            className="sessions-security-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="sessions-security-card__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div className="sessions-security-card__content">
              <h3>{t('sessions_sec_title')}</h3>
              <p>
                {t('sessions_sec_desc_prefix')}
                <a href="#profile" onClick={(e) => { e.preventDefault(); requireProfileAccess('/profile'); }}>
                  {t('sessions_sec_desc_link')}
                </a>
                {t('sessions_sec_desc_suffix')}
              </p>
            </div>
          </motion.div>
        </div>
      </main>

      <div className="sessions-toast-container">
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              className="sessions-toast"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.25 }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" width="18" height="18">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Footer />
    </motion.div>
  );
};

export default Sessions;
