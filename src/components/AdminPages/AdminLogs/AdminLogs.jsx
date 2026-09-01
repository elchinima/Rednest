import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../AdminLayout/AdminLayout';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import './AdminLogs.scss';

const PAGE_SIZE_OPTIONS = [15, 25, 50, 100];

const PAGES_LIST = [
  'All',
  'Users',
  'Products',
  'Orders',
  'Promos',
  'Reviews',
  'Newsletter',
  'Database',
];

const TYPES_LIST = ['All', 'POST', 'PUT', 'PATCH', 'DELETE'];

const ROLES_LIST = ['All', 'SuperAdmin', 'Admin', 'Moderator'];

const formatBakuDate = (isoStr) => {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '—';
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Baku',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    return formatter.format(d);
  } catch {
    return '—';
  }
};

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return 'Never';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 10) return 'Just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
};

const getTypeBadge = (type) => {
  const t = String(type || '').toUpperCase();
  switch (t) {
    case 'POST':
      return { className: 'log-badge log-badge--post', label: 'POST' };
    case 'PUT':
      return { className: 'log-badge log-badge--put', label: 'PUT' };
    case 'PATCH':
      return { className: 'log-badge log-badge--patch', label: 'PATCH' };
    case 'DELETE':
      return { className: 'log-badge log-badge--delete', label: 'DELETE' };
    default:
      return { className: 'log-badge log-badge--default', label: t || 'ACTION' };
  }
};

const getPageBadge = (page) => {
  const p = String(page || '').toLowerCase();
  switch (p) {
    case 'users':
      return { className: 'page-badge page-badge--users', label: 'Users' };
    case 'products':
      return { className: 'page-badge page-badge--products', label: 'Products' };
    case 'orders':
      return { className: 'page-badge page-badge--orders', label: 'Orders' };
    case 'promos':
      return { className: 'page-badge page-badge--promos', label: 'Promos' };
    case 'reviews':
      return { className: 'page-badge page-badge--reviews', label: 'Reviews' };
    case 'newsletter':
      return { className: 'page-badge page-badge--newsletter', label: 'Newsletter' };
    case 'database':
      return { className: 'page-badge page-badge--database', label: 'Database' };
    default:
      return { className: 'page-badge page-badge--default', label: page || 'Admin' };
  }
};

const getRoleBadge = (role) => {
  const r = String(role || '').toLowerCase();
  if (r.includes('super')) {
    return { className: 'role-badge role-badge--superadmin', label: 'Super Admin' };
  }
  if (r.includes('admin')) {
    return { className: 'role-badge role-badge--admin', label: 'Admin' };
  }
  if (r.includes('moderator')) {
    return { className: 'role-badge role-badge--moderator', label: 'Moderator' };
  }
  return { className: 'role-badge role-badge--default', label: role || 'Staff' };
};

const parseJsonSafe = (str) => {
  if (!str) return {};
  if (typeof str === 'object') return str;
  try {
    return JSON.parse(str);
  } catch {
    return { text: str };
  }
};

const extractActionSummary = (descriptionStr, type, page) => {
  const data = parseJsonSafe(descriptionStr);
  const actionName = data.action || type || 'Action';

  let targetPreview = '';
  if (data.targetEmail) {
    targetPreview = data.targetEmail;
  } else if (data.productName) {
    targetPreview = data.productName;
  } else if (data.orderId) {
    targetPreview = `Order #${String(data.orderId).substring(0, 8)}...`;
  } else if (data.promoCode) {
    targetPreview = `Promo: ${data.promoCode}`;
  } else if (data.fileName) {
    targetPreview = data.fileName;
  } else if (data.subject) {
    targetPreview = `Subject: "${data.subject.substring(0, 30)}${data.subject.length > 30 ? '...' : ''}"`;
  } else if (data.toEmail) {
    targetPreview = `To: ${data.toEmail}`;
  } else if (data.targetUserId) {
    targetPreview = `User ID: ${String(data.targetUserId).substring(0, 8)}...`;
  } else if (data.reviewId) {
    targetPreview = `Review ID: ${String(data.reviewId).substring(0, 8)}...`;
  }

  return { actionName, targetPreview, data };
};

