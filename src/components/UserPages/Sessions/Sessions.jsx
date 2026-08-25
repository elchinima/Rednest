import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';
import logo from '../../../assets/icons/rednest_logo.png';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import UserNavPills from '../../Elements/UserNavPills';
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
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '—';
  }
};

const Sessions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [revokingId, setRevokingId] = useState(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [copiedIp, setCopiedIp] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  useEffect(() => {
    if (isMenuOpen) {
      document.body.classList.add('mobile-menu-open');
    } else {
      document.body.classList.remove('mobile-menu-open');
    }
    return () => document.body.classList.remove('mobile-menu-open');
  }, [isMenuOpen]);

  const handleRevoke = async (sessionId) => {
    if (!sessionId || revokingId || revokingAll) return;
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

  const handleRevokeAllOther = async () => {
    const otherActiveSessions = sessions.filter((s) => !s.isCurrent && s.isActive);
    if (otherActiveSessions.length === 0 || revokingAll || revokingId) return;

    if (!window.confirm(`Are you sure you want to terminate ${otherActiveSessions.length} other active session(s)?`)) {
      return;
    }

    setRevokingAll(true);
    let successCount = 0;

    for (const session of otherActiveSessions) {
      try {
        const res = await fetchWithRefresh(`${apiUrl}/api/auth/sessions/${session.id}/revoke`, {
          method: 'POST',
        });
        if (res.ok) {
          successCount++;
          setSessions((prev) =>
            prev.map((s) => (s.id === session.id ? { ...s, isActive: false } : s))
          );
        }
      } catch (e) {
        console.error('Failed to revoke session', session.id, e);
      }
    }

    setRevokingAll(false);
    showToast(`Terminated ${successCount} session(s).`);
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

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      if (activeFilter === 'active' && !session.isActive) return false;
      if (activeFilter === 'terminated' && session.isActive) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const nameMatches = String(session.deviceName || '').toLowerCase().includes(query);
        const osMatches = String(session.operatingSystem || '').toLowerCase().includes(query);
        const ipMatches = String(session.lastLoginIp || '').toLowerCase().includes(query);
        const countryMatches = String(session.country || '').toLowerCase().includes(query);
        const typeMatches = String(session.deviceType || '').toLowerCase().includes(query);
        return nameMatches || osMatches || ipMatches || countryMatches || typeMatches;
      }

      return true;
    });
  }, [sessions, activeFilter, searchQuery]);

  const activeCount = sessions.filter((s) => s.isActive).length;
  const terminatedCount = sessions.filter((s) => !s.isActive).length;
  const otherActiveCount = sessions.filter((s) => !s.isCurrent && s.isActive).length;

  return (
    <motion.div
      className="sessions-page"
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

      <main className="sessions-main">
        <div className="sessions-container">
          <motion.div
            className="sessions-hero"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="sessions-hero__badge">
              <span className="sessions-hero__badge-dot" />
              <span>Security & Access</span>
            </div>
            <h1>Active Sessions</h1>
            <p className="sessions-hero__desc">
              Manage connected devices, monitor browser logins, and secure your Rednest account
            </p>
          </motion.div>

          <motion.div
            className="sessions-stats-bar"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.45 }}
          >
            <div className="sessions-stat-card">
              <div className="sessions-stat-card__icon sessions-stat-card__icon--primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <div className="sessions-stat-card__content">
                <span className="sessions-stat-card__label">Active Devices</span>
                <span className="sessions-stat-card__value">{activeCount}</span>
              </div>
            </div>

            <div className="sessions-stat-card">
              <div className="sessions-stat-card__icon sessions-stat-card__icon--current">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className="sessions-stat-card__content">
                <span className="sessions-stat-card__label">Current Session</span>
                <span className="sessions-stat-card__value sessions-stat-card__value--green">Protected</span>
              </div>
            </div>

            <div className="sessions-stat-card">
              <div className="sessions-stat-card__icon sessions-stat-card__icon--history">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="sessions-stat-card__content">
                <span className="sessions-stat-card__label">Total Recorded</span>
                <span className="sessions-stat-card__value">{sessions.length}</span>
              </div>
            </div>
          </motion.div>

          <div className="sessions-controls">
            <div className="sessions-filters">
              <button
                type="button"
                className={`sessions-filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setActiveFilter('all')}
              >
                All ({sessions.length})
              </button>
              <button
                type="button"
                className={`sessions-filter-btn ${activeFilter === 'active' ? 'active' : ''}`}
                onClick={() => setActiveFilter('active')}
              >
                Active ({activeCount})
              </button>
              <button
                type="button"
                className={`sessions-filter-btn ${activeFilter === 'terminated' ? 'active' : ''}`}
                onClick={() => setActiveFilter('terminated')}
              >
                Terminated ({terminatedCount})
              </button>
            </div>

            <div className="sessions-controls__right">
              {sessions.length > 1 && (
                <div className="sessions-search-box">
                  <svg className="sessions-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search device, OS, IP, country..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="sessions-search-input"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="sessions-search-clear"
                      onClick={() => setSearchQuery('')}
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}

              {otherActiveCount > 0 && (
                <button
                  type="button"
                  className="sessions-btn-danger"
                  onClick={handleRevokeAllOther}
                  disabled={revokingAll || Boolean(revokingId)}
                  title="Sign out of all devices except this one"
                >
                  {revokingAll ? (
                    <>
                      <img src={loaderIcon} alt="" className="sessions-btn-spinner" />
                      <span>Terminating...</span>
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                      <span>Terminate Other Devices ({otherActiveCount})</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                className="sessions-refresh-btn"
                onClick={fetchSessions}
                disabled={loading}
                title="Refresh sessions list"
              >
                <svg
                  className={loading ? 'sessions-refresh-icon--spinning' : ''}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  width="16"
                  height="16"
                >
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              </button>
            </div>
          </div>

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
          ) : filteredSessions.length === 0 ? (
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
              <h3>
                {searchQuery
                  ? 'No matching sessions found'
                  : activeFilter !== 'all'
                  ? `No ${activeFilter} sessions found`
                  : 'No sessions found'}
              </h3>
              <p>
                {searchQuery
                  ? 'Try searching with a different device name, IP address, or location.'
                  : 'No device sessions have been recorded for your account yet.'}
              </p>
              <button type="button" className="cta-btn sm sessions-empty-btn" onClick={() => navigate('/profile')}>
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
                {filteredSessions.map((session, idx) => {
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
                            disabled={isRevoking || revokingAll}
                          >
                            {isRevoking ? (
                              <>
                                <img
                                  src={loaderIcon}
                                  alt=""
                                  style={{
                                    width: '14px',
                                    height: '14px',
                                    filter: 'brightness(0) invert(1)',
                                  }}
                                />
                                <span>Terminating...</span>
                              </>
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
                If you see an unfamiliar device or location, terminate that session immediately and consider changing your password in your <Link to="/profile">Profile Settings</Link>. Remember to always sign out when using public or shared computers.
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
