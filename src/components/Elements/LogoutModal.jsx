import React from 'react';
import AnimatedModalWrapper from './AnimatedModalWrapper';
import loaderIcon from '../../assets/icons/loader-animated.svg';
import './RednestModal.scss';

const LogoutModal = ({
  isOpen,
  onClose,
  onConfirm,
  loading,
  title = 'Log Out',
  text = 'Are you sure you want to log out of your account?',
  confirmText = 'Log Out',
}) => {
  return (
    <AnimatedModalWrapper
      isOpen={isOpen}
      onClose={() => !loading && onClose()}
      targetBorderRadius="24px"
    >
      <div className="rednest-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rednest-modal__icon rednest-modal__icon--danger">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </div>

        <h3 className="rednest-modal__title">{title}</h3>
        <p className="rednest-modal__text">
          {text}
        </p>

        <div className="rednest-modal__actions">
          <button
            type="button"
            className="rednest-modal__btn rednest-modal__btn--cancel"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rednest-modal__btn rednest-modal__btn--danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src={loaderIcon} alt="Loading" style={{ width: '18px', height: '18px', filter: 'brightness(0) invert(1)' }} />
                Processing...
              </span>
            ) : 'Log Out'}
          </button>
        </div>
      </div>
    </AnimatedModalWrapper>
  );
};

export default LogoutModal;
