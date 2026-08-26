import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../../assets/icons/rednest_logo.png';
import UserNavPills from './UserNavPills';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

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
    <header className="home-header">
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
          >
            Home
          </Link>
          <Link
            to="/catalog"
            className={`nav-link ${location.pathname === '/catalog' ? 'active' : ''}`}
            onClick={handleCloseMenu}
          >
            Menu
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
