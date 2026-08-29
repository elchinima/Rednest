import React from 'react';
import AnimatedModalWrapper from '../../Elements/AnimatedModalWrapper';
import '../../Elements/RednestModal.scss';

const SubscribeErrorModal = ({ isOpen, onClose, message, errorType, onOpenRegister }) => {
  const isAlreadySubscribed = errorType === 'ALREADY_SUBSCRIBED' || 
    (typeof message === 'string' && message.toLowerCase().includes('already subscribed'));
  
  const isAccountRequired = errorType === 'ACCOUNT_NOT_FOUND' ||
    (typeof message === 'string' && message.toLowerCase().includes('not registered'));

  const title = isAlreadySubscribed 
    ? 'Already Subscribed' 
    : isAccountRequired 
      ? 'Account Required' 
      : 'Subscription Notice';

  return (
    <AnimatedModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      targetBorderRadius="24px"
    >
      <div className="rednest-modal" onClick={(e) => e.stopPropagation()}>
        <div className={`rednest-modal__icon ${isAlreadySubscribed ? 'rednest-modal__icon--warning' : 'rednest-modal__icon--warning'}`}>
          {isAlreadySubscribed ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
        </div>

        <h3 className="rednest-modal__title">{title}</h3>
        <p className="rednest-modal__text">
          {message || (isAlreadySubscribed 
            ? 'This email is already subscribed to the newsletter. If you have questions or need assistance, please contact technical support.' 
            : 'This email is not registered. Please create an account first.')}
        </p>

        <div className="rednest-modal__actions">
          <button
            type="button"
            className="rednest-modal__btn rednest-modal__btn--cancel"
            onClick={onClose}
          >
            Close
          </button>
          {isAlreadySubscribed && (
            <a
              href="mailto:hello@rednestcoffee.com?subject=Newsletter%20Subscription%20Support"
              className="rednest-modal__btn rednest-modal__btn--danger"
              style={{
                textDecoration: 'none',
                background: '#d97706',
                boxShadow: '0 4px 14px rgba(217, 119, 6, 0.35)'
              }}
              onClick={onClose}
            >
              Contact Support
            </a>
          )}
          {!isAlreadySubscribed && isAccountRequired && onOpenRegister && (
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
