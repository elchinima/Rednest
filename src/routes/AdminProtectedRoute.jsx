import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

const AdminProtectedRoute = ({ children }) => {
  const { isAdminAuth, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) {
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
