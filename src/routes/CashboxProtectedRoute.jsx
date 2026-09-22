import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import loaderIcon from '../assets/icons/loader-animated.svg';
import './AdminProtectedRoute.scss';

const ALLOWED_CASHBOX_ROLES = ['staff', 'admin', 'superadmin'];

const cleanRole = (role) => (role || '').toLowerCase().replace(/[\s_-]+/g, '');

export const isAllowedCashboxRole = (role) => {
  if (!role) return false;
  return ALLOWED_CASHBOX_ROLES.includes(cleanRole(role));
};

const CashboxProtectedRoute = ({ children }) => {
  const { isAuthenticated, user, authLoading, fetchCurrentUser } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const currentRole = user?.role || user?.Role;
    if (isAuthenticated && !currentRole && fetchCurrentUser) {
      setChecking(true);
      fetchCurrentUser().finally(() => setChecking(false));
    }
  }, [isAuthenticated, user, fetchCurrentUser]);

  if (authLoading || checking) {
    return (
      <div className="admin-loading-screen">
        <img src={loaderIcon} alt="Loading..." className="admin-loading-spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const role = user?.role || user?.Role;
  if (!isAllowedCashboxRole(role)) {
    return <Navigate to="/error?code=403" state={{ from: location }} replace />;
  }

  return children;
};

export default CashboxProtectedRoute;
