import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCashboxController } from './controllers/useCashboxController';
import CashboxTopBar from './components/CashboxTopBar';
import CashboxSidebar from './components/CashboxSidebar';
import CashboxProductGrid from './components/CashboxProductGrid';
import CashboxReceipt from './components/CashboxReceipt';
import CashboxNumpad from './components/CashboxNumpad';
import './Cashbox.scss';

const Cashbox = () => {
  const {
    cashierName,
    categories,
    filteredProducts,
    loading,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    getProductPrice,
    cartItems,
    addToCart,
    updateItemQty,
    removeCartItem,
    clearCart,
    totalAmount,
    receivedAmount,
    handleNumpadPress,
    handleBanknoteClick,
    changeAmount,
  } = useCashboxController();

  const [toast, setToast] = useState('');
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Total quantity of items currently in receipt
  const totalItemsCount = cartItems.reduce((acc, item) => acc + item.qty, 0);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handlePayCard = () => {
    if (cartItems.length === 0) {
      showToast('Receipt is empty! Please add products.');
      return;
    }
    showToast(`Card Payment successful: ${totalAmount.toFixed(2)} ₼ (Demo Visual Mode)`);
    setIsReceiptModalOpen(false);
  };

  const handlePayCash = () => {
    if (cartItems.length === 0) {
      showToast('Receipt is empty! Please add products.');
      return;
    }
    showToast(`Cash Payment successful: Received ${receivedAmount} ₼, Change ${changeAmount.toFixed(2)} ₼`);
    setIsReceiptModalOpen(false);
  };

  return (
    <div className="cashbox-view">
      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="cashbox-view__toast"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar with Brand, Search, Cashier */}
      <CashboxTopBar
        cashierName={cashierName}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* 3-Column POS Workspace (Desktop) / Vertical Stack (Mobile) */}
      <div className="cashbox-view__workspace">
        {/* Left Column (Desktop) / Top Sub-Navbar (Mobile) */}
        <CashboxSidebar
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        {/* Catalog Grid */}
        <main className="cashbox-view__catalog">
          <CashboxProductGrid
            products={filteredProducts}
            loading={loading}
            onAddToCart={addToCart}
            getProductPrice={getProductPrice}
            onResetSearch={() => {
              setSearchQuery('');
              setSelectedCategory('All');
            }}
          />
        </main>

        {/* Right Column (Desktop Only): Electronic Receipt + Touch Numpad */}
        <aside className="cashbox-view__checkout">
          <CashboxReceipt
            cartItems={cartItems}
            onUpdateQty={updateItemQty}
            onRemoveItem={removeCartItem}
            onClearCart={clearCart}
            totalAmount={totalAmount}
          />

          <CashboxNumpad
            receivedAmount={receivedAmount}
            changeAmount={changeAmount}
            totalAmount={totalAmount}
            onNumpadPress={handleNumpadPress}
            onBanknoteClick={handleBanknoteClick}
            onPayCard={handlePayCard}
            onPayCash={handlePayCash}
          />
        </aside>
      </div>

      {/* Mobile Floating Receipt Trigger (Centered at bottom of screen) */}
      <motion.button
        type="button"
        className="cashbox-mobile-trigger"
        onClick={() => setIsReceiptModalOpen(true)}
        whileTap={{ scale: 0.96 }}
        aria-label="Open electronic receipt"
      >
        <div className="cashbox-mobile-trigger__left">
          <div className="cashbox-mobile-trigger__icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {totalItemsCount > 0 && (
              <span className="cashbox-mobile-trigger__badge">{totalItemsCount}</span>
            )}
          </div>
          <div className="cashbox-mobile-trigger__info">
            <span className="cashbox-mobile-trigger__label">Electronic Receipt</span>
            <span className="cashbox-mobile-trigger__sub">
              {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>

        <div className="cashbox-mobile-trigger__right">
          <span className="cashbox-mobile-trigger__total">
            {totalAmount.toFixed(2)} ₼
          </span>
          <div className="cashbox-mobile-trigger__btn">
            <span>View</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>
      </motion.button>

      {/* Mobile Electronic Receipt Modal / Bottom Sheet */}
      <AnimatePresence>
        {isReceiptModalOpen && (
          <motion.div
            className="cashbox-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsReceiptModalOpen(false)}
          >
            <motion.div
              className="cashbox-modal"
              initial={{ y: '100%', opacity: 0.6 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="cashbox-modal__handle-bar" />

              <div className="cashbox-modal__header">
                <div className="cashbox-modal__title-group">
                  <span className="cashbox-modal__title">Electronic Receipt & Checkout</span>
                  <span className="cashbox-modal__items-count">{totalItemsCount} items</span>
                </div>
                <button
                  type="button"
                  className="cashbox-modal__close-btn"
                  onClick={() => setIsReceiptModalOpen(false)}
                  title="Close receipt"
                >
                  ✕
                </button>
              </div>

              <div className="cashbox-modal__scrollable">
                <CashboxReceipt
                  cartItems={cartItems}
                  onUpdateQty={updateItemQty}
                  onRemoveItem={removeCartItem}
                  onClearCart={clearCart}
                  totalAmount={totalAmount}
                />

                <CashboxNumpad
                  receivedAmount={receivedAmount}
                  changeAmount={changeAmount}
                  totalAmount={totalAmount}
                  onNumpadPress={handleNumpadPress}
                  onBanknoteClick={handleBanknoteClick}
                  onPayCard={handlePayCard}
                  onPayCash={handlePayCash}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Cashbox;
