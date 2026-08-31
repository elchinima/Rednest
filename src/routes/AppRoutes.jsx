import React, { Suspense, lazy, useEffect } from 'react';
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
const Addresses = lazy(() => import('../components/UserPages/Addresses/Addresses'));
const PaymentMethods = lazy(() => import('../components/UserPages/PaymentMethods/PaymentMethods'));
const UserReviews = lazy(() => import('../components/UserPages/Reviews/Reviews'));
const Basket = lazy(() => import('../components/PublicPages/Basket/Basket'));
const AdminLogin = lazy(() => import('../components/AdminPages/AdminLogin/AdminLogin'));
const Dashboard = lazy(() => import('../components/AdminPages/Dashboard/Dashboard'));
const AdminProducts = lazy(() => import('../components/AdminPages/Products/Products'));
const AdminOrders = lazy(() => import('../components/AdminPages/Orders/Orders'));
const Users = lazy(() => import('../components/AdminPages/Users/Users'));
const Database = lazy(() => import('../components/AdminPages/Database/Database'));
const AdminReviews = lazy(() => import('../components/AdminPages/Reviews/Reviews'));
const AdminPromos = lazy(() => import('../components/AdminPages/Promos/Promos'));
import ProtectedRoute from './ProtectedRoute';
import AdminProtectedRoute from './AdminProtectedRoute';
const ErrorPage = lazy(() => import('../components/PublicPages/ErrorPage/ErrorPage'));
const Rules = lazy(() => import('../components/PublicPages/Rules/Rules'));
const Reviews = lazy(() => import('../components/PublicPages/Reviews/Reviews'));
import ScrollToTop from '../components/Elements/ScrollToTop';
import SupportWidget from '../components/Elements/SupportWidget';
import BuyNowWidget from '../components/Elements/BuyNowWidget';
import FortuneWidget from '../components/Elements/FortuneWidget';
import { AuthProvider } from '../context/AuthContext';
import { AdminAuthProvider } from '../context/AdminAuthContext';
import { BasketProvider } from '../context/BasketContext';

const AnimatedRoutes = () => {
  const location = useLocation();

  useEffect(() => {
    const cleanStripe = () => {
      const selectors = [
        'iframe[src*="link.stripe.com"]',
        'iframe[src*="stripe.com"]',
        'iframe[name*="__privateStripe"]',
        '[class*="LinkFloating"]',
        '[class*="link-floating"]',
        '[data-testid*="link-floating"]',
        '[class*="stripe-floating"]',
        '[class*="FloatingButton"]',
        '[class*="floating-button"]',
      ];
      selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          try {
            el.remove();
          } catch {}
        });
      });
    };

    cleanStripe();
    const timer1 = setTimeout(cleanStripe, 100);
    const timer2 = setTimeout(cleanStripe, 500);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [location.pathname]);

  return (
    <Suspense fallback={null}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
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
          <Route path="/addresses" element={
            <ProtectedRoute>
              <Addresses />
            </ProtectedRoute>
          } />
          <Route path="/adresses" element={
            <ProtectedRoute>
              <Addresses />
            </ProtectedRoute>
          } />
          <Route path="/payment-methods" element={
            <ProtectedRoute>
              <PaymentMethods />
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
          <Route path="/reviews" element={
            <ProtectedRoute>
              <UserReviews />
            </ProtectedRoute>
          } />

          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={
            <AdminProtectedRoute>
              <Dashboard />
            </AdminProtectedRoute>
          } />
          <Route path="/admin/products" element={
            <AdminProtectedRoute>
              <AdminProducts />
            </AdminProtectedRoute>
          } />
          <Route path="/admin/orders" element={
            <AdminProtectedRoute>
              <AdminOrders />
            </AdminProtectedRoute>
          } />
          <Route path="/admin/promos" element={
            <AdminProtectedRoute>
              <AdminPromos />
            </AdminProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <AdminProtectedRoute>
              <Users />
            </AdminProtectedRoute>
          } />
          <Route path="/admin/database" element={
            <AdminProtectedRoute>
              <Database />
            </AdminProtectedRoute>
          } />
          <Route path="/admin/reviews" element={
            <AdminProtectedRoute>
              <AdminReviews />
            </AdminProtectedRoute>
          } />

          <Route path="/rules" element={<Rules />} />
          <Route path="/terms" element={<Navigate to="/rules" replace />} />
          <Route path="/review" element={<Reviews />} />
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
      <AuthProvider>
        <AdminAuthProvider>
          <BasketProvider>
            <ScrollToTop />
            <AnimatedRoutes />
            <SupportWidget />
            <BuyNowWidget />
            <FortuneWidget />
          </BasketProvider>
        </AdminAuthProvider>
      </AuthProvider>
    </Router>
  );
};

export default AppRoutes;