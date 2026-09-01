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

const ROLES_LIST = ['All', 'Super Admin', 'Admin', 'Moderator'];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  }),
};

const formatBakuDate = (isoStr) => {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '—';
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Baku',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(d);
    const day = parts.find((p) => p.type === 'day')?.value || '01';
    const month = parts.find((p) => p.type === 'month')?.value || '01';
    const year = parts.find((p) => p.type === 'year')?.value || '2000';
    const hour = parts.find((p) => p.type === 'hour')?.value || '00';
    const minute = parts.find((p) => p.type === 'minute')?.value || '00';
    return `${day}.${month}.${year}, ${hour}:${minute}`;
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

const formatRoleName = (role) => {
  if (!role) return 'Admin';
  const r = String(role).trim();
  if (r.toLowerCase().replace(/\s+/g, '') === 'superadmin') {
    return 'Super Admin';
  }
  return r;
};

const formatActionName = (name) => {
  if (!name) return 'Action';
  const str = String(name).trim();
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim();
};

const formatFieldName = (field) => {
  if (!field) return '';
  const str = String(field).trim();
  return str
    .replace(/Id$/i, ' ID')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
};

const getTypeBadgeClass = (type) => {
  const t = String(type || '').toUpperCase();
  switch (t) {
    case 'POST':
      return 'badge badge--success';
    case 'PUT':
      return 'badge badge--info';
    case 'PATCH':
      return 'badge badge--purple';
    case 'DELETE':
      return 'badge badge--danger';
    default:
      return 'badge badge--muted';
  }
};

const getRoleBadgeClass = (role) => {
  const r = String(role || '').toLowerCase();
  if (r.includes('super')) {
    return 'badge badge--warning';
  }
  if (r.includes('admin')) {
    return 'badge badge--danger';
  }
  if (r.includes('moderator')) {
    return 'badge badge--info';
  }
  return 'badge badge--muted';
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

const formatValueDisplay = (val) => {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'boolean') return val ? 'True' : 'False';
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
};

const extractChanges = (data) => {
  if (!data || typeof data !== 'object') return [];

  if (data.changes && typeof data.changes === 'object') {
    return Object.entries(data.changes)
      .filter(([_, val]) => val !== null && typeof val === 'object')
      .map(([key, val]) => ({
        field: formatFieldName(key),
        rawField: key,
        from: formatValueDisplay(val.from),
        to: formatValueDisplay(val.to),
      }));
  }

  if (data.previousStatus !== undefined && data.newStatus !== undefined) {
    return [
      {
        field: 'Status',
        rawField: 'status',
        from: formatValueDisplay(data.previousStatus),
        to: formatValueDisplay(data.newStatus),
      },
    ];
  }

  if (data.before && data.after && typeof data.before === 'object' && typeof data.after === 'object') {
    const allKeys = Array.from(new Set([...Object.keys(data.before), ...Object.keys(data.after)]));
    const diffs = [];
    for (const k of allKeys) {
      const bVal = data.before[k];
      const aVal = data.after[k];
      if (bVal !== aVal && (bVal !== undefined || aVal !== undefined)) {
        diffs.push({
          field: formatFieldName(k),
          rawField: k,
          from: formatValueDisplay(bVal),
          to: formatValueDisplay(aVal),
        });
      }
    }
    if (diffs.length > 0) return diffs;
  }

  if (data.action && String(data.action).toLowerCase().includes('toggle') && data.isActive !== undefined) {
    return [
      {
        field: 'Is Active',
        rawField: 'isActive',
        from: formatValueDisplay(!data.isActive),
        to: formatValueDisplay(data.isActive),
      },
    ];
  }

  return [];
};

const extractParams = (data) => {
  if (!data || typeof data !== 'object') return [];

  const skipKeys = new Set(['action', 'changes', 'before', 'after', 'previousStatus', 'newStatus']);
  const result = [];

  for (const [key, val] of Object.entries(data)) {
    if (skipKeys.has(key)) continue;
    if (val === null || val === undefined) continue;

    result.push({
      key: formatFieldName(key),
      rawKey: key,
      value: formatValueDisplay(val),
    });
  }

  return result;
};

const extractActionSummary = (descriptionStr, type, page) => {
  const data = parseJsonSafe(descriptionStr);
  const actionName = formatActionName(data.action || type || 'Action');
  const changes = extractChanges(data);
  const params = extractParams(data);

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
    targetPreview = `User: ${String(data.targetUserId).substring(0, 8)}...`;
  } else if (data.reviewId) {
    targetPreview = `Review: ${String(data.reviewId).substring(0, 8)}...`;
  }

  return { actionName, targetPreview, data, changes, params };
};

