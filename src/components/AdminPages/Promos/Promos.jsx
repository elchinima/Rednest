import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../AdminLayout/AdminLayout';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';
import { useAuth } from '../../../context/AuthContext';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import loaderIconRed from '../../../assets/icons/loader-animated-red.svg';
import AdminTableActions from '../../Elements/AdminTableActions';
import './Promos.scss';

const PAGE_SIZE = 12;

const cleanRole = (role) => (role || '').toLowerCase().replace(/\s+/g, '');

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Baku',
      day: '2-digit',
      month: 'short',
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
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = d - now;
    if (diffMs < 0) return 'Expired';
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays >= 1) return `in ${diffDays}d ${diffHours % 24}h`;
    if (diffHours >= 1) return `in ${diffHours}h`;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return `in ${Math.max(1, diffMins)}m`;
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

const getRewardBadge = (type, discountPercent, cashbackPercent) => {
  const t = String(type || '').toLowerCase();
  if (t === 'discountcustom' || t === '6') {
    return { label: `${discountPercent || 20}% Discount`, className: 'badge badge--success' };
  }
  if (t === 'discount25' || t === '3') {
    return { label: '25% Discount', className: 'badge badge--success' };
  }
  if (t === 'discount50' || t === '5') {
    return { label: '50% Discount', className: 'badge badge--success' };
  }
  if (t === 'cashbackonpurchases' || t === '4') {
    return { label: `${cashbackPercent || 10}% Cashback`, className: 'badge badge--warning' };
  }
  if (t === 'freedrink' || t === '1') {
    return { label: 'Free Drink', className: 'badge badge--info' };
  }
  if (t === 'freedessert' || t === '2') {
    return { label: 'Free Dessert', className: 'badge badge--purple' };
  }
  if (t === 'superprize' || t === '0') {
    return { label: 'Super Prize', className: 'badge badge--danger' };
  }
  return { label: type || 'Reward', className: 'badge badge--muted' };
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  }),
};

