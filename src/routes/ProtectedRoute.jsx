import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, authLoading, checkAuthStatus } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (checkAuthStatus) {
      checkAuthStatus();
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
