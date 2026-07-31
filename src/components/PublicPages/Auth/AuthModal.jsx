import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../../../assets/icons/rednest_logo.png';
import AnimatedModalWrapper from '../../Elements/AnimatedModalWrapper';
import './AuthModal.scss';

const AuthModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Submit Auth Modal:", { email, password, agree });
    onClose();
  };

  return (
    <AnimatedModalWrapper isOpen={isOpen} onClose={onClose}>
      <div 
        className="auth-modal-content"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="auth-modal-close" onMouseDown={onClose} onClick={onClose} aria-label="Close modal">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        
        <div className="auth-modal-header">
          <img src={logo} alt="Rednest Logo" className="auth-modal-logo" />
          <h2>Welcome to Rednest</h2>
          <p>Enter your email and password to log in or create a new account.</p>
        </div>
        
        <form className="auth-modal-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="modal-email">Email</label>
            <input 
              type="email" 
              id="modal-email" 
              placeholder="Enter your email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="modal-password">Password</label>
            <input 
              type="password" 
              id="modal-password" 
              placeholder="Enter your password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          
          <div className="checkbox-group">
            <input 
              type="checkbox" 
              id="modal-agree" 
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              required 
            />
            <label htmlFor="modal-agree">
              I agree to the <Link to="/terms" onClick={onClose} className="terms-link">Terms of Use</Link>
            </label>
          </div>
          
          <button type="submit" className="cta-btn auth-modal-submit-btn">Continue</button>
        </form>
      </div>
    </AnimatedModalWrapper>
  );
};

export default AuthModal;
