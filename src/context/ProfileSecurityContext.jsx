import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ProfilePasswordModal from '../components/Elements/ProfilePasswordModal';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import { API_URL } from '../utils/config';

import { useLang } from '../utils/useLang';
import { getWidgetTranslation } from '../components/Elements/Lang';

const ProfileSecurityContext = createContext(null);

const PROTECTED_ROUTES = [
  '/profile',
  '/addresses',
  '/adresses',
  '/payment-methods',
  '/sessions',
  '/orders',
  '/reviews',
];

const getModalContent = (path, lang) => {
  const t = (id) => getWidgetTranslation(lang, id);
  const title = t('modal_security_title');
  if (path === '/addresses' || path === '/adresses') {
    return {
      title,
      description: t('modal_security_desc_addresses'),
    };
  }
  if (path === '/payment-methods') {
    return {
      title,
      description: t('modal_security_desc_payments'),
    };
  }
  if (path === '/sessions') {
    return {
      title,
      description: t('modal_security_desc_sessions'),
    };
  }
  if (path === '/orders') {
    return {
      title,
      description: t('modal_security_desc_orders'),
    };
  }
  if (path === '/reviews') {
    return {
      title,
      description: t('modal_security_desc_reviews'),
    };
  }
  return {
    title,
    description: t('modal_security_desc_profile'),
  };
};

export const ProfileSecurityProvider = ({ children }) => {
  const [isProfileUnlocked, setIsProfileUnlocked] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [targetPath, setTargetPath] = useState('/profile');
  const navigate = useNavigate();
  const location = useLocation();
  const lang = useLang();
  const successCallbackRef = useRef(null);

  const checkSecurityStatus = useCallback(async () => {
    try {
      const apiUrl = API_URL;
      const res = await fetchWithRefresh(`${apiUrl}/api/auth/security-status`, {
        skipAuthRedirect: true,
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.verified) {
          setIsProfileUnlocked(true);
          return true;
        }
      }
      setIsProfileUnlocked(false);
      return false;
    } catch {
      return false;
    }
  }, []);

  const requireProfileAccess = useCallback((destination = '/profile', onSuccess = null) => {
    setTargetPath(destination);
    successCallbackRef.current = onSuccess;
    setIsPasswordModalOpen(true);
  }, []);

  const lockProfile = useCallback(() => {
    setIsProfileUnlocked(false);
  }, []);

  const handleVerificationSuccess = useCallback(() => {
    setIsProfileUnlocked(true);
    setIsPasswordModalOpen(false);

    if (successCallbackRef.current) {
      successCallbackRef.current();
      successCallbackRef.current = null;
    }

    if (targetPath && location.pathname !== targetPath) {
      navigate(targetPath);
    }
  }, [navigate, location.pathname, targetPath]);

  const handleModalClose = useCallback(() => {
    setIsPasswordModalOpen(false);
    successCallbackRef.current = null;

    if (!isProfileUnlocked && PROTECTED_ROUTES.includes(location.pathname)) {
      navigate('/', { replace: true });
    }
  }, [location.pathname, isProfileUnlocked, navigate]);

  const modalContent = getModalContent(targetPath || location.pathname, lang);

  return (
    <ProfileSecurityContext.Provider
      value={{
        isProfileUnlocked,
        requireProfileAccess,
        lockProfile,
        setIsProfileUnlocked,
        checkSecurityStatus,
      }}
    >
      {children}
      <ProfilePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={handleModalClose}
        onSuccess={handleVerificationSuccess}
        title={modalContent.title}
        description={modalContent.description}
      />
    </ProfileSecurityContext.Provider>
  );
};

export const useProfileSecurity = () => {
  const ctx = useContext(ProfileSecurityContext);
  if (!ctx) {
    throw new Error('useProfileSecurity must be used within ProfileSecurityProvider');
  }
  return ctx;
};

export default ProfileSecurityContext;
