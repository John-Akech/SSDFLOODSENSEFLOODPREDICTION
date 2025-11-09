import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HomeIcon,
  MapIcon,
  DocumentIcon,
  ChartIcon,
  CogIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from './Icons';
import { useLanguage } from '../i18n/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';

interface SubMenuItem {
  path: string;
  label: string;
  icon: React.ComponentType<any>;
  description: string;
  gradient: string;
  external?: boolean;
}

interface MenuItem {
  path?: string;
  label: string;
  icon: React.ComponentType<any>;
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
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set(['dashboards']));

  const menuItems: MenuItem[] = [
    {
      label: 'Dashboards',
      icon: ChartIcon,
      gradient: 'from-purple-500 to-pink-500',
      submenu: [
        {
          path: '/home',
          label: 'Dashboard',
          icon: HomeIcon,
          description: 'Main overview and statistics',
          gradient: 'from-blue-500 to-cyan-500'
        },
        {
          path: '/analytics',
          label: 'Flood Analytics',
          icon: ChartIcon,
          description: 'Advanced flood data analysis and insights',
          gradient: 'from-purple-500 to-pink-500'
        },
        {
          path: '/predictions',
          label: 'Prediction Center',
          icon: ChartIcon,
          description: 'Flood prediction models and forecasts',
          gradient: 'from-indigo-500 to-purple-500'
        },
        {
          path: '/monitoring',
          label: 'Real-time Monitoring',
          icon: ChartIcon,
          description: 'Live flood monitoring and alerts',
          gradient: 'from-green-500 to-teal-500'
        },
        {
          path: '/reports',
          label: 'Reports & Insights',
          icon: DocumentIcon,
          description: 'Comprehensive flood reports and analysis',
          gradient: 'from-orange-500 to-amber-500'
        },
      ]
    },
    {
      label: 'Maps & GIS',
      icon: MapIcon,
      gradient: 'from-emerald-500 to-teal-500',
      submenu: [
        {
          path: 'http://localhost:8080',
          label: 'SAR Detection',
          icon: MapIcon,
          description: 'Satellite-based flood detection',
          gradient: 'from-purple-500 to-indigo-500',
          external: true
        },
        {
          path: '/gis-analysis',
          label: 'GIS Analysis',
          icon: MapIcon,
          description: 'Advanced geospatial analysis tools',
          gradient: 'from-cyan-500 to-blue-500'
        }
      ]
    },
    {
      label: 'Data & Sharing',
      icon: DocumentIcon,
      gradient: 'from-indigo-500 to-purple-500',
      submenu: [
        {
          path: '/data-sharing',
          label: 'Data Sharing',
          icon: DocumentIcon,
          description: 'Contribute and share flood data',
          gradient: 'from-indigo-500 to-purple-500'
        },
        {
          path: '/data-sources',
          label: 'Data Sources',
          icon: DocumentIcon,
          description: 'Available data sources and APIs',
          gradient: 'from-blue-500 to-indigo-500'
        }
      ]
    },
    {
      path: '/report',
      label: 'Report Flood',
      icon: DocumentIcon,
      gradient: 'from-orange-500 to-amber-500',
      description: 'Report new flood events'
    }
  ];

  // Only show admin section if user is authenticated admin
  if (isAdmin) {
    menuItems.push({
      label: 'Administration',
      icon: CogIcon,
      gradient: 'from-red-500 to-pink-500',
      submenu: [
        {
          path: '/admin',
          label: 'Admin Panel',
          icon: CogIcon,
          description: 'System administration and management',
          gradient: 'from-red-500 to-pink-500'
        },
        {
          path: '/admin/users',
          label: 'User Management',
          icon: CogIcon,
          description: 'Manage users and permissions',
          gradient: 'from-pink-500 to-rose-500'
        },
        {
          path: '/admin/system',
          label: 'System Settings',
          icon: CogIcon,
          description: 'System configuration and settings',
          gradient: 'from-rose-500 to-red-500'
        }
      ]
    });
  } else {
    // Show login option for non-authenticated users
    menuItems.push({
      path: '/login',
      label: 'Admin Login',
      icon: CogIcon,
      gradient: 'from-gray-500 to-gray-600',
      description: 'Access admin dashboard'
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
    const Icon = item.icon;
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isExpanded = isMenuExpanded(item.label);

    if (hasSubmenu) {
      return (
        <div key={item.label} className="space-y-2">
          <button
            onClick={() => toggleMenu(item.label)}
            className="w-full flex items-center gap-5 px-6 py-4 rounded-xl transition-all duration-300 text-gray-700 hover:bg-blue-50 hover:text-blue-700 group"
          >
            <div className={`p-2.5 rounded-lg bg-gradient-to-br ${item.gradient}`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 text-left">
              <span className="font-semibold text-base">{item.label}</span>
            </div>
            {isExpanded ? (
              <ChevronDownIcon className="w-5 h-5 transition-transform duration-200" />
            ) : (
              <ChevronRightIcon className="w-5 h-5 transition-transform duration-200" />
            )}
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
                  const SubIcon = subItem.icon;
                  const isSubActive = isActive(subItem.path);

                  return subItem.external ? (
                    <a
                      key={subItem.path}
                      href={subItem.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`group flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 ${isSubActive
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                        : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                        }`}
                    >
                      <div className={`p-2 rounded-md ${isSubActive ? 'bg-white/20' : `bg-gradient-to-br ${subItem.gradient}`
                        }`}>
                        <SubIcon className={`w-5 h-5 ${isSubActive ? 'text-white' : 'text-white'}`} />
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
                    </a>
                  ) : (
                    <Link
                      key={subItem.path}
                      to={subItem.path}
                      className={`group flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 ${isSubActive
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                        : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                        }`}
                    >
                      <div className={`p-2 rounded-md ${isSubActive ? 'bg-white/20' : `bg-gradient-to-br ${subItem.gradient}`
                        }`}>
                        <SubIcon className={`w-5 h-5 ${isSubActive ? 'text-white' : 'text-white'}`} />
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
        target="_blank"
        rel="noopener noreferrer"
        className={`group flex items-center gap-5 px-6 py-4 rounded-xl transition-all duration-300 ${isItemActive
          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
          : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:scale-105'
          }`}
      >
        <div className={`p-2.5 rounded-lg ${isItemActive ? 'bg-white/20' : `bg-gradient-to-br ${item.gradient}`}`}>
          <Icon className={`w-6 h-6 ${isItemActive ? 'text-white' : 'text-white'}`} />
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
      </a>
    ) : (
      <Link
        key={item.path}
        to={item.path!}
        className={`group flex items-center gap-5 px-6 py-4 rounded-xl transition-all duration-300 ${isItemActive
          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
          : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:scale-105'
          }`}
      >
        <div className={`p-2.5 rounded-lg ${isItemActive ? 'bg-white/20' : `bg-gradient-to-br ${item.gradient}`}`}>
          <Icon className={`w-6 h-6 ${isItemActive ? 'text-white' : 'text-white'}`} />
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
      <aside className="w-72 bg-gradient-to-b from-slate-50 to-white border-r-2 border-slate-200/80 h-screen fixed left-0 top-0 z-40 flex flex-col shadow-2xl">
        {/* Header with Logo */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-700 p-8 border-b-2 border-blue-500/30">
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
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
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
        <div className="p-5 space-y-4 border-t-2 border-slate-200/80 bg-gradient-to-br from-slate-50 to-blue-50/30 flex-shrink-0">
          {/* Language Switcher */}
          <div className="flex justify-center">
            <LanguageSwitcher />
          </div>

          {/* Need Help Section */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-blue-900 mb-1">{t('needHelp')}</h4>
                <p className="text-xs text-blue-700 mb-3 leading-relaxed">
                  {t('contactSupport')}
                </p>
                <a
                  href="mailto:j.akech@alustudent.com"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {t('getSupport')}
                </a>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="space-y-2">
            <div className="text-xs text-slate-600 font-bold uppercase tracking-wider">System Status</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 p-3 rounded-lg text-center shadow-md hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <div className="font-bold text-green-700 text-sm">Live</div>
                </div>
                <div className="text-green-600 text-[10px] font-medium">Monitoring</div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 p-3 rounded-lg text-center shadow-md hover:shadow-lg transition-all duration-300">
                <div className="font-bold text-blue-700 text-sm mb-0.5">24/7</div>
                <div className="text-blue-600 text-[10px] font-medium">Support</div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default EnhancedSidebar;
