import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

const AdminProtectedRoute = ({ children }) => {
  const { isAdminAuth, loading, verify } = useAdminAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(!isAdminAuth);

  useEffect(() => {
    let isMounted = true;
    if (!isAdminAuth) {
      verify().finally(() => {
        if (isMounted) setChecking(false);
      });
    } else {
      setChecking(false);
    }
    return () => {
      isMounted = false;
    };
  }, [isAdminAuth, verify]);

  if (loading || checking) {
    return (
      <div className="admin-loading-screen">
        <div className="admin-spinner" />
      </div>
    );
  }

  if (!isAdminAuth) {
    return <Navigate to="/admin" state={{ from: location }} replace />;
  }

  return children;
};

export default AdminProtectedRoute;
