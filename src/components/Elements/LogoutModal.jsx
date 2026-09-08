import React from 'react';
import AnimatedModalWrapper from './AnimatedModalWrapper';
import loaderIconRed from '../../assets/icons/loader-animated-red.svg';
import { useLang } from '../../utils/useLang';
import { getWidgetTranslation } from './Lang';
import './RednestModal.scss';

const LogoutModal = ({
  isOpen,
  onClose,
  onConfirm,
  loading,
  title,
  text,
  confirmText,
}) => {
  const lang = useLang();
  const t = (id) => getWidgetTranslation(lang, id);

  const displayTitle = title || t('modal_logout_title');
  const displayText = text || t('modal_logout_text');
  const displayConfirmText = confirmText || t('modal_logout_confirm');

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

        <h3 className="rednest-modal__title">{displayTitle}</h3>
        <p className="rednest-modal__text">
          {displayText}
        </p>

        <div className="rednest-modal__actions">
          <button
            type="button"
            className="rednest-modal__btn rednest-modal__btn--cancel"
            onClick={onClose}
            disabled={loading}
          >
            {t('modal_logout_cancel')}
          </button>
          <button
            type="button"
            className="rednest-modal__btn rednest-modal__btn--danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff6b6b' }}>
                <img src={loaderIconRed} alt="Loading" style={{ width: '18px', height: '18px' }} />
                {t('modal_delete_deleting')}
              </span>
            ) : displayConfirmText}
          </button>
        </div>
      </div>
    </AnimatedModalWrapper>
  );
};

export default LogoutModal;
