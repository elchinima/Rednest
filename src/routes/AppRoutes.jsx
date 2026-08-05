import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Home from '../components/PublicPages/Home/Home';
import Catalog from '../components/PublicPages/Catalog/Catalog';
import Auth from '../components/PublicPages/Auth/Auth';
import Fortune from '../components/UserPages/Fortune/Fortune';
import ProtectedRoute from './ProtectedRoute';
import ScrollToTop from '../components/Elements/ScrollToTop';
import SupportWidget from '../components/Elements/SupportWidget';
import BuyNowWidget from '../components/Elements/BuyNowWidget';
import FortuneWidget from '../components/Elements/FortuneWidget';
import { AuthProvider } from '../context/AuthContext';

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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

const AppRoutes = () => {
  return (
    <Router>
      <AuthProvider>
        <ScrollToTop />
        <AnimatedRoutes />
        <SupportWidget />
        <BuyNowWidget />
        <FortuneWidget />
      </AuthProvider>
    </Router>
  );
};

export default AppRoutes;
