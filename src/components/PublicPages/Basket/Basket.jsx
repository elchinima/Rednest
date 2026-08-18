import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import logo from '../../../assets/icons/rednest_logo.png';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import Footer from '../../Footer/Footer';
import LogoutModal from '../../Elements/LogoutModal';
import { useAuth } from '../../../context/AuthContext';
import { useBasket } from '../../../context/BasketContext';
import './Basket.scss';

const Basket = () => {
  const { user, logout, authLoading } = useAuth();
  const { items, addItem, removeItem, deleteItem, loading: basketLoading } = useBasket();

  const [products, setProducts] = useState({});
  const [productsLoading, setProductsLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const response = await fetch(`${apiUrl}/api/products`);
        if (response.ok) {
          const data = await response.json();
          const productMap = {};
          data.forEach(category => {
            category.items.forEach(item => {
              productMap[item.id] = item;
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

  const grandTotal = enrichedItems
    .reduce((sum, item) => sum + parseFloat(item.totalPrice), 0)
    .toFixed(2);

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
            <div className="empty-icon">🛒</div>
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
                        <img src={item.product.imageUrl} alt={item.product.name} />
                      ) : (
                        <div className="basket-item-image-placeholder">☕</div>
                      )}
                    </div>

                    <div className="basket-item-body">
                      <div className="basket-item-main">
                        <div className="basket-item-info">
                          <h3 className="basket-item-name">{item.product.name}</h3>
                          <span className="basket-item-unit-price">{item.unitPrice.toFixed(2)} ₼ each</span>
                        </div>

                        <button
                          className="basket-item-delete mobile-delete"
                          onClick={() => deleteItem(item.productId)}
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
                            onClick={() => removeItem(item.productId)}
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="qty-value">{item.quantity}</span>
                          <button
                            className="qty-btn"
                            onClick={() => addItem(item.productId)}
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
                          onClick={() => deleteItem(item.productId)}
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
              <div className="summary-total">
                <span>Total</span>
                <span className="summary-total-price">{grandTotal} ₼</span>
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
