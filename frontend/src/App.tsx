import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { LanguageProvider } from './i18n/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import EnhancedSidebar from './components/EnhancedSidebar';
import Footer from './components/Footer';
import NotificationBell from './components/NotificationBell';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Home from './pages/Home';
import Analytics from './pages/Analytics';
import Report from './pages/Report';
import DataSharing from './pages/DataSharing';
import PredictionCenter from './pages/PredictionCenter';
import RealTimeMonitoring from './pages/RealTimeMonitoring';
import GISAnalysis from './pages/GISAnalysis';
import Admin from './pages/Admin';
import Login from './pages/Login';
import './styles/professional-ui.css';
import './styles/flood-colors.css';

const AppContent: React.FC = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered successfully:', registration);
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error);
        });
    }

    // Handle online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle sidebar toggle
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 overflow-hidden">
      {/* Notification Bell - Fixed position with proper spacing */}
      <div className="fixed top-4 right-4 z-50">
        <NotificationBell />
      </div>

      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-yellow-500 text-white text-center py-2 text-sm font-medium flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
          You're offline - Some features may be limited
        </div>
      )}

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden flex-col">
        <div className="flex flex-1 overflow-hidden">
          {/* Mobile Menu Button - Better positioning */}
          <button
            onClick={toggleSidebar}
            className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gradient-to-r from-blue-700 to-cyan-800 text-white rounded-lg shadow-lg hover:shadow-xl transition-all touch-manipulation"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Sidebar */}
          <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-72 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            }`}>
            <EnhancedSidebar onToggleSidebar={toggleSidebar} />
          </aside>

          {/* Sidebar Overlay for mobile */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
              onClick={toggleSidebar}
            />
          )}

          {/* Main Content - Improved spacing and layout */}
          <div className="flex-1 min-w-0 flex flex-col transition-all duration-300 overflow-y-auto overflow-x-hidden">
            <motion.main
              className="flex-1 w-full p-6 sm:p-8 lg:p-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className={['/map', '/gis-analysis'].includes(location.pathname) ? 'h-full w-full' : 'w-full max-w-[1920px] mx-auto'}>
                <AnimatePresence mode="wait">
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Landing />} />
                    <Route path="/home" element={<Home />} />
                    <Route path="/report" element={<Report />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/data-sharing" element={<DataSharing />} />
                    <Route path="/login" element={<Login />} />

                    {/* Additional public dashboard routes */}
                    <Route path="/predictions" element={<PredictionCenter />} />
                    <Route path="/monitoring" element={<RealTimeMonitoring />} />
                    <Route path="/reports" element={<Analytics />} />
                    <Route path="/map" element={<GISAnalysis />} />
                    <Route path="/gis-analysis" element={<GISAnalysis />} />
                    <Route path="/data-sources" element={<DataSharing />} />

                    {/* Protected Admin Routes Only */}
                    <Route path="/admin" element={
                      <ProtectedRoute requireAdmin>
                        <Admin />
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/users" element={
                      <ProtectedRoute requireAdmin>
                        <Admin />
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/system" element={
                      <ProtectedRoute requireAdmin>
                        <Admin />
                      </ProtectedRoute>
                    } />
                  </Routes>
                </AnimatePresence>
              </div>
            </motion.main>
          </div>
        </div>

        {/* Footer - Show on all pages - Full width footer outside container */}
        <div className="w-full" style={{
          width: '100vw',
          marginLeft: 'calc(-50vw + 50%)',
          marginRight: 'calc(-50vw + 50%)'
        }}>
          <Footer />
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </LanguageProvider>
  );
};

export default App;