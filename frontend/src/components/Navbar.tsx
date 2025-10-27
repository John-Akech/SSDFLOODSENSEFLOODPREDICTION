import React from 'react';
import { Link } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import LanguageSwitcher from './LanguageSwitcher';
import { useLanguage } from '../i18n/LanguageContext';

const Navbar: React.FC = () => {
  const { t } = useLanguage();

  return (
    <nav className="bg-gradient-to-r from-cyan-700 via-blue-700 to-teal-800 border-b border-cyan-600/30 fixed top-0 left-0 right-0 z-50 h-16 shadow-xl">
      <div className="h-full px-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <img src="/images/FloodSenseLogo.png" alt="FloodSense" className="h-12 w-auto group-hover:scale-105 transition-transform" />
          <div>
            <span className="text-xl font-bold text-white">FloodSense</span>
            <p className="text-xs text-cyan-100">{t('southSudanEarlyWarning')}</p>
          </div>
        </Link>

        <div className="flex items-center gap-6">
          <LanguageSwitcher />
          <NotificationBell />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
