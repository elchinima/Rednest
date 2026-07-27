import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import smileyAnimated from '../assets/icons/smiley-animated.svg';
import AuthModal from './PublicPages/Auth/AuthModal';
import './SupportWidget.scss';

const SupportWidget = () => {
  const location = useLocation();
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
      <div className={`support-widget-container ${isVisible ? 'visible' : ''}`}>
        <span className="support-tooltip">
          Ready to help you with your choice
        </span>
        <button 
          className="support-widget" 
          aria-label="Support chat" 
          onClick={() => setIsAuthModalOpen(true)}
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
