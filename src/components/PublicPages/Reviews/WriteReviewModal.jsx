import React, { useState, useEffect } from 'react';
import AnimatedModalWrapper from '../../Elements/AnimatedModalWrapper';
import { REVIEW_CATEGORIES } from './reviewsData';
import './WriteReviewModal.scss';

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #ef4444, #b91c1c)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #ec4899, #be185d)',
  'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  'linear-gradient(135deg, #10b981, #047857)',
  'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  'linear-gradient(135deg, #06b6d4, #0e7490)'
];

const WriteReviewModal = ({ isOpen, onClose, onSubmitReview }) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [authorName, setAuthorName] = useState('');
  const [category, setCategory] = useState('coffee');
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRating(5);
      setHoverRating(0);
      setAuthorName('');
      setCategory('coffee');
      setTitle('');
      setComment('');
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (loading) return;
    setError('');
    onClose();
  };

  const getInitials = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return 'U';
    return trimmed.charAt(0).toUpperCase();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');

    if (!authorName.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!title.trim()) {
      setError('Please provide a review headline.');
      return;
    }
    if (!comment.trim() || comment.trim().length < 10) {
      setError('Please write at least 10 characters for your review.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const randomGradient = AVATAR_GRADIENTS[Math.floor(Math.random() * AVATAR_GRADIENTS.length)];
      const firstName = authorName.trim().split(/\s+/)[0];

      const newReview = {
        id: `rev-${Date.now()}`,
        author: firstName,
        initials: getInitials(firstName),
        avatarGradient: randomGradient,
        rating: Number(rating),
        date: 'Just now',
        dateTimestamp: Date.now(),
        title: title.trim(),
        comment: comment.trim(),
        category: category,
        likes: 1,
        userLiked: true
      };

      onSubmitReview(newReview);
      setLoading(false);
      onClose();
    }, 300);
  };

  return (
    <AnimatedModalWrapper
      isOpen={isOpen}
      onClose={handleClose}
      targetBorderRadius="24px"
    >
      <div className="review-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="review-modal__close"
          onClick={handleClose}
          disabled={loading}
          aria-label="Close modal"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="review-modal__header">
          <div className="review-modal__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>
          <h2 className="review-modal__title">Write a Review</h2>
          <p className="review-modal__desc">
            Share your experience with the Rednest community
          </p>
        </div>

        <form className="review-modal__form" onSubmit={handleSubmit}>
          {error && (
            <div className="review-modal__error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="review-modal__field">
            <label>
              Your Rating <span className="review-modal__required">*</span>
            </label>
            <div className="review-modal__stars">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    className={`review-modal__star-btn ${isFilled ? 'active' : ''}`}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    aria-label={`${star} Stars`}
                  >
                    <svg viewBox="0 0 24 24" width="28" height="28" fill={isFilled ? '#fbbf24' : 'none'} stroke={isFilled ? '#fbbf24' : 'rgba(255,255,255,0.25)'} strokeWidth="1.5">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="review-modal__row">
            <div className="review-modal__field">
              <label htmlFor="rev-author">
                Your Name <span className="review-modal__required">*</span>
              </label>
              <input
                id="rev-author"
                type="text"
                placeholder="e.g. Alex"
                value={authorName}
                onChange={(e) => {
                  setAuthorName(e.target.value);
                  if (error) setError('');
                }}
                required
                disabled={loading}
              />
            </div>

            <div className="review-modal__field">
              <label htmlFor="rev-category">
                Category
              </label>
              <select
                id="rev-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={loading}
              >
                {REVIEW_CATEGORIES.filter(c => c.id !== 'all').map(c => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="review-modal__field">
            <label htmlFor="rev-title">
              Headline <span className="review-modal__required">*</span>
            </label>
            <input
              id="rev-title"
              type="text"
              placeholder="e.g. Best Red Latte in the city!"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError('');
              }}
              required
              disabled={loading}
            />
          </div>

          <div className="review-modal__field">
            <label htmlFor="rev-comment">
              Your Review <span className="review-modal__required">*</span>
            </label>
            <textarea
              id="rev-comment"
              placeholder="Share details about the taste, coffee quality, atmosphere, barista service..."
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                if (error) setError('');
              }}
              rows={3}
              required
              disabled={loading}
            />
          </div>

          <div className="review-modal__actions">
            <button
              type="button"
              className="cta-btn sm review-modal__btn review-modal__btn--cancel"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="cta-btn sm review-modal__btn review-modal__btn--submit"
              disabled={loading || !authorName.trim() || !title.trim() || !comment.trim()}
            >
              {loading ? 'Publishing...' : 'Publish Review'}
            </button>
          </div>
        </form>
      </div>
    </AnimatedModalWrapper>
  );
};

export default WriteReviewModal;