const Promos = () => {
  const { user } = useAuth();
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [claimFilter, setClaimFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [selectedPromo, setSelectedPromo] = useState(null);
  const [promoToDelete, setPromoToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    prizeType: 'DiscountCustom',
    discountPercent: 20,
    cashbackPercent: 10,
    prizeName: '20% Discount',
    prizeDescription: 'Get 20% off your entire order.',
    expiryDays: 14,
  });

  const [toast, setToast] = useState({ message: '', type: 'success' });

  const [copiedId, setCopiedId] = useState(null);

  const apiUrl = import.meta.env.VITE_API_URL || '';

  const currentUserRole = cleanRole(user?.role || user?.Role);
  const isSuperAdmin = currentUserRole === 'superadmin' || currentUserRole === 'super admin';

  const showToast = (message, type = 'success') => {
    const isErr = type === 'error' || /denied|failed|error|restricted/i.test(message);
    setToast({ message, type: isErr ? 'error' : 'success' });
    setTimeout(() => setToast({ message: '', type: 'success' }), 5000);
  };

  const copyToClipboard = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(`Copied "${text}" to clipboard!`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const fetchPromos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/promos`);
      if (res.ok) {
        const data = await res.json();
        setPromos(Array.isArray(data) ? data : []);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.message || 'Failed to load promos list.');
      }
    } catch {
      setError('Connection error while fetching promos.');
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchPromos();
  }, [fetchPromos]);

  const handleToggleActive = async (promo) => {
    if (!isSuperAdmin) {
      showToast('Access denied. Only Super Admin can change promo active status.');
      return;
    }
    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/promos/${promo.id}/toggle-active`, {
        method: 'PATCH',
      });
      if (res.ok) {
        const data = await res.json();
        setPromos((prev) =>
          prev.map((p) => (p.id === promo.id ? { ...p, isActive: data.isActive } : p))
        );
        showToast(data.message || 'Status updated.');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || 'Failed to update promo status.');
      }
    } catch {
      showToast('Network error while updating promo.');
    }
  };

  const handleOpenCreateModal = () => {
    setCreateForm({
      prizeType: 'DiscountCustom',
      discountPercent: 20,
      cashbackPercent: 10,
      prizeName: '20% Discount',
      prizeDescription: 'Get 20% off your entire order.',
      expiryDays: 14,
    });
    setIsCreateModalOpen(true);
  };

  const handlePrizeTypeChange = (type) => {
    let name = '';
    let desc = '';
    let disc = createForm.discountPercent || 20;
    let cash = createForm.cashbackPercent || 10;

    if (type === 'DiscountCustom') {
      name = `${disc}% Discount`;
      desc = `Get ${disc}% off your entire order.`;
    } else if (type === 'Discount25') {
      disc = 25;
      name = '25% Discount';
      desc = 'Get 25% off your next order.';
    } else if (type === 'Discount50') {
      disc = 50;
      name = '50% Discount';
      desc = 'Get 50% off your next order.';
    } else if (type === 'CashbackOnPurchases') {
      name = `${cash}% Cashback`;
      desc = `Earn ${cash}% cashback on your purchase.`;
    } else if (type === 'FreeDrink') {
      name = 'Free Drink';
      desc = 'Enjoy one free drink with your next order.';
    } else if (type === 'FreeDessert') {
      name = 'Free Dessert';
      desc = 'Enjoy one free dessert with your next order.';
    } else if (type === 'SuperPrize') {
      name = 'Super Prize';
      desc = 'Exclusive Super Prize bonus on your order.';
    }

    setCreateForm((prev) => ({
      ...prev,
      prizeType: type,
      discountPercent: disc,
      cashbackPercent: cash,
      prizeName: name,
      prizeDescription: desc,
    }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/promos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prizeType: createForm.prizeType,
          discountPercent: createForm.discountPercent,
          cashbackPercent: createForm.cashbackPercent,
          prizeName: createForm.prizeName,
          prizeDescription: createForm.prizeDescription,
          expiryDays: createForm.expiryDays,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create promo code.');
      }

      const data = await res.json();
      setPromos((prev) => [data.promo, ...prev]);
      setIsCreateModalOpen(false);
      showToast(`Promo code "${data.promo.promoCode}" created successfully!`);
    } catch (err) {
      showToast(err.message || 'Error creating promo code.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!promoToDelete) return;
    if (!isSuperAdmin) {
      showToast('Access denied. Only Super Admin can delete promo codes.');
      setPromoToDelete(null);
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/promos/${promoToDelete.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setPromos((prev) => prev.filter((p) => p.id !== promoToDelete.id));
        showToast('Promo code deleted successfully.');
        setPromoToDelete(null);
        if (selectedPromo?.id === promoToDelete.id) {
          setSelectedPromo(null);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.message || 'Failed to delete promo code.');
      }
    } catch {
      showToast('Error connecting to server.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredPromos = useMemo(() => {
    return promos
      .filter((p) => {
        if (claimFilter === 'unclaimed' && p.isClaimed) return false;
        if (claimFilter === 'claimed' && !p.isClaimed) return false;

        if (typeFilter !== 'all') {
          const t = String(p.prizeType || '').toLowerCase();
          if (typeFilter === 'discount' && !t.includes('discount')) return false;
          if (typeFilter === 'cashback' && !t.includes('cashback')) return false;
          if (typeFilter === 'freedrink' && !t.includes('drink')) return false;
          if (typeFilter === 'freedessert' && !t.includes('dessert')) return false;
          if (typeFilter === 'superprize' && !t.includes('super')) return false;
        }

        if (activeFilter === 'active' && (!p.isActive || p.isExpired)) return false;
        if (activeFilter === 'inactive' && (p.isActive || p.isExpired)) return false;
        if (activeFilter === 'expired' && !p.isExpired) return false;

        if (searchInput.trim()) {
          const q = searchInput.toLowerCase().trim();
          const matchCode = (p.promoCode || '').toLowerCase().includes(q);
          const matchPrize = (p.prizeName || '').toLowerCase().includes(q);
          const matchUser = p.claimedBy && (
            (p.claimedBy.name || '').toLowerCase().includes(q) ||
            (p.claimedBy.email || '').toLowerCase().includes(q)
          );
          if (!matchCode && !matchPrize && !matchUser) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.activatedAt || 0) - new Date(a.activatedAt || 0);
        if (sortBy === 'oldest') return new Date(a.activatedAt || 0) - new Date(b.activatedAt || 0);
        if (sortBy === 'expires') return new Date(a.expiresAt || 0) - new Date(b.expiresAt || 0);
        if (sortBy === 'discount') return (b.discountPercent || 0) - (a.discountPercent || 0);
        return 0;
      });
  }, [promos, claimFilter, typeFilter, activeFilter, searchInput, sortBy]);

  const visiblePromos = useMemo(() => {
    return filteredPromos.slice(0, visibleCount);
  }, [filteredPromos, visibleCount]);

  const stats = useMemo(() => {
    return {
      total: promos.length,
      unclaimed: promos.filter((p) => !p.isClaimed && p.isActive && !p.isExpired).length,
      claimed: promos.filter((p) => p.isClaimed).length,
      active: promos.filter((p) => p.isActive && !p.isExpired).length,
    };
  }, [promos]);

  return (
    <AdminLayout>
      <div className="admin-promos">
        <AnimatePresence>
          {toast.message && (
            <motion.div
              className={`admin-promos__toast ${toast.type === 'error' ? 'admin-promos__toast--error' : ''}`}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
            >
              {toast.type === 'error' ? (
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
              <span>{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="admin-promos__header"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div>
            <h1 className="admin-promos__title">Promos</h1>
            <p className="admin-promos__subtitle">
              Manage promotional discount codes, rewards, and claim statuses
            </p>
          </div>

          <div className="admin-promos__header-actions">
            <button
              type="button"
              className="admin-promos__btn-primary"
              onClick={handleOpenCreateModal}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Create Promo Code</span>
            </button>
          </div>
        </motion.div>

        <div className="admin-promos__stats">
          <motion.div
            className="admin-promos__stat-card"
            style={{ '--accent': '#ef4444' }}
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="show"
          >
            <div className="admin-promos__stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
                <line x1="12" y1="9" x2="12" y2="15" />
              </svg>
            </div>
            <div className="admin-promos__stat-body">
              <span className="admin-promos__stat-value">{loading ? '...' : stats.total}</span>
              <span className="admin-promos__stat-label">Total Promos</span>
              <span className="admin-promos__stat-sub">All created codes</span>
            </div>
          </motion.div>

          <motion.div
            className="admin-promos__stat-card"
            style={{ '--accent': '#10b981', cursor: 'pointer' }}
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            onClick={() => setClaimFilter('unclaimed')}
          >
            <div className="admin-promos__stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="admin-promos__stat-body">
              <span className="admin-promos__stat-value">{loading ? '...' : stats.unclaimed}</span>
              <span className="admin-promos__stat-label">Unclaimed (Ready)</span>
              <span className="admin-promos__stat-sub">Waiting for claim</span>
            </div>
          </motion.div>

          <motion.div
            className="admin-promos__stat-card"
            style={{ '--accent': '#3b82f6', cursor: 'pointer' }}
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            onClick={() => setClaimFilter('claimed')}
          >
            <div className="admin-promos__stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="admin-promos__stat-body">
              <span className="admin-promos__stat-value">{loading ? '...' : stats.claimed}</span>
              <span className="admin-promos__stat-label">Claimed by Users</span>
              <span className="admin-promos__stat-sub">Activated by customers</span>
            </div>
          </motion.div>

          <motion.div
            className="admin-promos__stat-card"
            style={{ '--accent': '#fbbf24', cursor: 'pointer' }}
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            onClick={() => setActiveFilter('active')}
          >
            <div className="admin-promos__stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div className="admin-promos__stat-body">
              <span className="admin-promos__stat-value highlight">{loading ? '...' : stats.active}</span>
              <span className="admin-promos__stat-label">Active Rewards</span>
              <span className="admin-promos__stat-sub">Valid for checkout</span>
            </div>
          </motion.div>
        </div>

        <div className="admin-promos__controls">
          <div className="admin-promos__search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by code, reward name, user name, or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                type="button"
                className="admin-promos__search-clear"
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

          <div className="admin-promos__filters">
            <div className="admin-promos__select-wrap">
              <select value={claimFilter} onChange={(e) => setClaimFilter(e.target.value)}>
                <option value="all">All Claim Status ({promos.length})</option>
                <option value="unclaimed">Unclaimed (Ready) ({stats.unclaimed})</option>
                <option value="claimed">Claimed by Users ({stats.claimed})</option>
              </select>
            </div>

            <div className="admin-promos__select-wrap">
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="all">All Reward Types</option>
                <option value="discount">Discounts</option>
                <option value="cashback">Cashback</option>
                <option value="freedrink">Free Drink</option>
                <option value="freedessert">Free Dessert</option>
                <option value="superprize">Super Prize</option>
              </select>
            </div>

            <div className="admin-promos__select-wrap">
              <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="active">Active ({stats.active})</option>
                <option value="inactive">Inactive</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            <div className="admin-promos__select-wrap">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="expires">Expires Soonest</option>
                <option value="discount">Highest Discount</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="admin-promos__error-banner">
            <span>{error}</span>
            <button type="button" onClick={fetchPromos}>Retry</button>
          </div>
        )}

        {loading ? (
          <div className="admin-promos__loading">
            <img src={loaderIcon} alt="Loading..." className="admin-promos__spinner" />
            <p>Loading promotional codes...</p>
          </div>
        ) : filteredPromos.length === 0 ? (
          <div className="admin-promos__empty">
            <div className="admin-promos__empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
                <line x1="12" y1="9" x2="12" y2="15" />
              </svg>
            </div>
            <h3>No promo codes found</h3>
            <p>
              {searchInput || claimFilter !== 'all' || typeFilter !== 'all' || activeFilter !== 'all'
                ? 'Try adjusting your search query or filters.'
                : 'Create your first promotional code to reward your customers.'}
            </p>
          </div>
        ) : (
          <div className="admin-promos__table-card">
            <div className="admin-promos__table-responsive">
              <table className="admin-promos__table">
                <thead>
                  <tr>
                    <th>Promo Code</th>
                    <th>Reward</th>
                    <th>Claim Status</th>
                    <th>Expires</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePromos.map((p, i) => {
                    const rewardBadge = getRewardBadge(p.prizeType, p.discountPercent, p.cashbackPercent);

                    return (
                      <motion.tr
                        key={p.id}
                        custom={i}
                        variants={fadeUp}
                        initial="hidden"
                        animate="show"
                      >
                        <td>
                          <button
                            className="admin-promos__copy-id"
                            onClick={() => copyToClipboard(p.promoCode, p.id)}
                            title="Click to copy promo code"
                          >
                            <code>{p.promoCode}</code>
                            {copiedId === p.id ? (
                              <span className="copied-tag">Copied!</span>
                            ) : (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                            )}
                          </button>
                        </td>

                        <td>
                          <div className="admin-promos__reward-cell">
                            <span className={rewardBadge.className}>{rewardBadge.label}</span>
                            {p.prizeDescription && (
                              <span className="admin-promos__reward-desc" title={p.prizeDescription}>
                                {p.prizeDescription}
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          {p.isClaimed && p.claimedBy ? (
                            <div className="admin-promos__customer-cell">
                              <div className="admin-promos__avatar">
                                {p.claimedBy.avatarUrl ? (
                                  <img src={p.claimedBy.avatarUrl} alt={p.claimedBy.name || p.claimedBy.email} />
                                ) : (
                                  <span>{getInitials(p.claimedBy.name, p.claimedBy.email)}</span>
                                )}
                              </div>
                              <div className="admin-promos__customer-info">
                                <span className="admin-promos__customer-name">
                                  {p.claimedBy.name || 'Customer'}
                                </span>
                                <span className="admin-promos__customer-email">
                                  {p.claimedBy.email}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="badge badge--success">● Unclaimed (Ready)</span>
                          )}
                        </td>

                        <td>
                          <div className="admin-promos__date-cell">
                            <span className={`date-main ${p.isExpired ? 'expired-text' : ''}`}>
                              {formatDate(p.expiresAt)}
                            </span>
                            <span className={`date-rel ${p.isExpired ? 'expired-tag' : ''}`}>
                              {formatRelativeTime(p.expiresAt)}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="admin-promos__badges">
                            {!p.isActive ? (
                              <span className="badge badge--muted">Inactive</span>
                            ) : p.isExpired ? (
                              <span className="badge badge--danger">Expired</span>
                            ) : (
                              <span className="badge badge--success">Active</span>
                            )}
                          </div>
                        </td>

                        <td className="text-right">
                          <AdminTableActions
                            index={i}
                            total={visiblePromos.length}
                            actions={[
                              {
                                label: 'View Details',
                                icon: (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                    <circle cx="12" cy="12" r="3" />
                                  </svg>
                                ),
                                onClick: () => setSelectedPromo(p),
                              },
                              {
                                label: p.isActive ? 'Deactivate' : 'Activate',
                                locked: !isSuperAdmin,
                                icon: (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                                    <line x1="12" y1="2" x2="12" y2="12" />
                                  </svg>
                                ),
                                onClick: () => {
                                  if (!isSuperAdmin) {
                                    showToast('Access denied. Only Super Admin can change promo active status.');
                                    return;
                                  }
                                  handleToggleActive(p);
                                },
                              },
                              {
                                label: 'Copy Promo Code',
                                icon: (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" />
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                  </svg>
                                ),
                                onClick: () => copyToClipboard(p.promoCode, p.id),
                              },
                              {
                                label: 'Delete Promo',
                                variant: 'danger',
                                locked: !isSuperAdmin,
                                icon: (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  </svg>
                                ),
                                onClick: () => {
                                  if (!isSuperAdmin) {
                                    showToast('Access denied. Only Super Admin can delete promo codes.');
                                    return;
                                  }
                                  setPromoToDelete(p);
                                },
                              },
                            ]}
                          />
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {visibleCount < filteredPromos.length && (
              <div className="admin-promos__load-more">
                <button
                  type="button"
                  className="admin-promos__btn-secondary"
                  onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                >
                  Load More ({filteredPromos.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </div>
        )}

        <AnimatePresence>
          {isCreateModalOpen && (
            <motion.div
              className="admin-promos__modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
            >
              <motion.div
                className="admin-promos__modal"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="admin-promos__modal-header">
                  <div>
                    <h2>Create Promo Code</h2>
                    <p>New promo code will be generated and held by Pixel until activated by a user</p>
                  </div>
                  <button
                    type="button"
                    className="admin-promos__modal-close"
                    onClick={() => setIsCreateModalOpen(false)}
                    aria-label="Close modal"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleCreateSubmit} className="admin-promos__modal-form">
                  <div className="form-group">
                    <label htmlFor="promo-reward-type">Reward Type</label>
                    <select
                      id="promo-reward-type"
                      value={createForm.prizeType}
                      onChange={(e) => handlePrizeTypeChange(e.target.value)}
                    >
                      <option value="DiscountCustom">Custom Percentage Discount (%)</option>
                      <option value="Discount25">25% Discount</option>
                      <option value="Discount50">50% Discount</option>
                      <option value="CashbackOnPurchases">Cashback on Purchases (%)</option>
                      <option value="FreeDrink">Free Drink</option>
                      <option value="FreeDessert">Free Dessert</option>
                      <option value="SuperPrize">Super Prize (Free Order up to 25 AZN)</option>
                    </select>
                  </div>

                  {createForm.prizeType === 'DiscountCustom' && (
                    <div className="form-group">
                      <div className="label-row">
                        <label>Discount Percentage: <strong>{createForm.discountPercent}%</strong></label>
                      </div>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={createForm.discountPercent}
                        onChange={(e) => {
                          const val = Math.min(99, Math.max(1, parseInt(e.target.value, 10) || 0));
                          setCreateForm((prev) => ({
                            ...prev,
                            discountPercent: val,
                            prizeName: `${val}% Discount`,
                            prizeDescription: `Get ${val}% off your entire order.`,
                          }));
                        }}
                      />
                      <div className="quick-chips">
                        {[5, 10, 15, 20, 25, 30, 50].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            className={`chip ${createForm.discountPercent === pct ? 'active' : ''}`}
                            onClick={() => {
                              setCreateForm((prev) => ({
                                ...prev,
                                discountPercent: pct,
                                prizeName: `${pct}% Discount`,
                                prizeDescription: `Get ${pct}% off your entire order.`,
                              }));
                            }}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {createForm.prizeType === 'CashbackOnPurchases' && (
                    <div className="form-group">
                      <div className="label-row">
                        <label>Cashback Percentage: <strong>{createForm.cashbackPercent}%</strong></label>
                      </div>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={createForm.cashbackPercent}
                        onChange={(e) => {
                          const val = Math.min(99, Math.max(1, parseInt(e.target.value, 10) || 0));
                          setCreateForm((prev) => ({
                            ...prev,
                            cashbackPercent: val,
                            prizeName: `${val}% Cashback`,
                            prizeDescription: `Earn ${val}% cashback on your purchase.`,
                          }));
                        }}
                      />
                      <div className="quick-chips">
                        {[5, 10, 15, 20, 25].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            className={`chip ${createForm.cashbackPercent === pct ? 'active' : ''}`}
                            onClick={() => {
                              setCreateForm((prev) => ({
                                ...prev,
                                cashbackPercent: pct,
                                prizeName: `${pct}% Cashback`,
                                prizeDescription: `Earn ${pct}% cashback on your purchase.`,
                              }));
                            }}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <div className="label-row">
                      <label>Validity Period: <strong>{createForm.expiryDays} days</strong></label>
                    </div>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={createForm.expiryDays}
                      onChange={(e) => {
                        const val = Math.min(30, Math.max(1, parseInt(e.target.value, 10) || 1));
                        setCreateForm((prev) => ({ ...prev, expiryDays: val }));
                      }}
                    />
                    <div className="quick-chips">
                      {[1, 3, 7, 14, 30].map((d) => (
                        <button
                          key={d}
                          type="button"
                          className={`chip ${createForm.expiryDays === d ? 'active' : ''}`}
                          onClick={() => setCreateForm((prev) => ({ ...prev, expiryDays: d }))}
                        >
                          {d} {d === 1 ? 'day' : 'days'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Reward Display Name</label>
                    <input
                      type="text"
                      value={createForm.prizeName}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, prizeName: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Reward Description</label>
                    <textarea
                      rows="2"
                      value={createForm.prizeDescription}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, prizeDescription: e.target.value }))}
                    />
                  </div>

                  <div className="admin-promos__modal-footer">
                    <button
                      type="button"
                      className="admin-promos__btn-secondary"
                      onClick={() => setIsCreateModalOpen(false)}
                      disabled={isCreating}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="admin-promos__btn-primary"
                      disabled={isCreating}
                    >
                      {isCreating ? (
                        <>
                          <img src={loaderIconRed} alt="" className="spinner-inline" />
                          <span>Creating...</span>
                        </>
                      ) : (
                        <span>Create Promo</span>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedPromo && (
            <motion.div
              className="admin-promos__modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPromo(null)}
            >
              <motion.div
                className="admin-promos__modal admin-promos__modal--details"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="admin-promos__modal-header">
                  <div className="admin-promos__modal-identity">
                    <div className="admin-promos__modal-meta">
                      <h2>Promo Details</h2>
                      <div className="admin-promos__modal-chips">
                        <code>{selectedPromo.promoCode}</code>
                        <button
                          type="button"
                          className="copy-btn"
                          onClick={() => copyToClipboard(selectedPromo.promoCode, selectedPromo.id)}
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="admin-promos__modal-close"
                    onClick={() => setSelectedPromo(null)}
                    aria-label="Close modal"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                <div className="admin-promos__details-body">
                  <div className="details-card-hero">
                    <div className="details-code-group">
                      <span className="code-label">PROMO CODE</span>
                      <span className="code-val">{selectedPromo.promoCode}</span>
                    </div>
                    <button
                      type="button"
                      className="details-copy-btn"
                      onClick={() => copyToClipboard(selectedPromo.promoCode, selectedPromo.id)}
                    >
                      Copy Code
                    </button>
                  </div>

                  <div className="details-grid">
                    <div className="detail-box">
                      <span className="label">Reward Type</span>
                      <span className="val">{selectedPromo.prizeName}</span>
                    </div>

                    <div className="detail-box">
                      <span className="label">Status</span>
                      <span className="val">
                        <span className={`badge ${!selectedPromo.isActive ? 'badge--muted' : selectedPromo.isExpired ? 'badge--danger' : 'badge--success'}`}>
                          {!selectedPromo.isActive ? 'Inactive' : selectedPromo.isExpired ? 'Expired' : 'Active'}
                        </span>
                      </span>
                    </div>

                    <div className="detail-box wide">
                      <span className="label">Description</span>
                      <span className="val-text">{selectedPromo.prizeDescription || 'No description provided.'}</span>
                    </div>

                    <div className="detail-box">
                      <span className="label">Created / Activated</span>
                      <span className="val">{formatDate(selectedPromo.activatedAt)}</span>
                    </div>

                    <div className="detail-box">
                      <span className="label">Expires</span>
                      <span className="val">{formatDate(selectedPromo.expiresAt)} ({formatRelativeTime(selectedPromo.expiresAt)})</span>
                    </div>

                    <div className="detail-box wide">
                      <span className="label">Claim Status</span>
                      {selectedPromo.isClaimed && selectedPromo.claimedBy ? (
                        <div className="claimed-user-card">
                          <div className="user-avatar">
                            {selectedPromo.claimedBy.avatarUrl ? (
                              <img src={selectedPromo.claimedBy.avatarUrl} alt={selectedPromo.claimedBy.name || selectedPromo.claimedBy.email} />
                            ) : (
                              <span>{getInitials(selectedPromo.claimedBy.name, selectedPromo.claimedBy.email)}</span>
                            )}
                          </div>
                          <div className="user-info">
                            <span className="name">{selectedPromo.claimedBy.name || 'Customer'}</span>
                            <span className="email">{selectedPromo.claimedBy.email} • Role: {selectedPromo.claimedBy.role}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="unclaimed-notice">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          <span>Held by system account (Pixel). Ready to be activated by any customer at /promos.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="admin-promos__modal-footer">
                  <button
                    type="button"
                    className="admin-promos__btn-secondary"
                    onClick={() => setSelectedPromo(null)}
                  >
                    Close
                  </button>
                  {isSuperAdmin && (
                    <button
                      type="button"
                      className="admin-promos__btn-primary"
                      onClick={() => {
                        handleToggleActive(selectedPromo);
                        setSelectedPromo((prev) => prev ? { ...prev, isActive: !prev.isActive } : null);
                      }}
                    >
                      {selectedPromo.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {promoToDelete && (
            <motion.div
              className="admin-promos__modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPromoToDelete(null)}
            >
              <motion.div
                className="admin-promos__modal admin-promos__modal--sm"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="delete-modal-content">
                  <div className="delete-icon-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </div>
                  <h3>Delete Promo Code</h3>
                  <p>
                    Are you sure you want to permanently delete promo code <strong>{promoToDelete.promoCode}</strong>? This action cannot be undone.
                  </p>
                  <div className="delete-actions">
                    <button
                      type="button"
                      className="admin-promos__btn-secondary"
                      onClick={() => setPromoToDelete(null)}
                      disabled={isDeleting}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="admin-promos__btn-danger"
                      onClick={handleDeleteConfirm}
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete Promo'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
};

export default Promos;
