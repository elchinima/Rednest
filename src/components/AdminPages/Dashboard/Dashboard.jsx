import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AdminLayout from '../AdminLayout/AdminLayout';
import { fetchWithRefresh } from '../../../utils/fetchWithRefresh';
import { useAuth } from '../../../context/AuthContext';
import './Dashboard.scss';

const cleanRole = (role) => (role || '').toLowerCase().replace(/\s+/g, '');

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  }),
};

const StatCard = ({ icon, label, value, sub, accent, index }) => (
  <motion.div
    className="dashboard-stat"
    style={{ '--accent': accent }}
    custom={index}
    variants={fadeUp}
    initial="hidden"
    animate="show"
  >
    <div className="dashboard-stat__icon">{icon}</div>
    <div className="dashboard-stat__body">
      <span className="dashboard-stat__value">{value}</span>
      <span className="dashboard-stat__label">{label}</span>
      {sub && <span className="dashboard-stat__sub">{sub}</span>}
    </div>
  </motion.div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({ fileCount: '—', totalKb: '—' });
  const [loadingStats, setLoadingStats] = useState(true);

  const currentUserRole = cleanRole(user?.role || user?.Role);
  const canAccessDatabase = currentUserRole === 'admin' || currentUserRole === 'superadmin';

  useEffect(() => {
    const fetchStats = async () => {
      if (!canAccessDatabase) {
        setStats({ fileCount: '—', totalKb: '—' });
        setLoadingStats(false);
        return;
      }
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const res = await fetchWithRefresh(`${apiUrl}/api/admin/files`);
        if (res.ok) {
          const files = await res.json();
          const totalKb = files.reduce((sum, f) => sum + (f.sizeKb || 0), 0);
          setStats({
            fileCount: files.length,
            totalKb: totalKb < 1024
              ? `${Math.round(totalKb)} KB`
              : `${(totalKb / 1024).toFixed(1)} MB`,
          });
        } else {
          setStats({ fileCount: '—', totalKb: '—' });
        }
      } catch {
        setStats({ fileCount: '—', totalKb: '—' });
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, [canAccessDatabase]);

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

        <div className="dashboard__stats">
          <StatCard
            index={0}
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
            value={loadingStats ? '...' : stats.fileCount}
            sub="Supabase Storage · admin-files"
          />
          <StatCard
            index={1}
            accent="#fb923c"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
            }
            label="Storage used"
            value={loadingStats ? '...' : stats.totalKb}
            sub="All WebP files combined"
          />
          <StatCard
            index={2}
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

        <motion.div
          className="dashboard__info"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="dashboard__info-card">
            <h3>How image upload works</h3>
            <ul>
              <li>Accepted formats: <strong>PNG, JPG, JPEG</strong> up to <strong>10 MB</strong></li>
              <li>Server compresses the image: <strong>50% quality</strong>, dimensions reduced <strong>by half</strong></li>
              <li>Result is stored in Supabase Storage as a <strong>WebP</strong> file</li>
              <li>A public URL is available immediately after upload</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
