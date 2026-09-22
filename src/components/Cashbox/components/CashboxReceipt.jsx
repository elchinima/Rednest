import React from 'react';

const CashboxReceipt = ({
  cartItems,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  subtotal = 0,
  promoDiscount = 0,
  totalAmount = 0,
  appliedPromo = null,
  onRemovePromo,
  onOpenPromoModal,
}) => {
  return (
    <div className="cashbox-receipt">
      <div className="cashbox-receipt__zigzag" />

      <div className="cashbox-receipt__header">
        <div className="cashbox-receipt__header-top">
          <span className="cashbox-receipt__title">Electronic Receipt</span>
          {cartItems.length > 0 && (
            <button
              type="button"
              className="cashbox-receipt__clear-btn"
              onClick={onClearCart}
              title="Clear receipt"
            >
              Clear
            </button>
          )}
        </div>
        <div className="cashbox-receipt__divider-dashed" />
      </div>

      <div className="cashbox-receipt__body">
        {cartItems.length === 0 ? (
          <div className="cashbox-receipt__empty">
            <span>Receipt is empty</span>
            <small>Select beverages or desserts from the catalog</small>
          </div>
        ) : (
          <div className="cashbox-receipt__items">
            {cartItems.map((item) => {
              const lineTotal = (item.price * item.qty).toFixed(2);
              return (
                <div key={item.id} className="cashbox-receipt__row">
                  {item.image && (
                    <div className="cashbox-receipt__thumb-wrap">
                      <img
                        src={item.image}
                        alt=""
                        className="cashbox-receipt__thumb-img"
                        onError={(e) => {
                          e.currentTarget.parentElement.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div className="cashbox-receipt__col-name">
                    <span className="cashbox-receipt__item-name">
                      {item.name}
                    </span>
                    <div className="cashbox-receipt__stepper">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.id, -1)}
                        className="cashbox-receipt__step-btn"
                        title="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="cashbox-receipt__qty">x{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.id, 1)}
                        className="cashbox-receipt__step-btn"
                        title="Increase quantity"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                        className="cashbox-receipt__del-btn"
                        title="Remove item"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="cashbox-receipt__col-price">
                    <span className="cashbox-receipt__item-total">{lineTotal} ₼</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {cartItems.length > 0 && (
          <div className="cashbox-receipt__promo-section">
            {appliedPromo ? (
              <div className="cashbox-receipt__promo-card">
                <div className="cashbox-receipt__promo-header">
                  <div className="cashbox-receipt__promo-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 9a3 3 0 0 1 0 6v3a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3a3 3 0 0 1 0-6V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
                      <path d="M9 9h.01" />
                      <path d="M15 15h.01" />
                      <path d="M16 8L8 16" />
                    </svg>
                    <span>{appliedPromo.promoCode}</span>
                  </div>
                  {onRemovePromo && (
                    <button
                      type="button"
                      className="cashbox-receipt__promo-remove"
                      onClick={onRemovePromo}
                      title="Remove promo code"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="cashbox-receipt__promo-details">
                  <span className="cashbox-receipt__promo-prize">
                    {appliedPromo.prizeName || 'Promo Discount'}
                  </span>
                  {promoDiscount > 0 && (
                    <span className="cashbox-receipt__promo-amount">
                      -{promoDiscount.toFixed(2)} ₼
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="cashbox-receipt__add-promo-btn"
                onClick={onOpenPromoModal}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 9a3 3 0 0 1 0 6v3a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3a3 3 0 0 1 0-6V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
                  <path d="M9 9h.01" />
                  <path d="M15 15h.01" />
                  <path d="M16 8L8 16" />
                </svg>
                <span>Use Promo Code</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="cashbox-receipt__footer">
        <div className="cashbox-receipt__divider-dashed" />
        {promoDiscount > 0 && (
          <div className="cashbox-receipt__subtotal-group">
            <div className="cashbox-receipt__summary-row">
              <span className="cashbox-receipt__summary-label">Subtotal:</span>
              <span className="cashbox-receipt__summary-val">{subtotal.toFixed(2)} ₼</span>
            </div>
            <div className="cashbox-receipt__summary-row cashbox-receipt__summary-row--discount">
              <span className="cashbox-receipt__summary-label">
                Promo Discount {appliedPromo ? `(${appliedPromo.promoCode})` : ''}:
              </span>
              <span className="cashbox-receipt__summary-val">-{promoDiscount.toFixed(2)} ₼</span>
            </div>
          </div>
        )}
        <div className="cashbox-receipt__total-row">
          <span className="cashbox-receipt__total-label">Total:</span>
          <span className="cashbox-receipt__total-val">
            {totalAmount.toFixed(2)} ₼
          </span>
        </div>
      </div>
    </div>
  );
};

export default CashboxReceipt;
