import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../AdminLayout/AdminLayout';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';
import DeleteConfirmModal from '../../Elements/DeleteConfirmModal';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import './Reviews.scss';

const PAGE_SIZE = 12;

const CATEGORIES = ['All Categories', 'Products', 'Service', 'Delivery', 'Staff'];
const STATUSES = ['All Statuses', 'Published', 'Verification', 'Pending', 'Cancelled'];
const RATINGS = [
  { value: 'all', label: 'All Ratings' },
  { value: '5', label: '5 Stars (★★★★★)' },
  { value: '4', label: '4 Stars (★★★★☆)' },
  { value: '3', label: '3 Stars (★★★☆☆)' },
  { value: '2', label: '2 Stars (★★☆☆☆)' },
  { value: '1', label: '1 Star (★☆☆☆☆)' },
];

const formatDate = (isoStr) => {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
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

const getStatusBadge = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'published') return { label: 'Published', className: 'badge badge--success' };
  if (s === 'verification') return { label: 'Verification', className: 'badge badge--warning' };
  if (s === 'pending') return { label: 'Pending', className: 'badge badge--info' };
  if (s === 'cancelled') return { label: 'Cancelled', className: 'badge badge--danger' };
  return { label: status || 'Pending', className: 'badge badge--muted' };
};

const getCategoryBadge = (cat) => {
  const c = (cat || '').toLowerCase();
  if (c === 'delivery') return { label: 'Delivery', className: 'badge badge--info' };
  if (c === 'products') return { label: 'Products', className: 'badge badge--success' };
  if (c === 'service') return { label: 'Service', className: 'badge badge--warning' };
  if (c === 'staff') return { label: 'Staff', className: 'badge badge--purple' };
  return { label: cat || 'General', className: 'badge badge--muted' };
};