const AdminLogs = () => {
  const [logs, setLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterPage, setFilterPage] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [filterRole, setFilterRole] = useState('All');

  const [selectedLog, setSelectedLog] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [rowViewModes, setRowViewModes] = useState({});
  const [modalViewMode, setModalViewMode] = useState('visual');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const copyToClipboard = async (text, label = 'Copied') => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`${label} copied to clipboard!`, 'success');
    } catch {
      showToast('Could not copy to clipboard', 'error');
    }
  };

  const fetchLogs = useCallback(
    async () => {
      setIsLoading(true);

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
          showToast('Failed to load audit logs.', 'error');
        }
      } catch (err) {
        console.error('Error fetching admin logs:', err);
        showToast('Error loading logs.', 'error');
      } finally {
        setIsLoading(false);
      }
    },
    [currentPage, pageSize, debouncedSearch, filterPage, filterType, filterRole]
  );

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

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

  const setRowMode = (id, mode) => {
    setRowViewModes((prev) => ({
      ...prev,
      [id]: mode,
    }));
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
              className={`admin-logs__toast ${toastType === 'error' ? 'admin-logs__toast--error' : ''}`}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
            >
              {toastType === 'error' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="admin-logs__header"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div>
            <h1 className="admin-logs__title">Audit Logs</h1>
            <p className="admin-logs__subtitle">
              Comprehensive activity history, data changes, and system operations
            </p>
          </div>
        </motion.div>

        <div className="admin-logs__stats">
          <motion.div
            className="admin-logs__stat-card"
            style={{ '--accent': '#ef4444' }}
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="show"
          >
            <div className="admin-logs__stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div className="admin-logs__stat-body">
              <span className="admin-logs__stat-value">{isLoading ? '...' : totalCount}</span>
              <span className="admin-logs__stat-label">Total Actions</span>
              <span className="admin-logs__stat-sub">Recorded in database</span>
            </div>
          </motion.div>

          <motion.div
            className="admin-logs__stat-card"
            style={{ '--accent': '#10b981' }}
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="show"
          >
            <div className="admin-logs__stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </div>
            <div className="admin-logs__stat-body">
              <span className="admin-logs__stat-value">{isLoading ? '...' : statsSummary.postCount}</span>
              <span className="admin-logs__stat-label">Created (POST)</span>
              <span className="admin-logs__stat-sub">Current view entries</span>
            </div>
          </motion.div>

          <motion.div
            className="admin-logs__stat-card"
            style={{ '--accent': '#3b82f6' }}
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="show"
          >
            <div className="admin-logs__stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
            <div className="admin-logs__stat-body">
              <span className="admin-logs__stat-value">{isLoading ? '...' : statsSummary.putPatchCount}</span>
              <span className="admin-logs__stat-label">Modifications</span>
              <span className="admin-logs__stat-sub">PUT / PATCH actions</span>
            </div>
          </motion.div>

          <motion.div
            className="admin-logs__stat-card"
            style={{ '--accent': '#f43f5e' }}
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="show"
          >
            <div className="admin-logs__stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>
            <div className="admin-logs__stat-body">
              <span className="admin-logs__stat-value">{isLoading ? '...' : statsSummary.deleteCount}</span>
              <span className="admin-logs__stat-label">Deletions</span>
              <span className="admin-logs__stat-sub">DELETE operations</span>
            </div>
          </motion.div>
        </div>

        <div className="admin-logs__controls">
          <div className="admin-logs__search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <div className="admin-logs__filters">
            <div className="admin-logs__select-wrap">
              <select
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

            <div className="admin-logs__select-wrap">
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setCurrentPage(1);
                }}
              >
                {TYPES_LIST.map((t) => (
                  <option key={t} value={t}>
                    {t === 'All' ? 'All Methods' : t}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-logs__select-wrap">
              <select
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

            <div className="admin-logs__select-wrap">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                {PAGE_SIZE_OPTIONS.map((sz) => (
                  <option key={sz} value={sz}>
                    {sz} / page
                  </option>
                ))}
              </select>
            </div>

            {isFiltered && (
              <button
                type="button"
                className="admin-logs__btn-clear"
                onClick={handleClearFilters}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="admin-logs__table-card">
          {isLoading ? (
            <div className="admin-logs__loading">
              <img src={loaderIcon} alt="Loading..." className="admin-logs__spinner" />
              <span>Loading activity logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="admin-logs__empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
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
            <div className="admin-logs__table-responsive">
              <table className="admin-logs__table">
                <thead>
                  <tr>
                    <th style={{ width: '32px' }} />
                    <th>Timestamp</th>
                    <th>Admin User</th>
                    <th>Role</th>
                    <th>Page</th>
                    <th>Method</th>
                    <th>Action, Target & Changes</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const typeBadgeClass = getTypeBadgeClass(log.type);
                    const roleBadgeClass = getRoleBadgeClass(log.role);
                    const { actionName, targetPreview, data, changes, params } = extractActionSummary(
                      log.description,
                      log.type,
                      log.page
                    );
                    const isExpanded = expandedRows.has(log.id);
                    const rowMode = rowViewModes[log.id] || 'visual';

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

                          <td>
                            <span className="admin-logs__time-main">{formatBakuDate(log.createdAt)}</span>
                            <span className="admin-logs__time-sub">{formatRelativeTime(log.createdAt)}</span>
                          </td>

                          <td>
                            <div className="admin-logs__user-info">
                              <span className="admin-logs__user-name">
                                {log.user?.name || 'Administrator'}
                              </span>
                              <span className="admin-logs__user-email">
                                {log.user?.email || log.userId || '—'}
                              </span>
                            </div>
                          </td>

                          <td>
                            <span className={roleBadgeClass}>{formatRoleName(log.role)}</span>
                          </td>

                          <td>
                            <span className="badge badge--muted">{log.page}</span>
                          </td>

                          <td>
                            <span className={typeBadgeClass}>{log.type}</span>
                          </td>

                          <td>
                            <div className="admin-logs__action-col">
                              <div className="admin-logs__action-title">{actionName}</div>
                              {targetPreview && (
                                <div className="admin-logs__action-target" title={targetPreview}>
                                  {targetPreview}
                                </div>
                              )}
                              {changes.length > 0 && (
                                <div className="admin-logs__diff-pill-list">
                                  {changes.slice(0, 3).map((ch, idx) => (
                                    <div key={idx} className="admin-logs__diff-pill" title={`${ch.field}: ${ch.from} → ${ch.to}`}>
                                      <span className="diff-label">{ch.field}:</span>
                                      <span className="diff-was">{ch.from}</span>
                                      <span className="diff-arrow">→</span>
                                      <span className="diff-now">{ch.to}</span>
                                    </div>
                                  ))}
                                  {changes.length > 3 && (
                                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)' }}>
                                      +{changes.length - 3} more changes
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="admin-logs__action-buttons">
                              <button
                                type="button"
                                className="admin-logs__action-btn"
                                onClick={() => setSelectedLog(log)}
                                title="Inspect Details"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10" />
                                  <line x1="12" y1="16" x2="12" y2="12" />
                                  <line x1="12" y1="8" x2="12.01" y2="8" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                className="admin-logs__action-btn"
                                onClick={() => copyToClipboard(log.description, 'Payload')}
                                title="Copy JSON"
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
                                className="admin-logs__expanded-card"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <div className="admin-logs__expanded-top">
                                  <div className="admin-logs__expanded-title-wrap">
                                    <span className="admin-logs__expanded-badge">{actionName}</span>
                                    <span className="admin-logs__expanded-id">
                                      Record ID: <code>{log.id}</code>
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div className="admin-logs__view-tabs">
                                      <button
                                        type="button"
                                        className={`admin-logs__tab-btn${rowMode === 'visual' ? ' admin-logs__tab-btn--active' : ''}`}
                                        onClick={() => setRowMode(log.id, 'visual')}
                                      >
                                        Visual Overview
                                      </button>
                                      <button
                                        type="button"
                                        className={`admin-logs__tab-btn${rowMode === 'json' ? ' admin-logs__tab-btn--active' : ''}`}
                                        onClick={() => setRowMode(log.id, 'json')}
                                      >
                                        Raw JSON
                                      </button>
                                    </div>

                                    <button
                                      type="button"
                                      className="admin-logs__btn-action-small"
                                      onClick={() => copyToClipboard(JSON.stringify(data, null, 2), 'JSON')}
                                    >
                                      Copy JSON
                                    </button>
                                    <button
                                      type="button"
                                      className="admin-logs__btn-action-small"
                                      onClick={() => setSelectedLog(log)}
                                    >
                                      Modal View
                                    </button>
                                  </div>
                                </div>

                                {rowMode === 'visual' ? (
                                  <>
                                    {changes.length > 0 && (
                                      <div className="admin-logs__diff-section">
                                        <h4 className="admin-logs__diff-heading">
                                          Value Changes (Before → After)
                                        </h4>
                                        <div className="admin-logs__diff-grid">
                                          {changes.map((ch, idx) => (
                                            <div key={idx} className="admin-logs__diff-card">
                                              <div className="admin-logs__diff-card-header">
                                                {ch.field}
                                              </div>
                                              <div className="admin-logs__diff-card-compare">
                                                <div className="admin-logs__diff-card-from">
                                                  <span className="lbl">Before</span>
                                                  <span className="val">{ch.from}</span>
                                                </div>
                                                <span className="admin-logs__diff-card-arrow">→</span>
                                                <div className="admin-logs__diff-card-to">
                                                  <span className="lbl">After</span>
                                                  <span className="val">{ch.to}</span>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {params.length > 0 && (
                                      <div className="admin-logs__params-section">
                                        <h4 className="admin-logs__diff-heading">
                                          Operation Parameters
                                        </h4>
                                        <div className="admin-logs__params-grid">
                                          {params.map((pm, idx) => (
                                            <div key={idx} className="admin-logs__param-item">
                                              <span className="admin-logs__param-item-label">{pm.key}</span>
                                              <span className="admin-logs__param-item-value">{pm.value}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <pre className="admin-logs__json-view">
                                    {JSON.stringify(data, null, 2)}
                                  </pre>
                                )}
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && totalPages > 1 && (
            <div className="admin-logs__pagination">
              <div className="admin-logs__pagination-info">
                Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalCount)} of {totalCount} logs
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
        </div>

        <AnimatePresence>
          {selectedLog && (() => {
            const modalSummary = extractActionSummary(
              selectedLog.description,
              selectedLog.type,
              selectedLog.page
            );

            return (
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
                    <div>
                      <div className="admin-logs__modal-badges">
                        <span className={getTypeBadgeClass(selectedLog.type)}>
                          {selectedLog.type}
                        </span>
                        <span className="badge badge--muted">
                          {selectedLog.page}
                        </span>
                        <span className={getRoleBadgeClass(selectedLog.role)}>
                          {formatRoleName(selectedLog.role)}
                        </span>
                      </div>
                      <h2 className="admin-logs__modal-title">{modalSummary.actionName} Details</h2>
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

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div className="admin-logs__view-tabs">
                        <button
                          type="button"
                          className={`admin-logs__tab-btn${modalViewMode === 'visual' ? ' admin-logs__tab-btn--active' : ''}`}
                          onClick={() => setModalViewMode('visual')}
                        >
                          Visual Overview
                        </button>
                        <button
                          type="button"
                          className={`admin-logs__tab-btn${modalViewMode === 'json' ? ' admin-logs__tab-btn--active' : ''}`}
                          onClick={() => setModalViewMode('json')}
                        >
                          Raw JSON
                        </button>
                      </div>

                      <button
                        type="button"
                        className="admin-logs__btn-action-small"
                        onClick={() =>
                          copyToClipboard(
                            JSON.stringify(modalSummary.data, null, 2),
                            'Full Payload'
                          )
                        }
                      >
                        Copy JSON
                      </button>
                    </div>

                    {modalViewMode === 'visual' ? (
                      <>
                        {modalSummary.changes.length > 0 && (
                          <div className="admin-logs__diff-section">
                            <h4 className="admin-logs__diff-heading">
                              Value Changes (Before → After)
                            </h4>
                            <div className="admin-logs__diff-grid">
                              {modalSummary.changes.map((ch, idx) => (
                                <div key={idx} className="admin-logs__diff-card">
                                  <div className="admin-logs__diff-card-header">
                                    {ch.field}
                                  </div>
                                  <div className="admin-logs__diff-card-compare">
                                    <div className="admin-logs__diff-card-from">
                                      <span className="lbl">Before</span>
                                      <span className="val">{ch.from}</span>
                                    </div>
                                    <span className="admin-logs__diff-card-arrow">→</span>
                                    <div className="admin-logs__diff-card-to">
                                      <span className="lbl">After</span>
                                      <span className="val">{ch.to}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {modalSummary.params.length > 0 && (
                          <div className="admin-logs__params-section">
                            <h4 className="admin-logs__diff-heading">
                              Operation Parameters & Entity Info
                            </h4>
                            <div className="admin-logs__params-grid">
                              {modalSummary.params.map((pm, idx) => (
                                <div key={idx} className="admin-logs__param-item">
                                  <span className="admin-logs__param-item-label">{pm.key}</span>
                                  <span className="admin-logs__param-item-value">{pm.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <pre className="admin-logs__modal-json">
                        {JSON.stringify(modalSummary.data, null, 2)}
                      </pre>
                    )}
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
            );
          })()}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
};

export default AdminLogs;
