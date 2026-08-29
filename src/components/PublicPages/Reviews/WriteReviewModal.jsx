import React, { useState, useEffect, useMemo } from 'react';
import AnimatedModalWrapper from '../../Elements/AnimatedModalWrapper';
import OrderSelectModal from './OrderSelectModal';
import { REVIEW_CATEGORIES, formatBakuDateTime } from './reviewsData';
import { getProductIconUrl } from '../../../utils/productIcons';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import loaderIconRed from '../../../assets/icons/loader-animated-red.svg';
import './WriteReviewModal.scss';

const RATING_LABELS = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Exceptional'
};

const WriteReviewModal = ({ isOpen, onClose, onSubmitReview }) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [category, setCategory] = useState('Delivery');
  const [comment, setComment] = useState('');
  const [eligibleOrders, setEligibleOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setRating(5);
    setHoverRating(0);
    setCategory('Delivery');
    setComment('');
    setError('');
    setSubmitting(false);
    setLoadingOrders(true);
    setIsOrderModalOpen(false);

    const apiUrl = import.meta.env.VITE_API_URL || '';
    fetchWithRefresh(`${apiUrl}/api/reviews/eligible-orders`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setEligibleOrders(data || []);
          if (data && data.length > 0) {
            setSelectedOrderId(data[0].id);
          } else {
            setSelectedOrderId('');
          }
        } else {
          setEligibleOrders([]);
          setSelectedOrderId('');
        }
      })
      .catch(() => {
        setEligibleOrders([]);
        setSelectedOrderId('');
      })
      .finally(() => {
        setLoadingOrders(false);
      });
  }, [isOpen]);

  const handleClose = () => {
    if (submitting) return;
    setError('');
    setIsOrderModalOpen(false);
    onClose();
  };

  const selectedOrder = useMemo(() => {
    return eligibleOrders.find((o) => o.id === selectedOrderId) || null;
  }, [eligibleOrders, selectedOrderId]);

  const activeRating = hoverRating || rating;
  const currentLabel = RATING_LABELS[Math.round(activeRating)] || 'Exceptional';
  const sliderPercentage = ((activeRating - 1) / 4) * 100;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');

    if (!selectedOrderId) {
      setError('Please select a completed order for this review.');
      return;
    }

    if (!comment.trim() || comment.trim().length < 5) {
      setError('Please write at least 5 characters for your review.');
      return;
    }

    if (comment.trim().length > 300) {
      setError('Review comment cannot exceed 300 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetchWithRefresh(`${apiUrl}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: selectedOrderId,
          category,
          rating: Number(rating),
          comment: comment.trim()
        })
      });

      const data = await response.json();

      if (response.ok) {
        onSubmitReview(data);
        onClose();
      } else {
        setError(data.message || 'Failed to submit review. Please try again.');
      }
    } catch (err) {
      setError('A network error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
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
            disabled={submitting}
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
              Share your experience on your completed Rednest order
            </p>
          </div>

          {loadingOrders ? (
            <div className="review-modal__loader">
              <img src={loaderIcon} alt="Loading" className="review-modal__spinner" />
              <span>Checking eligible orders...</span>
            </div>
          ) : eligibleOrders.length === 0 ? (
            <div className="review-modal__empty-orders">
              <div className="review-modal__empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h3>No eligible orders found</h3>
              <p>
                You can only write a review after your order status is marked as <strong>Complete</strong>. Each order can only be reviewed once.
              </p>
              <button
                type="button"
                className="cta-btn sm review-modal__btn--close"
                onClick={handleClose}
              >
                Close
              </button>
            </div>
          ) : (
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

              <div className="review-modal__field review-modal__field--rating-top">
                <div className="review-modal__rating-header">
                  <span className="review-modal__label-title">
                    Your Rating <span className="review-modal__required">*</span>
                  </span>
                  <div className="review-modal__rating-pill">
                    <span className="review-modal__rating-val">{Math.round(rating)}</span>
                    <svg className="review-modal__rating-star" viewBox="0 0 24 24" width="14.5" height="14.5" fill="#fbbf24" stroke="#fbbf24" strokeWidth="1">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <span className="review-modal__rating-sep">·</span>
                    <span className="review-modal__rating-text">{currentLabel}</span>
                  </div>
                </div>

                <div className="review-modal__slider-wrapper">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={rating}
                    onChange={(e) => {
                      setRating(Number(e.target.value));
                    }}
                    className="review-modal__slider"
                    style={{
                      background: `linear-gradient(90deg, #ef4444 0%, #fbbf24 ${sliderPercentage}%, rgba(255, 255, 255, 0.12) ${sliderPercentage}%)`
                    }}
                    aria-label="Slide to adjust rating"
                  />
                  <div className="review-modal__slider-ticks">
                    <span className={rating >= 1 ? 'active' : ''} onClick={() => setRating(1)}>1</span>
                    <span className={rating >= 2 ? 'active' : ''} onClick={() => setRating(2)}>2</span>
                    <span className={rating >= 3 ? 'active' : ''} onClick={() => setRating(3)}>3</span>
                    <span className={rating >= 4 ? 'active' : ''} onClick={() => setRating(4)}>4</span>
                    <span className={rating >= 5 ? 'active' : ''} onClick={() => setRating(5)}>5</span>
                  </div>
                </div>
              </div>

              <div className="review-modal__row">
                <div className="review-modal__field review-modal__col">
                  <label htmlFor="rev-category">
                    Category <span className="review-modal__required">*</span>
                  </label>
                  <select
                    id="rev-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={submitting}
                  >
                    {REVIEW_CATEGORIES.filter(c => c.id !== 'all').map(c => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="review-modal__field review-modal__col">
                  <label>
                    Select Order <span className="review-modal__required">*</span>
                  </label>
                  <button
                    type="button"
                    className="review-modal__order-trigger"
                    onClick={() => setIsOrderModalOpen(true)}
                    disabled={submitting}
                    title="Click to choose completed order"
                  >
                    {selectedOrder ? (
                      <div className="review-modal__order-trigger-info">
                        <span className="review-modal__order-trigger-id">
                          #{selectedOrder.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className="review-modal__order-trigger-price">
                          {Number(selectedOrder.totalAmount || 0).toFixed(2)} ₼
                        </span>
                      </div>
                    ) : (
                      <span className="review-modal__order-trigger-placeholder">
                        Choose order...
                      </span>
                    )}

                    <svg className="review-modal__order-trigger-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="review-modal__field">
                <div className="review-modal__label-row">
                  <label htmlFor="rev-comment">
                    Your Review <span className="review-modal__required">*</span>
                  </label>
                  <span className={`review-modal__counter ${comment.length >= 300 ? 'limit' : ''}`}>
                    {comment.length}/300
                  </span>
                </div>
                <textarea
                  id="rev-comment"
                  className="review-modal__textarea--tall"
                  placeholder="Share details about the taste, coffee quality, delivery, staff..."
                  value={comment}
                  onChange={(e) => {
                    setComment(e.target.value.slice(0, 300));
                    if (error) setError('');
                  }}
                  maxLength={300}
                  rows={7}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="review-modal__actions">
                <button
                  type="button"
                  className="cta-btn sm review-modal__btn review-modal__btn--cancel"
                  onClick={handleClose}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cta-btn sm review-modal__btn review-modal__btn--submit"
                  disabled={submitting || !selectedOrderId || !comment.trim()}
                >
                  {submitting ? (
                    <span className="review-btn-loader">
                      <img src={loaderIconRed} alt="Submitting..." style={{ width: '18px', height: '18px' }} />
                      Submitting...
                    </span>
                  ) : 'Submit Review'}
                </button>
              </div>
            </form>
          )}
        </div>
      </AnimatedModalWrapper>

      <OrderSelectModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        orders={eligibleOrders}
        selectedOrderId={selectedOrderId}
        onSelectOrder={(id) => setSelectedOrderId(id)}
      />
    </>
  );
};

export default WriteReviewModal;
