import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '../AdminLayout/AdminLayout';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';
import DeleteConfirmModal from '../../Elements/DeleteConfirmModal';
import AnimatedModalWrapper from '../../Elements/AnimatedModalWrapper';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import './Reviews.scss';

const PAGE_SIZE = 12;

const CATEGORIES = ['All', 'Delivery', 'Products', 'Service', 'Staff'];
const STATUSES = ['All', 'Verification', 'Pending', 'Published', 'Cancelled'];
const RATINGS = [
  { value: 'all', label: 'All Ratings' },
  { value: '5', label: '5 Stars (★★★★★)' },
  { value: '4', label: '4 Stars (★★★★☆)' },
  { value: '3', label: '3 Stars (★★★☆☆)' },
  { value: '2', label: '2 Stars (★★☆☆☆)' },
  { value: '1', label: '1 Star (★☆☆☆☆)' },
];
const LANGUAGES = [
  { value: 'all', label: 'All Languages' },
  { value: 'Russian', label: '🇷🇺 Russian' },
  { value: 'English', label: '🇬🇧 English' },
  { value: 'Azerbaijani', label: '🇦🇿 Azerbaijani' },
  { value: 'none', label: 'Unspecified' },
];

const formatBakuDate = (isoStr) => {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Baku',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
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

const getLanguageFlag = (lang) => {
  if (!lang) return null;
  const l = lang.toLowerCase();
  if (l.includes('ru')) return { flag: '🇷🇺', label: 'RU' };
  if (l.includes('en')) return { flag: '🇬🇧', label: 'EN' };
  if (l.includes('az')) return { flag: '🇦🇿', label: 'AZ' };
  return { flag: '🌐', label: lang };
};

const renderStars = (rating) => {
  const num = Math.round(Number(rating) || 0);
  return (
    <div className="review-stars" title={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={`star-item ${star <= num ? 'filled' : 'empty'}`}>
          ★
        </span>
      ))}
      <span className="star-num">{Number(rating).toFixed(1)}</span>
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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('table');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [selectedReview, setSelectedReview] = useState(null);
  const [editingReview, setEditingReview] = useState(null);
  const [editFormData, setEditFormData] = useState({
    category: 'Products',
    rating: 5,
    status: 'Published',
    language: 'Russian',
    comment: '',
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchReviews = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    setError('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/reviews`, {
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch reviews: ${res.status}`);
      }

      const data = await res.json();
      setReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching admin reviews:', err);
      setError(err.message || 'Failed to load reviews.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Rednest Admin — Reviews';
    window.scrollTo(0, 0);
    fetchReviews();
  }, [fetchReviews]);

  const stats = useMemo(() => {
    const total = reviews.length;
    const verification = reviews.filter((r) => r.status === 'Verification').length;
    const pending = reviews.filter((r) => r.status === 'Pending').length;
    const published = reviews.filter((r) => r.status === 'Published').length;
    const cancelled = reviews.filter((r) => r.status === 'Cancelled').length;

    const avgRating = total > 0
      ? (reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / total).toFixed(1)
      : '0.0';

    const totalLikes = reviews.reduce((acc, r) => acc + (r.likesCount || 0), 0);

    return { total, verification, pending, published, cancelled, avgRating, totalLikes };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      if (statusFilter !== 'All' && r.status !== statusFilter) {
        return false;
      }

      if (categoryFilter !== 'All' && r.category !== categoryFilter) {
        return false;
      }

      if (ratingFilter !== 'all') {
        const targetRating = Number(ratingFilter);
        const rVal = Math.round(Number(r.rating) || 0);
        if (rVal !== targetRating) return false;
      }

      if (languageFilter !== 'all') {
        if (languageFilter === 'none') {
          if (r.language) return false;
        } else if (r.language !== languageFilter) {
          return false;
        }
      }

      if (searchInput.trim()) {
        const query = searchInput.toLowerCase().trim();
        const userName = (r.user?.name || '').toLowerCase();
        const userEmail = (r.user?.email || '').toLowerCase();
        const comment = (r.comment || '').toLowerCase();
        const reviewId = (r.id || '').toLowerCase();
        const orderId = (r.orderId || '').toLowerCase();
        const category = (r.category || '').toLowerCase();

        return (
          userName.includes(query) ||
          userEmail.includes(query) ||
          comment.includes(query) ||
          reviewId.includes(query) ||
          orderId.includes(query) ||
          category.includes(query)
        );
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }
      if (sortBy === 'rating_high') {
        return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      }
      if (sortBy === 'rating_low') {
        return (Number(a.rating) || 0) - (Number(b.rating) || 0);
      }
      if (sortBy === 'likes') {
        return (b.likesCount || 0) - (a.likesCount || 0);
      }
      return 0;
    });
  }, [reviews, statusFilter, categoryFilter, ratingFilter, languageFilter, searchInput, sortBy]);

  const displayedReviews = useMemo(() => {
    return filteredReviews.slice(0, visibleCount);
  }, [filteredReviews, visibleCount]);

  const handleQuickStatusChange = async (reviewId, newStatus) => {
    setActionInProgressId(reviewId);
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

      showToast(`Review status changed to ${newStatus}`);
    } catch (err) {
      console.error('Error changing status:', err);
      showToast(err.message, 'error');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleOpenEdit = (review) => {
    setEditingReview(review);
    setEditFormData({
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
          category: editFormData.category,
          rating: Number(editFormData.rating),
          status: editFormData.status,
          language: editFormData.language || null,
          comment: editFormData.comment,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to update review.');
      }

      const data = await res.json();
      const updatedFields = data.review || editFormData;

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

      showToast('Review updated successfully.');
      setEditingReview(null);
    } catch (err) {
      console.error('Error updating review:', err);
      showToast(err.message, 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
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

      showToast('Review deleted successfully.');
      setReviewToDelete(null);
    } catch (err) {
      console.error('Error deleting review:', err);
      showToast(err.message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <AdminLayout>
      <div className="admin-reviews">
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              className={`admin-reviews__toast ${toastMessage.type === 'error' ? 'admin-reviews__toast--error' : ''}`}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.25 }}
            >
              {toastMessage.type === 'error' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
              <span>{toastMessage.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="admin-reviews__header">
          <div>
            <h1 className="admin-reviews__title">Reviews Management</h1>
            <p className="admin-reviews__subtitle">
              Monitor, moderate, and manage customer feedback across all categories.
            </p>
          </div>
          <div className="admin-reviews__header-actions">
            <button
              type="button"
              className="admin-reviews__btn admin-reviews__btn--secondary"
              onClick={() => fetchReviews(false)}
              disabled={refreshing}
              title="Refresh reviews list"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={refreshing ? 'spin-icon' : ''}
              >
                <path d="M21 2v6h-6" />
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="admin-reviews__stats-grid">
          <div className="admin-reviews__stat-card">
            <div className="stat-icon stat-icon--total">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-label">Total Reviews</span>
              <span className="stat-value">{stats.total}</span>
            </div>
          </div>

          <div className="admin-reviews__stat-card">
            <div className="stat-icon stat-icon--rating">
              <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-label">Average Rating</span>
              <span className="stat-value">{stats.avgRating} <small>/ 5.0</small></span>
            </div>
          </div>

          <div
            className={`admin-reviews__stat-card ${stats.verification > 0 ? 'admin-reviews__stat-card--alert' : ''}`}
            onClick={() => setStatusFilter('Verification')}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon stat-icon--verification">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-label">Needs Verification</span>
              <span className="stat-value stat-value--warn">{stats.verification}</span>
            </div>
          </div>

          <div
            className="admin-reviews__stat-card"
            onClick={() => setStatusFilter('Pending')}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon stat-icon--pending">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-label">Pending Moderation</span>
              <span className="stat-value">{stats.pending}</span>
            </div>
          </div>

          <div
            className="admin-reviews__stat-card"
            onClick={() => setStatusFilter('Published')}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-icon stat-icon--published">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-label">Published Live</span>
              <span className="stat-value stat-value--success">{stats.published}</span>
            </div>
          </div>
        </div>

        <div className="admin-reviews__controls">
          <div className="admin-reviews__status-tabs">
            {STATUSES.map((st) => {
              const count = st === 'All'
                ? reviews.length
                : reviews.filter((r) => r.status === st).length;
              return (
                <button
                  key={st}
                  type="button"
                  className={`status-tab-btn ${statusFilter === st ? 'active' : ''} ${st === 'Verification' && count > 0 ? 'has-badge' : ''}`}
                  onClick={() => setStatusFilter(st)}
                >
                  <span>{st}</span>
                  <span className="tab-count">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="admin-reviews__filter-row">
            <div className="admin-reviews__search-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search by user, email, review text, order ID..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searchInput && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearchInput('')}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="admin-reviews__select-wrapper">
              <label>Category:</label>
              <select
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

            <div className="admin-reviews__select-wrapper">
              <label>Rating:</label>
              <select
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

            <div className="admin-reviews__select-wrapper">
              <label>Language:</label>
              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-reviews__select-wrapper">
              <label>Sort:</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
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
                className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
                title="Table View"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <button
                type="button"
                className={`view-btn ${viewMode === 'cards' ? 'active' : ''}`}
                onClick={() => setViewMode('cards')}
                title="Cards View"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="admin-reviews__loading-state">
            <img src={loaderIcon} alt="Loading..." className="admin-loader" />
            <p>Loading customer reviews...</p>
          </div>
        ) : error ? (
          <div className="admin-reviews__error-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>{error}</p>
            <button
              type="button"
              className="admin-reviews__btn admin-reviews__btn--secondary"
              onClick={() => fetchReviews(false)}
            >
              Try Again
            </button>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="admin-reviews__empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <h3>No Reviews Found</h3>
            <p>
              {searchInput || statusFilter !== 'All' || categoryFilter !== 'All' || ratingFilter !== 'all' || languageFilter !== 'all'
                ? 'No reviews match your filter criteria. Try changing your filters.'
                : 'There are currently no reviews in the system.'}
            </p>
            {(searchInput || statusFilter !== 'All' || categoryFilter !== 'All' || ratingFilter !== 'all' || languageFilter !== 'all') && (
              <button
                type="button"
                className="admin-reviews__btn admin-reviews__btn--secondary"
                onClick={() => {
                  setSearchInput('');
                  setStatusFilter('All');
                  setCategoryFilter('All');
                  setRatingFilter('all');
                  setLanguageFilter('all');
                }}
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : viewMode === 'table' ? (
          <div className="admin-reviews__table-container">
            <table className="admin-reviews__table">
              <thead>
                <tr>
                  <th>Author / User</th>
                  <th>Order</th>
                  <th>Category</th>
                  <th>Rating</th>
                  <th>Review Comment</th>
                  <th>Lang</th>
                  <th>Likes</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="actions-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedReviews.map((review, idx) => {
                  const langInfo = getLanguageFlag(review.language);
                  const isPendingAction = actionInProgressId === review.id;

                  return (
                    <motion.tr
                      key={review.id}
                      custom={idx}
                      variants={fadeUp}
                      initial="hidden"
                      animate="show"
                      className={`review-row review-row--${(review.status || '').toLowerCase()}`}
                    >
                      <td>
                        <div className="author-cell">
                          {review.user?.profilePictureUrl ? (
                            <img
                              src={review.user.profilePictureUrl}
                              alt={review.user?.name || 'User'}
                              className="author-avatar"
                            />
                          ) : (
                            <div className="author-initials">
                              {getInitials(review.user?.name, review.user?.email)}
                            </div>
                          )}
                          <div className="author-meta">
                            <span className="author-name">
                              {review.user?.name || 'Anonymous User'}
                            </span>
                            <span className="author-email">
                              {review.user?.email || '—'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="order-cell">
                          <button
                            type="button"
                            className="id-pill"
                            onClick={() => copyToClipboard(review.orderId, `order-${review.id}`)}
                            title="Click to copy Order ID"
                          >
                            #{String(review.orderId || '').slice(0, 8)}
                            {copiedId === `order-${review.id}` && <span className="copied-tooltip">Copied!</span>}
                          </button>
                          {review.order && (
                            <span className="order-amount">
                              {Number(review.order.totalAmount || 0).toFixed(2)} ₼
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <span className={`category-badge category-badge--${(review.category || '').toLowerCase()}`}>
                          {review.category || 'General'}
                        </span>
                      </td>

                      <td>
                        <div className="rating-cell">
                          <span className="rating-star-icon">★</span>
                          <span className="rating-number">{Number(review.rating || 0).toFixed(1)}</span>
                        </div>
                      </td>

                      <td>
                        <div
                          className="comment-preview"
                          title={review.comment}
                          onClick={() => setSelectedReview(review)}
                        >
                          {review.comment ? (
                            review.comment.length > 80
                              ? `${review.comment.slice(0, 80)}...`
                              : review.comment
                          ) : (
                            <em className="empty-text">No text comment</em>
                          )}
                        </div>
                      </td>

                      <td>
                        {langInfo ? (
                          <span className="lang-tag" title={review.language}>
                            {langInfo.flag} {langInfo.label}
                          </span>
                        ) : (
                          <span className="lang-tag lang-tag--none">—</span>
                        )}
                      </td>

                      <td>
                        <span className="likes-badge">
                          <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                          {review.likesCount || 0}
                        </span>
                      </td>

                      <td>
                        <span className={`status-pill status-pill--${(review.status || '').toLowerCase()}`}>
                          <span className="status-dot" />
                          {review.status || 'Pending'}
                        </span>
                      </td>

                      <td>
                        <div className="date-cell">
                          <span>{formatRelativeTime(review.createdAt)}</span>
                          <small>{formatBakuDate(review.createdAt)}</small>
                        </div>
                      </td>

                      <td>
                        <div className="actions-cell">
                          {review.status !== 'Published' && (
                            <button
                              type="button"
                              className="action-btn action-btn--approve"
                              onClick={() => handleQuickStatusChange(review.id, 'Published')}
                              disabled={isPendingAction}
                              title="Approve & Publish"
                            >
                              ✓
                            </button>
                          )}

                          {review.status !== 'Verification' && (
                            <button
                              type="button"
                              className="action-btn action-btn--verify"
                              onClick={() => handleQuickStatusChange(review.id, 'Verification')}
                              disabled={isPendingAction}
                              title="Mark for Verification"
                            >
                              ⚠️
                            </button>
                          )}

                          {review.status !== 'Cancelled' && (
                            <button
                              type="button"
                              className="action-btn action-btn--cancel"
                              onClick={() => handleQuickStatusChange(review.id, 'Cancelled')}
                              disabled={isPendingAction}
                              title="Cancel / Reject"
                            >
                              ✕
                            </button>
                          )}

                          <button
                            type="button"
                            className="action-btn action-btn--view"
                            onClick={() => setSelectedReview(review)}
                            title="View Details"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            className="action-btn action-btn--edit"
                            onClick={() => handleOpenEdit(review)}
                            title="Edit Review"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            className="action-btn action-btn--delete"
                            onClick={() => setReviewToDelete(review)}
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
        ) : (
          <div className="admin-reviews__cards-grid">
            {displayedReviews.map((review, idx) => {
              const langInfo = getLanguageFlag(review.language);
              const isPendingAction = actionInProgressId === review.id;

              return (
                <motion.div
                  key={review.id}
                  custom={idx}
                  variants={fadeUp}
                  initial="hidden"
                  animate="show"
                  className={`review-card review-card--${(review.status || '').toLowerCase()}`}
                >
                  <div className="review-card__header">
                    <div className="author-meta">
                      {review.user?.profilePictureUrl ? (
                        <img
                          src={review.user.profilePictureUrl}
                          alt={review.user?.name || 'User'}
                          className="author-avatar"
                        />
                      ) : (
                        <div className="author-initials">
                          {getInitials(review.user?.name, review.user?.email)}
                        </div>
                      )}
                      <div>
                        <h4 className="author-name">{review.user?.name || 'Anonymous User'}</h4>
                        <span className="author-email">{review.user?.email || 'No email'}</span>
                      </div>
                    </div>
                    <span className={`status-pill status-pill--${(review.status || '').toLowerCase()}`}>
                      <span className="status-dot" />
                      {review.status || 'Pending'}
                    </span>
                  </div>

                  <div className="review-card__meta-bar">
                    <span className={`category-badge category-badge--${(review.category || '').toLowerCase()}`}>
                      {review.category || 'General'}
                    </span>
                    {renderStars(review.rating)}
                    {langInfo && (
                      <span className="lang-tag">
                        {langInfo.flag} {langInfo.label}
                      </span>
                    )}
                  </div>

                  <div className="review-card__body">
                    <p className="comment-text">
                      {review.comment || <em className="empty-text">No text feedback provided.</em>}
                    </p>
                  </div>

                  <div className="review-card__order-info">
                    <span className="order-label">
                      Order: #{String(review.orderId || '').slice(0, 8)}
                    </span>
                    <span className="likes-badge">
                      <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                      {review.likesCount || 0}
                    </span>
                    <span className="date-text">{formatRelativeTime(review.createdAt)}</span>
                  </div>

                  <div className="review-card__actions">
                    <div className="quick-status-group">
                      {review.status !== 'Published' && (
                        <button
                          type="button"
                          className="status-btn status-btn--published"
                          onClick={() => handleQuickStatusChange(review.id, 'Published')}
                          disabled={isPendingAction}
                        >
                          Approve
                        </button>
                      )}
                      {review.status !== 'Verification' && (
                        <button
                          type="button"
                          className="status-btn status-btn--verify"
                          onClick={() => handleQuickStatusChange(review.id, 'Verification')}
                          disabled={isPendingAction}
                        >
                          Verify
                        </button>
                      )}
                      {review.status !== 'Cancelled' && (
                        <button
                          type="button"
                          className="status-btn status-btn--cancel"
                          onClick={() => handleQuickStatusChange(review.id, 'Cancelled')}
                          disabled={isPendingAction}
                        >
                          Reject
                        </button>
                      )}
                    </div>

                    <div className="utility-actions">
                      <button
                        type="button"
                        className="icon-action-btn"
                        onClick={() => setSelectedReview(review)}
                        title="View Details"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="icon-action-btn"
                        onClick={() => handleOpenEdit(review)}
                        title="Edit Review"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="icon-action-btn icon-action-btn--danger"
                        onClick={() => setReviewToDelete(review)}
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

        {filteredReviews.length > visibleCount && (
          <div className="admin-reviews__load-more">
            <button
              type="button"
              className="admin-reviews__btn admin-reviews__btn--secondary"
              onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            >
              Load More Reviews ({filteredReviews.length - visibleCount} remaining)
            </button>
          </div>
        )}

        {selectedReview && (
          <AnimatedModalWrapper
            isOpen={!!selectedReview}
            onClose={() => setSelectedReview(null)}
            targetBorderRadius="24px"
          >
            <div className="review-details-modal" onClick={(e) => e.stopPropagation()}>
              <div className="review-details-modal__header">
                <div className="title-group">
                  <h3>Review Details</h3>
                  <span className="review-id">ID: {selectedReview.id}</span>
                </div>
                <button
                  type="button"
                  className="close-modal-btn"
                  onClick={() => setSelectedReview(null)}
                >
                  ✕
                </button>
              </div>

              <div className="review-details-modal__body">
                <div className="detail-section">
                  <h4 className="detail-section__title">Author Information</h4>
                  <div className="author-card">
                    {selectedReview.user?.profilePictureUrl ? (
                      <img
                        src={selectedReview.user.profilePictureUrl}
                        alt={selectedReview.user?.name || 'User'}
                        className="author-avatar lg"
                      />
                    ) : (
                      <div className="author-initials lg">
                        {getInitials(selectedReview.user?.name, selectedReview.user?.email)}
                      </div>
                    )}
                    <div className="author-info">
                      <span className="name">{selectedReview.user?.name || 'Anonymous User'}</span>
                      <span className="email">{selectedReview.user?.email || 'No email registered'}</span>
                      <span className="user-id">User ID: {selectedReview.userId}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4 className="detail-section__title">Order Summary</h4>
                  <div className="order-summary-box">
                    <div className="order-summary-item">
                      <span className="label">Order ID</span>
                      <span className="value code-font">{selectedReview.orderId}</span>
                    </div>
                    {selectedReview.order && (
                      <>
                        <div className="order-summary-item">
                          <span className="label">Order Date</span>
                          <span className="value">{formatBakuDate(selectedReview.order.createdAt)}</span>
                        </div>
                        <div className="order-summary-item">
                          <span className="label">Order Status</span>
                          <span className="value status-text">{selectedReview.order.status}</span>
                        </div>
                        <div className="order-summary-item">
                          <span className="label">Total Amount</span>
                          <span className="value price-text">{Number(selectedReview.order.totalAmount || 0).toFixed(2)} ₼</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="detail-section">
                  <h4 className="detail-section__title">Feedback & Rating</h4>
                  <div className="feedback-summary-box">
                    <div className="feedback-header">
                      <div>
                        <span className="category-tag">{selectedReview.category}</span>
                        {selectedReview.language && (
                          <span className="lang-tag">
                            {getLanguageFlag(selectedReview.language)?.flag} {selectedReview.language}
                          </span>
                        )}
                      </div>
                      <div className="rating-box">{renderStars(selectedReview.rating)}</div>
                    </div>
                    <div className="comment-full-box">
                      <p>{selectedReview.comment || <em>No written feedback.</em>}</p>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4 className="detail-section__title">Status & Moderation</h4>
                  <div className="moderation-summary-box">
                    <div className="mod-item">
                      <span className="label">Current Status:</span>
                      <span className={`status-pill status-pill--${(selectedReview.status || '').toLowerCase()}`}>
                        <span className="status-dot" />
                        {selectedReview.status}
                      </span>
                    </div>
                    <div className="mod-item">
                      <span className="label">Created:</span>
                      <span className="value">{formatBakuDate(selectedReview.createdAt)}</span>
                    </div>
                    <div className="mod-item">
                      <span className="label">Status Updated:</span>
                      <span className="value">{formatBakuDate(selectedReview.statusUpdatedAt)}</span>
                    </div>
                    <div className="mod-item">
                      <span className="label">Likes Count:</span>
                      <span className="value">{selectedReview.likesCount || 0} user(s) liked</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="review-details-modal__footer">
                <div className="status-quick-select">
                  <label>Change Status:</label>
                  <select
                    value={selectedReview.status}
                    onChange={(e) => handleQuickStatusChange(selectedReview.id, e.target.value)}
                  >
                    <option value="Published">Published</option>
                    <option value="Verification">Verification</option>
                    <option value="Pending">Pending</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="footer-btns">
                  <button
                    type="button"
                    className="admin-reviews__btn admin-reviews__btn--secondary"
                    onClick={() => {
                      const r = selectedReview;
                      setSelectedReview(null);
                      handleOpenEdit(r);
                    }}
                  >
                    Edit Review
                  </button>
                  <button
                    type="button"
                    className="admin-reviews__btn admin-reviews__btn--danger"
                    onClick={() => {
                      const r = selectedReview;
                      setSelectedReview(null);
                      setReviewToDelete(r);
                    }}
                  >
                    Delete Review
                  </button>
                </div>
              </div>
            </div>
          </AnimatedModalWrapper>
        )}

        {editingReview && (
          <AnimatedModalWrapper
            isOpen={!!editingReview}
            onClose={() => !isSavingEdit && setEditingReview(null)}
            targetBorderRadius="24px"
          >
            <div className="review-edit-modal" onClick={(e) => e.stopPropagation()}>
              <div className="review-edit-modal__header">
                <h3>Edit Review</h3>
                <button
                  type="button"
                  className="close-modal-btn"
                  onClick={() => !isSavingEdit && setEditingReview(null)}
                  disabled={isSavingEdit}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="review-edit-modal__form">
                <div className="form-row form-row--2">
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      value={editFormData.category}
                      onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
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
                      value={editFormData.rating}
                      onChange={(e) => setEditFormData({ ...editFormData, rating: Number(e.target.value) })}
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

                <div className="form-row form-row--2">
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
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
                      value={editFormData.language}
                      onChange={(e) => setEditFormData({ ...editFormData, language: e.target.value })}
                    >
                      <option value="">Unspecified</option>
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
                    value={editFormData.comment}
                    onChange={(e) => setEditFormData({ ...editFormData, comment: e.target.value })}
                    placeholder="Write or edit customer review comment..."
                  />
                </div>

                <div className="review-edit-modal__actions">
                  <button
                    type="button"
                    className="admin-reviews__btn admin-reviews__btn--secondary"
                    onClick={() => setEditingReview(null)}
                    disabled={isSavingEdit}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="admin-reviews__btn admin-reviews__btn--primary"
                    disabled={isSavingEdit}
                  >
                    {isSavingEdit ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img src={loaderIcon} alt="Saving..." style={{ width: '18px', height: '18px' }} />
                        Saving...
                      </span>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </AnimatedModalWrapper>
        )}

        <DeleteConfirmModal
          isOpen={!!reviewToDelete}
          onClose={() => !isDeleting && setReviewToDelete(null)}
          onConfirm={handleConfirmDelete}
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
