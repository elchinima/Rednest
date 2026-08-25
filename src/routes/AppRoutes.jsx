import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

const Home = lazy(() => import('../components/PublicPages/Home/Home'));
const Catalog = lazy(() => import('../components/PublicPages/Catalog/Catalog'));
const Auth = lazy(() => import('../components/PublicPages/Auth/Auth'));
const Fortune = lazy(() => import('../components/UserPages/Fortune/Fortune'));
const Profile = lazy(() => import('../components/UserPages/Profile/Profile'));
const Promos = lazy(() => import('../components/UserPages/Promos/Promos'));
const Sessions = lazy(() => import('../components/UserPages/Sessions/Sessions'));
const Order = lazy(() => import('../components/UserPages/Order/Order'));
const Orders = lazy(() => import('../components/UserPages/Orders/Orders'));
const Basket = lazy(() => import('../components/PublicPages/Basket/Basket'));
const AdminLogin = lazy(() => import('../components/AdminPages/AdminLogin/AdminLogin'));
const Dashboard = lazy(() => import('../components/AdminPages/Dashboard/Dashboard'));
const Database = lazy(() => import('../components/AdminPages/Database/Database'));
const ProtectedRoute = lazy(() => import('./ProtectedRoute'));
const AdminProtectedRoute = lazy(() => import('./AdminProtectedRoute'));
const ErrorPage = lazy(() => import('../components/PublicPages/ErrorPage/ErrorPage'));
const Rules = lazy(() => import('../components/PublicPages/Rules/Rules'));
import ScrollToTop from '../components/Elements/ScrollToTop';
import SupportWidget from '../components/Elements/SupportWidget';
import BuyNowWidget from '../components/Elements/BuyNowWidget';
import FortuneWidget from '../components/Elements/FortuneWidget';
import { AuthProvider } from '../context/AuthContext';
import { AdminAuthProvider } from '../context/AdminAuthContext';
import { BasketProvider } from '../context/BasketContext';

const AnimatedRoutes = () => {
  const location = useLocation();
  
  return (
    <Suspense fallback={null}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/fortune" element={
            <ProtectedRoute>
              <Fortune />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/promos" element={
            <ProtectedRoute>
              <Promos />
            </ProtectedRoute>
          } />
          <Route path="/sessions" element={
            <ProtectedRoute>
              <Sessions />
            </ProtectedRoute>
          } />
          <Route path="/basket" element={
            <ProtectedRoute>
              <Basket />
            </ProtectedRoute>
          } />
          <Route path="/order" element={
            <ProtectedRoute>
              <Order />
            </ProtectedRoute>
          } />
          <Route path="/orders" element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          } />

          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={
            <AdminProtectedRoute>
              <Dashboard />
            </AdminProtectedRoute>
          } />
          <Route path="/admin/database" element={
            <AdminProtectedRoute>
              <Database />
            </AdminProtectedRoute>
          } />

          <Route path="/rules" element={<Rules />} />
          <Route path="/terms" element={<Navigate to="/rules" replace />} />
          <Route path="/error" element={<ErrorPage />} />
          <Route path="*" element={<ErrorPage defaultCode="404" />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
};

const AppRoutes = () => {
  return (
    <Router>
      <AdminAuthProvider>
        <AuthProvider>
          <BasketProvider>
            <ScrollToTop />
            <AnimatedRoutes />
            <SupportWidget />
            <BuyNowWidget />
            <FortuneWidget />
          </BasketProvider>
        </AuthProvider>
      </AdminAuthProvider>
    </Router>
  );
};

export default AppRoutes;