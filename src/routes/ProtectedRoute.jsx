import React, { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AUTH_CHECK_TTL_MS = 5 * 60 * 1000;

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, authLoading, checkAuthStatus } = useAuth();
  const location = useLocation();
  const lastCheckRef = useRef(0);

  useEffect(() => {
    if (checkAuthStatus) {
      const now = Date.now();
      if (now - lastCheckRef.current > AUTH_CHECK_TTL_MS) {
        lastCheckRef.current = now;
        checkAuthStatus();
      }
    }
  }, [location.pathname, checkAuthStatus]);

  if (authLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;

