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
import './Sessions.scss';

const apiUrl = import.meta.env.VITE_API_URL || '';

const DeviceIcon = ({ type }) => {
  const t = (type || '').toLowerCase();
  if (t === 'mobile' || t === 'phone') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
    );
  }
  if (t === 'tablet' || t === 'ipad') {
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
      showToast('Session terminated successfully.');
    } catch (err) {
      showToast(err.message || 'Error revoking session');
    } finally {
      setRevokingId(null);
    }
  };

  const handleCopyIp = (ip) => {
    if (!ip) return;
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    showToast('IP address copied to clipboard!');
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
            <h1>Active Sessions</h1>
            <p className="sessions-hero__desc">
              Manage connected devices, monitor browser logins, and secure your Rednest account
            </p>
          </motion.div>

          {loading ? (
            <div className="sessions-loading-state">
              <img src={loaderIcon} alt="Loading..." className="sessions-loader-icon" />
              <p>Loading active sessions...</p>
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
                Try Again
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
              <h3>No sessions found</h3>
              <p>No device sessions have been recorded for your account yet.</p>
              <button type="button" className="cta-btn sm sessions-empty-btn" onClick={() => requireProfileAccess('/profile')}>
                Back to Profile
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
                                {session.deviceName || 'Unknown Device'}
                              </h3>
                            </div>
                            <span className="session-card__device-sub">
                              {session.operatingSystem || 'Unknown OS'} • {session.deviceType || 'Desktop'}
                            </span>
                          </div>
                        </div>

                        <div className="session-card__badges">
                          {isCurrent && (
                            <span className="session-badge session-badge--current">
                              <span className="pulsing-dot" /> This device
                            </span>
                          )}
                          <span
                            className={`session-badge ${
                              isActive ? 'session-badge--active' : 'session-badge--inactive'
                            }`}
                          >
                            {isActive ? 'Active' : 'Terminated'}
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
                            Location
                          </span>
                          <span className="session-card__detail-value">
                            {session.country || 'Unknown location'}
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
                            IP Address
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
                            First Signed In
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
                            Last Activity
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
                            <span>Current session (cannot be terminated from here)</span>
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
                                <span>Terminating...</span>
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
                                <span>Terminate Session</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="session-card__terminated-note">
                            Session has been terminated
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
              <h3>Security Recommendations</h3>
              <p>
                If you see an unfamiliar device or location, terminate that session immediately and consider changing your password in your <a href="#profile" onClick={(e) => { e.preventDefault(); requireProfileAccess('/profile'); }}>Profile Settings</a>. Remember to always sign out when using public or shared computers.
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
