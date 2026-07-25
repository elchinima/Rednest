import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../../../assets/icons/rednest_logo.png';
import './Auth.scss';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Submit Auth:", { email, password, agree });
  };

  return (
    <div className="auth-page">
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
              
              <button type="submit" className="cta-btn auth-submit-btn">Continue</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
