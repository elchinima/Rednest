import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ProfilePasswordModal from '../components/Elements/ProfilePasswordModal';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';

const ProfileSecurityContext = createContext(null);

const PROTECTED_ROUTES = [
  '/profile',
  '/addresses',
  '/adresses',
  '/payment-methods',
  '/sessions',
  '/orders',
];

const getModalContent = (path) => {
  if (path === '/addresses' || path === '/adresses') {
    return {
      title: 'Security Check',
      description: 'Enter your account password to access Delivery Addresses.',
    };
  }
  if (path === '/payment-methods') {
    return {
      title: 'Security Check',
      description: 'Enter your account password to access Payment Methods.',
    };
  }
  if (path === '/sessions') {
    return {
      title: 'Security Check',
      description: 'Enter your account password to access Active Sessions.',
    };
  }
  if (path === '/orders') {
    return {
      title: 'Security Check',
      description: 'Enter your account password to access Order History.',
    };
  }
  return {
    title: 'Security Check',
    description: 'Enter your account password to access Profile settings.',
  };
};

export const ProfileSecurityProvider = ({ children }) => {
  const [isProfileUnlocked, setIsProfileUnlocked] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [targetPath, setTargetPath] = useState('/profile');
  const navigate = useNavigate();
  const location = useLocation();
  const successCallbackRef = useRef(null);

  const checkSecurityStatus = useCallback(async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
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

  const modalContent = getModalContent(targetPath || location.pathname);

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
