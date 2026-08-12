import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AdminLayout from '../AdminLayout/AdminLayout';
import './Dashboard.scss';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  }),
};

const StatCard = ({ icon, label, value, sub, color, index }) => (
  <motion.div
    className={`dashboard-stat dashboard-stat--${color}`}
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
  const [stats, setStats] = useState({ fileCount: '—', totalKb: '—' });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${apiUrl}/api/admin/files`, { credentials: 'include' });
        if (res.ok) {
          const files = await res.json();
          const totalKb = files.reduce((sum, f) => sum + (f.sizeKb || 0), 0);
          setStats({
            fileCount: files.length,
            totalKb: totalKb < 1024
              ? `${Math.round(totalKb)} KB`
              : `${(totalKb / 1024).toFixed(1)} MB`,
          });
        }
      } catch {
        // silent
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <AdminLayout>
      <div className="dashboard">
        <motion.div
          className="dashboard__header"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div>
            <h1 className="dashboard__title">Dashboard</h1>
            <p className="dashboard__subtitle">Добро пожаловать в панель администратора</p>
          </div>
          <motion.button
            id="dashboard-go-database"
            className="dashboard__cta"
            onClick={() => navigate('/admin/database')}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
              <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
            </svg>
            Перейти в Database
          </motion.button>
        </motion.div>

        <div className="dashboard__stats">
          <StatCard
            index={0}
            color="red"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            }
            label="Файлов в хранилище"
            value={loadingStats ? '...' : stats.fileCount}
            sub="Supabase Storage · admin-files"
          />
          <StatCard
            index={1}
            color="orange"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            }
            label="Занято места"
            value={loadingStats ? '...' : stats.totalKb}
            sub="Все WebP-файлы"
          />
          <StatCard
            index={2}
            color="blue"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            }
            label="Формат"
            value="WebP"
            sub="50% качества · ½ разрешения"
          />
        </div>

        <motion.div
          className="dashboard__info"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="dashboard__info-card">
            <h3>Как работает загрузка</h3>
            <ul>
              <li>Принимаются форматы <strong>PNG, JPG, JPEG</strong> до <strong>10 МБ</strong></li>
              <li>Сервер сжимает изображение: качество <strong>50%</strong>, размеры уменьшаются <strong>вдвое</strong></li>
              <li>Результат сохраняется в Supabase Storage в формате <strong>WebP</strong></li>
              <li>Публичный URL доступен сразу после загрузки</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