const AdminLogs = () => {
  const [logs, setLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterPage, setFilterPage] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [filterRole, setFilterRole] = useState('All');

  const [selectedLog, setSelectedLog] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const copyToClipboard = async (text, label = 'Copied') => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied to clipboard!`);
    } catch {
      showToast('Could not copy to clipboard');
    }
  };

  const fetchLogs = useCallback(
    async (showLoadingSpinner = true) => {
      if (showLoadingSpinner) setIsLoading(true);
      else setIsRefreshing(true);

      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          pageSize: pageSize.toString(),
        });

        if (debouncedSearch.trim()) {
          params.append('search', debouncedSearch.trim());
        }
        if (filterPage && filterPage !== 'All') {
          params.append('filterPage', filterPage);
        }
        if (filterType && filterType !== 'All') {
          params.append('filterType', filterType);
        }
        if (filterRole && filterRole !== 'All') {
          params.append('filterRole', filterRole);
        }

        const res = await fetchWithRefresh(`/api/Admin/logs?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs || []);
          setTotalCount(data.totalCount || 0);
          setTotalPages(data.totalPages || 1);
        } else {
          showToast('Failed to load audit logs.');
        }
      } catch (err) {
        console.error('Error fetching admin logs:', err);
        showToast('Error loading logs.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [currentPage, pageSize, debouncedSearch, filterPage, filterType, filterRole]
  );

  useEffect(() => {
    fetchLogs(true);
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs(false);
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setFilterPage('All');
    setFilterType('All');
    setFilterRole('All');
    setCurrentPage(1);
  };

  const isFiltered =
    debouncedSearch.trim() !== '' ||
    filterPage !== 'All' ||
    filterType !== 'All' ||
    filterRole !== 'All';

  const toggleRowExpand = (id) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const statsSummary = useMemo(() => {
    const postCount = logs.filter((l) => l.type?.toUpperCase() === 'POST').length;
    const putPatchCount = logs.filter((l) => ['PUT', 'PATCH'].includes(l.type?.toUpperCase())).length;
    const deleteCount = logs.filter((l) => l.type?.toUpperCase() === 'DELETE').length;
    return { postCount, putPatchCount, deleteCount };
  }, [logs]);

  return (
    <AdminLayout>
      <div className="admin-logs">
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              className="admin-logs__toast"
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <header className="admin-logs__header">
          <div className="admin-logs__header-left">
            <div className="admin-logs__title-row">
              <h1 className="admin-logs__title">Audit Logs</h1>
              <span className="admin-logs__count-badge">{totalCount} total actions</span>
            </div>
            <p className="admin-logs__subtitle">
              Comprehensive log of all administrative actions, data changes, and operations
            </p>
          </div>

          <div className="admin-logs__header-right">
            <button
              id="admin-logs-auto-refresh-btn"
              type="button"
              className={`admin-logs__auto-refresh${autoRefresh ? ' admin-logs__auto-refresh--active' : ''}`}
              onClick={() => setAutoRefresh((prev) => !prev)}
              title={autoRefresh ? 'Disable live polling (15s)' : 'Enable live polling (15s)'}
            >
              <span className="admin-logs__auto-refresh-dot" />
              <span>{autoRefresh ? 'Live (15s)' : 'Live Off'}</span>
            </button>

            <button
              id="admin-logs-refresh-btn"
              type="button"
              className="admin-logs__btn-secondary"
              onClick={() => fetchLogs(false)}
              disabled={isRefreshing || isLoading}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={isRefreshing ? 'admin-logs__spin' : ''}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </header>

        <div className="admin-logs__stats-grid">
          <div className="admin-logs__stat-card">
            <div className="admin-logs__stat-icon admin-logs__stat-icon--total">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div className="admin-logs__stat-info">
              <span className="admin-logs__stat-val">{totalCount}</span>
              <span className="admin-logs__stat-label">Total Logged Actions</span>
            </div>
          </div>

          <div className="admin-logs__stat-card">
            <div className="admin-logs__stat-icon admin-logs__stat-icon--post">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <div className="admin-logs__stat-info">
              <span className="admin-logs__stat-val">{statsSummary.postCount}</span>
              <span className="admin-logs__stat-label">Created on Current View (POST)</span>
            </div>
          </div>

          <div className="admin-logs__stat-card">
            <div className="admin-logs__stat-icon admin-logs__stat-icon--put">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
            <div className="admin-logs__stat-info">
              <span className="admin-logs__stat-val">{statsSummary.putPatchCount}</span>
              <span className="admin-logs__stat-label">Modifications (PUT / PATCH)</span>
            </div>
          </div>

          <div className="admin-logs__stat-card">
            <div className="admin-logs__stat-icon admin-logs__stat-icon--delete">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>
            <div className="admin-logs__stat-info">
              <span className="admin-logs__stat-val">{statsSummary.deleteCount}</span>
              <span className="admin-logs__stat-label">Deletions (DELETE)</span>
            </div>
          </div>
        </div>

        <div className="admin-logs__toolbar">
          <div className="admin-logs__search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              id="admin-logs-search-input"
              type="text"
              placeholder="Search by action, user, email, ID, or payload..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="admin-logs__search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="admin-logs__filters-row">
            <div className="admin-logs__filter-item">
              <label htmlFor="admin-logs-page-filter">Page:</label>
              <select
                id="admin-logs-page-filter"
                value={filterPage}
                onChange={(e) => {
                  setFilterPage(e.target.value);
                  setCurrentPage(1);
                }}
              >
                {PAGES_LIST.map((p) => (
                  <option key={p} value={p}>
                    {p === 'All' ? 'All Pages' : p}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-logs__filter-item">
              <label htmlFor="admin-logs-type-filter">Method:</label>
              <select
                id="admin-logs-type-filter"
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setCurrentPage(1);
                }}
              >
                {TYPES_LIST.map((t) => (
                  <option key={t} value={t}>
                    {t === 'All' ? 'All Types' : t}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-logs__filter-item">
              <label htmlFor="admin-logs-role-filter">Role:</label>
              <select
                id="admin-logs-role-filter"
                value={filterRole}
                onChange={(e) => {
                  setFilterRole(e.target.value);
                  setCurrentPage(1);
                }}
              >
                {ROLES_LIST.map((r) => (
                  <option key={r} value={r}>
                    {r === 'All' ? 'All Roles' : r}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-logs__filter-item">
              <label htmlFor="admin-logs-pagesize-filter">Show:</label>
              <select
                id="admin-logs-pagesize-filter"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                {PAGE_SIZE_OPTIONS.map((sz) => (
                  <option key={sz} value={sz}>
                    {sz} rows
                  </option>
                ))}
              </select>
            </div>

            {isFiltered && (
              <button
                type="button"
                className="admin-logs__btn-clear-filters"
                onClick={handleClearFilters}
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        <div className="admin-logs__table-container">
          {isLoading ? (
            <div className="admin-logs__loading">
              <img src={loaderIcon} alt="Loading..." />
              <span>Loading audit logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="admin-logs__empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <circle cx="12" cy="14" r="3" />
                <line x1="12" y1="17" x2="12" y2="19" />
              </svg>
              <h3>No activity logs found</h3>
              <p>
                {isFiltered
                  ? 'Try adjusting or clearing your filters to see more results.'
                  : 'Administrative actions will appear here automatically when performed.'}
              </p>
              {isFiltered && (
                <button
                  type="button"
                  className="admin-logs__btn-secondary"
                  onClick={handleClearFilters}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <table className="admin-logs__table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }} />
                  <th>Timestamp</th>
                  <th>Admin User</th>
                  <th>Role</th>
                  <th>Page</th>
                  <th>Method</th>
                  <th>Action & Target</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const typeBadge = getTypeBadge(log.type);
                  const pageBadge = getPageBadge(log.page);
                  const roleBadge = getRoleBadge(log.role);
                  const { actionName, targetPreview, data } = extractActionSummary(
                    log.description,
                    log.type,
                    log.page
                  );
                  const isExpanded = expandedRows.has(log.id);

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        className={`admin-logs__row${isExpanded ? ' admin-logs__row--expanded' : ''}`}
                        onClick={() => toggleRowExpand(log.id)}
                      >
                        <td className="admin-logs__expand-cell">
                          <button
                            type="button"
                            className={`admin-logs__chevron-btn${isExpanded ? ' admin-logs__chevron-btn--open' : ''}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRowExpand(log.id);
                            }}
                            aria-label="Toggle details"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          </button>
                        </td>

                        <td className="admin-logs__time-cell">
                          <span className="admin-logs__time-main">{formatBakuDate(log.createdAt)}</span>
                          <span className="admin-logs__time-sub">{formatRelativeTime(log.createdAt)}</span>
                        </td>

                        <td className="admin-logs__user-cell">
                          <div className="admin-logs__user-wrapper">
                            {log.user?.profilePictureUrl ? (
                              <img
                                src={log.user.profilePictureUrl}
                                alt={log.user.name || 'Admin'}
                                className="admin-logs__user-avatar"
                              />
                            ) : (
                              <div className="admin-logs__user-avatar-fallback">
                                {(log.user?.name || log.user?.email || 'A')[0].toUpperCase()}
                              </div>
                            )}
                            <div className="admin-logs__user-meta">
                              <span className="admin-logs__user-name">
                                {log.user?.name || 'Administrator'}
                              </span>
                              <span className="admin-logs__user-email">
                                {log.user?.email || log.userId || '—'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className={roleBadge.className}>{roleBadge.label}</span>
                        </td>

                        <td>
                          <span className={pageBadge.className}>{pageBadge.label}</span>
                        </td>

                        <td>
                          <span className={typeBadge.className}>{typeBadge.label}</span>
                        </td>

                        <td className="admin-logs__action-cell">
                          <div className="admin-logs__action-title">{actionName}</div>
                          {targetPreview && (
                            <div className="admin-logs__action-target" title={targetPreview}>
                              {targetPreview}
                            </div>
                          )}
                        </td>

                        <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                          <div className="admin-logs__row-actions">
                            <button
                              type="button"
                              className="admin-logs__action-btn"
                              onClick={() => setSelectedLog(log)}
                              title="Inspect Full Log Entry"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="16" x2="12" y2="12" />
                                <line x1="12" y1="8" x2="12.01" y2="8" />
                              </svg>
                              <span>Details</span>
                            </button>
                            <button
                              type="button"
                              className="admin-logs__action-btn admin-logs__action-btn--icon"
                              onClick={() => copyToClipboard(log.description, 'JSON Payload')}
                              title="Copy JSON Payload"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="admin-logs__expanded-tr">
                          <td colSpan="8">
                            <motion.div
                              className="admin-logs__expanded-content"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div className="admin-logs__expanded-header">
                                <span className="admin-logs__expanded-label">
                                  Payload Details (JSON) — Log ID: <code>{log.id}</code>
                                </span>
                                <div className="admin-logs__expanded-actions">
                                  <button
                                    type="button"
                                    className="admin-logs__copy-btn"
                                    onClick={() => copyToClipboard(JSON.stringify(data, null, 2), 'JSON')}
                                  >
                                    Copy Formatted JSON
                                  </button>
                                  <button
                                    type="button"
                                    className="admin-logs__copy-btn"
                                    onClick={() => setSelectedLog(log)}
                                  >
                                    Open in Modal
                                  </button>
                                </div>
                              </div>
                              <pre className="admin-logs__json-view">
                                {JSON.stringify(data, null, 2)}
                              </pre>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {!isLoading && totalPages > 1 && (
          <div className="admin-logs__pagination">
            <div className="admin-logs__pagination-info">
              Showing {(currentPage - 1) * pageSize + 1} –{' '}
              {Math.min(currentPage * pageSize, totalCount)} of {totalCount} logs
            </div>

            <div className="admin-logs__pagination-controls">
              <button
                type="button"
                className="admin-logs__page-btn"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                title="First page"
              >
                «
              </button>
              <button
                type="button"
                className="admin-logs__page-btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                title="Previous page"
              >
                ‹ Prev
              </button>

              <span className="admin-logs__page-current">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                className="admin-logs__page-btn"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                title="Next page"
              >
                Next ›
              </button>
              <button
                type="button"
                className="admin-logs__page-btn"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                title="Last page"
              >
                »
              </button>
            </div>
          </div>
        )}

        <AnimatePresence>
          {selectedLog && (
            <div
              className="admin-logs__modal-backdrop"
              onClick={() => setSelectedLog(null)}
            >
              <motion.div
                className="admin-logs__modal"
                initial={{ opacity: 0, scale: 0.94, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 15 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="admin-logs__modal-header">
                  <div className="admin-logs__modal-title-wrap">
                    <div className="admin-logs__modal-badges">
                      <span className={getTypeBadge(selectedLog.type).className}>
                        {selectedLog.type}
                      </span>
                      <span className={getPageBadge(selectedLog.page).className}>
                        {selectedLog.page}
                      </span>
                      <span className={getRoleBadge(selectedLog.role).className}>
                        {selectedLog.role}
                      </span>
                    </div>
                    <h2 className="admin-logs__modal-title">Log Entry Details</h2>
                  </div>
                  <button
                    type="button"
                    className="admin-logs__modal-close"
                    onClick={() => setSelectedLog(null)}
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                <div className="admin-logs__modal-body">
                  <div className="admin-logs__modal-grid">
                    <div className="admin-logs__modal-item">
                      <span className="admin-logs__modal-item-label">Timestamp (UTC+4 Baku)</span>
                      <span className="admin-logs__modal-item-value">
                        {formatBakuDate(selectedLog.createdAt)}
                      </span>
                    </div>

                    <div className="admin-logs__modal-item">
                      <span className="admin-logs__modal-item-label">Relative Time</span>
                      <span className="admin-logs__modal-item-value">
                        {formatRelativeTime(selectedLog.createdAt)}
                      </span>
                    </div>

                    <div className="admin-logs__modal-item">
                      <span className="admin-logs__modal-item-label">Admin User</span>
                      <span className="admin-logs__modal-item-value">
                        {selectedLog.user?.name || 'Administrator'} ({selectedLog.user?.email || selectedLog.userId || '—'})
                      </span>
                    </div>

                    <div className="admin-logs__modal-item">
                      <span className="admin-logs__modal-item-label">Admin User ID</span>
                      <span className="admin-logs__modal-item-value">
                        <code>{selectedLog.userId || 'System'}</code>
                      </span>
                    </div>

                    <div className="admin-logs__modal-item admin-logs__modal-item--full">
                      <span className="admin-logs__modal-item-label">Log Record ID</span>
                      <span className="admin-logs__modal-item-value">
                        <code>{selectedLog.id}</code>
                      </span>
                    </div>
                  </div>

                  <div className="admin-logs__modal-payload-section">
                    <div className="admin-logs__modal-payload-header">
                      <span>Action Description & Database Payload:</span>
                      <button
                        type="button"
                        className="admin-logs__copy-btn"
                        onClick={() =>
                          copyToClipboard(
                            JSON.stringify(parseJsonSafe(selectedLog.description), null, 2),
                            'Full Payload'
                          )
                        }
                      >
                        Copy JSON
                      </button>
                    </div>
                    <pre className="admin-logs__modal-json">
                      {JSON.stringify(parseJsonSafe(selectedLog.description), null, 2)}
                    </pre>
                  </div>
                </div>

                <div className="admin-logs__modal-footer">
                  <button
                    type="button"
                    className="admin-logs__btn-secondary"
                    onClick={() => setSelectedLog(null)}
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
};

export default AdminLogs;
