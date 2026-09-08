import React, { useState, useEffect } from 'react';
import AnimatedModalWrapper from '../../Elements/AnimatedModalWrapper';
import loaderIconRed from '../../../assets/icons/loader-animated-red.svg';
import { useLang } from '../../../utils/useLang';
import { getAddressesTranslation } from './Lang';
import './AddressModal.scss';

const ButtonSpinner = () => (
  <img src={loaderIconRed} alt="Loading..." className="address-btn-spinner" style={{ width: '18px', height: '18px' }} />
);

const AddressModal = ({ isOpen, onClose, onSave, addressToEdit, loading }) => {
  const lang = useLang();
  const t = (id) => getAddressesTranslation(lang, id);
  const isEditing = Boolean(addressToEdit && addressToEdit.id);

  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [apartment, setApartment] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (addressToEdit) {
        setTitle(addressToEdit.title || '');
        setAddress(addressToEdit.address || '');
        setCity(addressToEdit.city || '');
        setApartment(addressToEdit.apartment || '');
        setPhone(addressToEdit.phone || '');
        setNotes(addressToEdit.notes || '');
        setIsDefault(Boolean(addressToEdit.isDefault));
      } else {
        setTitle('');
        setAddress('');
        setCity('');
        setApartment('');
        setPhone('');
        setNotes('');
        setIsDefault(false);
      }
      setError('');
    }
  }, [isOpen, addressToEdit]);

  const handleClose = () => {
    if (loading) return;
    setError('');
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');

    if (!address.trim()) {
      setError(t('modal_err_street'));
      return;
    }

    if (!city.trim()) {
      setError(t('modal_err_city'));
      return;
    }

    if (!phone.trim()) {
      setError(t('modal_err_phone'));
      return;
    }

    onSave({
      title: title.trim() || null,
      address: address.trim(),
      city: city.trim(),
      apartment: apartment.trim() || null,
      phone: phone.trim(),
      notes: notes.trim() || null,
      isDefault,
    });
  };

  return (
    <AnimatedModalWrapper
      isOpen={isOpen}
      onClose={handleClose}
      targetBorderRadius="24px"
    >
      <div className="address-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="address-modal__close"
          onClick={handleClose}
          disabled={loading}
          aria-label="Close modal"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="address-modal__header">
          <div className="address-modal__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <h2 className="address-modal__title">
            {isEditing ? t('modal_title_edit') : t('modal_title_add')}
          </h2>
          <p className="address-modal__desc">
            {isEditing
              ? t('modal_desc_edit')
              : t('modal_desc_add')}
          </p>
        </div>

        <form className="address-modal__form" onSubmit={handleSubmit}>
          {error && (
            <div className="address-modal__error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="address-modal__row">
            <div className="address-modal__field">
              <label htmlFor="addr-title">{t('modal_label_title')}</label>
              <input
                id="addr-title"
                type="text"
                placeholder={t('modal_ph_title')}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (error) setError('');
                }}
                maxLength={40}
                disabled={loading}
              />
            </div>

            <div className="address-modal__field">
              <label htmlFor="addr-city">
                {t('modal_label_city')} <span className="address-modal__required">*</span>
              </label>
              <input
                id="addr-city"
                type="text"
                placeholder={t('modal_ph_city')}
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  if (error) setError('');
                }}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="address-modal__field">
            <label htmlFor="addr-street">
              {t('modal_label_street')} <span className="address-modal__required">*</span>
            </label>
            <input
              id="addr-street"
              type="text"
              placeholder={t('modal_ph_street')}
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (error) setError('');
              }}
              required
              disabled={loading}
            />
          </div>

          <div className="address-modal__row">
            <div className="address-modal__field">
              <label htmlFor="addr-apt">{t('modal_label_apt')}</label>
              <input
                id="addr-apt"
                type="text"
                placeholder={t('modal_ph_apt')}
                value={apartment}
                onChange={(e) => setApartment(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="address-modal__field">
              <label htmlFor="addr-phone">
                {t('modal_label_phone')} <span className="address-modal__required">*</span>
              </label>
              <input
                id="addr-phone"
                type="tel"
                placeholder={t('modal_ph_phone')}
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (error) setError('');
                }}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="address-modal__field">
            <label htmlFor="addr-notes">{t('modal_label_notes')}</label>
            <textarea
              id="addr-notes"
              placeholder={t('modal_ph_notes')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={200}
              disabled={loading}
            />
          </div>

          <div className="address-modal__default-toggle" onClick={() => !loading && setIsDefault((prev) => !prev)}>
            <span className="address-modal__toggle-title">{t('modal_toggle_default')}</span>
            <button
              type="button"
              className={`address-modal__switch ${isDefault ? 'address-modal__switch--on' : ''}`}
              aria-label={t('modal_toggle_default')}
              disabled={loading}
              onClick={(e) => {
                e.stopPropagation();
                if (!loading) setIsDefault((prev) => !prev);
              }}
            >
              <span className="address-modal__switch-handle" />
            </button>
          </div>

          <div className="address-modal__actions">
            <button
              type="button"
              className="cta-btn sm address-modal__btn address-modal__btn--cancel"
              onClick={handleClose}
              disabled={loading}
            >
              {t('modal_btn_cancel')}
            </button>
            <button
              type="submit"
              className="cta-btn sm address-modal__btn address-modal__btn--submit"
              disabled={loading || !address.trim() || !phone.trim() || !city.trim()}
            >
              {loading ? (
                <span className="address-loader-inner">
                  <ButtonSpinner />
                  {isEditing ? t('modal_btn_saving') : t('modal_btn_adding')}
                </span>
              ) : (
                isEditing ? t('modal_btn_save') : t('modal_btn_add')
              )}
            </button>
          </div>
        </form>
      </div>
    </AnimatedModalWrapper>
  );
};

export default AddressModal;
