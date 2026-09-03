import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ProfilePasswordModal from '../components/Elements/ProfilePasswordModal';

const ProfileSecurityContext = createContext(null);

export const ProfileSecurityProvider = ({ children }) => {
  const [isProfileUnlocked, setIsProfileUnlocked] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [targetPath, setTargetPath] = useState('/profile');
  const navigate = useNavigate();
  const location = useLocation();
  const successCallbackRef = useRef(null);

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

    if (targetPath) {
      if (location.pathname !== targetPath) {
        navigate(targetPath);
      }
    }
  }, [navigate, location.pathname, targetPath]);

  const handleModalClose = useCallback(() => {
    setIsPasswordModalOpen(false);
    successCallbackRef.current = null;

    if (location.pathname === '/profile' && !isProfileUnlocked) {
      navigate('/', { replace: true });
    }
  }, [location.pathname, isProfileUnlocked, navigate]);

  return (
    <ProfileSecurityContext.Provider
      value={{
        isProfileUnlocked,
        requireProfileAccess,
        lockProfile,
        setIsProfileUnlocked,
      }}
    >
      {children}
      <ProfilePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={handleModalClose}
        onSuccess={handleVerificationSuccess}
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
