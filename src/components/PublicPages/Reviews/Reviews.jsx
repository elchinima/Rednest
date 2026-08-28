import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../../Elements/Navbar';
import Footer from '../../Footer/Footer';
import WriteReviewModal from './WriteReviewModal';
import AuthModal from '../Auth/AuthModal';
import { useAuth } from '../../../context/AuthContext';
import { REVIEW_CATEGORIES, getAvatarGradient, formatTimeAgo } from './reviewsData';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import './Reviews.scss';

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [likedMap, setLikedMap] = useState(() => {
    try {
      const saved = localStorage.getItem('rednest_liked_reviews');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const { isAuthenticated } = useAuth();

  const fetchReviews = useCallback(async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiUrl}/api/reviews`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data || []);
      }
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Rednest';
    window.scrollTo(0, 0);
    fetchReviews();

    const handleOpenModal = () => {
      if (!isAuthenticated) {
        setIsAuthModalOpen(true);
      } else {
        setIsWriteModalOpen(true);
      }
    };

    window.addEventListener('open-write-review-modal', handleOpenModal);
    return () => window.removeEventListener('open-write-review-modal', handleOpenModal);
  }, [isAuthenticated, fetchReviews]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleOpenWriteReview = () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
    } else {
      setIsWriteModalOpen(true);
    }
  };

  const handleToggleLike = (id) => {
    setLikedMap(prev => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem('rednest_liked_reviews', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleAddNewReview = (newReview) => {
    setReviews(prev => [newReview, ...prev]);
    showToast('🎉 Thank you! Your review was published successfully.');
  };

  const filteredReviews = useMemo(() => {
    if (selectedCategory === 'all') return reviews;
    return reviews.filter(r => (r.category || '').toLowerCase() === selectedCategory.toLowerCase());
  }, [reviews, selectedCategory]);

  const averageRating = useMemo(() => {
    if (!reviews || reviews.length === 0) return '5.0';
    const sum = reviews.reduce((acc, r) => acc + Number(r.rating || 0), 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  const renderStars = (ratingCount) => {
    const num = Number(ratingCount || 5);
    const formattedRating = num % 1 === 0 ? num : num.toFixed(1);
    return (
      <div className="stars-wrapper" title={`${ratingCount} out of 5 stars`}>
        <div className="stars-row stars-row--desktop">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg
              key={star}
              viewBox="0 0 24 24"
              width="16"
              height="16"
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
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="#fbbf24"
            stroke="#fbbf24"
            strokeWidth="1"
          >
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
        <span className="review-category-chip">
          {found.icon} {found.label}
        </span>
      );
    }
    return null;
  };

  return (
    <motion.div
      className="reviews-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Navbar />

      <main className="reviews-main">
        <div className="reviews-ambient-glow reviews-ambient-glow--1" />
        <div className="reviews-ambient-glow reviews-ambient-glow--2" />

        <div className="reviews-container">
          <div className="reviews-hero">
            <h1>Review</h1>
            <p>Discover authentic thoughts and stories from our coffee community.</p>

            <div className="reviews-overall-badge">
              <div className="overall-score">
                <span className="score-num">{averageRating}</span>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="#fbbf24" stroke="#fbbf24" strokeWidth="1">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <span className="score-divider">·</span>
              <span className="score-count">{reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</span>
            </div>

            <div className="reviews-hero__actions">
              <button
                type="button"
                className="write-review-btn"
                onClick={handleOpenWriteReview}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>Write a Review</span>
              </button>
            </div>
          </div>

          <div className="reviews-categories-bar">
            {REVIEW_CATEGORIES.map((cat) => {
              const count = cat.id === 'all'
                ? reviews.length
                : reviews.filter(r => (r.category || '').toLowerCase() === cat.id.toLowerCase()).length;

              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`reviews-category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  <span className="cat-icon">{cat.icon}</span>
                  <span>{cat.label}</span>
                  {count > 0 && <span className="cat-count">{count}</span>}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="reviews-loading-wrapper">
              <img src={loaderIcon} alt="Loading reviews" className="reviews-loading-spinner" />
              <span>Loading reviews...</span>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="reviews-empty-state">
              <div className="reviews-empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <h2>No reviews found</h2>
              <p>
                {selectedCategory === 'all'
                  ? 'Be the first to share your experience with Rednest after completing an order!'
                  : `There are currently no reviews in this category.`}
              </p>
              <button
                type="button"
                className="cta-btn sm reviews-empty-cta"
                onClick={handleOpenWriteReview}
              >
                Write a Review
              </button>
            </div>
          ) : (
            <div className="reviews-grid">
              <AnimatePresence mode="popLayout">
                {filteredReviews.map((review, index) => {
                  const authorFirstName = (review.author || 'Customer').split(' ')[0];
                  const initialLetter = review.initials || authorFirstName.charAt(0).toUpperCase() || 'C';
                  const isLiked = !!likedMap[review.id];

                  return (
                    <motion.div
                      key={review.id}
                      className="review-card"
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.25) }}
                    >
                      <div className="review-card-top">
                        <div className="author-info">
                          <div
                            className="author-avatar"
                            style={{
                              background: getAvatarGradient(review.id || review.userId || review.author)
                            }}
                          >
                            {review.avatarUrl ? (
                              <img src={review.avatarUrl} alt={authorFirstName} className="author-avatar-img" />
                            ) : (
                              initialLetter
                            )}
                          </div>
                          <div className="author-details">
                            <div className="author-name-row">
                              <span className="author-name">{authorFirstName}</span>
                              {getCategoryBadge(review.category)}
                            </div>
                            <span className="review-date">{formatTimeAgo(review.createdAt)}</span>
                          </div>
                        </div>

                        <div className="review-card-rating">
                          {renderStars(review.rating)}
                        </div>
                      </div>

                      <div className="review-body">
                        <p className="review-card-comment">{review.comment}</p>
                      </div>

                      <div className="review-card-footer">
                        <button
                          type="button"
                          className={`like-button ${isLiked ? 'liked' : ''}`}
                          onClick={() => handleToggleLike(review.id)}
                          aria-label="Mark as helpful"
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" fill={isLiked ? '#ef4444' : 'none'} stroke={isLiked ? '#ef4444' : 'currentColor'} strokeWidth="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                          <span>{isLiked ? 'Helpful' : 'Helpful'}</span>
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

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <AnimatePresence>
        {toastMessage && (
          <motion.div
            className="reviews-toast-notification"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20 }}
          >
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </motion.div>
  );
};

export default Reviews;
