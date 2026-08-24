import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Home from '../components/PublicPages/Home/Home';
import Catalog from '../components/PublicPages/Catalog/Catalog';
import Auth from '../components/PublicPages/Auth/Auth';
import Fortune from '../components/UserPages/Fortune/Fortune';
import Profile from '../components/UserPages/Profile/Profile';
import Promos from '../components/UserPages/Promos/Promos';
import Order from '../components/UserPages/Order/Order';
import Orders from '../components/UserPages/Orders/Orders';
import Basket from '../components/PublicPages/Basket/Basket';
import AdminLogin from '../components/AdminPages/AdminLogin/AdminLogin';
import Dashboard from '../components/AdminPages/Dashboard/Dashboard';
import Database from '../components/AdminPages/Database/Database';
import ProtectedRoute from './ProtectedRoute';
import AdminProtectedRoute from './AdminProtectedRoute';
import ErrorPage from '../components/PublicPages/ErrorPage/ErrorPage';
import Rules from '../components/PublicPages/Rules/Rules';
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