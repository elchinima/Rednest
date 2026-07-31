import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
.buynow-icon {
  width: 19px;
  height: 19px;
  fill: currentColor;
  transform: translateX(-2px);
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
}
`;

const BuyNowWidget = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isFooterVisible, setIsFooterVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      
      let isAtBottom = false;
      const footer = document.querySelector('footer');
      
      if (footer) {
        const footerRect = footer.getBoundingClientRect();
        if (footerRect.top <= window.innerHeight + 50) {
          isAtBottom = true;
        }
      } else {
        isAtBottom = window.innerHeight + scrollY >= document.documentElement.scrollHeight - 400;
      }

      setIsScrolled(scrollY >= 10);
      setIsFooterVisible(isAtBottom);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  if (location.pathname === '/login') {
    return null;
  }

  const isVisible = isScrolled && !isFooterVisible;

  return (
    <>
      <style>{buyNowStyles}</style>
      <div className={`buynow-widget-container ${isVisible ? 'visible' : ''}`}>
        <button 
          className="buynow-widget" 
          onClick={() => navigate('/catalog')}
        >
          <img src={cartAnimated} alt="Cart" className="buynow-icon" />
          Buy Now
        </button>
      </div>
    </>
  );
};

export default BuyNowWidget;
