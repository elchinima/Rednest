import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../PublicPages/Auth/Auth.scss';
import loaderIcon from '../../assets/icons/loader-animated.svg';

const LogoutModal = ({ isOpen, onClose, onConfirm, loading }) => {
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
                <div className="auth-header" style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Log Out</h2>
                  <p>Are you sure you want to log out of your account?</p>
                </div>
                
                <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
                  <button 
                    className="cta-btn auth-submit-btn" 
                    onClick={onClose} 
                    disabled={loading}
                    style={{ flex: 1, margin: 0, padding: '14px' }}
                  >
                    Cancel
                  </button>
                  <button 
                    className="cta-btn" 
                    onClick={onConfirm} 
                    disabled={loading}
                    style={{ 
                      flex: 1, 
                      background: 'rgba(255, 255, 255, 0.1)', 
                      color: '#fff', 
                      padding: '14px',
                      borderRadius: '8px'
                    }}
                  >
                    {loading ? (
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        <span style={{ position: 'absolute', right: '100%', marginRight: '8px', display: 'flex' }}>
                          <img src={loaderIcon} alt="Loading" style={{ width: '22px', height: '22px' }} />
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
