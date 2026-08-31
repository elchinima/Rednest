import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../AdminLayout/AdminLayout';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';
import { useAuth } from '../../../context/AuthContext';
import { useAdminAuth } from '../../../context/AdminAuthContext';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import loaderIconRed from '../../../assets/icons/loader-animated-red.svg';
import AdminTableActions from '../../Elements/AdminTableActions';
import './Promos.scss';

const PAGE_SIZE = 10;

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

const generateRandomPromoCode = (type) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  let prefix = 'RED-GIFT';
  if (type === 'DiscountCustom' || type === 'Discount25' || type === 'Discount50') prefix = 'RED-DISC';
  if (type === 'CashbackOnPurchases') prefix = 'RED-CASH';
  if (type === 'FreeDrink') prefix = 'RED-DRINK';
  if (type === 'FreeDessert') prefix = 'RED-DESSERT';
  if (type === 'SuperPrize') prefix = 'RED-SUPER';
  return `${prefix}-${rand}`;
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  }),
};

const AdminPromos = () => {
  const { user: currentUser } = useAuth();
  const { adminRole } = useAdminAuth();
  const navigate = useNavigate();

  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [claimFilter, setClaimFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [selectedPromo, setSelectedPromo] = useState(null);
  const [promoToDelete, setPromoToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);

  const [createForm, setCreateForm] = useState({
    promoCode: '',
    prizeType: 'DiscountCustom',
    discountPercent: 20,
    cashbackPercent: 10,
    prizeName: '20% Discount',
    prizeDescription: 'Get 20% off your entire order.',
    expiryDays: 7,
  });

  const apiUrl = import.meta.env.VITE_API_URL || '';

  const currentUserRole = cleanRole(adminRole || currentUser?.role || currentUser?.Role);
  const isSuperAdmin = currentUserRole === 'superadmin' || currentUserRole === 'super admin';
  const isAdmin = currentUserRole === 'admin';
  const hasAccess = isSuperAdmin || isAdmin;

  useEffect(() => {
    if (!hasAccess && !loading) {
      navigate('/admin/dashboard', { replace: true, state: { accessDenied: true } });
    }
  }, [hasAccess, loading, navigate]);

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3500);
  };

  const fetchPromos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/promos`);
      if (res.status === 401 || res.status === 403) {
        navigate('/admin/dashboard', { replace: true, state: { accessDenied: true } });
        return;
      }
      if (!res.ok) {
        throw new Error('Failed to load promo codes.');
      }
      const data = await res.json();
      setPromos(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Error loading promo codes.');
    } finally {
      setLoading(false);
    }
  }, [apiUrl, navigate]);

  useEffect(() => {
    fetchPromos();
  }, [fetchPromos]);

  const handleCopy = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast(`Promo code "${code}" copied to clipboard!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleToggleActive = async (id) => {
    setTogglingId(id);
    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/promos/${id}/toggle-active`, {
        method: 'PATCH',
      });
      if (res.status === 403) {
        showToast('Access denied.');
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update promo status.');
      }
      const data = await res.json();
      setPromos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isActive: data.isActive } : p))
      );
      showToast(data.message || 'Promo status updated.');
    } catch (err) {
      showToast(err.message || 'Error toggling promo status.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeletePromo = async () => {
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
      if (res.status === 403) {
        showToast('Access denied. Only Super Admin can delete promo codes.');
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to delete promo code.');
      }
      setPromos((prev) => prev.filter((p) => p.id !== promoToDelete.id));
      showToast('Promo code deleted permanently.');
      setPromoToDelete(null);
    } catch (err) {
      showToast(err.message || 'Error deleting promo code.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenCreateModal = () => {
    const initialType = 'DiscountCustom';
    const initialCode = generateRandomPromoCode(initialType);
    setCreateForm({
      promoCode: initialCode,
      prizeType: initialType,
      discountPercent: 20,
      cashbackPercent: 10,
      prizeName: '20% Discount',
      prizeDescription: 'Get 20% off your entire order.',
      expiryDays: 7,
    });
    setIsCreateModalOpen(true);
  };

  const handlePrizeTypeChange = (type) => {
    let name = 'Special Promotion';
    let desc = 'Exclusive reward from Rednest.';
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
      promoCode: generateRandomPromoCode(type),
    }));
  };

  const handleDiscountChange = (val) => {
    const clamped = Math.min(99, Math.max(1, parseInt(val, 10) || 0));
    setCreateForm((prev) => ({
      ...prev,
      discountPercent: clamped,
      prizeName: `${clamped}% Discount`,
      prizeDescription: `Get ${clamped}% off your entire order.`,
    }));
  };

  const handleCashbackChange = (val) => {
    const clamped = Math.min(99, Math.max(1, parseInt(val, 10) || 0));
    setCreateForm((prev) => ({
      ...prev,
      cashbackPercent: clamped,
      prizeName: `${clamped}% Cashback`,
      prizeDescription: `Earn ${clamped}% cashback on your purchase.`,
    }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.promoCode.trim()) {
      showToast('Please enter or generate a promo code.');
      return;
    }
    setIsCreating(true);
    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/promos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promoCode: createForm.promoCode.trim().toUpperCase(),
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

  const filteredPromos = useMemo(() => {
    return promos.filter((p) => {
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
      if (activeFilter === 'inactive' && p.isActive && !p.isExpired) return false;

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
    });
  }, [promos, claimFilter, typeFilter, activeFilter, searchInput]);

  const visiblePromos = useMemo(() => {
    return filteredPromos.slice(0, visibleCount);
  }, [filteredPromos, visibleCount]);

  const totalCount = promos.length;
  const unclaimedCount = promos.filter((p) => !p.isClaimed && p.isActive && !p.isExpired).length;
  const claimedCount = promos.filter((p) => p.isClaimed).length;
  const activeCount = promos.filter((p) => p.isActive && !p.isExpired).length;

  return (
    <AdminLayout>
      <div className="admin-promos">
        {/* Toast Notification */}
        <AnimatePresence>
          {successToast && (
            <motion.div
              className="admin-promos__toast"
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{successToast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page Header */}
        <div className="admin-promos__header">
          <div className="admin-promos__title-group">
            <h1 className="admin-promos__title">Promos</h1>
            <p className="admin-promos__subtitle">Manage promotional discount codes and rewards</p>
          </div>

          <div className="admin-promos__header-actions">
            <button
              type="button"
              className="admin-promos__btn-refresh"
              onClick={fetchPromos}
              disabled={loading}
              title="Refresh promo list"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={loading ? 'spinning' : ''}>
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              <span>Refresh</span>
            </button>

            <button
              type="button"
              className="admin-promos__btn-primary"
              onClick={handleOpenCreateModal}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Create Promo Code</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="admin-promos__stats-grid">
          <motion.div className="admin-promos__stat-card" custom={0} variants={fadeUp} initial="hidden" animate="show">
            <div className="admin-promos__stat-icon" style={{ '--accent': '239, 68, 68' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
                <line x1="12" y1="9" x2="12" y2="15" />
              </svg>
            </div>
            <div className="admin-promos__stat-body">
              <span className="admin-promos__stat-value">{totalCount}</span>
              <span className="admin-promos__stat-label">Total Promos</span>
            </div>
          </motion.div>

          <motion.div className="admin-promos__stat-card" custom={1} variants={fadeUp} initial="hidden" animate="show">
            <div className="admin-promos__stat-icon" style={{ '--accent': '34, 197, 94' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="admin-promos__stat-body">
              <span className="admin-promos__stat-value">{unclaimedCount}</span>
              <span className="admin-promos__stat-label">Unclaimed (Ready)</span>
            </div>
          </motion.div>

          <motion.div className="admin-promos__stat-card" custom={2} variants={fadeUp} initial="hidden" animate="show">
            <div className="admin-promos__stat-icon" style={{ '--accent': '59, 130, 246' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="admin-promos__stat-body">
              <span className="admin-promos__stat-value">{claimedCount}</span>
              <span className="admin-promos__stat-label">Claimed by Users</span>
            </div>
          </motion.div>

          <motion.div className="admin-promos__stat-card" custom={3} variants={fadeUp} initial="hidden" animate="show">
            <div className="admin-promos__stat-icon" style={{ '--accent': '245, 158, 11' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div className="admin-promos__stat-body">
              <span className="admin-promos__stat-value">{activeCount}</span>
              <span className="admin-promos__stat-label">Active Rewards</span>
            </div>
          </motion.div>
        </div>

        {/* Filter Toolbar */}
        <div className="admin-promos__toolbar">
          <div className="admin-promos__search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search code, reward name, user..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                type="button"
                className="clear-btn"
                onClick={() => setSearchInput('')}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="admin-promos__filter-group">
            <select
              value={claimFilter}
              onChange={(e) => setClaimFilter(e.target.value)}
              className="admin-promos__select"
            >
              <option value="all">All Claim Status</option>
              <option value="unclaimed">Unclaimed (Ready)</option>
              <option value="claimed">Claimed by User</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="admin-promos__select"
            >
              <option value="all">All Reward Types</option>
              <option value="discount">Discounts (%)</option>
              <option value="cashback">Cashback (%)</option>
              <option value="freedrink">Free Drinks</option>
              <option value="freedessert">Free Desserts</option>
              <option value="superprize">Super Prizes</option>
            </select>

            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="admin-promos__select"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive / Expired</option>
            </select>
          </div>
        </div>

        {/* Table / List */}
        {loading ? (
          <div className="admin-promos__loading">
            <img src={loaderIcon} alt="Loading..." className="admin-promos__spinner" />
            <p>Loading promo codes...</p>
          </div>
        ) : error ? (
          <div className="admin-promos__error">
            <p>{error}</p>
            <button type="button" className="admin-promos__btn-primary" onClick={fetchPromos}>
              Try Again
            </button>
          </div>
        ) : visiblePromos.length === 0 ? (
          <div className="admin-promos__empty">
            <div className="admin-promos__empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
                <line x1="12" y1="9" x2="12" y2="15" />
              </svg>
            </div>
            <h3>No promo codes found</h3>
            <p>
              {searchInput || claimFilter !== 'all' || typeFilter !== 'all' || activeFilter !== 'all'
                ? 'Try adjusting your filters or search terms.'
                : 'Create your first promo code to get started.'}
            </p>
            <button type="button" className="admin-promos__btn-primary" onClick={handleOpenCreateModal}>
              Create Promo Code
            </button>
          </div>
        ) : (
          <div className="admin-promos__table-wrap">
            <table className="admin-promos__table">
              <thead>
                <tr>
                  <th>Promo Code</th>
                  <th>Reward</th>
                  <th>Claim Status</th>
                  <th>Expires</th>
                  <th>Active</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visiblePromos.map((p, idx) => {
                  const rewardBadge = getRewardBadge(p.prizeType, p.discountPercent, p.cashbackPercent);
                  const isCopied = copiedCode === p.promoCode;
                  const isExpired = p.isExpired;

                  return (
                    <motion.tr
                      key={p.id}
                      custom={idx}
                      variants={fadeUp}
                      initial="hidden"
                      animate="show"
                    >
                      <td>
                        <div className="admin-promos__code-cell">
                          <span className="promo-code-pill" onClick={() => handleCopy(p.promoCode)} title="Click to copy">
                            {p.promoCode}
                          </span>
                          <button
                            type="button"
                            className={`copy-btn ${isCopied ? 'copied' : ''}`}
                            onClick={() => handleCopy(p.promoCode)}
                            title="Copy promo code"
                          >
                            {isCopied ? (
                              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>

                      <td>
                        <div className="admin-promos__reward-cell">
                          <span className={rewardBadge.className}>{rewardBadge.label}</span>
                          <span className="reward-sub">{p.prizeName}</span>
                        </div>
                      </td>

                      <td>
                        {p.isClaimed && p.claimedBy ? (
                          <div className="admin-promos__user-cell">
                            <div className="avatar">
                              {p.claimedBy.avatarUrl ? (
                                <img src={p.claimedBy.avatarUrl} alt={p.claimedBy.name} />
                              ) : (
                                <span>{(p.claimedBy.name || 'U')[0].toUpperCase()}</span>
                              )}
                            </div>
                            <div className="user-meta">
                              <span className="user-name">{p.claimedBy.name || 'User'}</span>
                              <span className="user-email">{p.claimedBy.email}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="unclaimed-badge" title="Not claimed yet. Available for any user to activate.">
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 14 14" />
                            </svg>
                            Unclaimed (Ready)
                          </span>
                        )}
                      </td>

                      <td>
                        <div className="admin-promos__date-cell">
                          <span className={`date-main ${isExpired ? 'expired-text' : ''}`}>
                            {formatDate(p.expiresAt)}
                          </span>
                          <span className={`date-rel ${isExpired ? 'expired-tag' : ''}`}>
                            {formatRelativeTime(p.expiresAt)}
                          </span>
                        </div>
                      </td>

                      <td>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={p.isActive}
                          className={`admin-promos__toggle ${p.isActive ? 'active' : ''} ${togglingId === p.id ? 'loading' : ''}`}
                          onClick={() => handleToggleActive(p.id)}
                          disabled={togglingId === p.id}
                          title={p.isActive ? 'Active (Click to deactivate)' : 'Inactive (Click to activate)'}
                        >
                          <span className="thumb" />
                        </button>
                      </td>

                      <td className="text-right">
                        <AdminTableActions
                          index={idx}
                          total={visiblePromos.length}
                          actions={[
                            {
                              label: 'View Details',
                              icon: (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              ),
                              onClick: () => setSelectedPromo(p),
                            },
                            {
                              label: 'Copy Code',
                              icon: (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                              ),
                              onClick: () => handleCopy(p.promoCode),
                            },
                            {
                              label: 'Delete Promo',
                              danger: true,
                              icon: (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              ),
                              disabled: !isSuperAdmin,
                              tooltip: !isSuperAdmin ? 'Access denied (Super Admin only)' : '',
                              onClick: () => {
                                if (!isSuperAdmin) {
                                  showToast('Access denied. Only Super Admin can delete promo codes.');
                                } else {
                                  setPromoToDelete(p);
                                }
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

        {/* Create Promo Modal */}
        <AnimatePresence>
          {isCreateModalOpen && (
            <div className="admin-promos__modal-backdrop" onClick={() => setIsCreateModalOpen(false)}>
              <motion.div
                className="admin-promos__modal"
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.25 }}
              >
                <div className="admin-promos__modal-header">
                  <div className="modal-title-group">
                    <h2>Create Promo Code</h2>
                    <p>New promo code will be available for single-use claiming</p>
                  </div>
                  <button
                    type="button"
                    className="close-btn"
                    onClick={() => setIsCreateModalOpen(false)}
                    aria-label="Close modal"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateSubmit} className="admin-promos__modal-form">
                  <div className="form-group">
                    <div className="label-row">
                      <label>Promo Code *</label>
                      <button
                        type="button"
                        className="btn-generate"
                        onClick={() =>
                          setCreateForm((prev) => ({
                            ...prev,
                            promoCode: generateRandomPromoCode(prev.prizeType),
                          }))
                        }
                      >
                        ⚡ Generate Code
                      </button>
                    </div>
                    <input
                      type="text"
                      value={createForm.promoCode}
                      placeholder="e.g. RED-DISC-7X9K"
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          promoCode: e.target.value.toUpperCase().replace(/\s+/g, ''),
                        }))
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Reward Type *</label>
                    <select
                      value={createForm.prizeType}
                      onChange={(e) => handlePrizeTypeChange(e.target.value)}
                    >
                      <option value="DiscountCustom">Custom Discount (%)</option>
                      <option value="CashbackOnPurchases">Cashback on Purchases (%)</option>
                      <option value="FreeDrink">Free Drink</option>
                      <option value="FreeDessert">Free Dessert</option>
                      <option value="SuperPrize">Super Prize (Free Order Cap)</option>
                    </select>
                  </div>

                  {createForm.prizeType === 'DiscountCustom' && (
                    <div className="form-group">
                      <div className="label-row">
                        <label>Discount Percentage (%) *</label>
                        <span className="val-preview">{createForm.discountPercent}%</span>
                      </div>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={createForm.discountPercent}
                        onChange={(e) => handleDiscountChange(e.target.value)}
                        required
                      />
                      <div className="quick-chips">
                        {[10, 15, 20, 25, 30, 50].map((num) => (
                          <button
                            key={num}
                            type="button"
                            className={`chip ${createForm.discountPercent === num ? 'active' : ''}`}
                            onClick={() => handleDiscountChange(num)}
                          >
                            {num}%
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {createForm.prizeType === 'CashbackOnPurchases' && (
                    <div className="form-group">
                      <div className="label-row">
                        <label>Cashback Percentage (%) *</label>
                        <span className="val-preview">{createForm.cashbackPercent}%</span>
                      </div>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={createForm.cashbackPercent}
                        onChange={(e) => handleCashbackChange(e.target.value)}
                        required
                      />
                      <div className="quick-chips">
                        {[5, 10, 15, 20, 25, 50].map((num) => (
                          <button
                            key={num}
                            type="button"
                            className={`chip ${createForm.cashbackPercent === num ? 'active' : ''}`}
                            onClick={() => handleCashbackChange(num)}
                          >
                            {num}%
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <div className="label-row">
                      <label>Validity Period (from creation) *</label>
                      <span className="val-preview">{createForm.expiryDays} {createForm.expiryDays === 1 ? 'day' : 'days'}</span>
                    </div>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={createForm.expiryDays}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          expiryDays: Math.min(30, Math.max(1, parseInt(e.target.value, 10) || 1)),
                        }))
                      }
                      required
                    />
                    <div className="quick-chips">
                      {[1, 3, 7, 14, 30].map((days) => (
                        <button
                          key={days}
                          type="button"
                          className={`chip ${createForm.expiryDays === days ? 'active' : ''}`}
                          onClick={() => setCreateForm((prev) => ({ ...prev, expiryDays: days }))}
                        >
                          {days}d
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Prize Title</label>
                    <input
                      type="text"
                      value={createForm.prizeName}
                      placeholder="e.g. 20% Discount"
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, prizeName: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Prize Description</label>
                    <textarea
                      rows="2"
                      value={createForm.prizeDescription}
                      placeholder="e.g. Get 20% off your entire order."
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
                        <span>Create Promo Code</span>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* View Details Modal */}
        <AnimatePresence>
          {selectedPromo && (
            <div className="admin-promos__modal-backdrop" onClick={() => setSelectedPromo(null)}>
              <motion.div
                className="admin-promos__modal"
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.25 }}
              >
                <div className="admin-promos__modal-header">
                  <div className="modal-title-group">
                    <h2>Promo Details</h2>
                    <p>Information about this promo code and activation status</p>
                  </div>
                  <button
                    type="button"
                    className="close-btn"
                    onClick={() => setSelectedPromo(null)}
                    aria-label="Close modal"
                  >
                    ✕
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
                      onClick={() => handleCopy(selectedPromo.promoCode)}
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
                        {!selectedPromo.isActive
                          ? 'Inactive'
                          : selectedPromo.isExpired
                          ? 'Expired'
                          : selectedPromo.isClaimed
                          ? 'Claimed & Active'
                          : 'Unclaimed (Ready)'}
                      </span>
                    </div>

                    <div className="detail-box">
                      <span className="label">Created Date</span>
                      <span className="val">{formatDate(selectedPromo.activatedAt)}</span>
                    </div>

                    <div className="detail-box">
                      <span className="label">Expiration Date</span>
                      <span className="val">{formatDate(selectedPromo.expiresAt)}</span>
                    </div>
                  </div>

                  <div className="detail-box wide">
                    <span className="label">Description</span>
                    <p className="val-text">{selectedPromo.prizeDescription || 'No description provided.'}</p>
                  </div>

                  <div className="detail-box wide">
                    <span className="label">Claimed By</span>
                    {selectedPromo.isClaimed && selectedPromo.claimedBy ? (
                      <div className="claimed-user-card">
                        <div className="user-avatar">
                          {selectedPromo.claimedBy.avatarUrl ? (
                            <img src={selectedPromo.claimedBy.avatarUrl} alt="" />
                          ) : (
                            <span>{(selectedPromo.claimedBy.name || 'U')[0].toUpperCase()}</span>
                          )}
                        </div>
                        <div className="user-info">
                          <span className="name">{selectedPromo.claimedBy.name}</span>
                          <span className="email">{selectedPromo.claimedBy.email}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="unclaimed-notice">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>Assigned to Pixel (AI). Ready for any customer to activate on /promos.</span>
                      </div>
                    )}
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
                  <button
                    type="button"
                    className={`admin-promos__btn-danger ${!isSuperAdmin ? 'admin-promos__btn-danger--locked' : ''}`}
                    onClick={() => {
                      if (!isSuperAdmin) {
                        showToast('Access denied. Only Super Admin can delete promo codes.');
                      } else {
                        const p = selectedPromo;
                        setSelectedPromo(null);
                        setPromoToDelete(p);
                      }
                    }}
                    title={isSuperAdmin ? 'Delete Promo' : 'Access denied (Super Admin only)'}
                  >
                    Delete Promo
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {promoToDelete && (
            <div className="admin-promos__modal-backdrop" onClick={() => setPromoToDelete(null)}>
              <motion.div
                className="admin-promos__modal admin-promos__modal--sm"
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <div className="delete-modal-content">
                  <div className="delete-icon-wrap">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </div>
                  <h3>Delete Promo Code?</h3>
                  <p>
                    Are you sure you want to delete promo code <strong>{promoToDelete.promoCode}</strong>? This action cannot be undone.
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
                      onClick={handleDeletePromo}
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete Promo'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
};

export default AdminPromos;
