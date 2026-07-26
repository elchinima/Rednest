import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import smileyAnimated from '../assets/icons/smiley-animated.svg';
import './SupportWidget.scss';

const SupportWidget = () => {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isFooterVisible, setIsFooterVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY >= 10);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const footer = document.querySelector('footer');
      if (!footer) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          setIsFooterVisible(entry.isIntersecting);
        },
        {
          root: null,
          threshold: 0,
          rootMargin: '50px 0px 0px 0px' 
        }
      );

      observer.observe(footer);

      return () => {
        observer.disconnect();
      };
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [location.pathname]);

  if (location.pathname === '/login') {
    return null;
  }

  const isVisible = isScrolled && !isFooterVisible;

  return (
    <div className={`support-widget-container ${isVisible ? 'visible' : ''}`}>
      <span className="support-tooltip">
        Ready to help you with your choice
      </span>
      <button 
        className="support-widget" 
        aria-label="Support chat" 
      >
        <img src={smileyAnimated} alt="Support" />
      </button>
    </div>
  );
};

export default SupportWidget;
