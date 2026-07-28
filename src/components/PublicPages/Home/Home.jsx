import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import logo from '../../../assets/icons/rednest_logo.png';
import premiumRoastIcon from '../../../assets/icons/premium_roast.svg';
import cozyAtmosphereIcon from '../../../assets/icons/cozy_atmosphere.svg';
import ecoFriendlyIcon from '../../../assets/icons/eco_friendly.svg';
import bgVideo from '../../../assets/video/media_1.mp4';
import aboutImage from '../../../assets/images/about_image.png';
import cappuccinoImg from '../../../assets/images/product/Cappuccino.jpg';
import redLatteImg from '../../../assets/images/product/Red_Latte.jpg';
import nestCappuccinoImg from '../../../assets/images/product/Nest_Cappuccino.jpg';
import hotChocolateImg from '../../../assets/images/product/Hot_Chocolate.jpg';
import Footer from '../../Footer/Footer';
import './Home.scss';

const Home = () => {
  const videoRef = useRef(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (videoRef.current) {
            if (entry.isIntersecting) {
              videoRef.current.play().catch(error => {
                console.log("Auto-play prevented", error);
              });
            } else {
              videoRef.current.pause();
            }
          }
        });
      },
      {
        rootMargin: '600px 0px 600px 0px',
        threshold: 0
      }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => {
      if (videoRef.current) {
        observer.unobserve(videoRef.current);
      }
    };
  }, []);

  return (
    <motion.div 
      className="home-page"
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      transition={{ duration: 0.3 }}
    >
      <header className="home-header">
        <div className="logo-container">
          <img src={logo} alt="Rednest Logo" className="logo" />
          <span className="brand-name">Rednest</span>
        </div>

        <div className={`nav-menu ${isMenuOpen ? 'open' : ''}`}>
          <nav className="nav-links">
            <Link to="/" className="nav-link active">Home</Link>
            <Link to="/catalog" className="nav-link">Menu</Link>
          </nav>
          <Link to="/login" className="cta-btn sm">Log In</Link>
        </div>

        <div
          className={`menu-overlay ${isMenuOpen ? 'open' : ''}`}
          onClick={() => setIsMenuOpen(false)}
        />

        <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? '✕' : '☰'}
        </button>
      </header>

      <section className="hero-section">
        <video ref={videoRef} autoPlay loop muted playsInline className="hero-video-bg">
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
          </div>
        </div>
      </section>

      <motion.section 
        className="features-section"
        initial={{ opacity: 0, y: 50 }} 
        whileInView={{ opacity: 1, y: 0 }} 
        viewport={{ once: true, amount: 0.2 }} 
        transition={{ duration: 0.6 }}
      >
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <img src={premiumRoastIcon} alt="Premium Roast" className="feature-svg" />
            </div>
            <h3>Premium Roast</h3>
            <p>Sourced from the finest farms around the globe for an unforgettable taste.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <img src={cozyAtmosphereIcon} alt="Cozy Atmosphere" className="feature-svg" />
            </div>
            <h3>Cozy Atmosphere</h3>
            <p>A perfect environment to relax, work, or catch up with friends.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <img src={ecoFriendlyIcon} alt="Eco-Friendly" className="feature-svg" />
            </div>
            <h3>Eco-Friendly</h3>
            <p>Committed to sustainable practices and 100% recyclable packaging.</p>
          </div>
        </div>
      </motion.section>

      <motion.section 
        className="popular-menu-section"
        initial={{ opacity: 0, y: 50 }} 
        whileInView={{ opacity: 1, y: 0 }} 
        viewport={{ once: true, amount: 0.2 }} 
        transition={{ duration: 0.6 }}
      >
        <div className="section-header">
          <h2>Our Favorites</h2>
          <p>Discover the drinks our customers love the most.</p>
        </div>
        <div className="menu-grid">
          <div className="menu-item-card">
            <div className="favorite-badge">Favorite</div>
            <img src={cappuccinoImg} alt="Cappuccino" className="menu-img-placeholder" style={{ objectFit: 'cover' }} />
            <div className="menu-info">
              <h4>Cappuccino</h4>
              <p>The perfect balance of coffee and milk foam. The soft foam on top brings happiness with every sip.</p>
              <span className="price">3.49 ₼</span>
            </div>
          </div>
          <div className="menu-item-card">
            <div className="favorite-badge">Favorite</div>
            <img src={redLatteImg} alt="Red Latte" className="menu-img-placeholder" style={{ objectFit: 'cover' }} />
            <div className="menu-info">
              <h4>Red Latte</h4>
              <p>Special Rednest recipe: The harmony of latte and strawberry syrup. A sweet and romantic taste.</p>
              <span className="price">3.75 ₼</span>
            </div>
          </div>
          <div className="menu-item-card">
            <div className="favorite-badge">Favorite</div>
            <img src={nestCappuccinoImg} alt="Nest Cappuccino" className="menu-img-placeholder" style={{ objectFit: 'cover' }} />
            <div className="menu-info">
              <h4>Nest Cappuccino</h4>
              <p>Cappuccino enriched with the sweetness of caramel and the aroma of hazelnut. Like a warm hug. </p>
              <span className="price">4.25 ₼</span>
            </div>
          </div>
          <div className="menu-item-card">
            <div className="favorite-badge">Favorite</div>
            <img src={hotChocolateImg} alt="Hot Chocolate" className="menu-img-placeholder" style={{ objectFit: 'cover' }} />
            <div className="menu-info">
              <h4>Hot Chocolate</h4>
              <p>A drink that warms your soul with the aroma and softness of thick chocolate. A taste that brings back childhood memories.</p>
              <span className="price">3.99 ₼</span>
            </div>
          </div>
        </div>
        <div className="section-actions">
          <Link to="/catalog" className="cta-btn secondary">View Full Menu</Link>
        </div>
      </motion.section>

      <motion.section 
        className="about-us-section"
        initial={{ opacity: 0, y: 50 }} 
        whileInView={{ opacity: 1, y: 0 }} 
        viewport={{ once: true, amount: 0.2 }} 
        transition={{ duration: 0.6 }}
      >
        <div className="about-grid">
          <div className="about-content">
            <h2>The Rednest Experience</h2>
            <p>
              At Rednest, we believe that coffee is more than just a drink—it's a ritual.
              We meticulously source our beans from sustainable farms across the globe,
              ensuring every cup you enjoy is crafted with passion and respect for the environment.
            </p>
            <p>
              Our baristas are artisans, dedicated to pouring perfection into every latte, cappuccino, and cold brew.
              Step into our cozy atmosphere and let us awaken your senses.
            </p>
          </div>
          <div className="about-visual">
            <img src={aboutImage} alt="The Rednest Experience" className="about-image" />
          </div>
        </div>
      </motion.section>

      <motion.section 
        className="newsletter-section"
        initial={{ opacity: 0, y: 50 }} 
        whileInView={{ opacity: 1, y: 0 }} 
        viewport={{ once: true, amount: 0.2 }} 
        transition={{ duration: 0.6 }}
      >
        <div className="newsletter-container">
          <h2>Join the Rednest Club</h2>
          <p>Subscribe to receive exclusive offers, new roast announcements, and brewing tips directly to your inbox.</p>
          <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="Enter your email address" required />
            <button type="submit" className="cta-btn" id='subscribe-btn'>Subscribe</button>
          </form>
        </div>
      </motion.section>

      <Footer />
    </motion.div>
  );
};

export default Home;
