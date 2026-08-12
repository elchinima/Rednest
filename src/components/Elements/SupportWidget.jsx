import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import smileyAnimated from '../../assets/icons/smiley-animated.svg';
import AuthModal from '../PublicPages/Auth/AuthModal';

const supportStyles = `
.support-widget-container {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 9999;
  display: flex;
  align-items: center;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  opacity: 0;
  pointer-events: none;
  transform: translateY(20px) scale(0.8);
}
body.mobile-menu-open .support-widget-container {
  opacity: 0 !important;
  pointer-events: none !important;
}
.support-widget-container.visible {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0) scale(1);
}
@media (max-width: 768px) {
  .support-widget-container {
    bottom: 20px;
    right: 20px;
  }
}
.support-tooltip {
  position: absolute;
  right: calc(100% + 15px);
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 12px 18px;
  border-radius: 12px 12px 0 12px;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transform: translate(15px, -50px) scale(0.9);
  pointer-events: none;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}
.support-widget-container:hover .support-tooltip {
  visibility: visible;
  animation: tooltipPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}
@keyframes tooltipPop {
  0% {
    opacity: 0;
    transform: translate(15px, -50px) scale(0.9);
  }
  100% {
    opacity: 1;
    transform: translate(0, -50px) scale(1);
  }
}
.support-widget {
  width: 65px;
  height: 65px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}
.support-widget img {
  width: 40px;
  height: 40px;
}
.support-widget:hover {
  transform: scale(1.15) translateY(-5px);
}
.support-widget:active {
  transform: scale(0.95);
}
@media (max-width: 768px) {
  .support-widget {
    width: 55px;
    height: 55px;
  }
  .support-widget img {
    width: 34px;
    height: 34px;
  }
}
`;

const SupportWidget = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

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

  if (location.pathname === '/login' || location.pathname === '/fortune') {
    return null;
  }

  const isVisible = isScrolled && !isFooterVisible;

  return (
    <>
      <style>{supportStyles}</style>
      <div className={`support-widget-container ${isVisible ? 'visible' : ''}`}>
        <span className="support-tooltip">
          Ready to help you with your choice
        </span>
        <button 
          className="support-widget" 
          aria-label="Support chat" 
          onClick={() => {
            if (!isAuthenticated) {
              setIsAuthModalOpen(true);
            }
          }}
        >
          <img src={smileyAnimated} alt="Support" />
        </button>
      </div>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </>
  );
};

export default SupportWidget;