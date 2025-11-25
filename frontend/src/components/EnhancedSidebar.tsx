import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../i18n/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun } from 'lucide-react';

interface SubMenuItem {
  path: string;
  label: string;
  description: string;
  gradient: string;
  external?: boolean;
}

interface MenuItem {
  path?: string;
  label: string;
  gradient: string;
  description?: string;
  external?: boolean;
  submenu?: SubMenuItem[];
}

interface EnhancedSidebarProps {
  onToggleSidebar?: () => void;
}

const EnhancedSidebar: React.FC<EnhancedSidebarProps> = ({ onToggleSidebar }) => {
  const location = useLocation();
  const isAdmin = localStorage.getItem('userRole') === 'admin';
  const { t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set([t('dashboards')]));

  const menuItems: MenuItem[] = [
    {
      label: t('dashboards'),
      gradient: 'from-purple-500 to-pink-500',
      submenu: [
        {
          path: '/home',
          label: t('dashboard'),
          description: t('mainOverview'),
          gradient: 'from-blue-500 to-cyan-500'
        },
        {
          path: '/analytics',
          label: t('floodAnalytics'),
          description: t('dataDrivenInsights'),
          gradient: 'from-purple-500 to-pink-500'
        },
        {
          path: '/predictions',
          label: t('predictiveModels'),
          description: t('aiForecasting'),
          gradient: 'from-indigo-500 to-purple-500'
        },
        {
          path: '/simulation',
          label: t('simulationMode'),
          description: t('simulationModeDesc'),
          gradient: 'from-pink-500 to-rose-500'
        },
        {
          path: '/monitoring',
          label: t('floodMonitoring'),
          description: t('realTimeAlerts'),
          gradient: 'from-green-500 to-teal-500'
        },
        {
          path: '/reports',
          label: t('downloadReports'),
          description: t('dataExport'),
          gradient: 'from-orange-500 to-amber-500'
        },
      ]
    },
    {
      label: t('mapsAndGis'),
      gradient: 'from-emerald-500 to-teal-500',
      submenu: [
        {
          path: import.meta.env.VITE_SAR_URL || 'http://localhost:8080',
          label: 'SAR Detection',
          description: t('geospatialVis'),
          gradient: 'from-purple-500 to-indigo-500',
          external: true
        },
        {
          path: '/gis-analysis',
          label: t('regionalAnalysis'),
          description: t('areaSpecificData'),
          gradient: 'from-cyan-500 to-blue-500'
        }
      ]
    },
    {
      label: t('dataAndSharing'),
      gradient: 'from-indigo-500 to-purple-500',
      submenu: [
        {
          path: '/data-sharing',
          label: t('dataAndSharing'),
          description: t('exportAndApi'),
          gradient: 'from-indigo-500 to-purple-500'
        },
        {
          path: '/data-sources',
          label: t('apiDocumentation'),
          description: t('developerAccess'),
          gradient: 'from-blue-500 to-indigo-500'
        }
      ]
    },
    {
      path: '/report',
      label: t('reportFlood'),
      gradient: 'from-orange-500 to-amber-500',
      description: t('reportFloodEvent')
    }
  ];

  // Only show admin section if user is authenticated admin
  if (isAdmin) {
    menuItems.push({
      label: t('administration'),
      gradient: 'from-red-500 to-pink-500',
      submenu: [
        {
          path: '/admin',
          label: t('adminPanel'),
          description: t('systemOverview'),
          gradient: 'from-red-500 to-pink-500'
        },
        {
          path: '/admin/users',
          label: t('userManagement'),
          description: t('manageSystemUsers'),
          gradient: 'from-pink-500 to-rose-500'
        },
        {
          path: '/admin/system',
          label: t('systemSettings'),
          description: t('configureSystem'),
          gradient: 'from-rose-500 to-red-500'
        }
      ]
    });
  } else {
    // Show login option for non-authenticated users
    menuItems.push({
      path: '/login',
      label: t('adminLogin'),
      gradient: 'from-gray-500 to-gray-600',
      description: t('accessControlPanel')
    });
  }

  const isActive = (path: string) => location.pathname === path;
  const isMenuExpanded = (menuLabel: string) => expandedMenus.has(menuLabel);

  const toggleMenu = (menuLabel: string) => {
    setExpandedMenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(menuLabel)) {
        newSet.delete(menuLabel);
      } else {
        newSet.add(menuLabel);
      }
      return newSet;
    });
  };

  const renderMenuItem = (item: MenuItem) => {
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isExpanded = isMenuExpanded(item.label);

    if (hasSubmenu) {
      return (
        <div key={item.label} className="space-y-2">
          <button
            onClick={() => toggleMenu(item.label)}
            className="w-full flex items-center gap-5 px-6 py-4 rounded-xl transition-all duration-300 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-700 dark:hover:text-blue-400 group"
          >
            <div className={`p-2.5 rounded-lg bg-gradient-to-br ${item.gradient} hidden`}>
            </div>
            <div className="flex-1 text-left">
              <span className="font-semibold text-base">{item.label}</span>
            </div>
          </button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="ml-6 space-y-2 border-l-2 border-blue-100 pl-5"
              >
                {item.submenu!.map((subItem) => {
                  const isSubActive = isActive(subItem.path);

                  return subItem.external ? (
                    <a
                      key={subItem.path}
                      href={subItem.path}
                      className={`group flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-700 dark:hover:text-blue-400`}
                    >
                      <div className={`p-2 rounded-md bg-gradient-to-br ${subItem.gradient} hidden`}>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-base">{subItem.label}</div>
                        <div className="text-sm text-gray-500">
                          {subItem.description}
                        </div>
                      </div>
                    </a>
                  ) : (
                    <Link
                      key={subItem.path}
                      to={subItem.path}
                      className={`group flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 ${isSubActive
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-700 dark:hover:text-blue-400'
                        }`}
                    >
                      <div className={`p-2 rounded-md ${isSubActive ? 'bg-white/20' : `bg-gradient-to-br ${subItem.gradient}`
                        } hidden`}>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-base">{subItem.label}</div>
                        <div className={`text-sm ${isSubActive ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                          {subItem.description}
                        </div>
                      </div>
                      {isSubActive && (
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      )}
                    </Link>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    // Single menu item
    const isItemActive = isActive(item.path!);

    return item.external ? (
      <a
        key={item.path}
        href={item.path}
        className={`group flex items-center gap-5 px-6 py-4 rounded-xl transition-all duration-300 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-700 dark:hover:text-blue-400 hover:scale-105`}
      >
        <div className={`p-2.5 rounded-lg bg-gradient-to-br ${item.gradient} hidden`}>
        </div>
        <div className="flex-1">
          <span className="font-semibold text-base">{item.label}</span>
          {item.description && (
            <div className="text-sm mt-1 text-gray-500">
              {item.description}
            </div>
          )}
        </div>
      </a>
    ) : (
      <Link
        key={item.path}
        to={item.path!}
        className={`group flex items-center gap-5 px-6 py-4 rounded-xl transition-all duration-300 ${isItemActive
          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
          : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-700 dark:hover:text-blue-400 hover:scale-105'
          }`}
      >
        <div className={`p-2.5 rounded-lg ${isItemActive ? 'bg-white/20' : `bg-gradient-to-br ${item.gradient}`} hidden`}>
        </div>
        <div className="flex-1">
          <span className="font-semibold text-base">{item.label}</span>
          {item.description && (
            <div className={`text-sm mt-1 ${isItemActive ? 'text-blue-100' : 'text-gray-500'
              }`}>
              {item.description}
            </div>
          )}
        </div>
        {isItemActive && (
          <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></div>
        )}
      </Link>
    );
  };

  return (
    <>
      <style>{`
        #sidebar-nav::-webkit-scrollbar {
          width: 20px !important;
        }
        #sidebar-nav::-webkit-scrollbar-track {
          background: #1e293b !important;
          border-radius: 10px !important;
          margin: 8px 0 !important;
        }
        #sidebar-nav::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%) !important;
          border-radius: 10px !important;
          border: 3px solid #1e293b !important;
          min-height: 80px !important;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4) !important;
        }
        #sidebar-nav::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%) !important;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.6) !important;
        }
        #sidebar-nav::-webkit-scrollbar-thumb:active {
          background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 50%, #1e40af 100%) !important;
        }
      `}</style>
      <aside className="w-72 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 border-r-2 border-slate-200/80 dark:border-slate-800/80 h-screen fixed left-0 top-0 z-40 flex flex-col shadow-2xl">
        {/* Header with Logo */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-700 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-8 border-b-2 border-blue-500/30 dark:border-slate-700">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-4 group">
              <div className="relative">
                <img
                  src="/images/FloodSenseLogo.png"
                  alt="FloodSense"
                  className="h-12 w-auto group-hover:scale-110 transition-all duration-300 drop-shadow-lg"
                />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse shadow-lg ring-2 ring-white"></div>
              </div>
              <div>
                <span className="text-xl font-extrabold text-white group-hover:text-blue-50 transition-colors duration-300 tracking-tight">
                  FloodSense
                </span>
                <p className="text-sm text-blue-100 group-hover:text-white transition-colors duration-300 font-medium">
                  {t('southSudanEarlyWarning')}
                </p>
              </div>
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-3 text-white hover:bg-white/20 rounded-xl transition-colors shadow-lg"
              aria-label="Toggle menu"
            >
              <span className="lg:hidden font-bold">Menu</span>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav
          id="sidebar-nav"
          className="p-7 space-y-4 flex-1 min-h-[calc(100vh-250px)] max-h-[calc(100vh-200px)] overflow-y-scroll"
          style={{
            scrollbarWidth: 'auto',
            scrollbarColor: '#3b82f6 #e2e8f0'
          }}
        >
          {menuItems.map((item) => renderMenuItem(item))}
        </nav>

        {/* Bottom Section - Fixed at bottom */}
        <div className="p-5 space-y-4 border-t-2 border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-900 dark:to-slate-800/30 flex-shrink-0">
          {/* Language Switcher & Theme Toggle */}
          <div className="flex justify-center items-center gap-3">
            <LanguageSwitcher />
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-sm transition-all"
              title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          {/* Need Help Section */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-900 border-2 border-blue-200 dark:border-slate-700 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg flex-shrink-0 hidden">
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-1">{t('needHelp')}</h4>
                <p className="text-xs text-blue-700 dark:text-blue-300 mb-3 leading-relaxed">
                  {t('contactSupport')}
                </p>
                <a
                  href="mailto:j.akech@alustudent.com"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  {t('getSupport')}
                </a>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="space-y-2">
            <div className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">{t('systemStatus')}</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 p-3 rounded-lg text-center shadow-md hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <div className="font-bold text-green-700 dark:text-green-400 text-sm">{t('live')}</div>
                </div>
                <div className="text-green-600 dark:text-green-500 text-[10px] font-medium">{t('monitoring')}</div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg text-center shadow-md hover:shadow-lg transition-all duration-300">
                <div className="font-bold text-blue-700 dark:text-blue-400 text-sm mb-0.5">24/7</div>
                <div className="text-blue-600 dark:text-blue-500 text-[10px] font-medium">{t('support')}</div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default EnhancedSidebar;
