import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../../Elements/Navbar';
import Footer from '../../Footer/Footer';
import WriteReviewModal from './WriteReviewModal';
import { INITIAL_REVIEWS } from './reviewsData';
import './Reviews.scss';

const Reviews = () => {
  const [reviews, setReviews] = useState(() => INITIAL_REVIEWS);
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    document.title = 'Review | Rednest';
    window.scrollTo(0, 0);

    const handleOpenModal = () => setIsWriteModalOpen(true);
    window.addEventListener('open-write-review-modal', handleOpenModal);
    return () => window.removeEventListener('open-write-review-modal', handleOpenModal);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleToggleLike = (id) => {
    setReviews(prevReviews =>
      prevReviews.map(rev => {
        if (rev.id === id) {
          const isLiked = rev.userLiked;
          return {
            ...rev,
            userLiked: !isLiked,
            likes: isLiked ? rev.likes - 1 : rev.likes + 1
          };
        }
        return rev;
      })
    );
  };

  const handleAddNewReview = (newReview) => {
    setReviews(prev => [newReview, ...prev]);
    showToast('🎉 Thank you! Your review was published successfully.');
  };

  const renderStars = (ratingCount) => {
    return (
      <div className="stars-row" title={`${ratingCount} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill={star <= Math.round(ratingCount) ? '#fbbf24' : 'rgba(255,255,255,0.2)'}
            stroke={star <= Math.round(ratingCount) ? '#fbbf24' : 'rgba(255,255,255,0.2)'}
            strokeWidth="1"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
        ))}
      </div>
    );
  };

  const averageRating = reviews.length
    ? (reviews.reduce((acc, r) => acc + Number(r.rating || 0), 0) / reviews.length).toFixed(1)
    : '5.0';

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
                <svg viewBox="0 0 24 24" width="16" height="16" fill="#fbbf24" stroke="#fbbf24" strokeWidth="1">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                <span className="score-num">{averageRating}</span>
              </div>
              <span className="score-divider">·</span>
              <span className="score-count">{reviews.length} reviews</span>
            </div>
          </div>

          <div className="reviews-grid">
            <AnimatePresence mode="popLayout">
              {reviews.map((review, index) => (
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
                        style={{ background: review.avatarGradient || 'linear-gradient(135deg, #ef4444, #991b1b)' }}
                      >
                        {review.initials || review.author.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="author-details">
                        <span className="author-name">{review.author}</span>
                        <span className="review-date">{review.date}</span>
                      </div>
                    </div>

                    <div className="review-card-rating">
                      {renderStars(review.rating)}
                    </div>
                  </div>

                  <div className="review-body">
                    <h3 className="review-card-title">{review.title}</h3>
                    <p className="review-card-comment">{review.comment}</p>
                  </div>

                  <div className="review-card-footer">
                    <button
                      type="button"
                      className={`like-button ${review.userLiked ? 'liked' : ''}`}
                      onClick={() => handleToggleLike(review.id)}
                      aria-label="Mark as helpful"
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill={review.userLiked ? '#ef4444' : 'none'} stroke={review.userLiked ? '#ef4444' : 'currentColor'} strokeWidth="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                      </svg>
                      <span>Helpful ({review.likes})</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <WriteReviewModal
        isOpen={isWriteModalOpen}
        onClose={() => setIsWriteModalOpen(false)}
        onSubmitReview={handleAddNewReview}
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
