import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
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
import Simulation from './pages/Simulation';
import './styles/professional-ui.css';
import './styles/flood-colors.css';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { usePerformanceProfile } from './hooks/usePerformanceProfile';
import { DisasterModeProvider, useDisasterMode } from './context/DisasterModeContext';
import { useTheme } from './context/ThemeContext';
import { Moon, Sun } from 'lucide-react';

const AppContent: React.FC = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isOffline } = useNetworkStatus();
  const { isLowPowerMode } = usePerformanceProfile();
  const { isDisasterMode, toggleDisasterMode } = useDisasterMode();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();

  // Handle sidebar toggle
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const rootClasses = [
    'min-h-screen flex flex-col overflow-hidden transition-colors duration-500',
    isDisasterMode ? 'bg-slate-900 text-white' : 'bg-cover bg-center bg-fixed bg-no-repeat dark:bg-slate-900 dark:text-white',
    isLowPowerMode ? 'low-power-mode' : ''
  ].join(' ').trim();

  const backgroundStyle = isDisasterMode || theme === 'dark' ? {} : {
    backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.9), rgba(240, 249, 255, 0.9)), url("/images/map.jpg")`
  };

  return (
    <div className={rootClasses} style={backgroundStyle}>
      {/* Notification Bell & Disaster Toggle - Fixed position */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-lg hover:bg-gray-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all"
          title={theme === 'dark' ? t('switchToLight') : t('switchToDark')}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <button
          onClick={toggleDisasterMode}
          className={`flex items-center gap-2 px-3 py-2 rounded-full shadow-lg transition-all font-bold text-xs sm:text-sm ${isDisasterMode
            ? 'bg-red-600 text-white hover:bg-red-700 ring-2 ring-red-400 animate-pulse'
            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          title={isDisasterMode ? t('deactivateDisasterMode') : t('activateDisasterMode')}
        >
          {isDisasterMode ? t('disasterMode') : t('normalMode')}
        </button>
        <NotificationBell />
      </div>

      {/* Offline Indicator */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-yellow-500 text-white text-center py-2 text-sm font-medium flex items-center justify-center gap-2">
          {t('offlineMessage')}
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
            <span className="font-bold text-sm">{t('menu')}</span>
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
                    <Route path="/simulation" element={<Simulation />} />
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
      <DisasterModeProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </DisasterModeProvider>
    </LanguageProvider>
  );
};

export default App;