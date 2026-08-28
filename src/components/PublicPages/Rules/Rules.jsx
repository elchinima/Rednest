import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Footer from '../../Footer/Footer';
import Navbar from '../../Elements/Navbar';
import './Rules.scss';

const Rules = () => {
  useEffect(() => {
    document.title = 'Rednest';
    window.scrollTo(0, 0);
  }, []);

  return (
    <motion.div 
      className="rules-page"
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      transition={{ duration: 0.3 }}
    >
      <Navbar />

      <main className="rules-main">
        <div className="rules-ambient-bg" />

        <div className="rules-container">
          <motion.div 
            className="rules-hero"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="rules-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span>Legal & Policies</span>
            </div>
            <h1 className="rules-title">Terms of Use</h1>
            <p className="rules-subtitle">
              Please review our terms of service, policies, and guidelines.
            </p>
          </motion.div>

          <motion.div 
            className="rules-card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="rules-empty-state">
              <div className="rules-empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <h2 className="rules-section-title">Terms of Service</h2>
              <p className="rules-placeholder-text">
                The content for the Terms of Use is currently being updated. Please check back soon for our comprehensive rules, terms of service, and user agreements.
              </p>
              
              <div className="rules-meta-info">
                <span className="rules-meta-tag">Status: Draft</span>
                <span className="rules-meta-tag">Last modified: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>

            <div className="rules-actions">
              <Link to="/" className="cta-btn secondary">
                Back to Home
              </Link>
              <Link to="/catalog" className="cta-btn">
                Explore Menu
              </Link>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </motion.div>
  );
};

export default Rules;