const renderStars = (rating) => {
  const num = Math.round(Number(rating) || 0);
  return (
    <div className="admin-reviews__stars" title={`${rating} / 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={`star-char ${star <= num ? 'filled' : 'empty'}`}>
          ★
        </span>
      ))}
      <span className="star-val">{Number(rating).toFixed(1)}</span>
    </div>
  );
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  }),
};

const AdminReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('table');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [selectedReview, setSelectedReview] = useState(null);
  const [editingReview, setEditingReview] = useState(null);
  const [editForm, setEditForm] = useState({
    category: 'Products',
    rating: 5,
    status: 'Published',
    language: '',
    comment: '',
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingReviewId, setUpdatingReviewId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const showToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3500);
  };

  const fetchReviews = useCallback(async () => {
    setError('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/reviews`, {
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error(`Failed to load reviews (${res.status})`);
      }

      const data = await res.json();
      setReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading reviews:', err);
      setError(err.message || 'Failed to load reviews.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    if (selectedReview || editingReview || reviewToDelete) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedReview, editingReview, reviewToDelete]);

  const stats = useMemo(() => {
    const total = reviews.length;
    const verification = reviews.filter((r) => r.status === 'Verification').length;
    const published = reviews.filter((r) => r.status === 'Published').length;
    const avgRating = total > 0
      ? (reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / total).toFixed(1)
      : '0.0';

    return { total, verification, published, avgRating };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      if (statusFilter !== 'All Statuses' && r.status !== statusFilter) {
        return false;
      }

      if (categoryFilter !== 'All Categories' && r.category !== categoryFilter) {
        return false;
      }

      if (ratingFilter !== 'all') {
        const target = Number(ratingFilter);
        const rVal = Math.round(Number(r.rating) || 0);
        if (rVal !== target) return false;
      }

      if (searchInput.trim()) {
        const query = searchInput.toLowerCase().trim();
        const userName = (r.user?.name || '').toLowerCase();
        const userEmail = (r.user?.email || '').toLowerCase();
        const comment = (r.comment || '').toLowerCase();
        const reviewId = (r.id || '').toLowerCase();
        const orderId = (r.orderId || '').toLowerCase();

        return (
          userName.includes(query) ||
          userEmail.includes(query) ||
          comment.includes(query) ||
          reviewId.includes(query) ||
          orderId.includes(query)
        );
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'rating_high') return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      if (sortBy === 'rating_low') return (Number(a.rating) || 0) - (Number(b.rating) || 0);
      if (sortBy === 'likes') return (b.likesCount || 0) - (a.likesCount || 0);
      return 0;
    });
  }, [reviews, statusFilter, categoryFilter, ratingFilter, searchInput, sortBy]);

  const visibleReviews = useMemo(() => {
    return filteredReviews.slice(0, visibleCount);
  }, [filteredReviews, visibleCount]);

  const handleUpdateStatus = async (reviewId, newStatus) => {
    setUpdatingReviewId(reviewId);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/reviews/${reviewId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to update review status.');
      }

      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? { ...r, status: newStatus, statusUpdatedAt: new Date().toISOString() }
            : r
        )
      );

      if (selectedReview && selectedReview.id === reviewId) {
        setSelectedReview((prev) => ({
          ...prev,
          status: newStatus,
          statusUpdatedAt: new Date().toISOString(),
        }));
      }

      showToast(`Status updated to "${newStatus}"`);
    } catch (err) {
      console.error('Error changing status:', err);
      showToast(err.message);
    } finally {
      setUpdatingReviewId(null);
    }
  };

  const openEditModal = (review) => {
    setEditingReview(review);
    setEditForm({
      category: review.category || 'Products',
      rating: Number(review.rating) || 5,
      status: review.status || 'Published',
      language: review.language || '',
      comment: review.comment || '',
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingReview) return;

    setIsSavingEdit(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/reviews/${editingReview.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          category: editForm.category,
          rating: Number(editForm.rating),
          status: editForm.status,
          language: editForm.language || null,
          comment: editForm.comment,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to update review.');
      }

      const data = await res.json();
      const updatedFields = data.review || editForm;

      setReviews((prev) =>
        prev.map((r) =>
          r.id === editingReview.id
            ? {
                ...r,
                ...updatedFields,
                statusUpdatedAt: updatedFields.statusUpdatedAt || new Date().toISOString(),
              }
            : r
        )
      );

      if (selectedReview && selectedReview.id === editingReview.id) {
        setSelectedReview((prev) => ({
          ...prev,
          ...updatedFields,
          statusUpdatedAt: updatedFields.statusUpdatedAt || new Date().toISOString(),
        }));
      }

      showToast('Review updated successfully');
      setEditingReview(null);
    } catch (err) {
      console.error('Error updating review:', err);
      showToast(err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!reviewToDelete) return;
    setIsDeleting(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/reviews/${reviewToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to delete review.');
      }

      setReviews((prev) => prev.filter((r) => r.id !== reviewToDelete.id));

      if (selectedReview && selectedReview.id === reviewToDelete.id) {
        setSelectedReview(null);
      }

      showToast('Review deleted successfully');
      setReviewToDelete(null);
    } catch (err) {
      console.error('Error deleting review:', err);
      showToast(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(`Copied: ${text.slice(0, 16)}...`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <AdminLayout>
      <div className="admin-reviews">
        <AnimatePresence>
          {successToast && (
            <motion.div
              className="admin-reviews__toast"
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
          className="admin-reviews__header"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div>
            <h1 className="admin-reviews__title">Reviews</h1>
            <p className="admin-reviews__subtitle">
              Customer feedback, star ratings, and moderation controls
            </p>
          </div>
        </motion.div>

        <div className="admin-reviews__stats">
          <motion.div
            className="admin-reviews__stat-card"
            style={{ '--accent': '#ef4444' }}
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="show"
          >
            <div className="admin-reviews__stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div className="admin-reviews__stat-body">
              <span className="admin-reviews__stat-value">{loading ? '...' : stats.total}</span>
              <span className="admin-reviews__stat-label">Total Reviews</span>
              <span className="admin-reviews__stat-sub">Across all categories</span>
            </div>
          </motion.div>

          <motion.div
            className="admin-reviews__stat-card"
            style={{ '--accent': '#fbbf24' }}
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="show"
          >
            <div className="admin-reviews__stat-icon">
              <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div className="admin-reviews__stat-body">
              <span className="admin-reviews__stat-value highlight">
                {loading ? '...' : `${stats.avgRating} ★`}
              </span>
              <span className="admin-reviews__stat-label">Average Rating</span>
              <span className="admin-reviews__stat-sub">Out of 5.0 stars</span>
            </div>
          </motion.div>

          <motion.div
            className="admin-reviews__stat-card"
            style={{ '--accent': '#f59e0b', cursor: 'pointer' }}
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            onClick={() => setStatusFilter('Verification')}
          >
            <div className="admin-reviews__stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className="admin-reviews__stat-body">
              <span className="admin-reviews__stat-value">{loading ? '...' : stats.verification}</span>
              <span className="admin-reviews__stat-label">Verification</span>
              <span className="admin-reviews__stat-sub">Needs attention</span>
            </div>
          </motion.div>

          <motion.div
            className="admin-reviews__stat-card"
            style={{ '--accent': '#10b981', cursor: 'pointer' }}
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            onClick={() => setStatusFilter('Published')}
          >
            <div className="admin-reviews__stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div className="admin-reviews__stat-body">
              <span className="admin-reviews__stat-value">{loading ? '...' : stats.published}</span>
              <span className="admin-reviews__stat-label">Published</span>
              <span className="admin-reviews__stat-sub">Live on site</span>
            </div>
          </motion.div>
        </div>

        <div className="admin-reviews__controls">
          <div className="admin-reviews__search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              id="admin-reviews-search"
              type="text"
              placeholder="Search by author, email, review text, or order ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button
                type="button"
                className="admin-reviews__search-clear"
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

          <div className="admin-reviews__filters">
            <div className="admin-reviews__select-wrap">
              <select
                id="admin-reviews-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-reviews__select-wrap">
              <select
                id="admin-reviews-category-filter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-reviews__select-wrap">
              <select
                id="admin-reviews-rating-filter"
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
              >
                {RATINGS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-reviews__select-wrap">
              <select
                id="admin-reviews-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="rating_high">Highest Rating</option>
                <option value="rating_low">Lowest Rating</option>
                <option value="likes">Most Liked</option>
              </select>
            </div>

            <div className="admin-reviews__view-toggle">
              <button
                type="button"
                className={`admin-reviews__view-btn${viewMode === 'table' ? ' active' : ''}`}
                onClick={() => setViewMode('table')}
                title="Table View"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </button>
              <button
                type="button"
                className={`admin-reviews__view-btn${viewMode === 'grid' ? ' active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="admin-reviews__error-banner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
            <button type="button" onClick={() => fetchReviews()}>Try Again</button>
          </div>
        )}

        {loading && (
          <div className="admin-reviews__loading">
            <img src={loaderIcon} alt="Loading..." className="admin-reviews__spinner" />
            <span>Loading customer reviews...</span>
          </div>
        )}

        {!loading && filteredReviews.length === 0 && (
          <div className="admin-reviews__empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <h3>No Reviews Found</h3>
            <p>
              {searchInput || statusFilter !== 'All Statuses' || categoryFilter !== 'All Categories' || ratingFilter !== 'all'
                ? 'No reviews match your filter criteria.'
                : 'There are currently no reviews in the system.'}
            </p>
          </div>
        )}

        {!loading && filteredReviews.length > 0 && viewMode === 'table' && (
          <div className="admin-reviews__table-card">
            <div className="admin-reviews__table-responsive">
              <table className="admin-reviews__table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Order</th>
                    <th>Category</th>
                    <th>Rating</th>
                    <th>Review Content</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleReviews.map((r, i) => {
                    const statusBadge = getStatusBadge(r.status);
                    const catBadge = getCategoryBadge(r.category);

                    return (
                      <motion.tr
                        key={r.id}
                        custom={i}
                        variants={fadeUp}
                        initial="hidden"
                        animate="show"
                      >
                        <td>
                          <div className="admin-reviews__user-cell">
                            <div className="admin-reviews__avatar">
                              {r.user?.profilePictureUrl ? (
                                <img src={r.user.profilePictureUrl} alt={r.user.name || r.user.email} />
                              ) : (
                                <span>{getInitials(r.user?.name, r.user?.email)}</span>
                              )}
                            </div>
                            <div className="admin-reviews__user-info">
                              <span className="admin-reviews__user-name">
                                {r.user?.name || 'Anonymous'}
                              </span>
                              <span className="admin-reviews__user-email">
                                {r.user?.email || '—'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="admin-reviews__copy-id"
                            onClick={() => copyToClipboard(r.orderId, `order-${r.id}`)}
                            title="Click to copy Order ID"
                          >
                            <code>#{String(r.orderId || '').slice(0, 8)}</code>
                            {copiedId === `order-${r.id}` ? (
                              <span className="copied-tag">✓</span>
                            ) : (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                            )}
                          </button>
                        </td>

                        <td>
                          <span className={catBadge.className}>{catBadge.label}</span>
                        </td>

                        <td>
                          {renderStars(r.rating)}
                        </td>

                        <td>
                          <div
                            className="admin-reviews__comment-preview"
                            title={r.comment}
                            onClick={() => setSelectedReview(r)}
                          >
                            {r.comment || <em className="text-muted">No comment text</em>}
                          </div>
                        </td>

                        <td>
                          <div className="admin-reviews__status-select-wrap">
                            <select
                              className={statusBadge.className}
                              value={r.status || 'Pending'}
                              disabled={updatingReviewId === r.id}
                              onChange={(e) => handleUpdateStatus(r.id, e.target.value)}
                            >
                              <option value="Published">Published</option>
                              <option value="Verification">Verification</option>
                              <option value="Pending">Pending</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </div>
                        </td>

                        <td>
                          <div className="admin-reviews__date-cell">
                            <span className="date-main">{formatDate(r.createdAt)}</span>
                            <span className="date-rel">{formatRelativeTime(r.createdAt)}</span>
                          </div>
                        </td>

                        <td className="text-right">
                          <div className="admin-reviews__action-buttons">
                            <button
                              type="button"
                              className="admin-reviews__action-btn"
                              onClick={() => setSelectedReview(r)}
                              title="View Review Details"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>

                            <button
                              type="button"
                              className="admin-reviews__action-btn"
                              onClick={() => openEditModal(r)}
                              title="Edit Review"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L16.5 3.5z" />
                              </svg>
                            </button>

                            <button
                              type="button"
                              className="admin-reviews__action-btn admin-reviews__action-btn--delete"
                              onClick={() => setReviewToDelete(r)}
                              title="Delete Review"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && filteredReviews.length > 0 && viewMode === 'grid' && (
          <div className="admin-reviews__grid">
            {visibleReviews.map((r, i) => {
              const statusBadge = getStatusBadge(r.status);
              const catBadge = getCategoryBadge(r.category);

              return (
                <motion.div
                  key={r.id}
                  className="admin-reviews__grid-card"
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  animate="show"
                >
                  <div className="admin-reviews__grid-top">
                    <div className="admin-reviews__avatar">
                      {r.user?.profilePictureUrl ? (
                        <img src={r.user.profilePictureUrl} alt={r.user.name || r.user.email} />
                      ) : (
                        <span>{getInitials(r.user?.name, r.user?.email)}</span>
                      )}
                    </div>
                    <div className="admin-reviews__grid-identity">
                      <h4>{r.user?.name || 'Anonymous User'}</h4>
                      <span className="email">{r.user?.email || 'No email'}</span>
                    </div>

                    <div className="admin-reviews__status-select-wrap">
                      <select
                        className={statusBadge.className}
                        value={r.status || 'Pending'}
                        disabled={updatingReviewId === r.id}
                        onChange={(e) => handleUpdateStatus(r.id, e.target.value)}
                      >
                        <option value="Published">Published</option>
                        <option value="Verification">Verification</option>
                        <option value="Pending">Pending</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div className="admin-reviews__grid-middle">
                    <div className="meta-chips">
                      <span className={catBadge.className}>{catBadge.label}</span>
                      {renderStars(r.rating)}
                    </div>
                    <p className="comment-body">
                      {r.comment || <em className="text-muted">No text feedback provided.</em>}
                    </p>
                  </div>

                  <div className="admin-reviews__grid-footer">
                    <div className="order-info">
                      <span className="order-tag">#{String(r.orderId || '').slice(0, 8)}</span>
                      <span className="date-tag">{formatRelativeTime(r.createdAt)}</span>
                    </div>

                    <div className="actions">
                      <button
                        type="button"
                        className="admin-reviews__action-btn"
                        onClick={() => setSelectedReview(r)}
                        title="View Details"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="admin-reviews__action-btn"
                        onClick={() => openEditModal(r)}
                        title="Edit Review"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="admin-reviews__action-btn admin-reviews__action-btn--delete"
                        onClick={() => setReviewToDelete(r)}
                        title="Delete Review"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {filteredReviews.length > visibleCount && !loading && (
          <div className="admin-reviews__load-more">
            <button
              type="button"
              className="admin-reviews__btn-secondary"
              onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            >
              Load More Reviews ({filteredReviews.length - visibleCount} remaining)
            </button>
          </div>
        )}

        <AnimatePresence>
          {selectedReview && (
            <div
              className="admin-reviews__modal-backdrop"
              onClick={() => setSelectedReview(null)}
            >
              <motion.div
                className="admin-reviews__modal"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="admin-reviews__modal-header">
                  <div className="admin-reviews__modal-identity">
                    <div className="admin-reviews__avatar admin-reviews__avatar--lg">
                      {selectedReview.user?.profilePictureUrl ? (
                        <img
                          src={selectedReview.user.profilePictureUrl}
                          alt={selectedReview.user.name || selectedReview.user.email}
                        />
                      ) : (
                        <span>{getInitials(selectedReview.user?.name, selectedReview.user?.email)}</span>
                      )}
                    </div>
                    <div className="admin-reviews__modal-meta">
                      <h2>{selectedReview.user?.name || 'Anonymous User'}</h2>
                      <p>{selectedReview.user?.email || 'No email registered'}</p>
                      <div className="admin-reviews__modal-chips">
                        <code>ID: {selectedReview.id}</code>
                        <button
                          type="button"
                          className="copy-btn"
                          onClick={() => copyToClipboard(selectedReview.id, 'modal-id')}
                        >
                          {copiedId === 'modal-id' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="admin-reviews__modal-close"
                    onClick={() => setSelectedReview(null)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                <div className="admin-reviews__modal-body">
                  <div className="admin-reviews__detail-row">
                    <div className="admin-reviews__detail-box">
                      <span className="label">Order Reference</span>
                      <span className="val code-val">#{String(selectedReview.orderId || '').slice(0, 16)}</span>
                    </div>
                    <div className="admin-reviews__detail-box">
                      <span className="label">Category</span>
                      <span className="val">{selectedReview.category}</span>
                    </div>
                  </div>

                  <div className="admin-reviews__detail-row">
                    <div className="admin-reviews__detail-box">
                      <span className="label">Rating</span>
                      <span className="val highlight">{renderStars(selectedReview.rating)}</span>
                    </div>
                    <div className="admin-reviews__detail-box">
                      <span className="label">Current Status</span>
                      <span className="val">{selectedReview.status}</span>
                    </div>
                  </div>

                  <div className="admin-reviews__comment-card">
                    <span className="label">Customer Review</span>
                    <p>{selectedReview.comment || <em>No text provided.</em>}</p>
                  </div>

                  <div className="admin-reviews__detail-row">
                    <div className="admin-reviews__detail-box">
                      <span className="label">Created Date</span>
                      <span className="val">{formatDate(selectedReview.createdAt)}</span>
                    </div>
                    <div className="admin-reviews__detail-box">
                      <span className="label">Likes Received</span>
                      <span className="val">{selectedReview.likesCount || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="admin-reviews__modal-footer">
                  <div className="status-change-group">
                    <label>Change Status:</label>
                    <select
                      value={selectedReview.status}
                      onChange={(e) => handleUpdateStatus(selectedReview.id, e.target.value)}
                    >
                      <option value="Published">Published</option>
                      <option value="Verification">Verification</option>
                      <option value="Pending">Pending</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="footer-actions">
                    <button
                      type="button"
                      className="admin-reviews__btn-secondary"
                      onClick={() => {
                        const r = selectedReview;
                        setSelectedReview(null);
                        openEditModal(r);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="admin-reviews__btn-danger"
                      onClick={() => {
                        const r = selectedReview;
                        setSelectedReview(null);
                        setReviewToDelete(r);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {editingReview && (
            <div
              className="admin-reviews__modal-backdrop"
              onClick={() => !isSavingEdit && setEditingReview(null)}
            >
              <motion.div
                className="admin-reviews__modal admin-reviews__modal--edit"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="admin-reviews__modal-header">
                  <h2>Edit Review</h2>
                  <button
                    type="button"
                    className="admin-reviews__modal-close"
                    onClick={() => !isSavingEdit && setEditingReview(null)}
                    disabled={isSavingEdit}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSaveEdit} className="admin-reviews__edit-form">
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Category</label>
                      <select
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        required
                      >
                        <option value="Delivery">Delivery</option>
                        <option value="Products">Products</option>
                        <option value="Service">Service</option>
                        <option value="Staff">Staff</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Rating (1 - 5)</label>
                      <select
                        value={editForm.rating}
                        onChange={(e) => setEditForm({ ...editForm, rating: Number(e.target.value) })}
                        required
                      >
                        <option value="5">5 Stars (★★★★★)</option>
                        <option value="4">4 Stars (★★★★☆)</option>
                        <option value="3">3 Stars (★★★☆☆)</option>
                        <option value="2">2 Stars (★★☆☆☆)</option>
                        <option value="1">1 Star (★☆☆☆☆)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Status</label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        required
                      >
                        <option value="Published">Published</option>
                        <option value="Verification">Verification</option>
                        <option value="Pending">Pending</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Language</label>
                      <select
                        value={editForm.language}
                        onChange={(e) => setEditForm({ ...editForm, language: e.target.value })}
                      >
                        <option value="">Auto / Unspecified</option>
                        <option value="Russian">Russian</option>
                        <option value="English">English</option>
                        <option value="Azerbaijani">Azerbaijani</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Review Comment Text</label>
                    <textarea
                      rows={5}
                      value={editForm.comment}
                      onChange={(e) => setEditForm({ ...editForm, comment: e.target.value })}
                      placeholder="Customer feedback..."
                    />
                  </div>

                  <div className="admin-reviews__modal-footer">
                    <button
                      type="button"
                      className="admin-reviews__btn-secondary"
                      onClick={() => setEditingReview(null)}
                      disabled={isSavingEdit}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="admin-reviews__btn-primary"
                      disabled={isSavingEdit}
                    >
                      {isSavingEdit ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <DeleteConfirmModal
          isOpen={!!reviewToDelete}
          onClose={() => !isDeleting && setReviewToDelete(null)}
          onConfirm={handleDeleteReview}
          title="Delete Review"
          text="Are you sure you want to permanently delete this customer review? This action cannot be undone."
          confirmLabel="Delete Review"
          loading={isDeleting}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminReviews;
