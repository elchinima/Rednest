import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../AdminLayout/AdminLayout';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';
import { useAuth } from '../../../context/AuthContext';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import loaderIconRed from '../../../assets/icons/loader-animated-red.svg';
import AdminTableActions from '../../Elements/AdminTableActions';
import './Users.scss';

const PAGE_SIZE = 10;

const formatCurrency = (val) => {
  const num = typeof val === 'number' ? val : parseFloat(val) || 0;
  return `${num.toFixed(2)} ₼`;
};

const formatDate = (dateStr) => {
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

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return 'Never';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '—';
  }
};

const getInitials = (name, email) => {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'U';
};

const ALL_ROLES = ['Customer', 'Bot', 'Support', 'Moderator', 'Admin', 'Super Admin'];

const ROLE_LEVELS = {
  Customer: 0,
  Bot: 1,
  Support: 2,
  Moderator: 3,
  Admin: 4,
  'Super Admin': 5,
  SuperAdmin: 5,
};

const getRoleLevel = (role) => {
  return ROLE_LEVELS[role] ?? 0;
};

const getRoleBadgeClass = (role) => {
  switch (role) {
    case 'Super Admin':
    case 'SuperAdmin':
      return 'badge--danger';
    case 'Admin':
      return 'badge--primary';
    case 'Moderator':
      return 'badge--warning';
    case 'Support':
      return 'badge--info';
    case 'Bot':
      return 'badge--purple';
    case 'Customer':
    default:
      return 'badge--muted';
  }
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  }),
};

