import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { fetchWithRefresh } from '../utils/fetchWithRefresh';
import { API_URL } from '../utils/config';

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
    let profile = userData;
    if (userData && userData.user) {
      profile = userData.user;
    }
    if (!profile || (!profile.name && !profile.email && !profile.Id && !profile.id)) {
      profile = { name: 'User', email: '' };
    }
    localStorage.setItem('rednest_auth', 'true');
    localStorage.setItem('rednest_user', JSON.stringify(profile));
    setIsAuthenticated(true);
    setUser(profile);
  }, []);

  const logout = useCallback(async () => {
    try {
      const apiUrl = API_URL;
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

  const fetchCurrentUser = useCallback(async () => {
    try {
      const apiUrl = API_URL;
      const response = await fetchWithRefresh(`${apiUrl}/api/auth/me`);

      if (response.ok) {
        const data = await response.json();
        login(data);
        return { ok: true, data };
      }

      if (response.status === 401) {
        return { ok: false, unauthorized: true };
      }

      return { ok: false, unauthorized: false };
    } catch (err) {
      console.error('Session validation failed:', err);
      return { ok: false, unauthorized: false };
    }
  }, [login]);

  const checkAuthStatus = useCallback(async () => {
    const hasAuth = localStorage.getItem('rednest_auth') === 'true';
    if (!hasAuth) return { ok: false };
    const result = await fetchCurrentUser();
    if (result && result.unauthorized) {
      localStorage.removeItem('rednest_auth');
      localStorage.removeItem('rednest_user');
      setIsAuthenticated(false);
      setUser(null);
    }
    return result;
  }, [fetchCurrentUser]);

  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem('rednest_auth');
      localStorage.removeItem('rednest_user');
      setIsAuthenticated(false);
      setUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  useEffect(() => {
    const validateSession = async () => {
      const hasAuth = localStorage.getItem('rednest_auth') === 'true';
      if (!hasAuth) {
        setAuthLoading(false);
        return;
      }

      const retryDelays = [3000, 5000];
      let result = await fetchCurrentUser();

      for (let i = 0; i < retryDelays.length && result && !result.ok && !result.unauthorized; i++) {
        await new Promise(r => setTimeout(r, retryDelays[i]));
        result = await fetchCurrentUser();
      }

      if (result && result.unauthorized) {
        localStorage.removeItem('rednest_auth');
        localStorage.removeItem('rednest_user');
        setIsAuthenticated(false);
        setUser(null);
      }
      setAuthLoading(false);
    };

    validateSession();
  }, [fetchCurrentUser]);

  const updateUser = useCallback((updatedFields) => {
    setUser((prev) => {
      const updated = { ...prev, ...updatedFields };
      localStorage.setItem('rednest_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, updateUser, authLoading, fetchCurrentUser, checkAuthStatus }}>
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
