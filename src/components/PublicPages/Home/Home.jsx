import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../../../assets/icons/rednest_logo.png';
import bgVideo from '../../../assets/video/media_1.mp4';
import './Home.scss';

const Home = () => {
  return (
    <div className="home-page">
      {/* Header */}
      <header className="home-header">
        <div className="logo-container">
          <img src={logo} alt="Rednest Logo" className="logo" />
          <span className="brand-name">Rednest</span>
        </div>
        <nav className="nav-links">
          <Link to="/" className="nav-link active">Home</Link>
          <Link to="/catalog" className="nav-link">Menu</Link>
          <Link to="/products" className="nav-link">Products</Link>
        </nav>
        <Link to="/catalog" className="cta-btn sm">Order Now</Link>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <video autoPlay loop muted playsInline className="hero-video-bg">
          <source src={bgVideo} type="video/mp4" />
        </video>
        <div className="hero-overlay"></div>
        
        <div className="hero-content">
          <h1 className="hero-title">
            Awaken Your <span className="highlight">Senses</span>
          </h1>
          <p className="hero-subtitle">
            Experience the rich, bold flavors of our premium coffee blends. Crafted with passion, served with perfection.
          </p>
          <div className="hero-actions">
            <Link to="/catalog" className="cta-btn lg">Explore Menu</Link>
            <Link to="/products" className="cta-btn secondary lg">Our Story</Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="feature-card">
          <div className="feature-icon">☕</div>
          <h3>Premium Roast</h3>
          <p>Sourced from the finest farms around the globe for an unforgettable taste.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">✨</div>
          <h3>Cozy Atmosphere</h3>
          <p>A perfect environment to relax, work, or catch up with friends.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🌱</div>
          <h3>Eco-Friendly</h3>
          <p>Committed to sustainable practices and 100% recyclable packaging.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <img src={logo} alt="Rednest Logo" className="footer-logo" />
            <span>Rednest Coffee Shop</span>
          </div>
          <p>&copy; {new Date().getFullYear()} Rednest. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
