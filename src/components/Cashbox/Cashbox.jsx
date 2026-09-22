import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../../utils/config';
import { fetchWithRefresh } from '../../utils/fetchWithRefresh';
import { useAuth } from '../../context/AuthContext';
import CashboxTopBar from './components/CashboxTopBar';
import CashboxSidebar from './components/CashboxSidebar';
import CashboxProductGrid from './components/CashboxProductGrid';
import CashboxReceipt from './components/CashboxReceipt';
import CashboxPromoModal from './components/CashboxPromoModal';
import './Cashbox.scss';

const Cashbox = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['All', 'Main Drinks', 'Specialty Drinks', 'Desserts']);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState([]);

  const [toast, setToast] = useState('');
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);

  const cashierName = user?.name || user?.username || user?.Name || 'Anna K.';
  const cashierAvatar = user?.profilePictureUrl || user?.ProfilePictureUrl || user?.avatarUrl || user?.avatar || null;

  const fetchInitData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithRefresh(`${API_URL}/api/cashbox/init`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.products)) {
          setProducts(data.products);
        }
        if (Array.isArray(data.categories) && data.categories.length > 0) {
          setCategories(data.categories);
        }
      }
    } catch (err) {
      console.error('Failed to load cashbox data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitData();
  }, [fetchInitData]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((item) => {
      const name = (item.displayName || item.name || '').toLowerCase();
      const desc = (item.displayDescription || item.description || '').toLowerCase();
      const category = (item.category || '').toLowerCase();

      const matchesSearch = !q || name.includes(q) || desc.includes(q) || category.includes(q);
      if (!matchesSearch) return false;

      if (selectedCategory === 'All') return true;
      return item.category?.toLowerCase() === selectedCategory.toLowerCase();
    });
  }, [products, searchQuery, selectedCategory]);

  const getProductPrice = (item) => {
    const raw = item.prices?.price !== undefined ? item.prices.price : item.price;
    const base = typeof raw === 'number' ? raw : parseFloat(raw) || 0;
    return Number(base.toFixed(2));
  };

  const addToCart = (product) => {
    const prodId = product._id || product.id;
    const price = getProductPrice(product);
    const prodName = product.displayName || product.name || 'Item';
    const prodImg = product.imageUrl || product.image || '';

    setCartItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.productId === prodId);
      if (existingIdx > -1) {
        const next = [...prev];
        next[existingIdx] = { ...next[existingIdx], qty: next[existingIdx].qty + 1 };
        return next;
      }
      return [
        ...prev,
        {
          id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          productId: prodId,
          name: prodName,
          image: prodImg,
          price,
          qty: 1,
        },
      ];
    });
  };

  const updateItemQty = (id, delta) => {
    setCartItems((prev) => {
      return prev
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.qty + delta;
            return nextQty > 0 ? { ...item, qty: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  const removeCartItem = (id) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const totalAmount = useMemo(() => {
    const sum = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
    return Number(sum.toFixed(2));
  }, [cartItems]);

  const totalItemsCount = cartItems.reduce((acc, item) => acc + item.qty, 0);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleConfirmOrder = async () => {
    if (cartItems.length === 0) {
      showToast('Receipt is empty! Please add products.');
      return;
    }
    try {
      await fetchWithRefresh(`${API_URL}/api/cashbox/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payMethod: 'Cash',
          products: cartItems.map((item) => ({ productId: item.productId, quantity: item.qty })),
          initialAmount: totalAmount,
          totalAmount: totalAmount,
        }),
      });
    } catch {}
    showToast(`Order confirmed: ${totalAmount.toFixed(2)} ₼`);
    clearCart();
    setIsReceiptModalOpen(false);
  };

  return (
    <div className="cashbox-view">
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

      <CashboxTopBar
        cashierName={cashierName}
        cashierAvatar={cashierAvatar}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <div className="cashbox-view__workspace">
        <CashboxSidebar
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          onPromoClick={() => setIsPromoModalOpen(true)}
        />

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

        <aside className="cashbox-view__checkout">
          <CashboxReceipt
            cartItems={cartItems}
            onUpdateQty={updateItemQty}
            onRemoveItem={removeCartItem}
            onClearCart={clearCart}
            totalAmount={totalAmount}
          />

          <motion.button
            type="button"
            className="cashbox-confirm-btn"
            whileTap={{ scale: 0.98 }}
            onClick={handleConfirmOrder}
            disabled={cartItems.length === 0}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Confirm</span>
          </motion.button>
        </aside>
      </div>

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
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {totalItemsCount > 0 && (
              <span className="cashbox-mobile-trigger__badge">{totalItemsCount}</span>
            )}
          </div>
          <span className="cashbox-mobile-trigger__label">Electronic Receipt</span>
        </div>

        <div className="cashbox-mobile-trigger__right">
          <span className="cashbox-mobile-trigger__amount">{totalAmount.toFixed(2)} ₼</span>
          <svg
            className="cashbox-mobile-trigger__chevron"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </div>
      </motion.button>

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
              initial={{ opacity: 0, y: 100, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.96 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="cashbox-modal__header">
                <h3>Current Order</h3>
                <button
                  type="button"
                  className="cashbox-modal__close"
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

                <motion.button
                  type="button"
                  className="cashbox-confirm-btn"
                  whileTap={{ scale: 0.98 }}
                  onClick={handleConfirmOrder}
                  disabled={cartItems.length === 0}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Confirm</span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CashboxPromoModal
        isOpen={isPromoModalOpen}
        onClose={() => setIsPromoModalOpen(false)}
      />
    </div>
  );
};

export default Cashbox;
