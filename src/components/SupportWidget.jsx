import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import smileyAnimated from '../assets/icons/smiley-animated.svg';
import './SupportWidget.scss';

const SupportWidget = () => {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      
      const isAtBottom = window.innerHeight + scrollY >= document.documentElement.scrollHeight - 150;

      if (scrollY >= 10 && !isAtBottom) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (location.pathname === '/login') {
    return null;
  }

  return (
    <div className={`support-widget-container ${isVisible ? 'visible' : ''}`}>
      <span className="support-tooltip">
        Ready to help you with your choice.
      </span>
      <button 
        className="support-widget" 
        aria-label="Support chat" 
        onClick={() => console.log('Open support chat')}
      >
        <img src={smileyAnimated} alt="Support" />
      </button>
    </div>
  );
};

export default SupportWidget;
