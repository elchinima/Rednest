import React from 'react';
import { motion } from 'framer-motion';
import AnimatedModalWrapper from '../../Elements/AnimatedModalWrapper';
import { formatBakuDateTime } from './reviewsData';
import { getProductIconUrl } from '../../../utils/productIcons';
import './OrderSelectModal.scss';

const OrderSelectModal = ({ isOpen, onClose, orders = [], selectedOrderId, onSelectOrder }) => {
  if (!isOpen) return null;

  return (
    <AnimatedModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      targetBorderRadius="24px"
    >
      <div className="order-select-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="order-select-modal__close"
          onClick={onClose}
          aria-label="Close order selector"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="order-select-modal__header">
          <div className="order-select-modal__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <h2 className="order-select-modal__title">Select Completed Order</h2>
          <p className="order-select-modal__desc">
            Choose which completed order you would like to evaluate
          </p>
        </div>

        <div className="order-select-modal__list">
          {orders.map((order) => {
            const isSelected = order.id === selectedOrderId;
            const shortId = order.id.slice(0, 8).toUpperCase();
            const total = Number(order.totalAmount || 0).toFixed(2);
            const items = order.items || [];

            return (
              <motion.div
                key={order.id}
                className={`order-select-card ${isSelected ? 'order-select-card--selected' : ''}`}
                onClick={() => {
                  onSelectOrder(order.id);
                  onClose();
                }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="order-select-card__top">
                  <div className="order-select-card__id-group">
                    <span className="order-select-card__id">Order #{shortId}</span>
                    <span className="order-select-card__date" title="Time in Baku (UTC+4)">
                      {formatBakuDateTime(order.createdAt)}
                    </span>
                  </div>

                  <div className="order-select-card__price-group">
                    <span className="order-select-card__price">{total} ₼</span>
                    <div className={`order-select-card__radio ${isSelected ? 'active' : ''}`}>
                      {isSelected && <div className="order-select-card__radio-dot" />}
                    </div>
                  </div>
                </div>

                {items.length > 0 && (
                  <div className="order-select-card__items">
                    {items.map((item, idx) => {
                      const iconUrl = getProductIconUrl(item);
                      return (
                        <div key={idx} className="order-select-card__item-chip" title={`${item.name} (x${item.quantity || 1})`}>
                          <div className="order-select-card__item-img-wrapper">
                            {iconUrl ? (
                              <img src={iconUrl} alt={item.name || 'Product'} className="order-select-card__item-img" />
                            ) : (
                              <span className="order-select-card__item-fallback">☕</span>
                            )}
                          </div>
                          <span className="order-select-card__item-name">{item.name || 'Coffee Item'}</span>
                          <span className="order-select-card__item-qty">x{item.quantity || 1}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="order-select-modal__footer">
          <button
            type="button"
            className="cta-btn sm order-select-modal__btn"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </AnimatedModalWrapper>
  );
};

export default OrderSelectModal;
