import React from 'react';
import { Link } from 'react-router-dom';
import { WaveIcon } from './Icons';
import { useLanguage } from '../i18n/LanguageContext';

const Footer: React.FC = () => {
  const { t } = useLanguage();
  
  const handlePolicyClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  return (
    <footer className="bg-navy-950 text-gray-300 mt-20">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <WaveIcon className="w-8 h-8 text-ocean-400" />
              <span className="text-xl font-bold text-white">FloodSense</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              AI-powered flood forecasting and early warning system for South Sudan communities.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-ocean-400 transition-colors">{t('dashboard')}</Link></li>
              <li><Link to="/map" className="hover:text-ocean-400 transition-colors">{t('riskMap')}</Link></li>
              <li><Link to="/report" className="hover:text-ocean-400 transition-colors">{t('reportFlood')}</Link></li>
              <li><Link to="/analytics" className="hover:text-ocean-400 transition-colors">{t('analytics')}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="https://github.com/John-Akech/SouthSudanFLoodSense" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">Documentation</a></li>
              <li><a href="http://localhost:8000/docs" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">API Reference</a></li>
              <li><a href="https://github.com/John-Akech/SouthSudanFLoodSense/discussions" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition-colors">Community Forum</a></li>
              <li><a href="mailto:j.akech@alustudent.com" className="hover:text-cyan-400 transition-colors">Support</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">{t('contactSupport')}</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                </svg>
                <a href="mailto:j.akech@alustudent.com" className="hover:text-cyan-400 transition-colors">j.akech@alustudent.com</a>
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                </svg>
                <span>Kigali, Rwanda</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-400">
            © 2025 FloodSense. BSc. Software Engineering Project by John Akech.
          </p>
          <div className="flex gap-6 text-sm">
            <a href="/privacy-policy.html#top" target="_blank" onClick={handlePolicyClick} className="hover:text-cyan-400 transition-colors">Privacy Policy</a>
            <a href="/terms-of-service.html#top" target="_blank" onClick={handlePolicyClick} className="hover:text-cyan-400 transition-colors">Terms of Service</a>
            <a href="/accessibility.html#top" target="_blank" onClick={handlePolicyClick} className="hover:text-cyan-400 transition-colors">Accessibility</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
