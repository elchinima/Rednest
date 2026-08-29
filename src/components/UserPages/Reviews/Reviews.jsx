import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import Navbar from '../../Elements/Navbar';
import Footer from '../../Footer/Footer';
import DeleteConfirmModal from '../../Elements/DeleteConfirmModal';
import WriteReviewModal from '../../PublicPages/Reviews/WriteReviewModal';
import { REVIEW_CATEGORIES, getAvatarGradient, formatBakuDateTime } from '../../PublicPages/Reviews/reviewsData';
import './Reviews.scss';

const apiUrl = import.meta.env.VITE_API_URL || '';

const Reviews = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchMyReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let res = await fetchWithRefresh(`${apiUrl}/api/reviews/my`);
      if (!res.ok) {
        // Fallback: fetch all and filter owner
        res = await fetchWithRefresh(`${apiUrl}/api/reviews`);
      }
      if (!res.ok) {
        throw new Error('Failed to load your reviews.');
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      // Filter owner if returned from all
      const myReviews = list.filter(r => r.isOwner || (user && (r.userId === user.id || r.userId === user.Id)));
      setReviews(myReviews);
    } catch (err) {
      console.error('Error fetching personal reviews:', err);
      setError(err.message || 'Could not load your reviews. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    document.title = 'My Reviews · Rednest';
    window.scrollTo(0, 0);
    if (user) {
      fetchMyReviews();
    }
  }, [user, fetchMyReviews]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleConfirmDelete = async () => {
    if (!reviewToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/reviews/${reviewToDelete.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setReviews(prev => prev.filter(r => r.id !== reviewToDelete.id));
        setReviewToDelete(null);
        showToast('🗑️ Review deleted successfully. You can write a new review for this order whenever you like.');
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.message || 'Failed to delete review.');
      }
    } catch {
      showToast('Failed to delete review. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddNewReview = (newReview) => {
    setReviews(prev => [newReview, ...prev]);
    showToast('🎉 Thank you! Your review was published successfully.');
  };

  const filteredReviews = useMemo(() => {
    if (selectedCategory === 'all') return reviews;
    return reviews.filter(r => (r.category || '').toLowerCase() === selectedCategory.toLowerCase());
  }, [reviews, selectedCategory]);

  const totalLikes = useMemo(() => {
    return reviews.reduce((sum, r) => sum + (Number(r.likes) || 0), 0);
  }, [reviews]);

  const averageRating = useMemo(() => {
    if (!reviews || reviews.length === 0) return '0.00';
    const sum = reviews.reduce((acc, r) => acc + Number(r.rating || 0), 0);
    return (sum / reviews.length).toFixed(2);
  }, [reviews]);

  const renderStars = (ratingCount) => {
    const num = Number(ratingCount || 5);
    const formattedRating = num % 1 === 0 ? num : num.toFixed(1);
    return (
      <div className="user-reviews-stars" title={`${ratingCount} out of 5 stars`}>
        <div className="stars-row stars-row--desktop">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg
              key={star}
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill={star <= Math.round(num) ? '#fbbf24' : 'rgba(255,255,255,0.2)'}
              stroke={star <= Math.round(num) ? '#fbbf24' : 'rgba(255,255,255,0.2)'}
              strokeWidth="1"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          ))}
        </div>
        <div className="stars-compact--mobile">
          <span className="rating-num">{formattedRating}</span>
          <svg viewBox="0 0 24 24" width="13" height="13" fill="#fbbf24" stroke="#fbbf24" strokeWidth="1">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
      </div>
    );
  };

  const getCategoryBadge = (catName) => {
    const found = REVIEW_CATEGORIES.find(c => c.id.toLowerCase() === (catName || '').toLowerCase());
    if (found && found.id !== 'all') {
      return (
        <span className="user-review-chip">
          {found.icon} {found.label}
        </span>
      );
    }
    return null;
  };

  const getStatusBadge = (statusStr) => {
    const s = String(statusStr || 'Published').toLowerCase();
    if (s === 'verification') {
      return (
        <span className="user-review-status-badge user-review-status-badge--verification" title="Review is pending verification">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Verification
        </span>
      );
    }
    if (s === 'cancelled') {
      return (
        <span className="user-review-status-badge user-review-status-badge--cancelled" title="Review cancelled">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          Cancelled
        </span>
      );
    }
    return (
      <span className="user-review-status-badge user-review-status-badge--published" title="Review published and public">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Published
      </span>
    );
  };

  return (
    <motion.div
      className="user-reviews-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Navbar />

      <main className="user-reviews-main">
        <div className="user-reviews-ambient-glow user-reviews-ambient-glow--1" />
        <div className="user-reviews-ambient-glow user-reviews-ambient-glow--2" />

        <div className="user-reviews-container">
          <motion.div
            className="user-reviews-hero"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="user-reviews-hero__top">
              <button
                type="button"
                className="user-reviews-back-btn"
                onClick={() => navigate('/profile')}
                title="Back to Profile"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                <span>Profile</span>
              </button>
            </div>

            <h1>My Reviews</h1>
            <p className="user-reviews-hero__desc">
              View your feedback on completed coffee orders, check community reactions, and manage your reviews
            </p>

            {reviews.length > 0 && (
              <div className="user-reviews-stats-bar">
                <div className="user-reviews-stat-card">
                  <span className="stat-label">Total Reviews</span>
                  <strong className="stat-value">{reviews.length}</strong>
                </div>
                <div className="user-reviews-stat-card">
                  <span className="stat-label">Total Likes Received</span>
                  <strong className="stat-value text-red">❤️ {totalLikes}</strong>
                </div>
                <div className="user-reviews-stat-card">
                  <span className="stat-label">Avg Rating Given</span>
                  <strong className="stat-value text-amber">★ {averageRating}</strong>
                </div>
              </div>
            )}

            <div className="user-reviews-hero-actions">
              <button
                type="button"
                className="cta-btn sm user-reviews-hero-btn"
                onClick={() => setIsWriteModalOpen(true)}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>Write a Review</span>
              </button>

              <Link to="/review" className="cta-btn sm user-reviews-hero-btn user-reviews-hero-btn--secondary">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>All Community Reviews</span>
              </Link>
            </div>
          </motion.div>

          {reviews.length > 1 && (
            <div className="user-reviews-categories-bar">
              {REVIEW_CATEGORIES.map((cat) => {
                const count = cat.id === 'all'
                  ? reviews.length
                  : reviews.filter(r => (r.category || '').toLowerCase() === cat.id.toLowerCase()).length;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`user-reviews-cat-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                    {count > 0 && <span className="cat-count">{count}</span>}
                  </button>
                );
              })}
            </div>
          )}

          {loading ? (
            <div className="user-reviews-loading">
              <img src={loaderIcon} alt="Loading..." className="user-reviews-spinner" />
              <p>Loading your reviews...</p>
            </div>
          ) : error ? (
            <div className="user-reviews-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" width="36" height="36">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p>{error}</p>
              <button type="button" className="cta-btn sm" onClick={() => fetchMyReviews()}>
                Try Again
              </button>
            </div>
          ) : filteredReviews.length === 0 ? (
            <motion.div
              className="user-reviews-empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}
            >
              <div className="user-reviews-empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h2>
                {selectedCategory === 'all' ? 'No reviews written yet' : 'No reviews in this category'}
              </h2>
              <p>
                {selectedCategory === 'all'
                  ? 'Share your experience with Rednest after completing an order to help fellow coffee lovers!'
                  : 'You do not have any reviews submitted under this category.'}
              </p>
              <div className="user-reviews-empty-actions">
                <button
                  type="button"
                  className="cta-btn sm user-reviews-empty-btn"
                  onClick={() => setIsWriteModalOpen(true)}
                >
                  Write a Review
                </button>
                <Link to="/orders" className="cta-btn sm user-reviews-empty-btn user-reviews-empty-btn--secondary">
                  View Orders
                </Link>
              </div>
            </motion.div>
          ) : (
            <div className="user-reviews-grid">
              <AnimatePresence mode="popLayout">
                {filteredReviews.map((review, index) => {
                  const authorFirstName = user?.name ? user.name.split(' ')[0] : (review.author || 'You').split(' ')[0];
                  const initialLetter = review.initials || authorFirstName.charAt(0).toUpperCase() || 'U';
                  const likesCount = Number(review.likes) || 0;
                  const avatarUrl = user?.profilePictureUrl || user?.ProfilePictureUrl || review.avatarUrl;

                  return (
                    <motion.div
                      key={review.id}
                      className="user-review-card"
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.25) }}
                    >
                      <div className="user-review-card__header">
                        <div className="user-review-card__author">
                          <div
                            className="user-review-card__avatar"
                            style={{
                              background: getAvatarGradient(review.id || user?.id || authorFirstName)
                            }}
                          >
                            {avatarUrl ? (
                              <img src={avatarUrl} alt={authorFirstName} className="user-review-card__avatar-img" />
                            ) : (
                              initialLetter
                            )}
                          </div>
                          <div className="user-review-card__author-details">
                            <div className="user-review-card__name-row">
                              <span className="user-review-card__name">{authorFirstName}</span>
                              <span className="user-review-card__you-badge">You</span>
                              {getStatusBadge(review.status)}
                            </div>
                            <span className="user-review-card__date" title="Time in Baku (UTC+4)">
                              {formatBakuDateTime(review.createdAt)}
                            </span>
                          </div>
                        </div>

                        <div className="user-review-card__header-right">
                          <div className="user-review-card__rating">
                            {renderStars(review.rating)}
                          </div>
                          <button
                            type="button"
                            className="user-review-card__delete-icon-btn"
                            onClick={() => setReviewToDelete(review)}
                            title="Delete this review"
                            aria-label="Delete this review"
                          >
                            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {getCategoryBadge(review.category) && (
                        <div className="user-review-card__category-row">
                          {getCategoryBadge(review.category)}
                        </div>
                      )}

                      <div className="user-review-card__body">
                        <p className="user-review-card__comment">{review.comment}</p>
                      </div>

                      <div className="user-review-card__footer">
                        <div className="user-review-card__likes-stat" title="Total helpful likes from other customers">
                          <svg viewBox="0 0 24 24" width="15" height="15" fill="#ef4444" stroke="#ef4444" strokeWidth="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                          <span>
                            {likesCount} {likesCount === 1 ? 'like received' : 'likes received'}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="user-review-card__delete-btn"
                          onClick={() => setReviewToDelete(review)}
                        >
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          <span>Delete Review</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>

      <WriteReviewModal
        isOpen={isWriteModalOpen}
        onClose={() => setIsWriteModalOpen(false)}
        onSubmitReview={handleAddNewReview}
      />

      <DeleteConfirmModal
        isOpen={!!reviewToDelete}
        onClose={() => !isDeleting && setReviewToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Review"
        text="Are you sure you want to delete your review? You will be able to write a new review for this order again."
        confirmLabel="Delete Review"
        loading={isDeleting}
      />

      <div className="user-reviews-toast-container">
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              className="user-reviews-toast"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            >
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Footer />
    </motion.div>
  );
};

export default Reviews;
