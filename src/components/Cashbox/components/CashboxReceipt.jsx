import React from 'react';

const CashboxReceipt = ({
  cartItems,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  totalAmount,
}) => {
  return (
    <div className="cashbox-receipt">
      {/* Perforated receipt top zig-zag */}
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

      {/* Itemized Order List */}
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
                  <div className="cashbox-receipt__col-name">
                    <span className="cashbox-receipt__item-name">
                      {item.name} {item.size ? `(${item.size})` : ''}
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
      </div>

      {/* Order Total */}
      <div className="cashbox-receipt__footer">
        <div className="cashbox-receipt__divider-dashed" />
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
