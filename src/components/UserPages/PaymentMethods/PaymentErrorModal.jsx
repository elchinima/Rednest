import React from 'react';
import AnimatedModalWrapper from '../../Elements/AnimatedModalWrapper';
import useLang from '../../../utils/useLang';
import { getPaymentMethodsTranslation } from './Lang';
import '../../Elements/RednestModal.scss';

const PaymentErrorModal = ({ isOpen, onClose, message, title = 'Card Error' }) => {
  const { lang } = useLang();
  const t = (id) => getPaymentMethodsTranslation(lang, id);

  return (
    <AnimatedModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      targetBorderRadius="24px"
      zIndex={100005}
    >
      <div className="rednest-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rednest-modal__icon rednest-modal__icon--danger">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>

        <h3 className="rednest-modal__title">{title}</h3>
        <p className="rednest-modal__text">
          {message || 'An error occurred while processing your card.'}
        </p>

        <div className="rednest-modal__actions">
          <button
            type="button"
            className="rednest-modal__btn rednest-modal__btn--danger"
            onClick={onClose}
          >
            {t('modal_understand')}
          </button>
        </div>
      </div>
    </AnimatedModalWrapper>
  );
};

export default PaymentErrorModal;
