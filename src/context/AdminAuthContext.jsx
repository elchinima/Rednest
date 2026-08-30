import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import { useAuth } from './AuthContext';

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const { updateUser } = useAuth();
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [adminRole, setAdminRole] = useState(null);
  const [loading, setLoading] = useState(() => {
    return typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
  });

  const verify = useCallback(async () => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/verify`, {
        skipAuthRedirect: true,
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setIsAdminAuth(true);
        if (data && data.role) {
          setAdminRole(data.role);
          updateUser({ role: data.role });
        }
        return { ok: true, role: data?.role, user: data };
      } else {
        setIsAdminAuth(false);
        setAdminRole(null);
        return { ok: false, status: res.status };
      }
    } catch {
      setIsAdminAuth(false);
      setAdminRole(null);
      return { ok: false };
    } finally {
      setLoading(false);
    }
  }, [updateUser]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
      verify();
    }
  }, [verify]);

  useEffect(() => {
    const handleFocus = () => {
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
        verify();
      }
    };

    const handleAdminUnauthorized = () => {
      verify();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);
    window.addEventListener('admin:unauthorized', handleAdminUnauthorized);
    window.addEventListener('admin:verify', handleAdminUnauthorized);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('admin:unauthorized', handleAdminUnauthorized);
      window.removeEventListener('admin:verify', handleAdminUnauthorized);
    };
  }, [verify]);

  const adminLogin = useCallback(async (password) => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const res = await fetchWithRefresh(`${apiUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
      skipAuthRedirect: true,
    });
    if (res.ok) {
      setIsAdminAuth(true);
      await verify();
      return { ok: true };
    }
    const data = await res.json().catch(() => ({}));
    return { ok: false, status: res.status, message: data.message || 'Incorrect password. Please try again.' };
  }, [verify]);

  const adminLogout = useCallback(async () => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    try {
      await fetchWithRefresh(`${apiUrl}/api/admin/logout`, {
        method: 'POST',
        skipAuthRedirect: true,
      });
    } catch {}
    setIsAdminAuth(false);
    setAdminRole(null);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ isAdminAuth, adminRole, loading, adminLogin, adminLogout, verify }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
};

export default AdminAuthContext;

