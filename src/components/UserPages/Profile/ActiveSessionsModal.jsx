import React, { useState, useEffect } from 'react';
import AnimatedModalWrapper from '../../Elements/AnimatedModalWrapper';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import './ActiveSessionsModal.scss';

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
  if (t === 'tablet') {
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

const formatDate = (dateStr) => {
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

const ActiveSessionsModal = ({ isOpen, onClose }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [revokingId, setRevokingId] = useState(null);

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
      setError(err.message || 'Error loading sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen]);

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
    } catch (err) {
      alert(err.message || 'Error revoking session');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <AnimatedModalWrapper isOpen={isOpen} onClose={onClose} targetBorderRadius="24px">
      <div className="active-sessions-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="active-sessions-modal__close"
          onClick={onClose}
          aria-label="Close modal"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="active-sessions-modal__header">
          <div className="active-sessions-modal__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <h3 className="active-sessions-modal__title">Active Sessions</h3>
          <p className="active-sessions-modal__desc">
            Devices and browser sessions currently connected to your Rednest account
          </p>
        </div>

        {loading ? (
          <div className="active-sessions-modal__loading">
            <img
              src={loaderIcon}
              alt="Loading..."
              style={{ width: '28px', height: '28px', filter: 'brightness(0) invert(1)' }}
            />
            <span>Loading active sessions...</span>
          </div>
        ) : error ? (
          <div className="active-sessions-modal__error">
            <span className="active-sessions-modal__error-text">{error}</span>
            <button
              type="button"
              className="cta-btn sm"
              onClick={fetchSessions}
              style={{ marginTop: '8px' }}
            >
              Retry
            </button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="active-sessions-modal__empty">
            <span>No active sessions found.</span>
          </div>
        ) : (
          <div className="active-sessions-modal__list">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`active-sessions-modal__card ${
                  session.isCurrent ? 'active-sessions-modal__card--current' : ''
                } ${!session.isActive ? 'active-sessions-modal__card--inactive' : ''}`}
              >
                <div className="active-sessions-modal__card-header">
                  <div className="active-sessions-modal__card-title-wrap">
                    <div className="active-sessions-modal__card-device-icon">
                      <DeviceIcon type={session.deviceType} />
                    </div>
                    <span className="active-sessions-modal__card-device-name">
                      {session.deviceName || 'Unknown Device'}
                    </span>
                  </div>

                  <div className="active-sessions-modal__card-badges">
                    {session.isCurrent && (
                      <span className="active-sessions-modal__badge active-sessions-modal__badge--current">
                        <span className="pulsing-dot" /> This device
                      </span>
                    )}
                    <span
                      className={`active-sessions-modal__badge ${
                        session.isActive
                          ? 'active-sessions-modal__badge--active'
                          : 'active-sessions-modal__badge--inactive'
                      }`}
                    >
                      {session.isActive ? 'Active' : 'Terminated'}
                    </span>
                  </div>
                </div>

                <div className="active-sessions-modal__card-details">
                  <div className="active-sessions-modal__detail-row">
                    <span className="active-sessions-modal__detail-label">Device Type:</span>
                    <span className="active-sessions-modal__detail-value">
                      {session.deviceType || 'Desktop'}
                    </span>
                  </div>

                  <div className="active-sessions-modal__detail-row">
                    <span className="active-sessions-modal__detail-label">Operating System:</span>
                    <span className="active-sessions-modal__detail-value">
                      {session.operatingSystem || 'Unknown OS'}
                    </span>
                  </div>

                  <div className="active-sessions-modal__detail-row">
                    <span className="active-sessions-modal__detail-label">Country:</span>
                    <span className="active-sessions-modal__detail-value">
                      {session.country || 'Unknown'}
                    </span>
                  </div>

                  <div className="active-sessions-modal__detail-row">
                    <span className="active-sessions-modal__detail-label">IP Address:</span>
                    <span className="active-sessions-modal__detail-value">
                      {session.lastLoginIp || 'Unknown'}
                    </span>
                  </div>

                  <div className="active-sessions-modal__detail-row">
                    <span className="active-sessions-modal__detail-label">Signed In:</span>
                    <span className="active-sessions-modal__detail-value">
                      {formatDate(session.createdAt)}
                    </span>
                  </div>

                  <div className="active-sessions-modal__detail-row">
                    <span className="active-sessions-modal__detail-label">Last Active:</span>
                    <span className="active-sessions-modal__detail-value">
                      {formatDate(session.lastActiveAt)}
                    </span>
                  </div>
                </div>

                <div className="active-sessions-modal__card-actions">
                  {session.isCurrent ? (
                    <span className="active-sessions-modal__current-label">
                      Current session (cannot be terminated here)
                    </span>
                  ) : session.isActive ? (
                    <button
                      type="button"
                      className="active-sessions-modal__revoke-btn"
                      onClick={() => handleRevoke(session.id)}
                      disabled={revokingId === session.id}
                    >
                      {revokingId === session.id ? (
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
                          Terminating...
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
                          Terminate Session
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="active-sessions-modal__current-label">Session terminated</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="active-sessions-modal__footer">
          <span className="active-sessions-modal__count">
            Total Sessions: {sessions.length}
          </span>
          <button
            type="button"
            className="active-sessions-modal__close-btn"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </AnimatedModalWrapper>
  );
};

export default ActiveSessionsModal;
