import React, { useState, useEffect } from 'react';
import AnimatedModalWrapper from '../../Elements/AnimatedModalWrapper';
import loaderIcon from '../../../assets/icons/loader-animated.svg';

const PRESET_TITLES = [
  { label: 'Home', icon: '🏠' },
  { label: 'Work', icon: '🏢' },
  { label: 'Apartment', icon: '🏬' },
  { label: 'Parents', icon: '🏡' },
  { label: 'Gym', icon: '🏋️' },
  { label: 'Other', icon: '📍' },
];

const AddressModal = ({ isOpen, onClose, onSave, addressToEdit, loading }) => {
  const isEditing = Boolean(addressToEdit && addressToEdit.id);

  const [title, setTitle] = useState('Home');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Baku');
  const [apartment, setApartment] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (addressToEdit) {
        setTitle(addressToEdit.title || 'Home');
        setAddress(addressToEdit.address || '');
        setCity(addressToEdit.city || 'Baku');
        setApartment(addressToEdit.apartment || '');
        setPhone(addressToEdit.phone || '');
        setNotes(addressToEdit.notes || '');
        setIsDefault(Boolean(addressToEdit.isDefault));
      } else {
        setTitle('Home');
        setAddress('');
        setCity('Baku');
        setApartment('');
        setPhone('');
        setNotes('');
        setIsDefault(false);
      }
      setError('');
    }
  }, [isOpen, addressToEdit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!address.trim()) {
      setError('Please enter your street address.');
      return;
    }

    onSave({
      title: title.trim() || 'Home',
      address: address.trim(),
      city: city.trim() || 'Baku',
      apartment: apartment.trim() || null,
      phone: phone.trim() || null,
      notes: notes.trim() || null,
      isDefault,
    });
  };

  return (
    <AnimatedModalWrapper
      isOpen={isOpen}
      onClose={() => !loading && onClose()}
      targetBorderRadius="24px"
    >
      <div className="address-modal" onClick={(e) => e.stopPropagation()}>
        <div className="address-modal__header">
          <div className="address-modal__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div className="address-modal__title-wrap">
            <h3 className="address-modal__title">
              {isEditing ? 'Edit Address' : 'Add Delivery Address'}
            </h3>
            <p className="address-modal__subtitle">
              {isEditing
                ? 'Update your delivery details and instructions'
                : 'Save a new delivery address for faster checkout'}
            </p>
          </div>
          <button
            type="button"
            className="address-modal__close-btn"
            onClick={onClose}
            disabled={loading}
            aria-label="Close modal"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form className="address-modal__form" onSubmit={handleSubmit}>
          {error && <div className="address-modal__error">{error}</div>}

          {/* Quick presets */}
          <div className="address-modal__field">
            <label className="address-modal__label">Address Label / Category</label>
            <div className="address-modal__chips">
              {PRESET_TITLES.map((preset) => {
                const isSelected = title.toLowerCase() === preset.label.toLowerCase();
                return (
                  <button
                    key={preset.label}
                    type="button"
                    className={`address-modal__chip ${isSelected ? 'address-modal__chip--active' : ''}`}
                    onClick={() => setTitle(preset.label)}
                  >
                    <span>{preset.icon}</span>
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              className="address-modal__input address-modal__input--title"
              placeholder="e.g. Home, Office, Gym, Mom's House..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={40}
            />
          </div>

          {/* Street Address & City */}
          <div className="address-modal__row">
            <div className="address-modal__field address-modal__field--grow">
              <label className="address-modal__label">
                Street Address <span className="address-modal__required">*</span>
              </label>
              <input
                type="text"
                className="address-modal__input"
                placeholder="e.g. Nizami Street 48, Building 2"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>

            <div className="address-modal__field address-modal__field--city">
              <label className="address-modal__label">City</label>
              <input
                type="text"
                className="address-modal__input"
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>

          {/* Apartment / Floor / Entrance & Contact Phone */}
          <div className="address-modal__row">
            <div className="address-modal__field">
              <label className="address-modal__label">Apt / Floor / Entrance</label>
              <input
                type="text"
                className="address-modal__input"
                placeholder="e.g. Apt 14, Floor 3, Ent. 1"
                value={apartment}
                onChange={(e) => setApartment(e.target.value)}
              />
            </div>

            <div className="address-modal__field">
              <label className="address-modal__label">Contact Phone (Optional)</label>
              <input
                type="tel"
                className="address-modal__input"
                placeholder="e.g. +994 50 123 45 67"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Courier Notes */}
          <div className="address-modal__field">
            <label className="address-modal__label">Courier Instructions / Intercom Code</label>
            <textarea
              className="address-modal__textarea"
              placeholder="e.g. Intercom code #1234. Please leave at door or call before arriving."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={200}
            />
          </div>

          {/* Default address switch */}
          <div className="address-modal__default-toggle" onClick={() => setIsDefault((prev) => !prev)}>
            <div className="address-modal__toggle-info">
              <span className="address-modal__toggle-title">Set as default delivery address</span>
              <span className="address-modal__toggle-desc">
                This address will be selected automatically during checkout
              </span>
            </div>
            <button
              type="button"
              className={`address-modal__switch ${isDefault ? 'address-modal__switch--on' : ''}`}
              aria-label="Set as default address"
              onClick={(e) => {
                e.stopPropagation();
                setIsDefault((prev) => !prev);
              }}
            >
              <span className="address-modal__switch-handle" />
            </button>
          </div>

          {/* Actions */}
          <div className="address-modal__actions">
            <button
              type="button"
              className="address-modal__btn address-modal__btn--cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="cta-btn primary-red address-modal__btn address-modal__btn--save"
              disabled={loading || !address.trim()}
            >
              {loading ? (
                <span className="address-modal__btn-spinner">
                  <img src={loaderIcon} alt="Loading" />
                  {isEditing ? 'Saving...' : 'Adding...'}
                </span>
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Add Address'
              )}
            </button>
          </div>
        </form>
      </div>
    </AnimatedModalWrapper>
  );
};

export default AddressModal;
