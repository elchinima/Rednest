import React from 'react';
import AnimatedModalWrapper from '../../Elements/AnimatedModalWrapper';
import '../../Elements/RednestModal.scss';

const SubscribeErrorModal = ({ isOpen, onClose, message, onOpenRegister }) => {
  return (
    <AnimatedModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      targetBorderRadius="24px"
    >
      <div className="rednest-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rednest-modal__icon rednest-modal__icon--warning">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h3 className="rednest-modal__title">Account Required</h3>
        <p className="rednest-modal__text">
          {message || 'This email is not registered. Please create an account first.'}
        </p>

        <div className="rednest-modal__actions">
          <button
            type="button"
            className="rednest-modal__btn rednest-modal__btn--cancel"
            onClick={onClose}
          >
            Close
          </button>
          {onOpenRegister && (
            <button
              type="button"
              className="rednest-modal__btn rednest-modal__btn--danger"
              style={{ background: '#e53e3e', boxShadow: '0 4px 14px rgba(229, 62, 62, 0.35)' }}
              onClick={() => {
                onClose();
                onOpenRegister();
              }}
            >
              Sign Up
            </button>
          )}
        </div>
      </div>
    </AnimatedModalWrapper>
  );
};

export default SubscribeErrorModal;
