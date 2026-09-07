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
        <nav className="nav-links">
          <Link
            to="/"
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
            onClick={handleCloseMenu}
            data-id="nav_home"
          >
            {t('nav_home')}
          </Link>
          <Link
            to="/catalog"
            className={`nav-link ${location.pathname === '/catalog' ? 'active' : ''}`}
            onClick={handleCloseMenu}
            data-id="nav_menu"
          >
            {t('nav_menu')}
          </Link>
          <Link
            to="/review"
            className={`nav-link ${location.pathname === '/review' || location.pathname === '/reviews' ? 'active' : ''}`}
            onClick={handleCloseMenu}
            data-id="nav_review"
          >
            {t('nav_review')}
          </Link>
        </nav>
        <UserNavPills onMenuClose={handleCloseMenu} />
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
