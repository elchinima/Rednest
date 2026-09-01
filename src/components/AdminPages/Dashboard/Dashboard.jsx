import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AdminLayout from '../AdminLayout/AdminLayout';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';
import { useAuth } from '../../../context/AuthContext';
import './Dashboard.scss';

const cleanRole = (role) => (role || '').toLowerCase().replace(/\s+/g, '');

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.45, ease: [0.16, 1, 0.3, 1] },
  }),
};

const StatCard = ({ icon, label, value, sub, accent, index, isLive }) => (
  <motion.div
    className="dashboard-stat"
    style={{ '--accent': accent }}
    custom={index}
    variants={fadeUp}
    initial="hidden"
    animate="show"
  >
    <div className="dashboard-stat__icon">
      {icon}
      {isLive && <span className="dashboard-stat__live-dot" />}
    </div>
    <div className="dashboard-stat__body">
      <div className="dashboard-stat__val-row">
        <span className="dashboard-stat__value">{value}</span>
      </div>
      <span className="dashboard-stat__label">{label}</span>
      {sub && <span className="dashboard-stat__sub">{sub}</span>}
    </div>
  </motion.div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [monthlyStats, setMonthlyStats] = useState({
    monthName: '',
    bakuCurrentTime: '',
    productsSold: '—',
    profitFormatted: '—',
    registrations: '—',
    onlineUsers: '—',
    averageRatingFormatted: '—',
    ratingUsersCount: '—',
    promosCreated: '—',
    promoSpentFormatted: '—',
  });

  const [storageStats, setStorageStats] = useState({ fileCount: '—', totalKb: '—' });
  const [loading, setLoading] = useState(true);

  const currentUserRole = cleanRole(user?.role || user?.Role);
  const canAccessDatabase = currentUserRole === 'admin' || currentUserRole === 'superadmin';

  const loadData = useCallback(async () => {
    setLoading(true);

    const apiUrl = import.meta.env.VITE_API_URL || '';

    try {
      // 1. Fetch monthly stats
      const statsRes = await fetchWithRefresh(`${apiUrl}/api/admin/stats`);
      if (statsRes.ok) {
        const data = await statsRes.json();
        setMonthlyStats({
          monthName: data.monthName || '',
          bakuCurrentTime: data.bakuCurrentTime || '',
          productsSold: data.productsSold ?? 0,
          profitFormatted: data.profitFormatted || `${(data.profit || 0).toFixed(2)} ₼`,
          registrations: data.registrations ?? 0,
          onlineUsers: data.onlineUsers ?? 0,
          averageRatingFormatted: data.averageRatingFormatted ?? '0.0',
          ratingUsersCount: data.ratingUsersCount ?? 0,
          promosCreated: data.promosCreated ?? 0,
          promoSpentFormatted: data.promoSpentFormatted || `${(data.promoSpent || 0).toFixed(2)} ₼`,
        });
      }

      // 2. Fetch storage stats if authorized
      if (canAccessDatabase) {
        const filesRes = await fetchWithRefresh(`${apiUrl}/api/admin/files`);
        if (filesRes.ok) {
          const files = await filesRes.json();
          const totalKb = files.reduce((sum, f) => sum + (f.sizeKb || 0), 0);
          setStorageStats({
            fileCount: files.length,
            totalKb: totalKb < 1024
              ? `${Math.round(totalKb)} KB`
              : `${(totalKb / 1024).toFixed(1)} MB`,
          });
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }, [canAccessDatabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <AdminLayout>
      <div className="dashboard">
        <motion.div
          className="dashboard__header"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <div>
            <h1 className="dashboard__title">Dashboard</h1>
            <p className="dashboard__subtitle">Overview of your Rednest admin panel</p>
          </div>

          {canAccessDatabase && (
            <motion.button
              id="dashboard-go-database"
              className="cta-btn dashboard__cta"
              onClick={() => navigate('/admin/database')}
              whileHover={{ scale: 1.03, translateY: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
                <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
              </svg>
              Go to Database
            </motion.button>
          )}
        </motion.div>

        {/* Section 1: Monthly business and operational metrics (Baku UTC+4) */}
        <div className="dashboard__section">
          <div className="dashboard__section-header">
            <div className="dashboard__section-title-wrap">
              <span className="dashboard__section-dot" />
              <h2 className="dashboard__section-title">Current Month Statistics</h2>
            </div>
            <div className="dashboard__badges">
              {monthlyStats.monthName && (
                <span className="dashboard__badge dashboard__badge--month">
                  {monthlyStats.monthName}
                </span>
              )}
              <span className="dashboard__badge dashboard__badge--timezone">
                UTC+4 (Baku)
              </span>
            </div>
          </div>

          <div className="dashboard__stats dashboard__stats--grid-4">
            {/* 1. Products sold this month */}
            <StatCard
              index={0}
              accent="#f59e0b"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                  <path d="M3 6h18" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              }
              label="Products Sold"
              value={loading ? '...' : monthlyStats.productsSold}
              sub="Excluding cancelled orders"
            />

            {/* 2. Monthly Revenue / Profit */}
            <StatCard
              index={1}
              accent="#10b981"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              }
              label="Monthly Revenue"
              value={loading ? '...' : monthlyStats.profitFormatted}
              sub="Total from active orders"
            />

            {/* 3. New Registrations */}
            <StatCard
              index={2}
              accent="#6366f1"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
              }
              label="New Registrations"
              value={loading ? '...' : monthlyStats.registrations}
              sub="Users registered this month"
            />

            {/* 4. Online Now */}
            <StatCard
              index={3}
              accent="#22c55e"
              isLive={true}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              }
              label="Online Now"
              value={loading ? '...' : monthlyStats.onlineUsers}
              sub="Active in last 15 minutes"
            />

            {/* 5. Average Rating */}
            <StatCard
              index={4}
              accent="#eab308"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              }
              label="Average Rating"
              value={loading ? '...' : `${monthlyStats.averageRatingFormatted} ★`}
              sub="Based on reviews this month"
            />

            {/* 6. Users Rated */}
            <StatCard
              index={5}
              accent="#06b6d4"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  <path d="M9 10h.01" />
                  <path d="M15 10h.01" />
                  <path d="M12 10h.01" />
                </svg>
              }
              label="Users Rated"
              value={loading ? '...' : monthlyStats.ratingUsersCount}
              sub="Unique reviewers this month"
            />

            {/* 7. Promos Created */}
            <StatCard
              index={6}
              accent="#a855f7"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
                  <line x1="12" y1="9" x2="12" y2="15" />
                </svg>
              }
              label="Promos Created"
              value={loading ? '...' : monthlyStats.promosCreated}
              sub="Created this month"
            />

            {/* 8. Promo Discounts */}
            <StatCard
              index={7}
              accent="#f43f5e"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 5L5 19" />
                  <circle cx="6.5" cy="6.5" r="2.5" />
                  <circle cx="17.5" cy="17.5" r="2.5" />
                </svg>
              }
              label="Promo Discounts"
              value={loading ? '...' : monthlyStats.promoSpentFormatted}
              sub="Total discounts applied"
            />
          </div>
        </div>

        {/* Section 2: Storage & System overview */}
        {canAccessDatabase && (
          <div className="dashboard__section">
            <div className="dashboard__section-header">
              <div className="dashboard__section-title-wrap">
                <span className="dashboard__section-dot dashboard__section-dot--storage" />
                <h2 className="dashboard__section-title">Media Storage</h2>
              </div>
              <span className="dashboard__badge dashboard__badge--storage">
                Supabase Storage
              </span>
            </div>

            <div className="dashboard__stats">
              <StatCard
                index={8}
                accent="#ef4444"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                }
                label="Files in storage"
                value={loading ? '...' : storageStats.fileCount}
                sub="Supabase Storage · admin-files"
              />
              <StatCard
                index={9}
                accent="#fb923c"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  </svg>
                }
                label="Storage used"
                value={loading ? '...' : storageStats.totalKb}
                sub="All WebP files combined"
              />
              <StatCard
                index={10}
                accent="#60a5fa"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                }
                label="Output format"
                value="WebP"
                sub="50% quality · ½ resolution"
              />
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
