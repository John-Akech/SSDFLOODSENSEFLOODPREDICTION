import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';

const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-slate-900 text-slate-300 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-40"></div>

      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg hidden">
              </div>
              <div>
                <span className="text-xl font-bold text-white">FloodSense</span>
                <p className="text-xs text-slate-400">South Sudan Early Warning</p>
              </div>
            </div>
            <p className="text-slate-400 leading-relaxed mb-4 text-sm">
              AI-powered flood forecasting and early warning system protecting communities across South Sudan with real-time monitoring and predictive analytics.
            </p>
            <div className="flex items-center gap-3">
              <a href="https://github.com/John-Akech/SouthSudanFLoodSense" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors group hidden">
              </a>
              <a href="mailto:j.akech@alustudent.com" className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors group hidden">
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold text-base mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Platform
            </h4>
            <ul className="space-y-2">
              <li><Link to="/" className="text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-2 group">
                {t('dashboard')}
              </Link></li>
              <li><Link to="/map" className="text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-2 group">
                {t('riskMap')}
              </Link></li>
              <li><Link to="/report" className="text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-2 group">
                {t('reportFlood')}
              </Link></li>
              <li><Link to="/analytics" className="text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-2 group">
                {t('analytics')}
              </Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-base mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Resources
            </h4>
            <ul className="space-y-2">
              <li><a href="https://github.com/John-Akech/SouthSudanFLoodSense" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-green-400 transition-colors flex items-center gap-2 group">
                Documentation
              </a></li>
              <li><a href="http://localhost:8000/docs" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-green-400 transition-colors flex items-center gap-2 group">
                API Reference
              </a></li>
              <li><a href="https://github.com/John-Akech/SouthSudanFLoodSense/discussions" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-green-400 transition-colors flex items-center gap-2 group">
                Community Forum
              </a></li>
              <li><a href="mailto:j.akech@alustudent.com" className="text-slate-400 hover:text-green-400 transition-colors flex items-center gap-2 group">
                Support
              </a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-base mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              {t('contactSupport')}
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0 hidden">
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Email</p>
                  <a href="mailto:j.akech@alustudent.com" className="text-white hover:text-blue-400 transition-colors font-medium">j.akech@alustudent.com</a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0 hidden">
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Location</p>
                  <span className="text-white font-medium">Kigali, Rwanda</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-4 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-sm text-gray-400">
            © 2025 FloodSense. BSc. Software Engineering Project by John Akech.
          </p>
          <div className="flex gap-6 text-sm">
            <a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">Privacy Policy</a>
            <a href="/terms-of-service.html" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">Terms of Service</a>
            <a href="/accessibility.html" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">Accessibility</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
