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
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';

import cappuccinoImg from '../../../assets/images/product/Cappuccino.jpg';
import redLatteImg from '../../../assets/images/product/Red_Latte.jpg';
import nestCappuccinoImg from '../../../assets/images/product/Nest_Cappuccino.jpg';
import hotChocolateImg from '../../../assets/images/product/Hot_Chocolate.jpg';
import teaImg from '../../../assets/images/product/Tea.jpg';
import espressoImg from '../../../assets/images/product/Espresso.jpg';
import americanoImg from '../../../assets/images/product/Americano.jpg';
import latteImg from '../../../assets/images/product/Latte.jpg';
import eclairImg from '../../../assets/images/product/Eclair.jpg';
import croissantImg from '../../../assets/images/product/Croissant.jpg';
import muffinImg from '../../../assets/images/product/Muffin.jpg';

const menuData = [
  {
    category: "Main Drinks",
    items: [
      {
        id: "tea",
        name: "Tea",
        description: "Quenches thirst, invigorates, and is an ideal choice for relaxation.",
        price: "1.49",
        image: teaImg
      },
      {
        id: "espresso",
        name: "Espresso",
        description: "A perfect choice to start the day energetically with its thick and strong taste. A favorite of true coffee lovers.",
        price: "2.89",
        image: espressoImg
      },
      {
        id: "americano",
        name: "Americano",
        description: "A light and delicate flavor. Prepared by adding water to espresso, its taste is simple yet classic.",
        price: "2.89",
        image: americanoImg
      },
      {
        id: "latte",
        name: "Latte",
        description: "Soft espresso mixed with fine milk foam. For those who love a warm and delicate taste.",
        price: "3.49",
        image: latteImg
      },
      {
        id: "cappuccino",
        name: "Cappuccino",
        description: "The perfect balance of coffee and milk foam. The soft foam on top brings happiness with every sip.",
        price: "3.49",
        image: cappuccinoImg
      }
    ]
  },
  {
    category: "Specialty Drinks",
    items: [
      {
        id: "red-latte",
        name: "Red Latte",
        description: "Special Rednest recipe: The harmony of latte and strawberry syrup. A sweet and romantic taste.",
        price: "3.75",
        image: redLatteImg
      },
      {
        id: "nest-cappuccino",
        name: "Nest Cappuccino",
        description: "Cappuccino enriched with the sweetness of caramel and the aroma of hazelnut. Like a warm hug.",
        price: "4.25",
        image: nestCappuccinoImg
      },
      {
        id: "hot-chocolate",
        name: "Hot Chocolate",
        description: "A drink that warms your soul with the aroma and softness of thick chocolate. A taste that brings back childhood memories.",
        price: "3.99",
        image: hotChocolateImg
      }
    ]
  },
  {
    category: "Desserts",
    items: [
      {
        id: "eclair",
        name: "Eclair",
        description: "A delicate pastry dessert filled with fragrant cream and covered with a fine layer. Every bite brings a light sweetness and pleasant taste.",
        price: "2.25",
        image: eclairImg
      },
      {
        id: "croissant",
        name: "Croissant",
        description: "An unforgettable French classic with butter and taste in a light, flaky pastry.",
        price: "1.99",
        image: croissantImg
      },
      {
        id: "muffin",
        name: "Muffin",
        description: "Soft, sweet, and satisfying. The best companion to every cup of coffee.",
        price: "1.59",
        image: muffinImg
      }
    ]
  }
];

const Catalog = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [addedItems, setAddedItems] = useState({});
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
          {menuData.map((categoryObj, index) => (
            <motion.section 
              key={index} 
              className="menu-category-section"
              initial={{ opacity: 0, y: 50 }} 
              whileInView={{ opacity: 1, y: 0 }} 
              viewport={{ once: true, amount: 0.1 }} 
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <h2 className="category-title">{categoryObj.category}</h2>
              <div className="catalog-grid">
                {categoryObj.items.map((item) => (
                  <div key={item.id} className="catalog-card">
                    <div className="card-image-container">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="item-image" />
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
                      onClick={() => setAddedItems(prev => ({ ...prev, [item.id]: prev[item.id] || Date.now() }))}
                    >
                      <img src={addedItems[item.id] ? `${successIcon}?t=${addedItems[item.id]}` : addIcon} alt="Add to cart" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.section>
          ))}
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
