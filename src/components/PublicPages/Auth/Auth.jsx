import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import logo from '../../../assets/icons/rednest_logo.png';
import './Auth.scss';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    setError(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authorization / Registration Error');
      }

      localStorage.setItem('token', data.token);
      setSuccess(true);

      window.location.href = '/';
    } catch (err) {
      console.error("Auth Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      className="auth-page"
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      transition={{ duration: 0.3 }}
    >
      <div className="auth-overlay"></div>
      
      <div className="auth-container">
        <Link to="/" className="auth-back-link">
          ← Back to Home
        </Link>
        
        <div className="auth-card-split">
          <div className="auth-card-left">
            <div className="auth-card-left-content">
              <Link to="/">
                <img src={logo} alt="Rednest" className="auth-brand-logo" />
              </Link>
              <h2>Awaken Your Senses</h2>
              <p>Experience the rich, bold flavors of our premium coffee blends. Join our community today.</p>
            </div>
          </div>
          
          <div className="auth-card-right">
            <div className="auth-header">
              <img src={logo} alt="Rednest Logo" className="auth-logo mobile-only-logo" />
              <h2>Welcome to Rednest</h2>
              <p>Enter your email and password to log in or create a new account.</p>
            </div>
            
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="input-group">
                <label htmlFor="email">Email</label>
                <input 
                  type="email" 
                  id="email" 
                  placeholder="Enter your email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
              
              <div className="input-group">
                <label htmlFor="password">Password</label>
                <input 
                  type="password" 
                  id="password" 
                  placeholder="Enter your password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
              
              <div className="checkbox-group">
                <input 
                  type="checkbox" 
                  id="agree" 
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  required 
                />
                <label htmlFor="agree">
                  I agree to the <Link to="/terms" className="terms-link">Terms of Use</Link>
                </label>
              </div>
              
              {error && <div className="auth-error" style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

              <button type="submit" className="cta-btn auth-submit-btn" disabled={loading}>
                {loading ? 'Processing...' : 'Continue'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Auth;
