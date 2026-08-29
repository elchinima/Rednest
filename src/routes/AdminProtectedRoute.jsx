import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAdminAuth } from '../context/AdminAuthContext';
import loaderIcon from '../assets/icons/loader-animated.svg';

const AdminProtectedRoute = ({ children }) => {
  const { isAuthenticated, authLoading } = useAuth();
  const { isAdminAuth, loading, verify } = useAdminAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(!isAdminAuth);

  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated && !isAdminAuth) {
      verify().finally(() => {
        if (isMounted) setChecking(false);
      });
    } else {
      setChecking(false);
    }
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, isAdminAuth, verify]);

  if (authLoading || (isAuthenticated && (loading || checking))) {
    return (
      <div className="admin-loading-screen">
        <img src={loaderIcon} alt="Loading..." className="admin-loading-spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdminAuth) {
    return <Navigate to="/admin" state={{ from: location }} replace />;
  }

  return children;
};

export default AdminProtectedRoute;
