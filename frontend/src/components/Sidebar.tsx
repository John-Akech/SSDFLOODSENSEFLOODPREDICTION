import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const isAdmin = localStorage.getItem('userRole') === 'admin';
  const isActive = (path: string) => location.pathname === path;
  const { t } = useLanguage();

  const navItems = [
    { path: '/home', label: t('dashboard'), gradient: 'from-blue-500 to-cyan-500' },
    { path: '/map', label: t('riskMap'), gradient: 'from-emerald-500 to-teal-500' },
    {
      path: import.meta.env.VITE_SAR_URL || 'http://localhost:8080',
      label: 'SAR Detection',
      gradient: 'from-purple-500 to-indigo-500',
      external: true
    },
    { path: '/report', label: t('reportFlood'), gradient: 'from-orange-500 to-amber-500' },
    { path: '/analytics', label: t('analytics'), gradient: 'from-purple-500 to-pink-500' },
    { path: '/data-sharing', label: 'Data Sharing', gradient: 'from-indigo-500 to-purple-500' },
  ];

  if (isAdmin) {
    navItems.push({ path: '/admin', label: t('adminPanel'), gradient: 'from-indigo-500 to-purple-500' });
  }

  return (
    <aside className="w-64 bg-white/95 backdrop-blur-xl border-r border-gray-200/50 h-screen fixed left-0 top-16 z-40 flex flex-col shadow-2xl">
      {/* Navigation */}
      <nav className="p-6 space-y-2 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return item.external ? (
            <a
              key={item.path}
              href={item.path}
              className={`group flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 ${
                'text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:scale-105'
                }`}
            >
              <span className="font-semibold text-sm">{item.label}</span>
            </a>
          ) : (
            <Link
              key={item.path}
              to={item.path}
              className={`group flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 ${active
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
                : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:scale-105'
                }`}
            >
              <span className="font-semibold text-sm">{item.label}</span>
              {active && (
                <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section - Fixed at bottom */}
      <div className="p-6 space-y-6 border-t border-gray-200/50 bg-white/50">
        {/* Language Switcher */}
        <div className="flex justify-center">
          <LanguageSwitcher />
        </div>

        {/* Need Help Section - Fixed height to prevent overflow */}
        <div className="card p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl">
          <div className="flex items-start gap-3">
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

export default Sidebar;