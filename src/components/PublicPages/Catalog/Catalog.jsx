import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import logo from '../../../assets/icons/rednest_logo.png';
import './Catalog.scss';
import Footer from '../../Footer/Footer';
import LogoutModal from '../../Elements/LogoutModal';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import addIcon from '../../../assets/icons/add.svg';
import successIcon from '../../../assets/icons/success-animated.svg';
import { useAuth } from '../../../context/AuthContext';
import { useBasket } from '../../../context/BasketContext';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';




const CategorySection = ({ categoryObj, index, onAddItem, addedAnimations }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef(null);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const card = container.querySelector('.catalog-card');
    if (!card) return;

    const style = window.getComputedStyle(container);
    const gap = parseFloat(style.gap) || 16;
    const cardWidth = card.offsetWidth + gap;

    if (cardWidth > 0) {
      const scrollPos = container.scrollLeft;
      const newIndex = Math.round(scrollPos / cardWidth);
      setActiveIndex(Math.max(0, Math.min(newIndex, categoryObj.items.length - 1)));
    }
  };

  const scrollToIndex = (idx) => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const card = container.querySelector('.catalog-card');
    if (!card) return;

    const style = window.getComputedStyle(container);
    const gap = parseFloat(style.gap) || 16;
    const cardWidth = card.offsetWidth + gap;

    container.scrollTo({
      left: idx * cardWidth,
      behavior: 'smooth'
    });
  };

  return (
    <motion.section 
      key={index} 
      className="menu-category-section"
      initial={{ opacity: 0, y: 50 }} 
      whileInView={{ opacity: 1, y: 0 }} 
      viewport={{ once: true, amount: 0.1 }} 
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <h2 className="category-title">{categoryObj.category}</h2>
      <div className="catalog-grid" ref={scrollRef} onScroll={handleScroll}>
        {categoryObj.items.map((item) => (
          <div key={item.id} className="catalog-card">
            <div className="card-image-container">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="item-image" />
              ) : (
                <div className="item-image-placeholder">
                  <span className="placeholder-icon">{item.icon}</span>
                </div>
              )}
            </div>
            <div className="card-content">
              <div className="card-header">
                <h3>{item.name}</h3>
                <span className="item-price">{item.price} ₼</span>
              </div>
              <p className="item-description">{item.description}</p>
            </div>
            <button 
              className="add-to-cart-btn"
              onClick={() => onAddItem(item.id)}
            >
              {addedAnimations[item.id] ? (
                <object 
                  type="image/svg+xml" 
                  data={successIcon} 
                  aria-label="Added"
                />
              ) : (
                <img 
                  src={addIcon} 
                  alt="Add" 
                />
              )}
            </button>
          </div>
        ))}
      </div>

      {categoryObj.items.length > 1 && (
        <div className="carousel-dots">
          {categoryObj.items.map((_, i) => (
            <button
              key={i}
              className={`dot ${i === activeIndex ? 'active' : ''}`}
              onClick={() => scrollToIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </motion.section>
  );
};

const Catalog = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [addedAnimations, setAddedAnimations] = useState({});
  const [menuData, setMenuData] = useState([]);
  const [isMenuLoading, setIsMenuLoading] = useState(true);
  const { addItem } = useBasket();

  const handleAddItem = (productId) => {
    addItem(productId);
    setAddedAnimations(prev => ({ ...prev, [productId]: true }));
    setTimeout(() => {
      setAddedAnimations(prev => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    }, 1500);
  };

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const { login, logout } = useAuth();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      await fetch(`${apiUrl}/api/auth/logout`, { method: 'POST', credentials: 'include' });
      setUser(null);
      logout();
      setIsLogoutModalOpen(false);
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const response = await fetchWithRefresh(`${apiUrl}/api/auth/me`);
        if (response.ok) {
          const data = await response.json();
          setUser(data);
          login(data);
        } else {
          logout();
        }
      } catch (err) {
        console.error("Failed to fetch user:", err);
      } finally {
        setIsAuthLoading(false);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const response = await fetch(`${apiUrl}/api/products`);
        if (response.ok) {
          const data = await response.json();
          setMenuData(data);
        }
      } catch (err) {
        console.error("Failed to fetch products:", err);
      } finally {
        setIsMenuLoading(false);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.classList.add('mobile-menu-open');
    } else {
      document.body.classList.remove('mobile-menu-open');
    }
    return () => document.body.classList.remove('mobile-menu-open');
  }, [isMenuOpen]);

  return (
    <motion.div 
      className="catalog-page"
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
            <Link to="/catalog" className="nav-link active">Menu</Link>
          </nav>
          {isAuthLoading ? (
            <span className="cta-btn sm no-hover" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default', pointerEvents: 'none' }}>
              <img src={loaderIcon} alt="Loading" style={{ width: '20px', height: '20px', filter: 'brightness(0)' }} />
            </span>
          ) : user ? (
            <div ref={userMenuRef} style={{ position: 'relative' }}>
              <button className="cta-btn sm" onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} style={{ cursor: 'pointer' }}>Hello, {user.name}</button>
              {isUserMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    width: '100%',
                    marginTop: '8px',
                    zIndex: 100
                  }}
                >
                  <button 
                    className="cta-btn sm"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsLogoutModalOpen(true);
                    }}
                    style={{
                      width: '100%',
                      cursor: 'pointer'
                    }}
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

        <div
          className={`menu-overlay ${isMenuOpen ? 'open' : ''}`}
          onClick={() => setIsMenuOpen(false)}
        />

        <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? '✕' : '☰'}
        </button>
      </header>

      <main className="catalog-main">
        <div className="catalog-hero">
          <h1>Our Menu</h1>
          <p>Discover our carefully crafted beverages and delightful desserts.</p>
        </div>

        <div className="menu-categories">
          {isMenuLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
              <img src={loaderIcon} alt="Loading" style={{ width: '40px', height: '40px' }} />
            </div>
          ) : (
            menuData.map((categoryObj, index) => (
              <CategorySection
                key={index}
                categoryObj={categoryObj}
                index={index}
                onAddItem={handleAddItem}
                addedAnimations={addedAnimations}
              />
            ))
          )}
        </div>
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

export default Catalog;

