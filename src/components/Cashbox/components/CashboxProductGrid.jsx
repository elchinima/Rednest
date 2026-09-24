import React from 'react';
import { motion } from 'framer-motion';

const CashboxProductGrid = ({
  products,
  loading,
  onAddToCart,
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

  const getProductImage = (item) => {
    if (!item) return null;
    if (item.images && typeof item.images === 'object') {
      const icon = item.images.icon || item.images.Icon;
      const img = item.images.image || item.images.Image;
      if (icon) return icon;
      if (img) return img;
    }
    if (typeof item.images === 'string' && item.images.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(item.images);
        const icon = parsed.icon || parsed.Icon;
        const img = parsed.image || parsed.Image;
        if (icon) return icon;
        if (img) return img;
      } catch {}
    }
    return item.imageUrl || item.iconUrl || item.image || item.icon || null;
  };

  return (
    <div className="cashbox-grid">
      {products.map((item) => {
        const prodId = item._id || item.id;
        const price = getProductPrice(item);
        const name = item.displayName || item.name || 'Product';
        const img = getProductImage(item);

        return (
          <motion.div
            key={prodId}
            className="cashbox-card"
            whileTap={{ scale: 0.98 }}
            onClick={() => onAddToCart(item)}
          >
            <div className="cashbox-card__img-wrap">
              {img ? (
                <img
                  src={img}
                  alt={name}
                  className="cashbox-card__img"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const ph = e.currentTarget.parentElement?.querySelector('.cashbox-card__img-placeholder');
                    if (ph) ph.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className="cashbox-card__img-placeholder"
                style={{ display: img ? 'none' : 'flex' }}
              >
                ☕
              </div>
            </div>

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
    </div>
  );
};

export default CashboxProductGrid;
