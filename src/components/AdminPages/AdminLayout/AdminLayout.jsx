import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../../../assets/icons/rednest_logo.png';
import { useAdminAuth } from '../../../context/AdminAuthContext';
import { useAuth } from '../../../context/AuthContext';
import LogoutModal from '../../Elements/LogoutModal';
import './AdminLayout.scss';

const cleanRole = (role) => (role || '').toLowerCase().replace(/\s+/g, '');

const NAV_ITEMS = [
  {
    to: '/admin/dashboard',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    to: '/admin/products',
    label: 'Products',
    requiredRoles: ['admin', 'superadmin'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    ),
  },
  {
    to: '/admin/orders',
    label: 'Orders',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    to: '/admin/promos',
    label: 'Promos',
    requiredRoles: ['admin', 'superadmin'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
        <line x1="12" y1="9" x2="12" y2="15" />
      </svg>
    ),
  },
  {
    to: '/admin/users',
    label: 'Users',
    requiredRoles: ['admin', 'superadmin'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    to: '/admin/newsletter',
    label: 'Newsletter',
    requiredRoles: ['admin', 'superadmin'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
  {
    to: '/admin/reviews',
    label: 'Reviews',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    to: '/admin/database',
    label: 'Database',
    requiredRoles: ['admin', 'superadmin'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
        <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
      </svg>
    ),
  },
];

const AdminLayout = ({ children }) => {
  const { adminLogout, adminRole, verify } = useAdminAuth();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [accessDeniedToast, setAccessDeniedToast] = useState('');

  const currentUserRole = cleanRole(adminRole || user?.role || user?.Role);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (location.state?.accessDenied) {
      setAccessDeniedToast('Access restricted. You do not have permission to view this section.');
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    if (accessDeniedToast) {
      const timer = setTimeout(() => setAccessDeniedToast(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [accessDeniedToast]);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await adminLogout();
      setIsLogoutModalOpen(false);
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Admin logout failed:', err);
      navigate('/', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="admin-layout">
      <AnimatePresence>
        {accessDeniedToast && (
          <motion.div
            className="admin-layout__toast"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{accessDeniedToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="admin-mobile-header">
        <button
          id="admin-mobile-menu-btn"
          className="admin-mobile-header__toggle"
          onClick={() => setSidebarOpen((prev) => !prev)}
          aria-label="Toggle navigation"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className="admin-mobile-header__brand">
          <span className="admin-mobile-header__title">Admin Panel</span>
        </div>

        <button
          className="admin-mobile-header__logout"
          onClick={() => setIsLogoutModalOpen(true)}
          aria-label="Exit Admin"
          title="Exit Admin"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </header>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="admin-sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside className={`admin-sidebar${sidebarOpen ? ' admin-sidebar--open' : ''}`}>
        <div className="admin-sidebar__header">
          <div className="admin-sidebar__header-info">
            <img src={logo} alt="Rednest" className="admin-sidebar__logo" />
            <div className="admin-sidebar__brand">
              <span className="admin-sidebar__title">Rednest</span>
              <span className="admin-sidebar__subtitle">Admin Panel</span>
            </div>
          </div>
          <button
            className="admin-sidebar__close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className="admin-sidebar__nav">
          <p className="admin-sidebar__section-label">Navigation</p>
          {NAV_ITEMS.map((item) => {
            const isLocked = item.requiredRoles && !item.requiredRoles.includes(currentUserRole);

            return (
              <NavLink
                key={item.to}
                to={isLocked ? '#' : item.to}
                id={`admin-nav-${item.label.toLowerCase()}`}
                className={({ isActive }) =>
                  `admin-sidebar__link${isActive && !isLocked ? ' admin-sidebar__link--active' : ''}${isLocked ? ' admin-sidebar__link--locked' : ''}`
                }
                onClick={async (e) => {
                  if (isLocked) {
                    e.preventDefault();
                    setAccessDeniedToast(`Access to "${item.label}" is restricted (Admin and Super Admin only).`);
                  } else {
                    setSidebarOpen(false);
                    const res = await verify();
                    if (res && res.role) {
                      const updatedRole = cleanRole(res.role);
                      if (item.requiredRoles && !item.requiredRoles.includes(updatedRole)) {
                        e.preventDefault();
                        setAccessDeniedToast(`Access to "${item.label}" is restricted (Admin and Super Admin only).`);
                      }
                    }
                  }
                }}
              >
                {({ isActive }) => (
                  <>
                    {isActive && !isLocked && (
                      <motion.div
                        layoutId="admin-nav-indicator"
                        className="admin-sidebar__link-bg"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.45 }}
                      />
                    )}
                    <span className="admin-sidebar__link-icon">{item.icon}</span>
                    <span className="admin-sidebar__link-label">{item.label}</span>
                    {isLocked && (
                      <span className="admin-sidebar__link-lock" title="Access restricted">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <button
          id="admin-audit-log-btn"
          className="admin-sidebar__audit-btn"
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          Audit Log
        </button>

        <button
          id="admin-logout-btn"
          className="admin-sidebar__logout"
          onClick={() => setIsLogoutModalOpen(true)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Exit Admin
        </button>
      </aside>

      <main className="admin-content">
        {children}
      </main>

      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        loading={isLoggingOut}
        title="Exit Admin Panel"
        text="Are you sure you want to exit the Admin Panel and return to the Home page?"
        confirmText="Exit Admin"
      />
    </div>
  );
};

export default AdminLayout;
