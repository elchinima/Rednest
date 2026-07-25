import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from '../components/PublicPages/Home/Home';
import Catalog from '../components/PublicPages/Catalog/Catalog';
import Auth from '../components/PublicPages/Auth/Auth';
import ScrollToTop from '../components/ScrollToTop';
import SupportWidget from '../components/SupportWidget';

const AppRoutes = () => {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/login" element={<Auth />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <SupportWidget />
    </Router>
  );
};

export default AppRoutes;
