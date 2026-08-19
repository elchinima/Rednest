import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import logo from '../../../assets/icons/rednest_logo.png';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import cartAnimated from '../../../assets/icons/cart-animated.svg';
import giftAnimated from '../../../assets/icons/gift-animated.svg';
import Footer from '../../Footer/Footer';
import LogoutModal from '../../Elements/LogoutModal';
import DeleteConfirmModal from '../../Elements/DeleteConfirmModal';
import FitText from '../../Elements/FitText';
import { useAuth } from '../../../context/AuthContext';
import { useBasket } from '../../../context/BasketContext';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';
import useSequentialImageLoader from '../../../utils/useSequentialImageLoader';
import './Basket.scss';

const formatPrizeName = (name) => {
  if (!name) return '';
  const mapping = {
    'SUPER PRIZE': 'Super Prize',
    'FREE DRINK': 'Free Drink',
    'FREE DESSERT': 'Free Dessert',
    'DISCOUNT UP TO 25%': 'Discount up to 25%',
    'CASHBACK ON PURCHASES': 'Cashback on Purchases',
    'DISCOUNT UP TO 50%': 'Discount up to 50%',
  };
  const upper = name.trim().toUpperCase();
  if (mapping[upper]) return mapping[upper];

  return name
    .toLowerCase()
    .split(' ')
    .map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : '')
    .join(' ');
};

