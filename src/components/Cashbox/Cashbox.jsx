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
    shiftTime,
    cashDrawerBalance,
    heldOrdersCount,
    categories,
    filteredProducts,
    loading,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    selectedSizes,
    setProductSize,
    getProductSize,
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
  };

  const handlePayCash = () => {
    if (cartItems.length === 0) {
      showToast('Receipt is empty! Please add products.');
      return;
    }
    showToast(`Cash Payment successful: Received ${receivedAmount} ₼, Change ${changeAmount.toFixed(2)} ₼`);
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

      {/* Top Bar with Brand, Search, Shift, Drawer Balance */}
      <CashboxTopBar
        shiftTime={shiftTime}
        cashierName={cashierName}
        cashDrawerBalance={cashDrawerBalance}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* 3-Column POS Workspace (Variant 2) */}
      <div className="cashbox-view__workspace">
        {/* Left Column: Categories Sidebar */}
        <CashboxSidebar
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          heldOrdersCount={heldOrdersCount}
        />

        {/* Center Column: Interactive DB Product Catalog Grid */}
        <main className="cashbox-view__catalog">
          <CashboxProductGrid
            products={filteredProducts}
            loading={loading}
            onAddToCart={addToCart}
            selectedSizes={selectedSizes}
            onSetProductSize={setProductSize}
            getProductSize={getProductSize}
            getProductPrice={getProductPrice}
            onResetSearch={() => {
              setSearchQuery('');
              setSelectedCategory('All');
            }}
          />
        </main>

        {/* Right Column: Thermal Receipt + Interactive Touch Numpad */}
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
    </div>
  );
};

export default Cashbox;
