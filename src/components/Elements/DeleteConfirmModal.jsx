import React from 'react';
import AnimatedModalWrapper from './AnimatedModalWrapper';
import loaderIcon from '../../assets/icons/loader-animated.svg';
import './RednestModal.scss';

const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  title = 'Remove Item',
  text,
  confirmLabel = 'Remove',
  loading
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
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </div>

        <h3 className="rednest-modal__title">{title}</h3>
        <p className="rednest-modal__text">
          {text || (itemName
            ? `Are you sure you want to remove ${itemName} from your basket?`
            : 'Are you sure you want to remove this item from your basket?')}
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
                Deleting...
              </span>
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </AnimatedModalWrapper>
  );
};

export default DeleteConfirmModal;
