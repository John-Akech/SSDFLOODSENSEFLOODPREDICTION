import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './i18n/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import NotificationBell from './components/NotificationBell';
import Landing from './pages/Landing';
import Home from './pages/Home';
import Map from './pages/Map';
import Report from './pages/Report';
import Analytics from './pages/Analytics';
import DataSharing from './pages/DataSharing';
import Admin from './pages/Admin';
import Login from './pages/Login';


const App: React.FC = () => {
  useEffect(() => {
    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return (
    <AuthProvider>
      <LanguageProvider>
        <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
        <Navbar />
        <NotificationBell />
        <div className="flex flex-1 pt-16">
          <Sidebar />
          <motion.main 
            className="flex-1 lg:ml-64 ml-0 transition-all duration-300"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/home" element={<Home />} />
                <Route path="/map" element={<Map />} />
                <Route path="/report" element={<Report />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/data-sharing" element={<DataSharing />} />

                <Route path="/login" element={<Login />} />
                <Route path="/admin" element={
                  <ProtectedRoute requiredRole="admin">
                    <Admin />
                  </ProtectedRoute>
                } />
              </Routes>
            </AnimatePresence>
            <Footer />
          </motion.main>
        </div>
      </div>
        </BrowserRouter>
      </LanguageProvider>
    </AuthProvider>
  );
};

export default App;
