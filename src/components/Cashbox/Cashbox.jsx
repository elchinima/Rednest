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
  const [appliedPromo, setAppliedPromo] = useState(null);

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
    const prodCategory = product.category || 'General';

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
          category: prodCategory,
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
    setAppliedPromo(null);
  };

  const subtotal = useMemo(() => {
    const sum = cartItems.reduce((acc, item) => acc + item.price * item.qty, 0);
    return Number(sum.toFixed(2));
  }, [cartItems]);

  const promoDiscount = useMemo(() => {
    if (!appliedPromo || cartItems.length === 0 || subtotal <= 0) return 0;

    const pType = String(appliedPromo.prizeType || '').toLowerCase();
    const pName = String(appliedPromo.prizeName || '').toUpperCase();
    const discPercent = appliedPromo.discountPercent || (
      pType === 'discount25' || pName.includes('25%') ? 25 :
      pType === 'discount50' || pName.includes('50%') ? 50 : 0
    );

    if (discPercent > 0) {
      return Number(Math.min(subtotal, (subtotal * discPercent) / 100).toFixed(2));
    }

    if (pType === 'superprize' || pType === '0' || pName.includes('SUPER')) {
      return Number(Math.min(subtotal, 25.00).toFixed(2));
    }

    if (pType === 'freedrink' || pType === '1' || pName.includes('DRINK')) {
      const drinks = cartItems.filter((item) => {
        const cat = (item.category || '').toLowerCase();
        return cat.includes('drink') || cat.includes('coffee') || cat.includes('tea');
      });
      if (drinks.length === 0) return 0;
      const totalDrinkQty = drinks.reduce((sum, x) => sum + x.qty, 0);
      const totalDrinkPrice = drinks.reduce((sum, x) => sum + x.price * x.qty, 0);
      const avgDrinkPrice = totalDrinkPrice / totalDrinkQty;
      return Number(Math.min(subtotal, avgDrinkPrice).toFixed(2));
    }

    if (pType === 'freedessert' || pType === '2' || pName.includes('DESSERT')) {
      const desserts = cartItems.filter((item) => {
        const cat = (item.category || '').toLowerCase();
        return cat.includes('dessert') || cat.includes('sweet') || cat.includes('cake') || cat.includes('bakery');
      });
      if (desserts.length === 0) return 0;
      const totalDessertQty = desserts.reduce((sum, x) => sum + x.qty, 0);
      const totalDessertPrice = desserts.reduce((sum, x) => sum + x.price * x.qty, 0);
      const avgDessertPrice = totalDessertPrice / totalDessertQty;
      return Number(Math.min(subtotal, avgDessertPrice).toFixed(2));
    }

    return 0;
  }, [appliedPromo, cartItems, subtotal]);

  const totalAmount = useMemo(() => {
    return Number(Math.max(0, subtotal - promoDiscount).toFixed(2));
  }, [subtotal, promoDiscount]);

  const totalItemsCount = cartItems.reduce((acc, item) => acc + item.qty, 0);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleApplyPromo = (promo) => {
    setAppliedPromo(promo);
    showToast(`Promo code ${promo.promoCode} applied!`);
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    showToast('Promo code removed from receipt.');
  };

  const handleConfirmOrder = async () => {
    if (cartItems.length === 0) {
      showToast('Receipt is empty! Please add products.');
      return;
    }
    try {
      const res = await fetchWithRefresh(`${API_URL}/api/cashbox/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payMethod: 'Cash',
          products: cartItems.map((item) => ({ productId: item.productId, quantity: item.qty })),
          initialAmount: subtotal,
          promoCodeId: appliedPromo ? appliedPromo.promoCode : null,
          totalAmount: totalAmount,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.message || 'Failed to process order.');
        return;
      }

      const usedCode = appliedPromo?.promoCode;
      showToast(
        usedCode
          ? `Order confirmed: ${totalAmount.toFixed(2)} ₼ (Promo ${usedCode} redeemed)`
          : `Order confirmed: ${totalAmount.toFixed(2)} ₼`
      );
      clearCart();
      setIsReceiptModalOpen(false);
    } catch (err) {
      console.error('Failed to confirm cashbox order:', err);
      showToast('Network error while processing order.');
    }
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
          hasAppliedPromo={Boolean(appliedPromo)}
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
            subtotal={subtotal}
            promoDiscount={promoDiscount}
            totalAmount={totalAmount}
            appliedPromo={appliedPromo}
            onRemovePromo={handleRemovePromo}
            onOpenPromoModal={() => setIsPromoModalOpen(true)}
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
                  subtotal={subtotal}
                  promoDiscount={promoDiscount}
                  totalAmount={totalAmount}
                  appliedPromo={appliedPromo}
                  onRemovePromo={handleRemovePromo}
                  onOpenPromoModal={() => setIsPromoModalOpen(true)}
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
        appliedPromo={appliedPromo}
        onApplyPromo={handleApplyPromo}
        onRemovePromo={handleRemovePromo}
      />
    </div>
  );
};

export default Cashbox;
