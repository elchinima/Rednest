import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBasket } from '../../context/BasketContext';
import cartAnimated from '../../assets/icons/cart-animated.svg';

const buyNowStyles = `
.buynow-widget-container {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translate(-50%, 20px) scale(0.8);
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  opacity: 0;
  pointer-events: none;
}
body.mobile-menu-open .buynow-widget-container {
  opacity: 0 !important;
  pointer-events: none !important;
}
.buynow-widget-container.visible {
  opacity: 1;
  pointer-events: auto;
  transform: translate(-50%, 0) scale(1);
}
@media (max-width: 768px) {
  .buynow-widget-container {
    bottom: 20px;
  }
}
.buynow-widget {
  padding: 0 24px;
  height: 49px !important;
  min-height: 49px !important;
  box-sizing: border-box;
  border-radius: 26px;
  background: rgba(220, 53, 69, 0.9);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.buynow-widget:hover {
  transform: scale(1.08) translateY(-3px);
  background: rgba(220, 53, 69, 1);
}
.buynow-widget:active {
  transform: scale(0.95);
}
.buynow-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.buynow-icon {
  width: 19px;
  height: 19px;
  fill: currentColor;
  transform: translateX(-2px);
}
.cart-badge {
  position: absolute;
  top: -6px;
  right: -7px;
  background: #ffffff;
  color: #dc3545;
  font-size: 0.52rem;
  font-weight: 800;
  min-width: 13px;
  height: 13px;
  padding: 0 2px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.25);
  animation: badgePop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  line-height: 1;
}
@keyframes badgePop {
  0% { transform: scale(0); }
  80% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
@media (max-width: 768px) {
  .buynow-widget {
    padding: 0 18px;
    height: 41px !important;
    min-height: 41px !important;
    font-size: 0.75rem;
  }
  .buynow-icon {
    width: 16px;
    height: 16px;
  }
  .cart-badge {
    top: -5px;
    right: -6px;
    min-width: 11px;
    height: 11px;
    font-size: 0.48rem;
    padding: 0 2px;
  }
}
`;

const BuyNowWidget = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const { totalCount } = useBasket();

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      
      let isAtBottom = false;
      const footer = document.querySelector('footer');
      
      if (footer) {
        const footerRect = footer.getBoundingClientRect();
        if (footerRect.top <= window.innerHeight - 60) {
          isAtBottom = true;
        }
      } else {
        isAtBottom = window.innerHeight + scrollY >= document.documentElement.scrollHeight - 100;
      }

      setIsScrolled(scrollY >= 10);
      setIsFooterVisible(isAtBottom);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  if (location.pathname === '/login' || location.pathname === '/fortune' || location.pathname === '/basket' || location.pathname === '/profile' || location.pathname.startsWith('/admin')) {
    return null;
  }

  const isVisible = isScrolled && !isFooterVisible;

  return (
    <>
      <style>{buyNowStyles}</style>
      <div className={`buynow-widget-container ${isVisible ? 'visible' : ''}`}>
        <button 
          className="buynow-widget" 
          onClick={() => navigate('/basket')}
        >
          <div className="buynow-icon-wrapper">
            <img src={cartAnimated} alt="Cart" className="buynow-icon" />
            {totalCount > 0 && (
              <span key={totalCount} className="cart-badge">{totalCount}</span>
            )}
          </div>
          Buy Now
        </button>
      </div>
    </>
  );
};

export default BuyNowWidget;
