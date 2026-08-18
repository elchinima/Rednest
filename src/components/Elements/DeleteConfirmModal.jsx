import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import '../PublicPages/Auth/Auth.scss';

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, itemName, loading }) => {
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
                  <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Remove Item</h2>
                  <p style={{ width: '85%', margin: '0 auto' }}>
                    {itemName 
                      ? `Are you sure you want to remove ${itemName} from your basket?` 
                      : 'Are you sure you want to remove this item from your basket?'}
                  </p>
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
                    className="cta-btn logout-confirm-btn" 
                    onClick={onConfirm} 
                    disabled={loading}
                    style={{ flex: 1 }}
                  >
                    Remove
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

export default DeleteConfirmModal;
