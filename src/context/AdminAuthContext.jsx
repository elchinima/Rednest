import React, { createContext, useContext, useState, useCallback } from 'react';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [adminRole, setAdminRole] = useState(null);
  const [loading, setLoading] = useState(false);

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
        }
        return { ok: true, role: data?.role, user: data };
      }
      setIsAdminAuth(false);
      setAdminRole(null);
      return { ok: false, status: res.status };
    } catch {
      setIsAdminAuth(false);
      setAdminRole(null);
      return { ok: false };
    } finally {
      setLoading(false);
    }
  }, []);

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
      return { ok: true };
    }
    const data = await res.json().catch(() => ({}));
    return { ok: false, status: res.status, message: data.message || 'Incorrect password. Please try again.' };
  }, []);

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