const Basket = () => {
  const { user, logout, authLoading } = useAuth();
  const { items, addItem, removeItem, deleteItem, loading: basketLoading } = useBasket();

  const [products, setProducts] = useState({});
  const [productsLoading, setProductsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [flashingItemIds, setFlashingItemIds] = useState({});
  const [activePromo, setActivePromo] = useState(null);
  const userMenuRef = useRef(null);


  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const response = await fetch(`${apiUrl}/api/products`);
        if (response.ok) {
          const data = await response.json();
          const productMap = {};
          data.forEach(categoryGroup => {
            categoryGroup.items.forEach(item => {
              productMap[item.id] = { ...item, category: item.category || categoryGroup.category };
            });
          });
          setProducts(productMap);
        }
      } catch (err) {
        console.error('Failed to fetch products:', err);
      } finally {
        setProductsLoading(false);
      }
    };
    fetchProducts();
  }, []);


  useEffect(() => {
    if (!user) return;
    const apiUrl = import.meta.env.VITE_API_URL || '';
    fetchWithRefresh(`${apiUrl}/api/auth/promo`)
      .then(r => r.json())
      .then(data => {
        if (data.hasPromo && data.isActive) {
          setActivePromo(data);
        }
      })
      .catch(() => {});
  }, [user]);


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.classList.add('mobile-menu-open');
    } else {
      document.body.classList.remove('mobile-menu-open');
    }
    return () => document.body.classList.remove('mobile-menu-open');
  }, [isMenuOpen]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      await fetch(`${apiUrl}/api/auth/logout`, { method: 'POST', credentials: 'include' });
      logout();
      setIsLogoutModalOpen(false);
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const productId = itemToDelete.productId;
    setItemToDelete(null);
    setIsDeleting(false);
    try {
      await deleteItem(productId);
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  const handleDecrease = (item) => {
    if (item.quantity <= 1) {
      setItemToDelete(item);
    } else {
      removeItem(item.productId);
    }
  };

  const handleIncrease = (item) => {
    if (item.quantity >= 100) {
      setFlashingItemIds(prev => ({ ...prev, [item.productId]: true }));
      setTimeout(() => {
        setFlashingItemIds(prev => {
          const next = { ...prev };
          delete next[item.productId];
          return next;
        });
      }, 2500);
      return;
    }
    addItem(item.productId);
  };

  const isLoading = authLoading || basketLoading || productsLoading;

  const enrichedItems = items
    .map(item => {
      const product = products[item.productId];
      if (!product) return null;
      const unitPrice = parseFloat(product.price);
      const totalPrice = (unitPrice * item.quantity).toFixed(2);
      return { ...item, product, unitPrice, totalPrice };
    })
    .filter(Boolean);

  const orderedBasketItems = useMemo(() => {
    return enrichedItems.map(item => ({
      id: item.productId,
      imageUrl: item.product?.imageUrl
    }));
  }, [enrichedItems]);

  const loadedImages = useSequentialImageLoader(orderedBasketItems);

  const grandTotal = enrichedItems
    .reduce((sum, item) => sum + parseFloat(item.totalPrice), 0)
    .toFixed(2);

  const promoDiscountAmount = useMemo(() => {
    if (!activePromo || !activePromo.isActive || enrichedItems.length === 0) return 0;
    const numericTotal = parseFloat(grandTotal) || 0;
    if (numericTotal <= 0) return 0;

    const pType = String(activePromo.prizeType || '').toLowerCase();
    const pName = String(activePromo.prizeName || '').toUpperCase();

    if (pType === 'discount25' || pType === '3' || pName.includes('25%')) {
      return Math.round(numericTotal * 25) / 100;
    }
    if (pType === 'discount50' || pType === '5' || pName.includes('50%')) {
      return Math.round(numericTotal * 50) / 100;
    }
    if (pType === 'superprize' || pType === '0' || pName.includes('SUPER')) {
      return Math.min(numericTotal, 25.00);
    }
    if (pType === 'freedrink' || pType === '1' || pName.includes('DRINK')) {
      const drinks = enrichedItems.filter(x => {
        const cat = (x.product?.category || '').toLowerCase();
        return cat.includes('drink');
      });
      if (drinks.length === 0) return 0;
      const totalQty = drinks.reduce((sum, x) => sum + x.quantity, 0);
      const totalPrice = drinks.reduce((sum, x) => sum + x.unitPrice * x.quantity, 0);
      return Math.round((totalPrice / totalQty) * 100) / 100;
    }
    if (pType === 'freedessert' || pType === '2' || pName.includes('DESSERT')) {
      const desserts = enrichedItems.filter(x => {
        const cat = (x.product?.category || '').toLowerCase();
        return cat.includes('dessert');
      });
      if (desserts.length === 0) return 0;
      const totalQty = desserts.reduce((sum, x) => sum + x.quantity, 0);
      const totalPrice = desserts.reduce((sum, x) => sum + x.unitPrice * x.quantity, 0);
      return Math.round((totalPrice / totalQty) * 100) / 100;
    }

    return 0;
  }, [activePromo, enrichedItems, grandTotal]);


  const discountedTotal = Math.max(0, parseFloat(grandTotal) - promoDiscountAmount).toFixed(2);


  return (
    <motion.div
      className="basket-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <header className="home-header">
        <div className="logo-container">
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src={logo} alt="Rednest Logo" className="logo" />
            <span className="brand-name">Rednest</span>
          </Link>
        </div>

        <div className={`nav-menu ${isMenuOpen ? 'open' : ''}`}>
          <nav className="nav-links">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/catalog" className="nav-link">Menu</Link>
          </nav>
          {authLoading ? (
            <span className="cta-btn sm no-hover" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default', pointerEvents: 'none' }}>
              <img src={loaderIcon} alt="Loading" style={{ width: '20px', height: '20px', filter: 'brightness(0)' }} />
            </span>
          ) : user ? (
            <div ref={userMenuRef} style={{ position: 'relative' }}>
              <button className="cta-btn sm" onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} style={{ cursor: 'pointer' }}>
                Hello, {user.name}
              </button>
              {isUserMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ position: 'absolute', top: '100%', left: 0, width: '100%', marginTop: '8px', zIndex: 100 }}
                >
                  <button
                    className="cta-btn sm"
                    onClick={() => { setIsUserMenuOpen(false); setIsLogoutModalOpen(true); }}
                    style={{ width: '100%', cursor: 'pointer' }}
                  >
                    Log Out
                  </button>
                </motion.div>
              )}
            </div>
          ) : (
            <Link to="/login" className="cta-btn sm">Log In</Link>
          )}
        </div>

        <div className={`menu-overlay ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(false)} />
        <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? '✕' : '☰'}
        </button>
      </header>

      <main className="basket-main">
        <div className="basket-hero">
          <h1>Your Basket</h1>
          <p>Review your selections before placing an order.</p>
        </div>

        {isLoading ? (
          <div className="basket-loading">
            <img src={loaderIcon} alt="Loading" />
          </div>
        ) : enrichedItems.length === 0 ? (
          <motion.div
            className="basket-empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="empty-icon">
              <img src={cartAnimated} alt="Cart" />
            </div>
            <h2>Your basket is empty</h2>
            <p>Looks like you haven't added anything yet. Browse our menu and find your perfect drink.</p>
            <Link to="/catalog" className="cta-btn">Explore Menu</Link>
          </motion.div>
        ) : (
          <div className="basket-content">
            <div className="basket-items">
              <AnimatePresence>
                {enrichedItems.map((item, index) => (
                  <motion.div
                    key={item.productId}
                    className="basket-item"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0, padding: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.03 }}
                    layout
                  >
                    <div className="basket-item-image">
                      {item.product.imageUrl ? (
                        <>
                          <img 
                            src={item.product.imageUrl} 
                            alt={item.product.name} 
                            className={loadedImages[item.productId] ? 'loaded' : ''} 
                          />
                          {!loadedImages[item.productId] && (
                            <div className="basket-item-image-placeholder">☕</div>
                          )}
                        </>
                      ) : (
                        <div className="basket-item-image-placeholder">☕</div>
                      )}
                    </div>

                    <div className="basket-item-body">
                      <div className="basket-item-main">
                        <div className="basket-item-info">
                          <FitText as="h3" className="basket-item-name" maxFontSize={1.15} minFontSize={0.72}>
                            {item.product.name}
                          </FitText>
                          <span className="basket-item-unit-price">{item.unitPrice.toFixed(2)} ₼ each</span>
                        </div>

                        <button
                          className="basket-item-delete mobile-delete"
                          onClick={() => setItemToDelete(item)}
                          aria-label="Remove item"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4h6v2" />
                          </svg>
                        </button>
                      </div>

                      <div className="basket-item-controls">
                        <div className="basket-item-quantity">
                          <button
                            className="qty-btn"
                            onClick={() => handleDecrease(item)}
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className={`qty-value ${flashingItemIds[item.productId] ? 'qty-limit-flash' : ''}`}>
                            {item.quantity}
                          </span>
                          <button
                            className="qty-btn"
                            onClick={() => handleIncrease(item)}
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>

                        <div className="basket-item-total">
                          <span className="basket-item-total-price">{item.totalPrice} ₼</span>
                        </div>

                        <button
                          className="basket-item-delete desktop-delete"
                          onClick={() => setItemToDelete(item)}
                          aria-label="Remove item"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4h6v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <motion.div
              className="basket-summary"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <h2>Order Summary</h2>
              <div className="summary-lines">
                {enrichedItems.map(item => (
                  <div key={item.productId} className="summary-line">
                    <span className="summary-line-name">
                      {item.product.name}
                      <span className="summary-line-qty"> × {item.quantity}</span>
                    </span>
                    <span className="summary-line-price">{item.totalPrice} ₼</span>
                  </div>
                ))}
              </div>
              <div className="summary-divider" />
              {promoDiscountAmount > 0 && (
                <div className="summary-subtotal">
                  <span>Subtotal</span>
                  <span>{grandTotal} ₼</span>
                </div>
              )}
              {promoDiscountAmount > 0 && (
                <AnimatePresence>
                  <motion.div
                    className="summary-promo-row"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <span className="summary-promo-label">
                      <img src={giftAnimated} alt="Promo gift" className="summary-promo-icon" />
                      <span>{formatPrizeName(activePromo?.prizeName)}</span>
                    </span>
                    <span className="summary-promo-discount">−{promoDiscountAmount.toFixed(2)} ₼</span>
                  </motion.div>
                </AnimatePresence>
              )}
              <div className="summary-total">
                <span>Total</span>
                <span className="summary-total-price">{discountedTotal} ₼</span>
              </div>

              <button className="cta-btn basket-checkout-btn">
                Place Order
              </button>
              <Link to="/catalog" className="cta-btn secondary basket-continue-btn">
                Continue Shopping
              </Link>
            </motion.div>
          </div>
        )}
      </main>

      <DeleteConfirmModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
        itemName={itemToDelete?.product?.name}
        loading={isDeleting}
      />

      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        loading={isLoggingOut}
      />
      <Footer />
    </motion.div>
  );
};

export default Basket;
