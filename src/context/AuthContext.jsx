import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('rednest_auth') === 'true';
  });
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('rednest_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = useCallback((userData) => {
    const profile = userData || { name: 'Guest', email: '' };
    localStorage.setItem('rednest_auth', 'true');
    localStorage.setItem('rednest_user', JSON.stringify(profile));
    setIsAuthenticated(true);
    setUser(profile);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('rednest_auth');
    localStorage.removeItem('rednest_user');
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
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
