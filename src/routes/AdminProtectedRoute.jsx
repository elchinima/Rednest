import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAdminAuth } from '../context/AdminAuthContext';
import loaderIcon from '../assets/icons/loader-animated.svg';
import './AdminProtectedRoute.scss';

const ALLOWED_ADMIN_ROLES = ['moderator', 'admin', 'super admin', 'superadmin'];

const cleanRole = (role) => (role || '').toLowerCase().replace(/\s+/g, '');

const isAllowedAdminRole = (role) => {
  if (!role) return false;
  return ALLOWED_ADMIN_ROLES.map(cleanRole).includes(cleanRole(role));
};

const AdminProtectedRoute = ({ children, requiredRoles }) => {
  const { isAuthenticated, user, authLoading } = useAuth();
  const { isAdminAuth, loading: adminLoading, verify } = useAdminAuth();
  const location = useLocation();
  const [checkingRoute, setCheckingRoute] = useState(true);
  const [verifiedRole, setVerifiedRole] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setCheckingRoute(true);

    if (!isAuthenticated) {
      setCheckingRoute(false);
      return;
    }

    verify()
      .then((res) => {
        if (isMounted) {
          if (res && res.role) {
            setVerifiedRole(res.role);
          } else {
            setVerifiedRole(null);
          }
          setCheckingRoute(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCheckingRoute(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [location.pathname, isAuthenticated, verify]);

  const activeRole = verifiedRole || user?.role || user?.Role;
  const hasAdminRole = isAllowedAdminRole(activeRole);
  const normalizedRole = cleanRole(activeRole);

  if (authLoading || (isAuthenticated && (adminLoading || checkingRoute))) {
    return (
      <div className="admin-loading-screen">
        <img src={loaderIcon} alt="Loading..." className="admin-loading-spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!hasAdminRole || !isAdminAuth) {
    return <Navigate to="/admin" state={{ from: location, roleForbidden: true }} replace />;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    const normalizedRequired = requiredRoles.map(cleanRole);
    if (!normalizedRequired.includes(normalizedRole)) {
      return <Navigate to="/admin/dashboard" state={{ accessDenied: true }} replace />;
    }
  }

  return children;
};

export default AdminProtectedRoute;
