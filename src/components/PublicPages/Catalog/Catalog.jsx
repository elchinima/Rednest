import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import './Catalog.scss';
import Footer from '../../Footer/Footer';
import Navbar from '../../Elements/Navbar';
import FitText from '../../Elements/FitText';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import productCardLoader from '../../../assets/icons/product-card-loader.svg';
import addIcon from '../../../assets/icons/add.svg';
import successIcon from '../../../assets/icons/success-animated.svg';
import { useBasket } from '../../../context/BasketContext';
import useSequentialImageLoader from '../../../utils/useSequentialImageLoader';

const CategorySection = ({ categoryObj, index, onAddItem, addedAnimations, loadedImages }) => {
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
                <>
                  <img 
                    src={item.imageUrl} 
                    alt={item.name} 
                    loading="lazy"
                    onLoad={() => loadedImages.markLoaded?.(item.id)}
                    className={`item-image ${loadedImages[item.id] ? 'loaded' : ''}`} 
                  />
                  {!loadedImages[item.id] && (
                    <div className="item-image-placeholder">
                      <span className="placeholder-icon">{item.icon || '☕'}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="item-image-placeholder">
                  <span className="placeholder-icon">{item.icon || '☕'}</span>
                </div>
              )}
            </div>
            <div className="card-content">
              <div className="card-header">
                <FitText as="h3" className="item-name" maxFontSize={1.3} minFontSize={0.78}>
                  {item.name}
                </FitText>
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
  const [addedAnimations, setAddedAnimations] = useState({});
  const [menuData, setMenuData] = useState([]);
  const [isMenuLoading, setIsMenuLoading] = useState(true);
  const { addItem, getItemQuantity } = useBasket();

  const [skeletonCount, setSkeletonCount] = useState(() => {
    if (typeof window === 'undefined') return 3;
    const w = window.innerWidth;
    if (w < 768) return 1;
    if (w < 1150) return 2;
    return 3;
  });

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 768) setSkeletonCount(1);
      else if (w < 1150) setSkeletonCount(2);
      else setSkeletonCount(3);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const orderedItems = useMemo(() => {
    return menuData.flatMap(cat => cat.items || []);
  }, [menuData]);

  const loadedImages = useSequentialImageLoader(orderedItems);

  const handleAddItem = (productId) => {
    const currentQty = getItemQuantity(productId);
    if (currentQty >= 100) {
      return;
    }
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

  return (
    <motion.div 
      className="catalog-page"
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      transition={{ duration: 0.3 }}
    >
      <Navbar />

      <main className="catalog-main">
        <div className="catalog-hero">
          <h1>Our Menu</h1>
          <p>Discover our carefully crafted beverages and delightful desserts.</p>
        </div>

        <div className="menu-categories">
          {isMenuLoading ? (
            <div className="catalog-grid skeleton-grid">
              {Array.from({ length: skeletonCount }).map((_, i) => (
                <div key={i} className="catalog-skeleton-card">
                  <img src={productCardLoader} alt="Loading product" className="skeleton-svg-img" />
                </div>
              ))}
            </div>
          ) : (
            menuData.map((categoryObj, index) => (
              <CategorySection
                key={index}
                categoryObj={categoryObj}
                index={index}
                onAddItem={handleAddItem}
                addedAnimations={addedAnimations}
                loadedImages={loadedImages}
              />
            ))
          )}
        </div>
      </main>

      <Footer />
    </motion.div>
  );
};

export default Catalog;
