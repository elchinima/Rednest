import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('rednest_auth') === 'true';
  });
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('rednest_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authLoading, setAuthLoading] = useState(true);

  const login = useCallback((userData) => {
    const profile = userData || { name: 'Guest', email: '' };
    localStorage.setItem('rednest_auth', 'true');
    localStorage.setItem('rednest_user', JSON.stringify(profile));
    setIsAuthenticated(true);
    setUser(profile);
  }, []);

  const logout = useCallback(async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      await fetch(`${apiUrl}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch { }
    localStorage.removeItem('rednest_auth');
    localStorage.removeItem('rednest_user');
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  useEffect(() => {
    const validateSession = async () => {
      const hasAuth = localStorage.getItem('rednest_auth') === 'true';
      if (!hasAuth) {
        setAuthLoading(false);
        return;
      }

      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const response = await fetchWithRefresh(`${apiUrl}/api/auth/me`);

        if (response.ok) {
          const data = await response.json();
          login(data);
        } else {
          localStorage.removeItem('rednest_auth');
          localStorage.removeItem('rednest_user');
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (err) {
        console.error('Session validation failed:', err);
      } finally {
        setAuthLoading(false);
      }
    };

    validateSession();
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, authLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
