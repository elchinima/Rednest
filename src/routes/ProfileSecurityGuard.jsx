import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useProfileSecurity } from '../context/ProfileSecurityContext';
import loaderIcon from '../assets/icons/loader-animated.svg';

const ProfileSecurityGuard = ({ children }) => {
  const { isProfileUnlocked, requireProfileAccess, checkSecurityStatus } = useProfileSecurity();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    if (isProfileUnlocked) {
      setChecking(false);
      return;
    }

    setChecking(true);
    checkSecurityStatus().then((isVerified) => {
      if (isMounted) {
        if (!isVerified) {
          requireProfileAccess(location.pathname);
        }
        setChecking(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [location.pathname, isProfileUnlocked, requireProfileAccess, checkSecurityStatus]);

  if (checking || !isProfileUnlocked) {
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
