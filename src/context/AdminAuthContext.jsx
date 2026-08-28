import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [loading, setLoading] = useState(() => {
    return typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
  });

  const verify = useCallback(async () => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetchWithRefresh(`${apiUrl}/api/admin/verify`);
      setIsAdminAuth(res.ok);
      return res.ok;
    } catch {
      setIsAdminAuth(false);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
      verify();
    }
  }, [verify]);

  const adminLogin = useCallback(async (password) => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const res = await fetchWithRefresh(`${apiUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setIsAdminAuth(true);
      return { ok: true };
    }
    const data = await res.json().catch(() => ({}));
    return { ok: false, status: res.status, message: data.message || 'Incorrect password. Please try again.' };
  }, []);

  const adminLogout = useCallback(async () => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    await fetchWithRefresh(`${apiUrl}/api/admin/logout`, {
      method: 'POST',
    });
    setIsAdminAuth(false);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ isAdminAuth, loading, adminLogin, adminLogout, verify }}>
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
