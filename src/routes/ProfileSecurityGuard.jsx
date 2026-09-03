import React, { useEffect } from 'react';
import { useProfileSecurity } from '../context/ProfileSecurityContext';
import loaderIcon from '../assets/icons/loader-animated.svg';

const ProfileSecurityGuard = ({ children }) => {
  const { isProfileUnlocked, requireProfileAccess, lockProfile } = useProfileSecurity();

  useEffect(() => {
    if (!isProfileUnlocked) {
      requireProfileAccess('/profile');
    }

    return () => {
      lockProfile();
    };
  }, [isProfileUnlocked, requireProfileAccess, lockProfile]);

  if (!isProfileUnlocked) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0d0d0d',
        }}
      >
        <img
          src={loaderIcon}
          alt="Security check..."
          style={{ width: '40px', height: '40px' }}
        />
      </div>
    );
  }

  return children;
};

export default ProfileSecurityGuard;
