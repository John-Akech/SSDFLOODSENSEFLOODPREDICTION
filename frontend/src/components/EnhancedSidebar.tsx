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
          path: '/map',
          label: 'Risk Map',
          icon: MapIcon,
          description: 'Interactive flood risk visualization',
          gradient: 'from-emerald-500 to-teal-500'
        },
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
        },
        {
          path: '/infrastructure',
          label: 'Infrastructure Map',
          icon: MapIcon,
          description: 'Critical infrastructure monitoring',
          gradient: 'from-yellow-500 to-orange-500'
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
        },
        {
          path: '/api-docs',
          label: 'API Documentation',
          icon: DocumentIcon,
          description: 'Developer API documentation',
          gradient: 'from-gray-500 to-gray-600'
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

  const renderMenuItem = (item: MenuItem, index: number) => {
    const Icon = item.icon;
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isExpanded = isMenuExpanded(item.label);

    if (hasSubmenu) {
      return (
        <div key={item.label} className="space-y-1">
          <button
            onClick={() => toggleMenu(item.label)}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 text-gray-700 hover:bg-blue-50 hover:text-blue-700 group"
          >
            <div className={`p-2 rounded-lg bg-gradient-to-br ${item.gradient}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <span className="font-semibold text-sm">{item.label}</span>
            </div>
            {isExpanded ? (
              <ChevronDownIcon className="w-4 h-4 transition-transform duration-200" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 transition-transform duration-200" />
            )}
          </button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="ml-4 space-y-1 border-l-2 border-blue-100 pl-4"
              >
                {item.submenu!.map((subItem, subIndex) => {
                  const SubIcon = subItem.icon;
                  const isSubActive = isActive(subItem.path);
                  
                  return subItem.external ? (
                    <a
                      key={subItem.path}
                      href={subItem.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`group flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                        isSubActive
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                          : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      <div className={`p-1.5 rounded-md ${
                        isSubActive ? 'bg-white/20' : `bg-gradient-to-br ${subItem.gradient}`
                      }`}>
                        <SubIcon className={`w-4 h-4 ${isSubActive ? 'text-white' : 'text-white'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{subItem.label}</div>
                        <div className={`text-xs ${
                          isSubActive ? 'text-blue-100' : 'text-gray-500'
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
                      className={`group flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                        isSubActive
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                          : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      <div className={`p-1.5 rounded-md ${
                        isSubActive ? 'bg-white/20' : `bg-gradient-to-br ${subItem.gradient}`
                      }`}>
                        <SubIcon className={`w-4 h-4 ${isSubActive ? 'text-white' : 'text-white'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{subItem.label}</div>
                        <div className={`text-xs ${
                          isSubActive ? 'text-blue-100' : 'text-gray-500'
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
        className={`group flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 ${
          isItemActive
            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
            : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:scale-105'
        }`}
      >
        <div className={`p-2 rounded-lg ${isItemActive ? 'bg-white/20' : `bg-gradient-to-br ${item.gradient}`}`}>
          <Icon className={`w-5 h-5 ${isItemActive ? 'text-white' : 'text-white'}`} />
        </div>
        <div className="flex-1">
          <span className="font-semibold text-sm">{item.label}</span>
          {item.description && (
            <div className={`text-xs mt-1 ${
              isItemActive ? 'text-blue-100' : 'text-gray-500'
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
        className={`group flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 ${
          isItemActive
            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
            : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:scale-105'
        }`}
      >
        <div className={`p-2 rounded-lg ${isItemActive ? 'bg-white/20' : `bg-gradient-to-br ${item.gradient}`}`}>
          <Icon className={`w-5 h-5 ${isItemActive ? 'text-white' : 'text-white'}`} />
        </div>
        <div className="flex-1">
          <span className="font-semibold text-sm">{item.label}</span>
          {item.description && (
            <div className={`text-xs mt-1 ${
              isItemActive ? 'text-blue-100' : 'text-gray-500'
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
    <aside className="w-56 bg-white/95 backdrop-blur-xl border-r border-gray-200/60 h-screen fixed left-0 top-0 z-40 flex flex-col shadow-xl">
      {/* Header with Logo */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-cyan-800 p-4 border-b border-blue-600/30">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <img 
                src="/images/FloodSenseLogo.png" 
                alt="FloodSense" 
                className="h-10 w-auto group-hover:scale-105 transition-transform duration-300" 
              />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <div>
              <span className="text-lg font-bold text-white group-hover:text-blue-100 transition-colors duration-300">
                FloodSense
              </span>
              <p className="text-xs text-blue-100/80 group-hover:text-blue-100 transition-colors duration-300">
                {t('southSudanEarlyWarning')}
              </p>
            </div>
          </Link>
          
          {/* Mobile Menu Button */}
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-5 space-y-2 flex-1 overflow-y-auto">
        {menuItems.map((item, index) => renderMenuItem(item, index))}
      </nav>

      {/* Bottom Section - Fixed at bottom */}
      <div className="p-5 space-y-5 border-t border-gray-200/60 bg-white/60">
        {/* Language Switcher */}
        <div className="flex justify-center">
          <LanguageSwitcher />
        </div>
        
        {/* Need Help Section - Fixed height to prevent overflow */}
        <div className="card p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-blue-900 mb-1">{t('needHelp')}</h4>
              <p className="text-xs text-blue-700 mb-3 leading-relaxed line-clamp-2">
                {t('contactSupport')}
              </p>
              <a 
                href="mailto:j.akech@alustudent.com" 
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
              >
                {t('getSupport')}
              </a>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-2">
          <div className="text-xs text-gray-500 font-medium">Quick Stats</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-green-50 p-2 rounded-lg text-center">
              <div className="font-bold text-green-600">Live</div>
              <div className="text-green-500">Monitoring</div>
            </div>
            <div className="bg-blue-50 p-2 rounded-lg text-center">
              <div className="font-bold text-blue-600">24/7</div>
              <div className="text-blue-500">Support</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default EnhancedSidebar;
