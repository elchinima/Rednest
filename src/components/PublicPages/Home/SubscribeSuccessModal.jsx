import React from 'react';
import AnimatedModalWrapper from '../../Elements/AnimatedModalWrapper';
import { useLang } from '../../../utils/useLang';
import { getHomeTranslation } from './Lang';
import '../../Elements/RednestModal.scss';

const SubscribeSuccessModal = ({ isOpen, onClose, message }) => {
  const lang = useLang();
  const t = (id) => getHomeTranslation(lang, id);

  return (
    <AnimatedModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      targetBorderRadius="24px"
    >
      <div className="rednest-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rednest-modal__icon rednest-modal__icon--success">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h3 className="rednest-modal__title" data-id="home_modal_succ_title">{t('home_modal_succ_title')}</h3>
        <p className="rednest-modal__text">
          {message || 'Successfully subscribed to the Rednest Club!'}
        </p>

        <div className="rednest-modal__actions">
          <button
            type="button"
            className="rednest-modal__btn rednest-modal__btn--success"
            onClick={onClose}
            data-id="home_modal_succ_btn"
          >
            {t('home_modal_succ_btn')}
          </button>
        </div>
      </div>
    </AnimatedModalWrapper>
  );
};

export default SubscribeSuccessModal;
