import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../../assets/icons/rednest_logo.png';
import UserNavPills from './UserNavPills';
import { useLang } from '../../utils/useLang';
import { getWidgetTranslation } from './Lang';

const Navbar = () => {
  const lang = useLang();
  const t = (id) => getWidgetTranslation(lang, id);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/' || location.pathname === '/home';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.classList.add('mobile-menu-open');
    } else {
      document.body.classList.remove('mobile-menu-open');
    }
    return () => {
      document.body.classList.remove('mobile-menu-open');
    };
  }, [isMenuOpen]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const handleCloseMenu = () => setIsMenuOpen(false);

  return (
    <header
      className={`home-header ${isHome ? 'home-header--home' : ''} ${isScrolled ? 'home-header--scrolled' : 'home-header--transparent'}`}
    >
      <div className="logo-container">
        <Link
          to="/"
          onClick={handleCloseMenu}
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <img src={logo} alt="Rednest Logo" className="logo" />
          <span className="brand-name">Rednest</span>
        </Link>
      </div>

      <div className={`nav-menu ${isMenuOpen ? 'open' : ''}`}>
        <UserNavPills onMenuClose={handleCloseMenu} />
        <nav className="nav-links">
          <Link
            to="/"
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
            onClick={handleCloseMenu}
            data-id="nav_home"
          >
            <svg className="nav-link__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
              <path d="M9 21V12h6v9" />
            </svg>
            <span>{t('nav_home')}</span>
          </Link>
          <Link
            to="/catalog"
            className={`nav-link ${location.pathname === '/catalog' ? 'active' : ''}`}
            onClick={handleCloseMenu}
            data-id="nav_menu"
          >
            <svg className="nav-link__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <span>{t('nav_menu')}</span>
          </Link>
          <Link
            to="/review"
            className={`nav-link ${location.pathname === '/review' || location.pathname === '/reviews' ? 'active' : ''}`}
            onClick={handleCloseMenu}
            data-id="nav_review"
          >
            <svg className="nav-link__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <span>{t('nav_review')}</span>
          </Link>
        </nav>

        <div className="nav-menu__footer">
          <div className="nav-menu__social">
            <a href="https://www.instagram.com/rednest.az/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="5" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <a href="https://www.facebook.com/rednest.az" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
              </svg>
            </a>
          </div>
          <span className="nav-menu__version">v2.0</span>
        </div>
      </div>

      <div
        className={`menu-overlay ${isMenuOpen ? 'open' : ''}`}
        onClick={handleCloseMenu}
      />

      <button
        className="mobile-menu-btn"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-label="Toggle menu"
      >
        {isMenuOpen ? '✕' : '☰'}
      </button>
    </header>
  );
};

export default Navbar;
