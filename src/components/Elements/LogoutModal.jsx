import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../PublicPages/Auth/Auth.scss';

const LoaderIcon = () => (
  <svg width="22" height="22" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g>
      <animateTransform attributeName="transform" type="rotate" values="0 24 24; 360 24 24" dur="1s" repeatCount="indefinite" />
      <circle cx="24" cy="24" r="16" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M24 8 A16 16 0 0 1 40 24" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </g>
  </svg>
);

const LogoutModal = ({ isOpen, onClose, onConfirm, loading }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="auth-page" 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, background: 'none' }}
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          transition={{ duration: 0.3 }}
        >
          <div className="auth-overlay" onClick={onClose} style={{ backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)' }}></div>
          
          <div className="auth-container" style={{ display: 'flex', justifyContent: 'center' }}>
            <motion.div 
              className="auth-card-split" 
              style={{ maxWidth: '400px', width: '100%', flex: 'none' }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="auth-card-right" style={{ width: '100%', padding: '40px' }}>
                <div className="auth-header" style={{ marginBottom: '24px', textAlign: 'center' }}>
                  <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Log Out</h2>
                  <p style={{ width: '80%', margin: '0 auto' }}>Are you sure you want to log out of your account?</p>
                </div>
                
                <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
                  {!loading && (
                    <button 
                      className="cta-btn auth-submit-btn" 
                      onClick={onClose} 
                      disabled={loading}
                      style={{ flex: 1, margin: 0, padding: '14px' }}
                    >
                      Cancel
                    </button>
                  )}
                  <button 
                    className="cta-btn logout-confirm-btn" 
                    onClick={onConfirm} 
                    disabled={loading}
                  >
                    {loading ? (
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <span style={{ display: 'flex' }}>
                          <LoaderIcon />
                        </span>
                        Processing...
                      </span>
                    ) : 'Log Out'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LogoutModal;
