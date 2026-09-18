import React from 'react';
import { motion } from 'framer-motion';

const SIZES = ['S', 'M', 'L'];

const CashboxProductGrid = ({
  products,
  loading,
  onAddToCart,
  selectedSizes,
  onSetProductSize,
  getProductPrice,
  onResetSearch,
}) => {
  if (loading) {
    return (
      <div className="cashbox-grid cashbox-grid--loading">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="cashbox-card cashbox-card--skeleton">
            <div className="cashbox-card__skeleton-img" />
            <div className="cashbox-card__skeleton-line" />
            <div className="cashbox-card__skeleton-line cashbox-card__skeleton-line--short" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="cashbox-grid__empty">
        <div className="cashbox-grid__empty-icon">☕</div>
        <h3>No Products Found</h3>
        <p>Try adjusting your search query or select a different category</p>
        {onResetSearch && (
          <button
            type="button"
            className="cashbox-grid__empty-btn"
            onClick={onResetSearch}
          >
            Reset Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="cashbox-grid">
      {products.map((item) => {
        const prodId = item._id || item.id;
        const currentSize = selectedSizes[prodId] || 'M';
        const price = getProductPrice(item, currentSize);
        const name = item.displayName || item.name || 'Product';
        const img = item.imageUrl || item.image;

        // By default show S/M/L for drinks; for desserts/pastries default to M
        const isFood = (item.category || '').toLowerCase().includes('dessert') || (item.category || '').toLowerCase().includes('pastry');
        const availableSizes = item.availableSizes || (isFood ? ['M'] : SIZES);

        return (
          <motion.div
            key={prodId}
            className="cashbox-card"
            whileTap={{ scale: 0.98 }}
            onClick={() => onAddToCart(item)}
          >
            {/* Product Image */}
            <div className="cashbox-card__img-wrap">
              {img ? (
                <img
                  src={img}
                  alt={name}
                  className="cashbox-card__img"
                  loading="lazy"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className="cashbox-card__img-placeholder"
                style={{ display: img ? 'none' : 'flex' }}
              >
                ☕
              </div>

              {/* S / M / L Size Pill Toggle */}
              {availableSizes.length > 1 && (
                <div
                  className="cashbox-card__sizes"
                  onClick={(e) => e.stopPropagation()}
                >
                  {availableSizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      className={`cashbox-card__size-btn ${currentSize === size ? 'cashbox-card__size-btn--active' : ''}`}
                      onClick={() => onSetProductSize(prodId, size)}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="cashbox-card__info">
              <span className="cashbox-card__title" title={name}>
                {name}
              </span>
              <div className="cashbox-card__price-row">
                <span className="cashbox-card__price">
                  {price.toFixed(2)} ₼
                </span>
                <span className="cashbox-card__add-badge">+</span>
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* Quick Custom Charge Item */}
      <div
        className="cashbox-card cashbox-card--custom"
        onClick={() => onAddToCart({
          _id: `custom-${Date.now()}`,
          name: 'Custom Order',
          displayName: 'Custom Order',
          price: 2.00,
          category: 'Other',
        })}
        title="Add Custom Order"
      >
        <div className="cashbox-card__custom-inner">
          <span className="cashbox-card__custom-plus">+</span>
          <span className="cashbox-card__custom-label">Custom Item</span>
        </div>
      </div>
    </div>
  );
};

export default CashboxProductGrid;
