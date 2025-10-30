import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HomeIcon, MapIcon, DocumentIcon, ChartIcon, CogIcon } from './Icons';
import { useLanguage } from '../i18n/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const isAdmin = localStorage.getItem('userRole') === 'admin';
  const isActive = (path: string) => location.pathname === path;
  const { t } = useLanguage();

  const navItems = [
    { path: '/home', label: t('dashboard'), icon: HomeIcon, gradient: 'from-blue-500 to-cyan-500' },
    { path: '/map', label: t('riskMap'), icon: MapIcon, gradient: 'from-emerald-500 to-teal-500' },
    { path: 'http://localhost:8080', label: 'SAR Detection', icon: MapIcon, gradient: 'from-purple-500 to-indigo-500', external: true },

    { path: '/report', label: t('reportFlood'), icon: DocumentIcon, gradient: 'from-orange-500 to-amber-500' },
    { path: '/analytics', label: t('analytics'), icon: ChartIcon, gradient: 'from-purple-500 to-pink-500' },
    { path: '/data-sharing', label: 'Data Sharing', icon: DocumentIcon, gradient: 'from-indigo-500 to-purple-500' },
  ];

  if (isAdmin) {
    navItems.push({ path: '/admin', label: t('adminPanel'), icon: CogIcon, gradient: 'from-indigo-500 to-purple-500' });
  }

  return (
    <aside className="w-64 bg-white/95 backdrop-blur-xl border-r border-gray-200/50 min-h-screen fixed left-0 top-16 bottom-0 overflow-y-auto shadow-2xl">
      <nav className="p-6 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return item.external ? (
            <a
              key={item.path}
              href={item.path}
              target="_blank"
              rel="noopener noreferrer"
                className={`group flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 ${
                  active
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:scale-105'
                }`}
            >
              <div className={`p-2 rounded-lg ${active ? 'bg-white/20' : `bg-gradient-to-br ${item.gradient}`}`}>
                <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-white'}`} />
              </div>
              <span className="font-semibold text-sm">{item.label}</span>
              {active && (
                <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></div>
              )}
            </a>
          ) : (
            <Link
              key={item.path}
              to={item.path}
                className={`group flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 ${
                  active
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105'
                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:scale-105'
                }`}
            >
              <div className={`p-2 rounded-lg ${active ? 'bg-white/20' : `bg-gradient-to-br ${item.gradient}`}`}>
                <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-white'}`} />
              </div>
              <span className="font-semibold text-sm">{item.label}</span>
              {active && (
                <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-6 mt-8 space-y-6">
        <div className="flex justify-center">
          <LanguageSwitcher />
        </div>
        
          <div className="card p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-blue-900 mb-2">{t('needHelp')}</h4>
              <p className="text-xs text-blue-700 mb-4 leading-relaxed">{t('contactSupport')}</p>
              <a 
                href="mailto:j.akech@alustudent.com" 
                className="btn btn-primary text-xs px-4 py-2 shadow-lg hover:shadow-xl"
              >
                {t('getSupport')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