const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('lastActive');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsTab, setDetailsTab] = useState('overview');

  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    balance: 0,
    role: 'Customer',
    isActive: true,
    twoFactorEnabled: false,
    subscribe: false,
  });
  const [isSavingUser, setIsSavingUser] = useState(false);

  const [copiedId, setCopiedId] = useState(null);

  const apiUrl = import.meta.env.VITE_API_URL || '';

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3500);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } else {
        setError('Failed to load users list.');
      }
    } catch {
      setError('Connection error while fetching users.');
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const loadUserDetails = async (userId) => {
    setSelectedUserId(userId);
    setDetailsTab('overview');
    setLoadingDetails(true);
    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setUserDetails(data);
      } else {
        showToast('Failed to load detailed profile.');
      }
    } catch {
      showToast('Error loading user profile.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    const is2Fa = user.twoFactorEnabled !== undefined 
      ? user.twoFactorEnabled 
      : (user.session?.twoFactorEnabled ?? false);
    const isSub = user.subscribe !== undefined 
      ? user.subscribe 
      : (user.session?.subscribe ?? false);
    const isActive = user.isActive !== undefined 
      ? user.isActive 
      : (user.session?.isActive !== false);

    setEditForm({
      name: user.name || '',
      email: user.email || '',
      balance: user.balance || 0,
      role: user.role || 'Customer',
      isActive: isActive !== false,
      twoFactorEnabled: !!is2Fa,
      subscribe: !!isSub,
    });
  };

  const isEditingSelf = Boolean(
    currentUser &&
    editingUser &&
    ((currentUser.id && String(currentUser.id).toLowerCase() === String(editingUser.id).toLowerCase()) ||
     (currentUser.Id && String(currentUser.Id).toLowerCase() === String(editingUser.id).toLowerCase()) ||
     (currentUser.email && editingUser.email && currentUser.email.toLowerCase() === editingUser.email.toLowerCase()))
  );

  const currentUserRole = currentUser?.role || 'Customer';
  const currentUserLevel = getRoleLevel(currentUserRole);
  const targetUserRole = editingUser?.role || 'Customer';
  const targetUserLevel = getRoleLevel(targetUserRole);

  const allowedRolesToAssign = ALL_ROLES.filter((r) => getRoleLevel(r) < currentUserLevel);

  let isRoleDisabled = false;
  let roleHelperText = '';

  if (isEditingSelf) {
    isRoleDisabled = true;
    roleHelperText = 'You cannot change your own role.';
  } else if (targetUserLevel >= currentUserLevel) {
    isRoleDisabled = true;
    roleHelperText = 'You cannot modify the role of a user with an equal or higher role than yours.';
  } else if (allowedRolesToAssign.length === 0) {
    isRoleDisabled = true;
    roleHelperText = 'You do not have permission to assign roles.';
  } else {
    roleHelperText = `You can only assign roles lower than your role (${currentUserRole}).`;
  }

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    if (isEditingSelf && editForm.isActive === false) {
      alert('You cannot deactivate or block your own account.');
      return;
    }

    if (editForm.role !== editingUser.role) {
      const newRoleLevel = getRoleLevel(editForm.role);
      if (isEditingSelf) {
        alert('You cannot change your own role.');
        return;
      }
      if (targetUserLevel >= currentUserLevel) {
        alert('You cannot modify the role of a user with an equal or higher role than yours.');
        return;
      }
      if (newRoleLevel >= currentUserLevel) {
        alert(`You cannot assign your own role (${currentUserRole}) or a higher role.`);
        return;
      }
    }

    setIsSavingUser(true);
    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          balance: parseFloat(editForm.balance) || 0,
          role: editForm.role,
          isActive: editForm.isActive,
          twoFactorEnabled: editForm.twoFactorEnabled,
          subscribe: editForm.subscribe,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast('User profile updated successfully.');
        setEditingUser(null);
        fetchUsers();
        if (selectedUserId === editingUser.id) {
          loadUserDetails(editingUser.id);
        }
      } else {
        alert(data.message || 'Failed to update user.');
      }
    } catch {
      alert('Error updating user.');
    } finally {
      setIsSavingUser(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive !== false).length;
    const blocked = users.filter((u) => u.isActive === false).length;
    const totalBalance = users.reduce((sum, u) => sum + (parseFloat(u.balance) || 0), 0);
    const totalOrders = users.reduce((sum, u) => sum + (u.ordersCount || 0), 0);
    return {
      total,
      active,
      blocked,
      totalBalance,
      totalOrders,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    let list = [...users];

    if (searchInput.trim()) {
      const q = searchInput.toLowerCase().trim();
      list = list.filter(
        (u) =>
          (u.name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.id || '').toLowerCase().includes(q)
      );
    }

    if (statusFilter === 'active') {
      list = list.filter((u) => u.isActive !== false);
    } else if (statusFilter === 'blocked') {
      list = list.filter((u) => u.isActive === false);
    }

    list.sort((a, b) => {
      if (sortBy === 'lastActive') {
        const timeA = new Date(a.lastActiveAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.lastActiveAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      }
      if (sortBy === 'name') {
        return (a.name || a.email || '').localeCompare(b.name || b.email || '');
      }
      if (sortBy === 'balance') {
        return (parseFloat(b.balance) || 0) - (parseFloat(a.balance) || 0);
      }
      if (sortBy === 'orders') {
        return (b.ordersCount || 0) - (a.ordersCount || 0);
      }
      return 0;
    });

    return list;
  }, [users, searchInput, statusFilter, sortBy]);

  const visibleUsers = useMemo(() => {
    return filteredUsers.slice(0, visibleCount);
  }, [filteredUsers, visibleCount]);

  const hasMore = visibleCount < filteredUsers.length;

  return (
    <AdminLayout>
      <div className="admin-users">
        <AnimatePresence>
          {successToast && (
            <motion.div
              className="admin-users__toast"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{successToast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="admin-users__header"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div>
            <h1 className="admin-users__title">Users</h1>
            <p className="admin-users__subtitle">
              Manage registered accounts, view profiles, and edit balances
            </p>
          </div>
        </motion.div>

        <div className="admin-users__stats">
          <motion.div
            className="admin-users__stat-card"
            style={{ '--accent': '#ef4444' }}
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="show"
          >
            <div className="admin-users__stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="admin-users__stat-body">
              <span className="admin-users__stat-value">{loading ? '...' : stats.total}</span>
              <span className="admin-users__stat-label">Total Users</span>
              <span className="admin-users__stat-sub">{stats.active} active</span>
            </div>
          </motion.div>

          <motion.div
            className="admin-users__stat-card"
            style={{ '--accent': '#10b981' }}
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="show"
          >
            <div className="admin-users__stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div className="admin-users__stat-body">
              <span className="admin-users__stat-value">{loading ? '...' : stats.active}</span>
              <span className="admin-users__stat-label">Active Accounts</span>
              <span className="admin-users__stat-sub">In good standing</span>
            </div>
          </motion.div>

          <motion.div
            className="admin-users__stat-card"
            style={{ '--accent': '#f43f5e' }}
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="show"
          >
            <div className="admin-users__stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            </div>
            <div className="admin-users__stat-body">
              <span className="admin-users__stat-value">{loading ? '...' : stats.blocked}</span>
              <span className="admin-users__stat-label">Blocked Accounts</span>
              <span className="admin-users__stat-sub">Suspended access</span>
            </div>
          </motion.div>

          <motion.div
            className="admin-users__stat-card"
            style={{ '--accent': '#fb923c' }}
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="show"
          >
            <div className="admin-users__stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                <path d="M12 18V6" />
              </svg>
            </div>
            <div className="admin-users__stat-body">
              <span className="admin-users__stat-value">
                {loading ? '...' : formatCurrency(stats.totalBalance)}
              </span>
              <span className="admin-users__stat-label">Total Balance</span>
              <span className="admin-users__stat-sub">{stats.totalOrders} orders placed</span>
            </div>
          </motion.div>
        </div>

        <div className="admin-users__controls">
          <div className="admin-users__search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              id="admin-users-search"
              type="text"
              placeholder="Search by name, email, or user ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                className="admin-users__search-clear"
                onClick={() => setSearchInput('')}
                aria-label="Clear search"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <div className="admin-users__filters">
            <div className="admin-users__select-wrap">
              <select
                id="admin-users-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses ({users.length})</option>
                <option value="active">Active Accounts</option>
                <option value="blocked">Blocked Accounts</option>
              </select>
            </div>

            <div className="admin-users__select-wrap">
              <select
                id="admin-users-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="lastActive">Latest Active</option>
                <option value="name">Name / Email (A-Z)</option>
                <option value="balance">Highest Balance</option>
                <option value="orders">Most Orders</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="admin-users__error-banner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
            <button onClick={fetchUsers}>Try Again</button>
          </div>
        )}

        {loading && (
          <div className="admin-users__loading">
            <img src={loaderIcon} alt="Loading..." className="admin-users__spinner" />
            <span>Loading user accounts...</span>
          </div>
        )}

        {!loading && filteredUsers.length === 0 && (
          <div className="admin-users__empty">
            <div className="admin-users__empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>
            <h3>No users found</h3>
            <p>
              {searchInput || statusFilter !== 'all'
                ? 'No user accounts match your search filters.'
                : 'No users registered yet.'}
            </p>
            {(searchInput || statusFilter !== 'all') && (
              <button
                className="admin-users__btn-secondary"
                onClick={() => {
                  setSearchInput('');
                  setStatusFilter('all');
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        )}

        {!loading && filteredUsers.length > 0 && (
          <div className="admin-users__table-card">
            <div className="admin-users__table-responsive">
              <table className="admin-users__table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Balance</th>
                    <th>Orders & Spent</th>
                    <th>Last Active</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map((u, i) => (
                    <motion.tr
                      key={u.id}
                      custom={i}
                      variants={fadeUp}
                      initial="hidden"
                      animate="show"
                    >
                      <td>
                        <div className="admin-users__user-cell">
                          <div className="admin-users__avatar">
                            {u.profilePictureUrl ? (
                              <img src={u.profilePictureUrl} alt={u.name || u.email} />
                            ) : (
                              <span>{getInitials(u.name, u.email)}</span>
                            )}
                          </div>
                          <div className="admin-users__user-info">
                            <span className="admin-users__user-name">
                              {u.name || 'Unnamed User'}
                            </span>
                            <span className="admin-users__user-email">{u.email}</span>
                            <button
                              className="admin-users__copy-id"
                              onClick={() => copyToClipboard(u.id, u.id)}
                              title="Click to copy User ID"
                            >
                              <code>{u.id.slice(0, 8)}...</code>
                              {copiedId === u.id ? (
                                <span className="copied-tag">Copied!</span>
                              ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="9" y="9" width="13" height="13" rx="2" />
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className={`badge ${getRoleBadgeClass(u.role)}`}>
                          {u.role || 'Customer'}
                        </span>
                      </td>

                      <td>
                        <div className="admin-users__badges">
                          {u.isActive !== false ? (
                            <span className="badge badge--success">Active</span>
                          ) : (
                            <span className="badge badge--danger">Blocked</span>
                          )}
                        </div>
                      </td>

                      <td>
                        <div className="admin-users__balance-cell">
                          <span className="admin-users__balance-val">
                            {formatCurrency(u.balance)}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="admin-users__orders-cell">
                          <span className="admin-users__orders-count">
                            {u.ordersCount} {u.ordersCount === 1 ? 'order' : 'orders'}
                          </span>
                          <span className="admin-users__orders-spent">
                            Spent: {formatCurrency(u.totalSpent)}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="admin-users__last-active-cell">
                          <span className="admin-users__date-main">
                            {formatDate(u.lastActiveAt || u.createdAt)}
                          </span>
                          <span className="admin-users__date-rel">
                            {formatRelativeTime(u.lastActiveAt || u.createdAt)}
                          </span>
                        </div>
                      </td>

                      <td className="text-right">
                        <AdminTableActions
                          index={i}
                          total={visibleUsers.length}
                          actions={[
                            {
                              label: 'View Profile',
                              icon: (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              ),
                              onClick: () => loadUserDetails(u.id),
                            },
                            {
                              label: 'Edit User & Balance',
                              icon: (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              ),
                              onClick: () => openEditModal(u),
                            },
                          ]}
                        />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {hasMore && !loading && (
          <div className="admin-users__load-more">
            <button
              className="admin-users__btn-secondary"
              onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            >
              Load More Users ({filteredUsers.length - visibleCount} remaining)
            </button>
          </div>
        )}

        <AnimatePresence>
          {selectedUserId && (
            <div className="admin-users__modal-backdrop" onClick={() => setSelectedUserId(null)}>
              <motion.div
                className="admin-users__modal admin-users__modal--details"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                {loadingDetails ? (
                  <div className="admin-users__modal-loading">
                    <img src={loaderIcon} alt="Loading..." className="admin-users__spinner" />
                    <span>Loading detailed user info...</span>
                  </div>
                ) : userDetails ? (
                  <>
                    <div className="admin-users__modal-header">
                      <div className="admin-users__modal-identity">
                        <div className="admin-users__avatar admin-users__avatar--lg">
                          {userDetails.profilePictureUrl ? (
                            <img src={userDetails.profilePictureUrl} alt={userDetails.name || userDetails.email} />
                          ) : (
                            <span>{getInitials(userDetails.name, userDetails.email)}</span>
                          )}
                        </div>
                        <div className="admin-users__modal-meta">
                          <h2>{userDetails.name || 'Unnamed User'}</h2>
                          <p>{userDetails.email}</p>
                          <div className="admin-users__modal-chips">
                            <code>ID: {userDetails.id}</code>
                            <button
                              className="copy-btn"
                              onClick={() => copyToClipboard(userDetails.id, 'modal-id')}
                            >
                              {copiedId === 'modal-id' ? 'Copied!' : 'Copy'}
                            </button>
                          </div>
                        </div>
                      </div>

                      <button
                        className="admin-users__modal-close"
                        onClick={() => setSelectedUserId(null)}
                        aria-label="Close"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>

                    <div className="admin-users__modal-tabs-wrap">
                      <div className="admin-users__modal-tabs">
                        <button
                          className={`tab-btn${detailsTab === 'overview' ? ' active' : ''}`}
                          onClick={() => setDetailsTab('overview')}
                        >
                          <span>Overview</span>
                        </button>
                        <button
                          className={`tab-btn${detailsTab === 'addresses' ? ' active' : ''}`}
                          onClick={() => setDetailsTab('addresses')}
                        >
                          <span>Addresses</span>
                          <span className="tab-badge">{userDetails.addresses?.length || 0}</span>
                        </button>
                        <button
                          className={`tab-btn${detailsTab === 'cards' ? ' active' : ''}`}
                          onClick={() => setDetailsTab('cards')}
                        >
                          <span>Cards</span>
                          <span className="tab-badge">{userDetails.paymentMethods?.length || 0}</span>
                        </button>
                        <button
                          className={`tab-btn${detailsTab === 'orders' ? ' active' : ''}`}
                          onClick={() => setDetailsTab('orders')}
                        >
                          <span>Orders</span>
                          <span className="tab-badge">{userDetails.orders?.length || 0}</span>
                        </button>
                        <button
                          className={`tab-btn${detailsTab === 'promos' ? ' active' : ''}`}
                          onClick={() => setDetailsTab('promos')}
                        >
                          <span>Promos</span>
                          <span className="tab-badge">{userDetails.promos?.length || 0}</span>
                        </button>
                      </div>
                    </div>

                    <div className="admin-users__modal-body">
                      {detailsTab === 'overview' && (
                        <div className="admin-users__details-overview">
                          <div className="admin-users__info-grid">
                            <div className="info-item">
                              <span className="label">Current Balance</span>
                              <span className="value highlight">{formatCurrency(userDetails.balance)}</span>
                            </div>
                            <div className="info-item">
                              <span className="label">Account Status</span>
                              <span className="value">
                                {userDetails.session?.isActive !== false ? (
                                  <span className="badge badge--success">Active</span>
                                ) : (
                                  <span className="badge badge--danger">Blocked / Suspended</span>
                                )}
                              </span>
                            </div>
                            <div className="info-item">
                              <span className="label">Two-Factor Auth</span>
                              <span className="value">
                                {userDetails.session?.twoFactorEnabled ? (
                                  <span className="badge badge--success">Enabled</span>
                                ) : (
                                  <span className="badge badge--muted">Disabled</span>
                                )}
                              </span>
                            </div>
                            <div className="info-item">
                              <span className="label">Newsletter</span>
                              <span className="value">
                                {userDetails.session?.subscribe ? (
                                  <span className="badge badge--info">Subscribed</span>
                                ) : (
                                  <span className="badge badge--muted">Not Subscribed</span>
                                )}
                              </span>
                            </div>
                            <div className="info-item">
                              <span className="label">Total Orders</span>
                              <span className="value">{userDetails.orders?.length || 0}</span>
                            </div>
                            <div className="info-item">
                              <span className="label">Registration IP</span>
                              <span className="value">
                                {userDetails.session?.registrationIp || 'Not recorded'}
                              </span>
                            </div>
                          </div>

                          <div className="admin-users__quick-actions">
                            <div className="actions-row">
                              <button
                                className="admin-users__btn-secondary"
                                onClick={() => {
                                  openEditModal(userDetails);
                                }}
                              >
                                Edit Profile / Balance
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {detailsTab === 'addresses' && (
                        <div className="admin-users__details-addresses">
                          {userDetails.addresses && userDetails.addresses.length > 0 ? (
                            <div className="addresses-list">
                              {userDetails.addresses.map((a, idx) => (
                                <div key={idx} className="address-card">
                                  <div className="address-card__header">
                                    <strong>{a.title || 'Address'}</strong>
                                    {a.isDefault && <span className="badge badge--info">Default</span>}
                                  </div>
                                  <p className="address-card__main">
                                    {a.address} {a.apartment ? `, Apt ${a.apartment}` : ''}
                                  </p>
                                  <p className="address-card__city">{a.city}</p>
                                  {a.phone && <p className="address-card__phone">📞 {a.phone}</p>}
                                  {a.notes && <p className="address-card__notes">Note: {a.notes}</p>}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="empty-subtab">No saved delivery addresses.</div>
                          )}
                        </div>
                      )}

                      {detailsTab === 'cards' && (
                        <div className="admin-users__details-cards">
                          {userDetails.paymentMethods && userDetails.paymentMethods.length > 0 ? (
                            <div className="cards-list">
                              {userDetails.paymentMethods.map((pm, idx) => (
                                <div key={idx} className="card-item">
                                  <div className="card-item__icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                                      <line x1="1" y1="10" x2="23" y2="10" />
                                    </svg>
                                  </div>
                                  <div className="card-item__info">
                                    <strong>
                                      {pm.cardBrand || 'Card'} •••• {pm.last4 || (pm.id > 0 ? String(pm.id).padStart(4, '0') : '••••')}
                                    </strong>
                                    <span>{pm.cardholderName || 'Cardholder'}</span>
                                    {pm.expiryDate && <span>Exp: {pm.expiryDate}</span>}
                                  </div>
                                  {pm.isDefault && <span className="badge badge--info">Default</span>}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="empty-subtab">No saved payment methods.</div>
                          )}
                        </div>
                      )}

                      {detailsTab === 'orders' && (
                        <div className="admin-users__details-orders">
                          {userDetails.orders && userDetails.orders.length > 0 ? (
                            <div className="orders-list">
                              {userDetails.orders.map((o) => (
                                <div key={o.id} className="order-card">
                                  <div className="order-card__header">
                                    <span className="order-card__date">{formatDate(o.createdAt)}</span>
                                    <span className="badge badge--info">{o.status}</span>
                                  </div>
                                  <div className="order-card__body">
                                    <div className="order-card__info">
                                      <span>{o.itemsCount} {o.itemsCount === 1 ? 'item' : 'items'}</span>
                                      <span className="order-card__dot">•</span>
                                      <span>{o.paymentMethod || 'Online'}</span>
                                    </div>
                                    <strong className="order-card__total">{formatCurrency(o.totalAmount)}</strong>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="empty-subtab">No orders placed by this user yet.</div>
                          )}
                        </div>
                      )}

                      {detailsTab === 'promos' && (
                        <div className="admin-users__details-promos">
                          {userDetails.promos && userDetails.promos.length > 0 ? (
                            <div className="promos-list">
                              {userDetails.promos.map((p) => (
                                <div key={p.id} className="promo-card">
                                  <div className="promo-card__header">
                                    <strong>{p.prizeInfo?.prizeName || 'Promo Prize'}</strong>
                                    {p.isActive ? (
                                      <span className="badge badge--success">Active</span>
                                    ) : (
                                      <span className="badge badge--muted">Used / Inactive</span>
                                    )}
                                  </div>
                                  <div className="promo-card__code">
                                    <code>{p.codes?.promoCode}</code>
                                  </div>
                                  <p className="promo-card__desc">
                                    {p.prizeInfo?.prizeDescription}
                                  </p>
                                  <div className="promo-card__dates">
                                    <span>Activated: {formatDate(p.dates?.activatedAt)}</span>
                                    <span>Expires: {formatDate(p.dates?.expiresAt)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="empty-subtab">No promo codes awarded to this user.</div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                ) : null}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {editingUser && (
            <div className="admin-users__modal-backdrop" onClick={() => setEditingUser(null)}>
              <motion.div
                className="admin-users__modal admin-users__modal--edit"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="admin-users__modal-header">
                  <div>
                    <h2>Edit User Account</h2>
                    <p>{editingUser.email}</p>
                  </div>
                  <button className="admin-users__modal-close" onClick={() => setEditingUser(null)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSaveUser} className="admin-users__edit-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Name</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="e.g. John Doe"
                      />
                    </div>

                    <div className="form-group">
                      <label>Email Address</label>
                      <input
                        type="email"
                        required
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        placeholder="user@example.com"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>User Balance (₼)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editForm.balance}
                        onChange={(e) => setEditForm({ ...editForm, balance: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>

                    <div className="form-group">
                      <label>User Role</label>
                      <select
                        value={editForm.role}
                        disabled={isRoleDisabled}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      >
                        {!allowedRolesToAssign.includes(editForm.role) && (
                          <option value={editForm.role}>{editForm.role}</option>
                        )}
                        {allowedRolesToAssign.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      {roleHelperText && (
                        <small className="admin-users__field-hint">{roleHelperText}</small>
                      )}
                    </div>
                  </div>

                  <div className="toggles-section">
                    <label className={`toggle-item${isEditingSelf ? ' toggle-item--disabled' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isEditingSelf ? true : editForm.isActive}
                        disabled={isEditingSelf}
                        onChange={(e) => !isEditingSelf && setEditForm({ ...editForm, isActive: e.target.checked })}
                      />
                      <span className="toggle-label">
                        <strong>Account Active</strong>
                        <small>
                          {isEditingSelf
                            ? 'You cannot block or deactivate your own account'
                            : 'Uncheck to block user from logging in'}
                        </small>
                      </span>
                    </label>

                    <label className="toggle-item">
                      <input
                        type="checkbox"
                        checked={editForm.twoFactorEnabled}
                        onChange={(e) => setEditForm({ ...editForm, twoFactorEnabled: e.target.checked })}
                      />
                      <span className="toggle-label">
                        <strong>Two-Factor Authentication (2FA)</strong>
                        <small>Require OTP verification during sign-in</small>
                      </span>
                    </label>

                    <label className="toggle-item">
                      <input
                        type="checkbox"
                        checked={editForm.subscribe}
                        onChange={(e) => setEditForm({ ...editForm, subscribe: e.target.checked })}
                      />
                      <span className="toggle-label">
                        <strong>Newsletter Subscription</strong>
                        <small>Receive promotional emails and updates</small>
                      </span>
                    </label>
                  </div>

                  <div className="admin-users__modal-actions">
                    <button
                      type="button"
                      className="admin-users__btn-secondary"
                      onClick={() => setEditingUser(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="cta-btn"
                      disabled={isSavingUser}
                    >
                      {isSavingUser ? (
                        <span className="btn-loader">
                          <img src={loaderIconRed} alt="Saving..." className="btn-loader__icon" />
                          Saving Changes...
                        </span>
                      ) : 'Save User'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
};

export default Users;
