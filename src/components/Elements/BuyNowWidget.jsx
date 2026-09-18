import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useBasket } from '../../context/BasketContext';
import cartAnimated from '../../assets/icons/cart-animated.svg';
import { useLang } from '../../utils/useLang';
import { getWidgetTranslation } from './Lang';

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
  gap: 12px;
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
    gap: 10px;
  }
  .buynow-widget {
    padding: 0 16px;
    font-size: 0.76rem;
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
  white-space: nowrap;
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
.review-widget-icon {
  width: 18px;
  height: 18px;
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

  .buynow-widget-container.is-review-page .buynow-widget {
    padding: 0;
    width: 44px;
    height: 44px !important;
    min-height: 44px !important;
    border-radius: 50%;
    gap: 0;
  }
  .buynow-widget-container.is-review-page .buynow-widget-text {
    display: none;
  }
  .buynow-widget-container.is-review-page .buynow-icon {
    transform: none;
  }
}
`;

const BuyNowWidget = () => {
  const lang = useLang();
  const t = (id) => getWidgetTranslation(lang, id);
  const location = useLocation();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const { totalCount } = useBasket();

  const isReviewPage = location.pathname === '/review';

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

  const hiddenPaths = ['/login', '/fortune', '/basket', '/profile', '/sessions', '/promos', '/order', '/orders', '/rules', '/terms', '/error', '/cashbox'];
  if (hiddenPaths.includes(location.pathname) || location.pathname.startsWith('/admin')) {
    return null;
  }

  const isVisible = isScrolled && !isFooterVisible;

  return (
    <>
      <style>{buyNowStyles}</style>
      <div className={`buynow-widget-container ${isVisible ? 'visible' : ''} ${isReviewPage ? 'is-review-page' : ''}`}>
        <button 
          className="buynow-widget" 
          onClick={() => navigate('/basket')}
          aria-label={t('widget_buynow_cart')}
          data-id="widget_buynow_cart"
        >
          <div className="buynow-icon-wrapper">
            <img src={cartAnimated} alt="Cart" className="buynow-icon" />
            {totalCount > 0 && (
              <span key={totalCount} className="cart-badge">{totalCount}</span>
            )}
          </div>
          <span className="buynow-widget-text" data-id="widget_buynow_cart">{t('widget_buynow_cart')}</span>
        </button>

        {isReviewPage && (
          <button
            className="buynow-widget review-widget-btn"
            onClick={() => window.dispatchEvent(new CustomEvent('open-write-review-modal'))}
            aria-label={t('widget_buynow_write_review')}
            data-id="widget_buynow_write_review"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="review-widget-icon">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <span className="buynow-widget-text" data-id="widget_buynow_write_review">{t('widget_buynow_write_review')}</span>
          </button>
        )}
      </div>
    </>
  );
};

export default BuyNowWidget;
