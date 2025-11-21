import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { t } = useLanguage();

  return (
    <nav className="bg-gradient-to-r from-blue-700 via-blue-800 to-cyan-800 border-b border-blue-600/30 fixed top-0 left-0 right-0 z-50 h-16 shadow-2xl backdrop-blur-xl">
      <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Left side - Logo and Menu Button */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors font-bold"
            aria-label="Toggle menu"
          >
            Menu
          </button>
          {/* Logo */}
          <Link to="/" className="flex items-center gap-4 group">
            <div className="relative">
              <img
                src="/images/FloodSenseLogo.png"
                alt="FloodSense"
                className="h-12 w-auto group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            <div>
              <span className="text-xl font-bold text-white group-hover:text-blue-100 transition-colors duration-300">
                FloodSense
              </span>
              <p className="text-xs text-blue-100/80 group-hover:text-blue-100 transition-colors duration-300">
                {t('southSudanEarlyWarning')}
              </p>
            </div>
          </Link>
        </div>
        {/* Right side - Notifications only */}
        <div className="flex items-center gap-4">
          {/* Place the NotificationBell component here if you have one */}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;