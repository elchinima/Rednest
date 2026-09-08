import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';
import loaderIcon from '../../../assets/icons/loader-animated.svg';
import Navbar from '../../Elements/Navbar';
import Footer from '../../Footer/Footer';
import DeleteConfirmModal from '../../Elements/DeleteConfirmModal';
import AddressModal from './AddressModal';
import PaymentErrorModal from '../PaymentMethods/PaymentErrorModal';
import useLang from '../../../utils/useLang';
import { getAddressesTranslation } from './Lang';
import './Addresses.scss';

const apiUrl = import.meta.env.VITE_API_URL || '';

const formatBakuDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return '';
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.05,
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: 0.2 },
  },
};

const Addresses = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { lang } = useLang();
  const t = (id) => getAddressesTranslation(lang, id);

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressToEdit, setAddressToEdit] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [settingDefaultId, setSettingDefaultId] = useState(null);

  const showToast = (msg, type = 'success', duration = 3000) => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, duration);
  };

  const fetchAddresses = async () => {
    setLoading(true);
    setError(null);
    try {
      let res = await fetchWithRefresh(`${apiUrl}/api/addresses`);
      if (!res.ok && res.status === 404) {
        res = await fetchWithRefresh(`${apiUrl}/api/adresses`);
      }
      if (!res.ok) {
        throw new Error('Failed to load saved delivery addresses.');
      }
      const data = await res.json();
      setAddresses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching addresses:', err);
      setError(err.message || 'Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleSaveAddress = async (formData) => {
    setModalLoading(true);
    try {
      const isEditing = Boolean(addressToEdit && addressToEdit.id);
      const endpoint = isEditing ? `/api/addresses/${addressToEdit.id}` : '/api/addresses';
      const url = `${apiUrl}${endpoint}`;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetchWithRefresh(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to save address.');
      }

      const savedAddress = await res.json();

      if (isEditing) {
        setAddresses((prev) => {
          const updated = prev.map((item) =>
            item.id === savedAddress.id ? savedAddress : formData.isDefault ? { ...item, isDefault: false } : item
          );
          return updated.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
        });
        showToast(t('addr_toast_updated'));
      } else {
        setAddresses((prev) => {
          const updated = formData.isDefault
            ? prev.map((item) => ({ ...item, isDefault: false }))
            : [...prev];
          return [savedAddress, ...updated].sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
        });
        showToast(t('addr_toast_added'));
      }

      setIsAddressModalOpen(false);
      setAddressToEdit(null);
    } catch (err) {
      setErrorModalMessage(err.message || 'Error saving address.');
      setIsErrorModalOpen(true);
    } finally {
      setModalLoading(false);
    }
  };

  const handleSetDefault = async (address) => {
    if (!address || address.isDefault || settingDefaultId) return;
    setSettingDefaultId(address.id);

    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/addresses/${address.id}/default`, {
        method: 'PATCH',
      });
      if (!res.ok) {
        throw new Error('Failed to set default address.');
      }

      setAddresses((prev) =>
        prev
          .map((a) => ({
            ...a,
            isDefault: a.id === address.id,
          }))
          .sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0))
      );
      showToast(`"${address.title || address.address}" ${t('addr_toast_default')}`);
    } catch (err) {
      showToast(err.message || 'Error setting default address.', 'error');
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!addressToDelete || deleteLoading) return;
    setDeleteLoading(true);

    try {
      const res = await fetchWithRefresh(`${apiUrl}/api/addresses/${addressToDelete.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Failed to remove address.');
      }

      setAddresses((prev) => {
        const remaining = prev.filter((a) => a.id !== addressToDelete.id);
        if (addressToDelete.isDefault && remaining.length > 0 && !remaining.some((a) => a.isDefault)) {
          remaining[0].isDefault = true;
        }
        return remaining;
      });

      showToast(t('addr_toast_deleted'));
      setIsDeleteModalOpen(false);
      setAddressToDelete(null);
    } catch (err) {
      showToast(err.message || 'Error deleting address.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const isEmpty = !loading && addresses.length === 0;

  return (
    <motion.div
      className="addresses-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Navbar />

      <main className={`addresses-main ${isEmpty ? 'addresses-main--empty' : ''}`}>
        <div className={`addresses-container ${isEmpty ? 'addresses-container--empty' : ''}`}>
          <motion.div
            className="addresses-hero"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1>{t('addr_hero_title')}</h1>
            <p className="addresses-hero__desc">
              {t('addr_hero_desc')}
            </p>

            <div className="addresses-hero__actions">
              <button
                type="button"
                className="cta-btn primary-red addresses-hero__add-btn"
                onClick={() => {
                  if (addresses.length >= 3) {
                    setErrorModalMessage(t('addr_limit_reached'));
                    setIsErrorModalOpen(true);
                  } else {
                    setAddressToEdit(null);
                    setIsAddressModalOpen(true);
                  }
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>{t('addr_btn_add')}</span>
              </button>
            </div>
          </motion.div>

          {loading ? (
            <div className="addresses-loading-state">
              <img src={loaderIcon} alt="Loading..." className="addresses-loader-icon" />
              <p>{t('addr_loading')}</p>
            </div>
          ) : error ? (
            <div className="addresses-error-state">
              <p>{error}</p>
              <button
                type="button"
                className="cta-btn sm secondary"
                onClick={fetchAddresses}
              >
                {t('addr_try_again')}
              </button>
            </div>
          ) : (
            <>
              <div className="addresses-grid">
                <AnimatePresence>
                  {addresses.map((addr, idx) => (
                    <motion.div
                      key={addr.id}
                      className={`address-card ${addr.isDefault ? 'address-card--default' : ''}`}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      custom={idx}
                      layout
                    >
                      <div className="address-card__header">
                        <div className="address-card__title-group">
                          <div className="address-card__icon-badge">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                          </div>
                          <div className="address-card__meta">
                            {addr.title ? (
                              <>
                                <h3 className="address-card__title">{addr.title}</h3>
                                {addr.createdAt && (
                                  <span className="address-card__date">
                                    {t('addr_added_on')} {formatBakuDate(addr.createdAt)}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="address-card__date address-card__date--standalone">
                                {addr.createdAt ? `${t('addr_added_on')} ${formatBakuDate(addr.createdAt)}` : t('addr_fallback_title')}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="address-card__badges">
                          {addr.isDefault && (
                            <span className="address-card__badge-default">
                              <span className="pulsing-dot" />
                              {t('addr_badge_default')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="address-card__body">
                        <div className="address-card__street">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          <span>{addr.address}</span>
                        </div>

                        <div className="address-card__details-grid">
                          {addr.city && (
                            <div className="address-card__detail-item">
                              <span className="address-card__detail-label">{t('addr_city')}</span>
                              <span className="address-card__detail-val">{addr.city}</span>
                            </div>
                          )}

                          {addr.apartment && (
                            <div className="address-card__detail-item">
                              <span className="address-card__detail-label">{t('addr_apt')}</span>
                              <span className="address-card__detail-val">{addr.apartment}</span>
                            </div>
                          )}

                          {addr.phone && (
                            <div className="address-card__detail-item">
                              <span className="address-card__detail-label">{t('addr_phone')}</span>
                              <span className="address-card__detail-val">{addr.phone}</span>
                            </div>
                          )}
                        </div>

                        {addr.notes && (
                          <div className="address-card__note-box">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            <span>{addr.notes}</span>
                          </div>
                        )}
                      </div>

                      <div className="address-card__footer">
                        <div className="address-card__footer-left">
                          {!addr.isDefault && (
                            <button
                              type="button"
                              className="address-card__action-btn address-card__action-btn--default"
                              onClick={() => handleSetDefault(addr)}
                              disabled={settingDefaultId === addr.id}
                              title={t('addr_set_default')}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                              </svg>
                              <span>{settingDefaultId === addr.id ? t('addr_setting_default') : t('addr_set_default')}</span>
                            </button>
                          )}
                        </div>

                        <div className="address-card__footer-right">
                          <button
                            type="button"
                            className="address-card__action-btn address-card__action-btn--edit"
                            onClick={() => {
                              setAddressToEdit(addr);
                              setIsAddressModalOpen(true);
                            }}
                            title={t('addr_edit')}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            <span>{t('addr_edit')}</span>
                          </button>

                          <button
                            type="button"
                            className="address-card__action-btn address-card__action-btn--delete"
                            onClick={() => {
                              setAddressToDelete(addr);
                              setIsDeleteModalOpen(true);
                            }}
                            title={t('addr_delete')}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            <span>{t('addr_delete')}</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </main>

      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => {
          setIsAddressModalOpen(false);
          setAddressToEdit(null);
        }}
        onSave={handleSaveAddress}
        addressToEdit={addressToEdit}
        loading={modalLoading}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setAddressToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        itemName={addressToDelete ? (addressToDelete.title ? `"${addressToDelete.title}" (${addressToDelete.address})` : `"${addressToDelete.address}"`) : t('addr_this_address')}
        loading={deleteLoading}
      />

      <PaymentErrorModal
        isOpen={isErrorModalOpen}
        onClose={() => setIsErrorModalOpen(false)}
        message={errorModalMessage}
        title={t('addr_limit_title')}
      />

      <div className="addresses-toast-container">
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              className={`addresses-toast ${toastType === 'error' ? 'addresses-toast--error' : ''}`}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.25 }}
            >
              {toastType === 'error' ? (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              )}
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Footer />
    </motion.div>
  );
};

export default Addresses;
