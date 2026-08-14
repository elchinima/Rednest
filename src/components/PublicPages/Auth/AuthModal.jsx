import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../../../assets/icons/rednest_logo.png';
import AnimatedModalWrapper from '../../Elements/AnimatedModalWrapper';
import { useAuth } from '../../../context/AuthContext';
import './AuthModal.scss';

const LoaderIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g>
      <animateTransform attributeName="transform" type="rotate" values="0 24 24; 360 24 24" dur="1s" repeatCount="indefinite" />
      <circle cx="24" cy="24" r="16" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M24 8 A16 16 0 0 1 40 24" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </g>
  </svg>
);

const AuthModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('login');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    setError(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Authorization / Registration Error');
      }

      if (!data.hasName) {
        setStep('name');
      } else {
        localStorage.setItem('rednest_auth', 'true');
        window.location.reload();
      }
    } catch (err) {
      console.error("Auth Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNameSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    setError(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiUrl}/api/auth/name`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update name');
      }

      localStorage.setItem('rednest_auth', 'true');
      login({ email, name });
      onClose();
      window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
          <p>
            {step === 'login'
              ? 'Enter your email and password to log in or create a new account.'
              : 'Almost there! Enter your name to complete registration.'}
          </p>
        </div>
        
        {step === 'login' ? (
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

            {error && (
              <div className="auth-modal-error">{error}</div>
            )}
            
            <button type="submit" className="cta-btn auth-modal-submit-btn" disabled={loading}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <LoaderIcon /> Processing...
                </span>
              ) : 'Continue'}
            </button>
          </form>
        ) : (
          <form className="auth-modal-form" onSubmit={handleNameSubmit}>
            <div className="input-group">
              <label htmlFor="modal-name">Your Name</label>
              <input 
                type="text" 
                id="modal-name" 
                placeholder="Enter your name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required 
                autoFocus
              />
            </div>

            {error && (
              <div className="auth-modal-error">{error}</div>
            )}
            
            <button type="submit" className="cta-btn auth-modal-submit-btn" disabled={loading}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <LoaderIcon /> Saving...
                </span>
              ) : 'Complete Registration'}
            </button>
          </form>
        )}
      </div>
    </AnimatedModalWrapper>
  );
};

export default AuthModal;
